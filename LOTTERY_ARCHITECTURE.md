# LOTTERY_ARCHITECTURE

This document records architecture/design decisions made for the Tilt lottery system in this implementation session.

## Scope and subsystem boundary

- The lottery system is implemented inside the **Tilt subsystem**, not the main app DB layer.
- Tilt data access uses:
  - `src/db/tilt-db.ts`
  - `src/db/tilt-schema.ts`
- Tilt migrations/config use:
  - `drizzle-tiltyoutmusic.config.ts`

---

## Data model decisions

Lottery tables are in `src/db/tilt-schema.ts`:

- `lottery_campaigns`
- `qr_tokens`
- `lottery_sessions`
- `lottery_entries`

Key schema choices:

- `lottery_sessions.id` is text (nanoid), not UUID.
- `qr_tokens.token` is unique.
- `lottery_entries.session_id` is unique.
- Campaign deletion cascades to `qr_tokens` (`onDelete: cascade`).
- Dedup is by:
  - `(campaign_id, email)`
  - `(campaign_id, phone_hash)`
- No fingerprint field/index.
- No OTP/email verification fields in lottery session flow.

---

## QR generation and redeem flow

### QR generation

- Endpoint: `POST /api/tilt/qr`
- Non-idempotent by design: each request creates a fresh token.
- `outlet_id` is derived server-side from authenticated Tilt session (`tilt_token`), not user input.
- `campaign_id` is auto-selected server-side as the currently active campaign:
  - `starts_at <= now <= ends_at`
  - if multiple active, pick the most recently created.
- If no active campaign: return explicit `NO_ACTIVE_CAMPAIGN` error.
- QR URL format uses redeem route with token in URL fragment for privacy:
  - `.../tilt/redeem#t=<token>`
  - token is not sent to the server via URL query.

Approach used:

- **Privacy-by-fragment transport**: token is intentionally carried in the hash so it does not appear in server logs, reverse-proxy logs, or normal query-param analytics.
- **Server-authoritative campaign selection**: active campaign is resolved server-side instead of trusting client-supplied IDs.
- **Per-sale token issuance**: generation is intentionally non-idempotent to prevent accidental token reuse across different participants.

### Redeem

- Landing page: `src/app/tilt/redeem/page.tsx`
- Redeem API: `POST /api/tilt/redeem`
- Token burn + session creation is atomic in a DB transaction.
- Strict one-time behavior:
  - any second redeem attempt for a used token returns `ALREADY_USED`.
  - no session re-issue for used tokens.
  - race-safe update prevents double-burn.
- Cookie used for anonymous continuation:
  - name: `lsid`
  - `httpOnly`, `secure`, `sameSite: strict`, `maxAge: 1800`
- Redeem client resiliency:
  - hash token parsing supports encoded fragment variants.
  - token is removed from visible URL immediately via `history.replaceState`.
  - React Strict Mode double-effect protection is implemented so dev prepass does not trigger false `missing_token` redirects.

Approach used:

- **Client-to-server handoff pattern**: client reads fragment (`window.location.hash`) then POSTs token body to `/api/tilt/redeem`; fragment is never read server-side directly.
- **Burn-then-session transaction**: token burn (`used_at`, `session_id`) and session creation happen in one DB transaction to avoid split-brain states.
- **Fail-closed replay policy**: second redemption of the same token returns `ALREADY_USED` rather than re-issuing sessions.
- **URL scrubbing**: token is removed from browser-visible URL immediately after extraction.

---

## Submission flow decisions

- Submission endpoint remains `POST /api/tilt/register` (Tilt flow wiring).
- Submission session resolution order:
  - primary: valid lottery session cookie (`lsid`)
  - fallback: session id captured from redeem success payload and held in `sessionStorage` (`tilt_lsid_fallback`) for environments where secure cookie persistence is flaky during local/dev scan flows.
- Idempotency: already-submitted session returns `already_submitted`.
- Validation includes:
  - full_name required
  - email format required
  - disposable email rejected
  - phone digits length validation
  - address required
