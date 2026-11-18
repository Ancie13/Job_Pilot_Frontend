import { ApiError, apiClient } from "../../services/api/client";

export interface ChatMessageRecord {
  id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface ChatConversation {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatConversationDetail extends ChatConversation {
  messages: ChatMessageRecord[];
}

interface PagedConversations {
  results: ChatConversation[];
}

export async function listConversations() {
  const result = await apiClient.get<ChatConversation[] | PagedConversations>("/api/ai/conversations/");
  return Array.isArray(result) ? result : result.results;
}

export function createConversation() {
  return apiClient.post<ChatConversation>("/api/ai/conversations/", {});
}

export function getConversation(id: number) {
  return apiClient.get<ChatConversationDetail>(`/api/ai/conversations/${id}/`);
}

export function renameConversation(id: number, title: string) {
  return apiClient.patch<ChatConversation>(`/api/ai/conversations/${id}/`, { title });
}

export function deleteConversation(id: number) {
  return apiClient.delete(`/api/ai/conversations/${id}/`);
}

export interface ChatCompletion {
  conversation_id?: number;
  message?: ChatMessageRecord;
  provider?: string;
  model?: string;
}

export async function streamChatMessage(
  conversationId: number,
  message: string,
  options: { externalAIConsent: boolean; signal?: AbortSignal; onDelta: (text: string) => void; onMetadata?: (data: Record<string, unknown>) => void },
) {
  const response = await apiClient.postStream("/api/ai/chat/", {
    conversation_id: conversationId,
    message,
    external_ai_consent: options.externalAIConsent,
    stream: true,
  }, options.signal);
  if (!response.body) throw new ApiError("The chat stream was empty.", 0);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completed = false;
  let completion: ChatCompletion = {};

  const consumeFrame = (frame: string) => {
    let eventName = "message";
    const data: string[] = [];
    for (const line of frame.split("\n")) {
      if (line.startsWith("event:")) eventName = line.slice(6).trim();
      else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
    }
    if (!data.length) return;
    const payloadText = data.join("\n");
    if (payloadText === "[DONE]") { completed = true; return; }
    let payload: Record<string, unknown>;
    try { payload = JSON.parse(payloadText) as Record<string, unknown>; }
    catch { throw new ApiError("The chat stream contained invalid data.", 0); }
    if (eventName === "error" || payload.type === "error") {
      const detail = typeof payload.detail === "string" ? payload.detail : "The AI could not complete this response.";
      throw new ApiError(detail, 503, payload);
    }
    if (payload.type === "delta" && typeof payload.content === "string") options.onDelta(payload.content);
    if (payload.type === "metadata" || payload.type === "usage") options.onMetadata?.(payload);
    if (payload.type === "complete" || payload.type === "completion" || payload.type === "done") {
      completed = true;
      completion = {
        conversation_id: typeof payload.conversation_id === "number" ? payload.conversation_id : undefined,
        message: payload.message && typeof payload.message === "object" ? payload.message as ChatMessageRecord : undefined,
        provider: typeof payload.provider === "string" ? payload.provider : undefined,
        model: typeof payload.model === "string" ? payload.model : undefined,
      };
    }
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");
      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        consumeFrame(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf("\n\n");
      }
      if (done) break;
    }
    if (buffer.trim()) consumeFrame(buffer);
  } finally {
    reader.releaseLock();
  }
  if (!completed) throw new ApiError("The response was interrupted before it finished.", 0);
  return completion;
}
