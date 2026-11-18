import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent, ReactNode } from "react";
import {
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
  renameConversation,
  streamChatMessage,
} from "./chat.service";
import type { ChatConversation, ChatMessageRecord } from "./chat.service";
import { ApiError } from "../../services/api/client";

type Message = ChatMessageRecord & { localKey: string; status?: "streaming" | "failed" };

function messageError(error: unknown) {
  if (!(error instanceof ApiError)) return "The chat service could not be reached. Please try again.";
  if (error.status === 401) return "Your session expired. Sign in again to continue.";
  if (error.status === 429) return "The AI service is busy. Please wait and try again.";
  if (error.status === 0) return error.message || "The connection was interrupted. Please try again.";
  return error.message || "The AI could not complete this request.";
}

function fromRecord(message: ChatMessageRecord): Message {
  return { ...message, localKey: `message-${message.id}` };
}

function InlineMarkdown({ text }: { text: string }) {
  const pieces = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g).filter(Boolean);
  return <>{pieces.map((piece, index) => {
    if (piece.startsWith("**") && piece.endsWith("**")) return <strong key={index}>{piece.slice(2, -2)}</strong>;
    if (piece.startsWith("`") && piece.endsWith("`")) return <code key={index}>{piece.slice(1, -1)}</code>;
    const link = piece.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (link) return <a key={index} href={link[2]} target="_blank" rel="noreferrer">{link[1]}</a>;
    return <span key={index}>{piece}</span>;
  })}</>;
}

function MarkdownContent({ content, onCopyCode }: { content: string; onCopyCode: (text: string) => void }) {
  const blocks: ReactNode[] = [];
  const lines = content.split("\n");
  let paragraph: string[] = [];
  let list: string[] = [];
  let code: string[] | null = null;
  let codeLanguage = "";
  const flushParagraph = () => {
    if (paragraph.length) blocks.push(<p key={`p-${blocks.length}`}><InlineMarkdown text={paragraph.join(" ")} /></p>);
    paragraph = [];
  };
  const flushList = () => {
    if (list.length) blocks.push(<ul key={`ul-${blocks.length}`}>{list.map((item, index) => <li key={index}><InlineMarkdown text={item} /></li>)}</ul>);
    list = [];
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      flushParagraph(); flushList();
      if (code === null) { code = []; codeLanguage = line.slice(3).trim(); }
      else {
        const source = code.join("\n");
        blocks.push(<div className="chat-code" key={`code-${blocks.length}`}><div><span>{codeLanguage || "Code"}</span><button type="button" onClick={() => onCopyCode(source)}>Copy code</button></div><pre><code>{source}</code></pre></div>);
        code = null; codeLanguage = "";
      }
      continue;
    }
    if (code !== null) { code.push(line); continue; }
    if (!line.trim()) { flushParagraph(); flushList(); continue; }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph(); flushList();
      const level = heading[1].length;
      blocks.push(level === 1 ? <h3 key={`h-${blocks.length}`}><InlineMarkdown text={heading[2]} /></h3> : level === 2 ? <h4 key={`h-${blocks.length}`}><InlineMarkdown text={heading[2]} /></h4> : <h5 key={`h-${blocks.length}`}><InlineMarkdown text={heading[2]} /></h5>);
      continue;
    }
    const item = line.match(/^\s*[-*]\s+(.+)$/);
    if (item) { flushParagraph(); list.push(item[1]); continue; }
    flushList(); paragraph.push(line.trim());
  }
  if (code !== null) {
    const source = code.join("\n");
    blocks.push(<div className="chat-code" key={`code-${blocks.length}`}><div><span>{codeLanguage || "Code"}</span><button type="button" onClick={() => onCopyCode(source)}>Copy code</button></div><pre><code>{source}</code></pre></div>);
  }
  flushParagraph(); flushList();
  return <div className="chat-markdown">{blocks}</div>;
}