- Phone storage rule:
  - normalize with Nepal country code baseline (`977`)
  - store SHA-256 hash (`phone_hash`), not raw phone for dedup.
- On success transaction:
  - insert into `lottery_entries`
  - set `lottery_sessions.submitted_at`

Approach used:

- **Single-submit session gate**: session is the write gate; once `submitted_at` is set, repeat submissions return `already_submitted` payload rather than creating duplicates.
- **Campaign-scoped dedupe**: uniqueness checks are done at campaign scope for email and phone hash.
- **PII minimization for phone**: store normalized hash (`phone_hash`) instead of raw phone for dedupe.

---

## Middleware/proxy/session-check/health

- Existing project interception uses `src/proxy.ts`
- Lottery guard logic was merged into `src/proxy.ts` matcher behavior.
- Session validity endpoint:
  - `GET /api/tilt/session-check?sid=...`
- Health endpoint:
  - `GET /api/tilt/health`

Approach used (lottery guard):

- **Proxy guard for protected lottery pages**: `src/proxy.ts` guards lottery-only paths before page render.
- **Internal BFF validation call**: proxy performs internal fetch to `GET /api/tilt/session-check` because proxy runtime should not couple directly to Drizzle DB access.
- **Reasoned invalid redirects**: failed session checks redirect to `/tilt/invalid?reason=...` for deterministic UX and easier debugging.
- **Guard scope separation**: redeem endpoint is public (token exchange), while form/success pages are guarded by session validity.

Approach used (not showing token in URL):

- **Fragment-only token exposure**: token appears only as `#t=...` on initial open.
- **Immediate replaceState scrub**: token is removed from visible URL before additional navigation logic.
- **No query-token contract in final flow**: server redeem contract is POST body token, not query string.

---

## Outlet and admin UX decisions

### Outlet

- Outlet QR generation moved to a dedicated page:
  - `src/app/tilt/outlet/qr/page.tsx`
- Manual campaign/outlet ID inputs removed from outlet UI.
- Outlet dashboard overview no longer embeds the QR generator.

### Superadmin campaign management

- Dedicated campaign management page:
  - `src/app/tilt/admin/campaigns/page.tsx`
- API routes:
  - `GET/POST /api/tilt/admin/campaigns`
  - `PATCH /api/tilt/admin/campaigns/[id]`
  - `POST /api/tilt/admin/campaigns/[id]/end-now`
- Access restriction uses existing SUPERADMIN pattern.
- Edit rules:
  - editable: `name`, `ends_at`
  - `starts_at` editing is blocked via API (`STARTS_AT_LOCKED`).
- No delete action provided (end-now is the stop mechanism).

---

## Error-shape and response conventions

- Tilt lottery APIs use explicit `{ error, code }` style for expected failures.
- UI maps known codes to user-facing copy.
- Error branches remain explicit for security and operational visibility.

---

## Security and anti-fraud assumptions

- Token is single-use and consumed atomically.
- Anonymous continuity is session-cookie-based (`lsid`), not account-bound.
- Duplicate prevention is campaign-scoped by email and phone hash.
- No fingerprinting and no OTP in this design.

---

## Session change log (2026-06-17)

This section records all notable code changes made during this debugging/fix session.

### 1) Redeem/scan failure investigation and fixes

- Diagnosed `TypeError: NetworkError when attempting to fetch resource` as route/runtime/config interaction risk and redeem-flow instability.
- Added `runtime = "nodejs"` on redeem route to guarantee Node runtime compatibility with Drizzle/pg usage.
- Hardened tilt DB bootstrap (`src/db/tilt-db.ts`) to avoid import-time crash loops when `TILT_DATABASE_URL` is missing:
  - replaced top-level throw with lazy proxy-based throw on actual DB access.

### 2) URL token transport experiments and final decision

- Tried query-param redeem URL and server-redirect redeem variants during debugging.
- Reverted to required privacy model:
  - QR links encode token in hash (`#t=`), not query.
  - Redeem happens via client `POST /api/tilt/redeem`.
  - no GET/query redeem contract in final state.

### 3) One-time token semantics correction

