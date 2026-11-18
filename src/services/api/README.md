# Backend integration

Set `VITE_API_BASE_URL` to the Django origin for deployment. Local Vite development defaults to `http://localhost:8000`, matching `.env.example`. `apiClient` sends credentialed requests, keeps the access JWT in module memory, adds Bearer authorization, bootstraps and sends the Django CSRF token on unsafe requests, and retries a protected request once after rotating the HttpOnly refresh cookie. Startup initializes authentication through that refresh cookie; access tokens are not persisted in browser storage.

The frontend uses browser-history paths such as `/discover` and `/applications`; production hosting must serve `index.html` as the fallback for these client routes.

The matching feature uses the backend contracts as implemented:

- Public search: `GET /jobs/search` with repeated `keywords` parameters; backend keyword matching is OR-based and returns one page.
- Recommendations: `GET /api/matching/recommendations/`; synchronous and limited to one search page.
- Individual, bulk, and saved-application matching: `POST /api/matching/jobs/`, `/api/matching/jobs/bulk/` (up to 20), and `/api/matching/applications/{id}/`.
- History, detail, and refresh: `GET /api/matching/`, `GET /api/matching/{id}/`, and `POST /api/matching/{id}/refresh/`.
- Saved jobs and applications: `POST`/`GET /api/applications/`.
- Candidate profile and primary CV: `GET`/`PATCH /api/profile/me/`, `GET`/`POST /api/resumes/`, and `POST /api/resumes/{id}/set-primary/`.
- Email registration and cookie-based JWT login, refresh, and logout: `/api/auth/`.

The backend returns the score, category values, history metadata, and AI status. The frontend displays `null` category values as unavailable and does not calculate or alter match scores. Bulk and recommendation calls are deterministic by backend design.

Profile edits are sent as partial updates; parsed CV data is not silently copied into the profile. CV upload uses multipart field `document`, then explicitly selects that CV as primary. The matching backend reads the primary parsed CV together with the saved profile.

AI analysis requires the one-time consent checkbox in Discover Jobs. The submitted request includes `include_ai: true` and `external_ai_consent: true`; provider routing remains server-side. The UI displays the backend's `ai_status` and does not represent deterministic results as successful AI output.

## Backend behavior to be aware of

An AI-enabled request reuses only an equivalent result with completed AI analysis. If the prior result is deterministic or its AI attempt was unavailable, the backend makes a new attempt and preserves the earlier result in match history.

The attached backend README says the matching migration has not yet been applied to the local database. Apply migrations in the backend environment before testing authenticated matching endpoints. The frontend itself has no existing test runner or component testing dependencies.
