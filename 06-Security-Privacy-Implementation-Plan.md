# Security & Privacy Implementation Plan

Same requirements as the original SRS (Sections 39, 40, 41), mapped to specific MERN-stack tooling.

## Transport & headers

- HTTPS everywhere — Vercel and Render both provide this by default; never allow plain HTTP in production.
- `helmet` middleware on Express for standard security headers (HSTS, X-Content-Type-Options, etc.).
- CORS locked to `CLIENT_ORIGIN` only — no wildcard `*` origin, since credentials (cookies) are involved.
- Production `CLIENT_ORIGIN` must be `www.<custom-domain>`, with the API on `api.<custom-domain>` of the *same* domain (see Deployment Plan) — not the platforms' default `vercel.app`/`onrender.com` hosts. This isn't just a CORS nicety: the `SameSite=Strict` session cookie chosen in the Architecture doc depends on frontend and backend being same-site, and correcting this was the reason this document was revised.
- Because the cookie stays `SameSite=Strict` (same-site domains make this possible without compromise), there is no need to weaken it to `SameSite=None` to accommodate hosting — that weaker setting is intentionally avoided since it would reopen cross-site request risk for no real benefit here.

## Authentication & session

- Passwords hashed with `argon2` (or `bcrypt` if argon2 native bindings are a deployment hassle on Render's free tier — verify at setup time).
- Sessions in MongoDB via `connect-mongo`, cookie flags `httpOnly; secure; sameSite=strict`.
- CSRF double-submit token on all state-changing admin routes.
- Login rate-limited via `express-rate-limit` (per-IP and per-email).
- No JWTs in `localStorage` or `sessionStorage`, per the explicit requirement.

## Input validation & injection protection

- Every request body validated server-side with Zod, independent of whatever the client already checked (Rule 4 from the original SRS carries over unchanged).
- `express-mongo-sanitize` to strip any `$`/`.`-prefixed keys from user input before it reaches Mongoose queries — this is the MongoDB-specific equivalent of SQL-injection protection (NoSQL injection via operator injection, e.g. `{ "$gt": "" }` in a login field).
- Mongoose schemas themselves add a layer of type-casting that rejects most malformed input by default.

## Data minimization & exposure control

- Patient-facing API responses never include `doctorNotes`, `AuditLog` entries, or another patient's data.
- The public status-lookup endpoint is `POST /appointments/status` with `{ referenceNumber, phone }` in the request body — not a `GET` with the phone number as a query parameter, so it never ends up in the URL, browser history, proxy logs, or server access logs. It requires **both** the reference number and the phone number on file — a reference number alone isn't enough to pull up someone's appointment, since reference numbers could plausibly be guessed or shared. The response returns only status, dates/times, and location name — see the exact shape in the API Specification doc; medical history, `doctorNotes`, and audit data are never included.
- Medical history fields are never included in email notification bodies (Section 39 of the original SRS) — notifications reference the appointment only by date/time/location/reference number.
- `AuditLog.metadata` is a schema-enforced free-form field, but the code that writes to it must never include medical history or full patient records — only IDs and status transitions.

## Access control

- Admin routes gated by `requireAuth` middleware, never by an obscure URL path.
- Every admin action that touches an appointment writes an `AuditLog` entry (who, what, when) — satisfies the same audit requirement as the original design.
- No patient login/account exists in the MVP, so there's no patient session to accidentally leak another patient's data through — reduces the attack surface considerably for v1.

## Secrets

- All secrets live in Render's/Vercel's environment variable dashboards, never in the repository.
- `.env.example` files committed with placeholders only.
- Different secrets for staging vs. production.

## Privacy compliance (India — DPDP Act, 2023)

- Same posture as before: this plan does not constitute legal review. Before production launch, have the Privacy Policy, Terms of Use, consent language, and data retention policy reviewed against DPDP Act obligations (lawful purpose, consent, data minimization, breach notification duties) — implementing HTTPS and hashed passwords is necessary but not sufficient for legal compliance.
- Consent checkbox on the appointment form, exact wording pending legal review (unchanged from the original SRS, Section 42).
- Data retention: decide and document how long patient/appointment records are kept once inactive, and implement a deletion or anonymization job accordingly — not yet specified in the SRS, worth raising with Dr. Bharathi before launch.