- Corrected redeem behavior to strict anti-sharing requirement:
  - used token now always fails with `ALREADY_USED`.
  - removed previous session re-issue behavior for used tokens.

### 4) `missing_token` redirects right after scan (root cause + fix)

- Root cause identified: React Strict Mode double-effect in dev.
  - first effect read hash token and stripped URL.
  - second effect saw no hash and redirected to `missing_token`.
- Fix implemented in `src/app/tilt/redeem/page.tsx`:
  - temporary pending token storage in `sessionStorage` (`tilt_redeem_pending_token`).
  - robust hash token parsing (including encoded fragment variants).
  - cleanup of pending token on success/failure.

### 5) Form submit session recognition stabilization

- Added redeem success payload field `session_id`.
- Form page stores session fallback (`tilt_lsid_fallback`) from redeem success and includes it in register payload.
- Register route resolves session by cookie first, then by fallback `sid`.
- This keeps production cookie-first behavior while preventing local/dev false negatives when secure-cookie persistence is inconsistent.

### 6) Current table usage clarity

- Lottery participant submissions are written to `lottery_entries`.
- `lottery_sessions.submitted_at` is updated in the same transaction.
- `tilt_registrations` remains present for legacy/admin/profile paths and is not the active lottery-entry sink.

### 7) Fresh scan redirecting to `invalid_session` after redeem

Problem:

- `POST /api/tilt/redeem` succeeded, but next navigation redirected to `/tilt/invalid?reason=invalid_session`.

Root causes:

- Proxy guard was moved to `/tilt`, while secure cookie persistence could be delayed/missing in local/dev flows.
- Guard then failed before form render.

Fixes:

- Reverted proxy lottery guard matcher away from `/tilt` (kept proxy for legacy guarded paths).
- Added dedicated session gate endpoint `GET /api/tilt/session-state`.
- Added client-side session gate in `src/app/tilt/page.tsx` that:
  - validates session before rendering form,
  - redirects to reasoned invalid page for invalid/already-submitted sessions,
  - reuses one-hop `sid` fallback and reissues `lsid` when needed.
- Added `runtime = "nodejs"` to `src/app/api/tilt/session-check/route.ts` for consistent DB access.

### 8) Invalid page + UI alignment + plaintext phone requirement

Changes:

- Added dedicated invalid page at `src/app/tilt/invalid/page.tsx` with reason-based copy (`missing_token`, `not_found`, `expired`, `already_used`, `invalid_session`, `already_submitted`, `server_error`).
- Updated invalid page styling to match Tilt visual language (dark green base, lime accents, red warning seam).
- Updated redeem loading screen in `src/app/tilt/redeem/page.tsx` to Tilt-themed spinner screen.
- Added plaintext phone persistence:
  - schema column `lottery_entries.phone_plain`,
  - register insert writes normalized plaintext phone,
  - migration added: `drizzle/0014_add_phone_plain_to_lottery_entries.sql`.

---

### 9) QR status tracking + outlet stats + signup changes (2026-06-18)

#### QR status endpoint
- New: `GET /api/tilt/qr/status?token=<token>` — outlet-authenticated, read-only single-token lookup.
- Returns `{ status: "active" }`, `{ status: "used" }`, or `{ status: "expired" }`.
- Status derived from `qr_tokens.usedAt` (null → not scanned) and `expiresAt` (compared to server time).
- Used by the outlet QR page to show a solid dark gray overlay with "USED" / "EXPIRED" text when the token is no longer valid, making the QR unscannable on screen.

#### Outlet stats endpoint
- New: `GET /api/tilt/outlet/stats` — outlet-authenticated, returns `{ scans, submissions }`.
- **Scans**: count of `qr_tokens` where `outletId = <current outlet>` AND `usedAt IS NOT NULL`.
- **Submissions**: count of `qr_tokens` joined to `lottery_sessions` where `outletId = <current outlet>` AND `submittedAt IS NOT NULL`.
- Pure read-only `SELECT COUNT` queries — no writes, no impact on redeem security.

