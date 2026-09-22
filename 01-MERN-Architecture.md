# MERN Architecture

The product requirements, SRS, wireframes, appointment state machine, availability rules, and security requirements from the earlier design are unchanged. This document replaces only the technical implementation: Next.js/Prisma/PostgreSQL → React/Vite + Express + MongoDB.

## 1. System diagram

```
                    Patient / Doctor Browser
                              |
                              v
                 React + Vite frontend (client/)
                    - Public site
                    - Appointment wizard
                    - Admin dashboard (same app, route-gated)
                              |
                         HTTPS REST API
                              |
                              v
                 Express + TypeScript backend (server/)
                    - Routes → Controllers → Services → Models
                              |
              ┌───────────────┼────────────────┐
              v                v                v
        MongoDB Atlas    Auth Service    Notification Service
        (Mongoose)      (sessions)              |
                                                 v
                                              Email (Resend/Brevo)
```

Both the public site and the admin dashboard ship as **one** React SPA (Vite), split by route (`/admin/*` vs everything else) and by an `AdminRoute` guard component that checks session state before rendering — same pattern as the Next.js version's middleware, just enforced client-side *and* re-enforced server-side on every API call (never trust the client-side guard alone).

## 2. Why a separate client/server instead of Next.js's единое app

Next.js let the API routes and pages live in one deployable. MERN splits this by convention: `client/` is a static SPA build served by Vercel; `server/` is a long-running Express process on Render. This is a **materially different deployment shape** (static CDN + separate API host, vs one Next.js server), which is why the folder structure and deployment plan both look different from before — not an oversight, but the natural consequence of the stack swap.

### Domain architecture — required for the chosen cookie strategy

`SameSite=Strict` only works the way Section 3 relies on it if the frontend and backend are **subdomains of the same parent domain**. A browser treats `www.example.com` and `example.vercel.app`/`example.onrender.com` as entirely unrelated sites, and `SameSite=Strict` cookies are not sent on cross-site requests at all — the admin dashboard would simply fail to authenticate.

Production must therefore use:

```
www.<custom-domain>   → Vercel  (frontend)
api.<custom-domain>   → Render  (backend)
```

both under one registered domain, with the session cookie's `Domain` attribute left unset (defaults to the exact host) or explicitly scoped to `.{custom-domain}` if the frontend ever needs to read a non-httpOnly companion cookie — but not required for the httpOnly session cookie itself, since only the API needs to read it and the frontend always calls `api.<custom-domain>` directly.

This is a hosting decision to make *before* buying/configuring DNS, not something to patch around later — weakening `SameSite=Strict` to `SameSite=None` to accommodate mismatched hosting domains would reopen the CSRF surface that `Strict` exists to close, for no real benefit, so that path is intentionally not taken. See the Deployment Plan for the DNS/CNAME setup.

Local development is unaffected: `localhost:5173` → `localhost:4000` are both `localhost` (different ports, same site for cookie purposes in modern browsers), so `SameSite=Strict` works locally without any special-casing.

## 3. Authentication approach — decided before implementation, as requested

**Chosen approach: server-side sessions, stored in MongoDB via `connect-mongo`, delivered to the browser as an `httpOnly`, `secure`, `sameSite=strict` cookie.**

Why this over a JWT-in-localStorage approach:
- **JWT in localStorage is explicitly disallowed** in the requirements, and for good reason — any XSS on the site (e.g. a compromised npm package, a reflected script) can read `localStorage` and exfiltrate the token. An `httpOnly` cookie cannot be read by JavaScript at all, so it isn't a target for that class of attack.
- There is exactly one admin account for the MVP (Dr. Bharathi.P), possibly a small number of staff logins later (Section 36 future). Session storage doesn't need to scale to thousands of concurrent users, so the usual argument for stateless JWTs (avoiding a session store) doesn't buy much here, while losing the ability to instantly revoke a session does cost something — if a laptop is lost, revoking a session means deleting one row from the session collection; revoking a JWT requires a denylist anyway, which reintroduces server-side state through the back door.
- `connect-mongo` reuses the same MongoDB Atlas cluster already in the stack — no new infrastructure (e.g. Redis) to run or pay for.

Why not JWT-in-httpOnly-cookie instead (the other secure option): it's a reasonable alternative, but it adds refresh-token rotation complexity for a benefit (statelessness) that doesn't matter at this scale. Sessions are the simpler correct choice here; note it for later if the admin side ever needs to scale to many concurrent staff logins across services.

**CSRF**: because auth now rides on a cookie (unlike a manually-attached `Authorization: Bearer` header), state-changing requests (`POST`/`PATCH`/`DELETE`) need CSRF protection. Approach: `sameSite=strict` on the session cookie handles most cross-site cases by itself; layered on top, use the double-submit-token pattern (`csrf-csrf` npm package or equivalent) for admin-mutating routes as defense in depth, since `sameSite=strict` alone has had browser-support edge cases historically.

**Password storage**: `argon2` (preferred) or `bcrypt` for hashing `AdminUser.passwordHash`. Never store or log plaintext.

**Login flow**:
```
1. POST /api/admin/auth/login { email, password }
2. Server verifies credentials, creates a session document in MongoDB
3. Server sets Set-Cookie: sid=<session-id>; HttpOnly; Secure; SameSite=Strict
4. Client stores nothing manually — the browser holds the cookie
5. Every subsequent request automatically includes the cookie (credentials: 'include' on fetch)
6. Server middleware (requireAuth) loads the session on each admin request
7. POST /api/admin/auth/logout destroys the session server-side
```

Rate limiting on the login route (e.g. 5 attempts / 15 min per IP via `express-rate-limit`) to blunt brute force, per the original security requirements.

## 4. Request lifecycle (typical admin action)

```
Browser → fetch('/api/admin/appointments/:id/accept', {credentials:'include'})
   → Express: cors middleware (origin allow-list) 
   → session middleware (loads session from Mongo)
   → requireAuth middleware (401 if no valid session)
   → csrf middleware (403 if token mismatch)
   → zod validation middleware (400 if payload invalid)
   → controller → service (business logic: re-check availability, transition state)
   → Mongoose model (MongoDB write, inside a transaction where needed)
   → response
```

## 5. Notification service

Unchanged in shape from the original design — an interface (`NotificationService.send(type, appointment)`) with an `EmailProvider` implementation for the MVP, so SMS/WhatsApp providers can be added later without touching appointment logic. Every send is logged to a `Notification` collection before attempting delivery.