function ChatMessage({ message, onCopy }: { message: Message; onCopy: (text: string) => void }) {
  const isUser = message.role === "user";
  return <article className={`ai-chat-message ${isUser ? "user" : "assistant"}`}>
    <div className="chat-message-avatar" aria-hidden="true">{isUser ? "You" : "AI"}</div>
    <div className="chat-message-body">
      <header><b>{isUser ? "You" : "JobPilot AI"}</b><time dateTime={message.created_at}>{new Date(message.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time></header>
      {isUser ? <p className="chat-user-content">{message.content}</p> : <MarkdownContent content={message.content} onCopyCode={onCopy} />}
      {message.status === "streaming" && <span className="chat-stream-cursor" aria-label="Generating response" />}
      {message.status === "failed" && <p className="chat-message-failed">Generation stopped. This partial response was not saved.</p>}
      {message.status !== "streaming" && message.status !== "failed" && <button className="chat-copy-message" type="button" onClick={() => onCopy(message.content)} aria-label="Copy message">Copy</button>}
    </div>
  </article>;
}

export default function AIChatPage() {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [pendingText, setPendingText] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);

  const loadConversations = async (selectFirst = false) => {
    setLoadingList(true);
    try {
      const items = await listConversations();
      setConversations(items);
      if (selectFirst && items.length) await openConversation(items[0].id);
      else if (!items.length && selectFirst) { setActiveId(null); setMessages([]); }
    } catch (reason) { setError(messageError(reason)); }
    finally { setLoadingList(false); }
  };

  const openConversation = async (id: number) => {
    setActiveId(id); setMobileHistoryOpen(false); setLoadingConversation(true); setError(""); setNotice("");
    try {
      const detail = await getConversation(id);
      setMessages(detail.messages.map(fromRecord));
    } catch (reason) { setMessages([]); setError(messageError(reason)); }
    finally { setLoadingConversation(false); }
  };

  useEffect(() => { void loadConversations(true); }, []);
  useEffect(() => {
    if (nearBottom.current) bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const createNewConversation = async () => {
    if (sending) return;
    setError(""); setNotice(""); setMobileHistoryOpen(false);
    try {
      const created = await createConversation();
      setConversations((items) => [created, ...items.filter((item) => item.id !== created.id)]);
      setActiveId(created.id); setMessages([]); setDraft("");
    } catch (reason) { setError(messageError(reason)); }
  };

  const sendMessage = (event?: FormEvent) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    if (!consentGiven) { setPendingText(text); setConsentChecked(false); return; }
    void submitMessage(text, true);
  };

  const submitMessage = async (text: string, externalAIConsent: boolean) => {
    setError(""); setNotice(""); setDraft(""); setSending(true);
    const controller = new AbortController(); abortRef.current = controller;
    const now = new Date().toISOString();
    const userMessage: Message = { id: -Date.now(), localKey: `local-user-${Date.now()}`, role: "user", content: text, created_at: now };
    const assistantKey = `local-ai-${Date.now()}`;
    const assistantMessage: Message = { id: -Date.now() - 1, localKey: assistantKey, role: "assistant", content: "", created_at: new Date().toISOString(), status: "streaming" };
    setMessages((current) => [...current, userMessage, assistantMessage]);
    let conversationId = activeId;
    try {
      if (conversationId === null) {
        const created = await createConversation();
        conversationId = created.id;
        setActiveId(conversationId);
        setConversations((items) => [created, ...items]);
      }
      await streamChatMessage(conversationId, text, {
        externalAIConsent,
        signal: controller.signal,
        onDelta: (delta) => setMessages((current) => current.map((item) => item.localKey === assistantKey ? { ...item, content: item.content + delta } : item)),
      });
      const detail = await getConversation(conversationId);
      setMessages(detail.messages.map(fromRecord));
      setConversations((items) => [detail, ...items.filter((item) => item.id !== detail.id)].sort((a, b) => b.updated_at.localeCompare(a.updated_at)));
    } catch (reason) {
      setMessages((current) => current.map((item) => item.localKey === assistantKey ? { ...item, status: "failed" } : item));
      if (controller.signal.aborted) setNotice("Generation stopped. Any partial assistant output was discarded.");
      else setError(messageError(reason));
      if (conversationId !== null) {
        void loadConversations();
        const failedConversationId = conversationId;
        const currentActiveId = activeId;
        if (currentActiveId === null) setActiveId(failedConversationId);
      }
    } finally { setSending(false); abortRef.current = null; }
  };

  const rename = async (conversation: ChatConversation) => {
    const title = renameValue.trim();
    if (!title) { setRenamingId(null); return; }
    try {
      const updated = await renameConversation(conversation.id, title);
      setConversations((items) => items.map((item) => item.id === updated.id ? updated : item));
      setNotice("Conversation renamed."); setRenamingId(null);
    } catch (reason) { setError(messageError(reason)); }
  };

  const remove = async (conversation: ChatConversation) => {
    if (!window.confirm(`Delete “${conversation.title}”? This cannot be undone.`)) return;
    try {
      await deleteConversation(conversation.id);
      const remaining = conversations.filter((item) => item.id !== conversation.id);
      setConversations(remaining);
      if (activeId === conversation.id) {
        setActiveId(null); setMessages([]);
        if (remaining.length) void openConversation(remaining[0].id);
      }
      setNotice("Conversation deleted.");
    } catch (reason) { setError(messageError(reason)); }
  };

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setNotice("Copied to clipboard."); }
    catch { setError("Clipboard access is unavailable in this browser."); }
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); }
  };

  const activeConversation = conversations.find((item) => item.id === activeId);
  return <div className={`ai-chat-page ${mobileHistoryOpen ? "history-open" : ""}`}>
    <aside className="ai-chat-history" aria-label="Conversation history">
      <div className="ai-chat-history-head"><h2>Conversations</h2><button className="ai-chat-close-history" type="button" onClick={() => setMobileHistoryOpen(false)} aria-label="Close conversation history">×</button></div>
      <button className="ai-chat-new" type="button" onClick={() => void createNewConversation()} disabled={sending}>＋ New conversation</button>
      <div className="ai-chat-conversation-list">
        {loadingList ? <p className="ai-chat-muted">Loading history…</p> : !conversations.length ? <p className="ai-chat-muted">Your saved conversations will appear here.</p> : conversations.map((item) => <div className={`ai-chat-conversation ${activeId === item.id ? "active" : ""}`} key={item.id}>
          {renamingId === item.id ? <form onSubmit={(event) => { event.preventDefault(); void rename(item); }}><input autoFocus value={renameValue} onChange={(event) => setRenameValue(event.target.value)} aria-label="Conversation title" /><button type="submit" aria-label="Save title">Save</button><button type="button" onClick={() => setRenamingId(null)}>Cancel</button></form> : <button className="ai-chat-conversation-select" type="button" onClick={() => void openConversation(item.id)}><b>{item.title || "New conversation"}</b><time dateTime={item.updated_at}>{new Date(item.updated_at).toLocaleDateString()}</time></button>}
          {renamingId !== item.id && <div className="ai-chat-conversation-actions"><button type="button" aria-label={`Rename ${item.title}`} onClick={() => { setRenamingId(item.id); setRenameValue(item.title); }}>Rename</button><button type="button" aria-label={`Delete ${item.title}`} onClick={() => void remove(item)}>Delete</button></div>}
        </div>)}
      </div>
    </aside>
    {mobileHistoryOpen && <button className="ai-chat-backdrop" type="button" aria-label="Close history" onClick={() => setMobileHistoryOpen(false)} />}
    <main className="ai-chat-main">
      <header className="ai-chat-topbar"><button type="button" className="ai-chat-history-toggle" onClick={() => setMobileHistoryOpen(true)} aria-label="Open conversation history">☰</button><div className="ai-chat-brand"><span>✦</span><div><h1>{activeConversation?.title || "JobPilot AI"}</h1><p>AI assistant</p></div></div><button type="button" className="ai-chat-refresh" onClick={() => void loadConversations()} disabled={loadingList}>Refresh history</button></header>
      {error && <div className="ai-chat-alert" role="alert"><span>{error}</span><button type="button" onClick={() => setError("")} aria-label="Dismiss error">×</button></div>}
      {notice && <div className="ai-chat-notice" role="status">{notice}</div>}
      <div className="ai-chat-scroll" ref={scrollRef} onScroll={(event) => { const el = event.currentTarget; nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120; }}>
        {loadingConversation ? <div className="ai-chat-empty" role="status">Loading conversation…</div> : messages.length ? <div className="ai-chat-thread">{messages.map((message) => <ChatMessage key={message.localKey} message={message} onCopy={(value) => void copy(value)} />)}<div ref={bottomRef} /></div> : <section className="ai-chat-welcome"><span className="ai-chat-welcome-orb">✦</span><h2>What can I help you with?</h2><p>Ask for help with your job search, interview preparation, or professional writing.</p><div>{["Help me prepare for an interview", "How can I improve my resume?", "Suggest a job search plan"].map((prompt) => <button type="button" key={prompt} onClick={() => setDraft(prompt)}>{prompt}<span>↗</span></button>)}</div></section>}
      </div>
      <form className="ai-chat-composer" onSubmit={(event) => void sendMessage(event)}><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={onInputKeyDown} placeholder="Message JobPilot AI…" rows={1} disabled={sending} aria-label="Message JobPilot AI" /><div><span>Enter to send · Shift+Enter for a new line</span>{sending ? <button type="button" className="ai-chat-stop" onClick={() => abortRef.current?.abort()}>Stop generation</button> : <button type="submit" disabled={!draft.trim()} aria-label="Send message">Send&nbsp; ↑</button>}</div></form>
      <p className="ai-chat-disclaimer">AI responses can be inaccurate. Verify important information.</p>
    </main>
    {pendingText && <div className="ai-consent-backdrop" role="presentation"><section className="ai-consent-dialog" role="dialog" aria-modal="true" aria-labelledby="ai-consent-title"><h2 id="ai-consent-title">Before you send a message</h2><p>For regular accounts, chat messages are processed by an external AI service. JobPilot sends the message and recent conversation context only; your CV and profile are not attached automatically. Avoid including sensitive personal information.</p><label><input type="checkbox" checked={consentChecked} onChange={(event) => setConsentChecked(event.target.checked)} />I consent to processing this chat message by the AI service.</label><div><button type="button" className="secondary" onClick={() => setPendingText("")}>Cancel</button><button type="button" className="primary" disabled={!consentChecked} onClick={() => { setConsentGiven(true); const message = pendingText; setPendingText(""); void submitMessage(message, true); }}>Continue</button></div></section></div>}
  </div>;
}