#### Schema: address on tilt_users
- Added `address: text("address")` to `tiltUsersTable` in `src/db/tilt-schema.ts`.
- Nullable — existing users remain valid without a stored address.
- Migration pushed via `drizzle-kit push --config=drizzle-tiltyoutmusic.config.ts`.

#### /api/tilt/me now queries DB directly
- Previously returned user fields directly from JWT payload.
- Now queries `tiltUsersTable` for the full user record (`id`, `name`, `email`, `role`, `address`).
- Always returns the latest address (and any future fields) for every user — no re-login required.

#### Signup: business name + address
- Signup form changed: "Full Name" → "Business Name", placeholder "Your business name".
- New Address textarea field in signup form.
- Signup API accepts `address` and stores it in `tiltUsersTable.address`.
- Address included in JWT payload on signup (for consistency; `/api/tilt/me` is the source of truth).

#### Outlet overview: registration card replaced
- Registration card (which pulled from `tiltRegistrationsTable`) removed.
- Replaced with a **Business** profile card showing `name`, `email`, `address` from `tiltUsersTable`.
- "Edit Registration" and "Complete Registration" links removed.
- Outlet stats cards (Scans / Submissions) placed above the profile card.

#### Admin overview
- No changes needed — admin table already had no edit registration button.

---

---

### 10) Campaign date UX improvements (2026-06-18)

- **Duration preview**: live text below end datetime field shows `Duration: 2d 4h` (green) or `End must be after start` (red), computed reactively from start/end values.
- **Quick-end presets**: 6 pill buttons below end field: `+1h`, `+2h`, `+4h`, `+1d`, `+1w`, `+1mo`. Each sets the end datetime relative to start with one click. Disabled until start is set.
- **Grid alignment fix**: form changed from `items-end` to `items-start` so field columns align at their top; submit button row gets `self-end`.
- File: `src/app/tilt/admin/campaigns/page.tsx` only — no schema or API changes.

---

### 11) Invite-only signup system (2026-06-18)

#### New schema
- Added `invited_outlets` table to `src/db/tilt-schema.ts`:
  - `id` (serial PK), `email` (varchar, unique), `createdAt` (timestamp).
- Migration pushed via `drizzle-kit push --config=drizzle-tiltyoutmusic.config.ts`.

#### Signup API gate
- `POST /api/tilt/signup` now checks `invited_outlets` table for the email before proceeding.
- Uninvited emails receive `403 "This email has not been invited yet."`.
- On successful signup, the invite row is deleted (one-time use).
- No JWT issued on signup — user must log in separately (redirect changed to `/tilt/login`).

#### Admin users API overhaul
- `GET /api/tilt/admin/users`:
  - Three queries merged in JS: outlet users, scan counts per `outletId` (`qr_tokens`), submission counts per `outletId` (`lottery_entries` → `lottery_sessions` → `qr_tokens`).
  - Also fetches `invited_outlets` to show pending invites.
  - Returns merged array with `status: "active" | "invited"`, `scanCount`, `submissionCount`.
  - No more `tiltRegistrationsTable` join.
- `POST /api/tilt/admin/users` — accepts `{ email }`, creates invite. Checks for duplicate invites and existing accounts.

#### Admin page redesign
- Invite form at top: email input + "Invite" button.
- Stats: Total / Active / Invited counts (instead of Total / Registered / Pending).
- Table columns: Outlet, Email, Address, Scans, Submissions, Status, Joined.
- Status badges: "Active" (green dot) / "Invited" (amber dot).
- Empty state: "Invite an outlet above to get started."

#### Files
- `src/db/tilt-schema.ts` — new table
- `src/app/api/tilt/signup/route.ts` — invite gate
- `src/app/api/tilt/admin/users/route.ts` — GET overhaul + POST
- `src/app/tilt/admin/page.tsx` — redesign
- `src/app/tilt/signup/page.tsx` — redirect change

---

### 12) Session expiry enforcement on register (2026-06-18)

- Added server-side 30-minute expiry check to `POST /api/tilt/register`.
- Mirrors the existing check in `GET /api/tilt/session-state` but enforces it server-side even if client-side validation is bypassed.
- A session older than 30 minutes without a submission is rejected with `SESSION_EXPIRED`.
- Added `SESSION_EXPIRED` → "Your session has expired. Please scan the QR again." in the client error map.
- Files: `src/app/api/tilt/register/route.ts`, `src/app/tilt/page.tsx`.

---

### 13) Responsive dashboards (2026-06-18)

#### Sidebar collapse (both layouts)
- Added `sidebarOpen` state + hamburger button (visible only on mobile).
- On mobile (`< md`): sidebar becomes a fixed overlay with dark backdrop, slides in/out via `translate-x` transition.
- On `md+`: sidebar stays as side-by-side layout.
- All nav links close sidebar on click.
- Main content gets `min-w-0` (prevents overflow), responsive padding (`px-4 md:px-8`).
- Sticky top bar with hamburger + brand name on mobile.
- Files: `src/app/tilt/admin/layout.tsx`, `src/app/tilt/outlet/layout.tsx`.

#### Page-level responsive fixes
- **Admin page**: stat row `flex` → `grid grid-cols-1 sm:grid-cols-3`; invite form `flex` → `flex flex-col sm:flex-row`; table wrapper `overflow-x-auto` with `minWidth: 700px`.
- **Outlet page**: stat row `flex` → `grid grid-cols-1 sm:grid-cols-2`.
- **Campaigns page**: table wrapper `overflow-x-auto` with `minWidth: 650px`.
- **QR page**: already responsive — no changes needed.

#### Scan count discrepancy fix
- Admin scan count now filters by `isNotNull(qrTokensTable.usedAt)` to match the outlet's definition of "scans" (only actually scanned tokens, not total generated).
- File: `src/app/api/tilt/admin/users/route.ts`.

---

### 14) Brand consistency pass (2026-06-18)

- `~` replaced with `T` in loading screen green badge and lottery form badge.
- All standalone `tilt` headings replaced with `Tilt Your Music` (login, signup, lottery form pages).
- All `document.title` values changed from `Tiltyourmusic` to `Tilt Your Music`.
- Admin sidebar brand changed from "Tilt Admin" to "Tilt Your Music" with subtitle "Superadmin".
- Mobile header brand changed to "Tilt Your Music" (both admin and outlet layouts).
- Metadata description changed from `"Tiltyourmusic event registration portal"` to `"Tilt Your Music event registration portal"`.
- Loading screen subtext changed from `"Tiltyourmusic · Events"` to `"Tilt Your Music"`.
- Loading screen letter reveal animation kept as `"TILT"` (stylistic, not a heading).

---

### 15) Campaign entries page + admin user management (2026-06-18)

#### Campaign entries API & page
- New API `GET /api/tilt/admin/campaigns/[id]/entries` returns all lottery entries for a campaign with outlet name joined through `lottery_sessions` → `qr_tokens` → `tilt_users`.
- Entries are ordered ascending by `createdAt` (oldest first).
- New page at `src/app/tilt/admin/campaigns/[id]` with:
  - Back link to campaigns list
  - Campaign name + entry count header
  - Table columns: `#` (1-based index), Name, Email, Phone, Outlet, Flagged, Submitted
  - Flagged rows highlighted with red tint background
- Campaigns list updated: `entryCount` added to GET response via `LEFT JOIN + COUNT + GROUP BY` on `lottery_entries`. Displays as a numeric column with "View" link per row.

#### Admin user management
- `GET /api/tilt/admin/users` now returns `totalSubmissions` alongside `users` array.
- `DELETE /api/tilt/admin/users` accepts `{ type: "invite", id }` or `{ type: "user", id }` to revoke an invite or permanently remove an outlet account.
- Admin page (`src/app/tilt/admin/page.tsx`):
  - Added **Submissions** stat card (4th card; grid changed to `sm:grid-cols-4`).
  - Added **Revoke** button on invited rows, **Remove** button on active rows.
  - Confirmation dialog before delete (modal overlay with cancel/confirm).
  - Table `minWidth` increased to `800px` to accommodate Actions column.

## Notes
