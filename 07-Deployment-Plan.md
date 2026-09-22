# Deployment Plan

## Hosting choices (free/low-cost, as requested)

| Component | Choice | Free-tier notes |
|---|---|---|
| Frontend | Vercel | Static Vite build; generous free tier for a low-traffic single-practice site |
| Backend | Render (Web Service) | Free tier sleeps after inactivity — first request after idle will be slow (10-30s cold start). Acceptable for an MVP; worth a small paid instance ($7/mo tier) once the site goes live for real patients, since a slow first request on a medical booking site looks broken to a nervous patient |
| Database | MongoDB Atlas free tier (M0) | 512MB storage — comfortably enough for years of a single-doctor practice's appointment volume |
| Email | Resend or Brevo free tier | Both offer enough free monthly sends for this volume; Resend has a cleaner API, Brevo's free tier is more generous on volume — either is fine, pick based on API ergonomics when you get there |
| Source control / CI | GitHub + GitHub Actions (or Vercel/Render's built-in Git integration) | Push-to-deploy on `main`, preview deploys on PRs |

## Deployment architecture

```
GitHub repo
   │
   ├── client/ → Vercel  → www.<custom-domain>   (auto-deploy on push to main, preview per PR)
   │
   └── server/ → Render  → api.<custom-domain>   (auto-deploy on push to main)
                     │
                     ├── MongoDB Atlas (M0 cluster)
                     └── Email provider (Resend/Brevo API)
```

Vercel and Render are separate services with separate deploy triggers — a monorepo with two subfolders is fine; both platforms support "root directory" configuration to point at `client/` or `server/` respectively without needing separate repos.

**Both must sit on subdomains of the same registered custom domain — not the default `*.vercel.app`/`*.onrender.com` hosts.** This is a correction to the original plan: the `SameSite=Strict` session cookie (Architecture doc, Section 3) only travels between same-site requests, and Vercel/Render's default domains are unrelated sites to the browser. Preview deploys on random `*.vercel.app` URLs are fine to keep as-is for frontend-only preview review, but they simply won't be able to authenticate against the production API — that's expected and fine, since preview deploys aren't where admin login testing happens anyway.

### DNS setup (one-time)

1. Register or use an existing custom domain, e.g. `drbharathi.example`.
2. In Vercel: add `www.drbharathi.example` (and optionally the bare apex `drbharathi.example`, redirecting to `www`) as a custom domain on the client project; Vercel provides the CNAME/A record values to add at your DNS provider.
3. In Render: add `api.drbharathi.example` as a custom domain on the server web service; Render provides its own CNAME target.
4. Add both DNS records at your registrar/DNS host. Propagation can take anywhere from minutes to ~24 hours — start this well before a planned launch date, not the day of.
5. Update `CLIENT_ORIGIN` (server env) and `VITE_API_BASE_URL` (client env) to the real subdomains once DNS is live, and redeploy both.
6. Verify in a real browser (not just curl) that the admin login sets a cookie and that subsequent authenticated requests succeed — cookie/`SameSite` issues are the one class of bug that curl won't reliably catch, since curl doesn't enforce the same cross-site cookie rules a browser does.

## Environment separation

- **Local**: `.env` files, local or Atlas dev cluster (a free M0 cluster can double as dev if you're careful not to mix with production data — better to spin up a second free M0 cluster for dev if you stay under Atlas's per-account free-tier limits).
- **Staging** (optional but recommended before the doctor starts using it for real patients): separate Render service + separate Atlas database, same codebase.
- **Production**: real domain, real Atlas cluster, real email sender identity (verified domain, not a free email provider's shared domain, to avoid notifications landing in spam).

## Local development setup

```bash
# 1. Clone and install
git clone <repo-url>
cd doctor-appointment
cd server && npm install && cd ../client && npm install

# 2. Environment
cp server/.env.example server/.env   # fill in a dev MongoDB URI, session secret, etc.
cp client/.env.example client/.env   # VITE_API_BASE_URL=http://localhost:4000/api

# 3. Run both (two terminals, or a root-level concurrently script)
cd server && npm run dev     # ts-node-dev / nodemon on :4000
cd client && npm run dev     # Vite dev server on :5173, proxying /api to :4000

# 4. Seed data (recommended before building UI against real data)
cd server && npm run seed    # creates one AdminUser, both practice locations with real
                              # addresses (Nirmala Hospital, Mysuru; JSS Hospital,
                              # Chamarajanagar), and a PLACEHOLDER weekly schedule
                              # (scheduleIsDemoData: true) so the wizard/availability
                              # logic has something to render — NOT Dr. Bharathi's real
                              # consultation hours. Real hours must be entered through the
                              # admin schedule editor before production launch.
```

A `vite.config.ts` dev-server proxy (`/api` → `http://localhost:4000`) avoids CORS friction during local development, separate from the production CORS allow-list configuration on the Express side.

## Domain & email deliverability

Before launch, verify a real domain with the email provider (SPF/DKIM records) rather than sending from a free-tier shared domain — appointment confirmations landing in spam defeats the purpose of the notification system. This is a DNS task on whatever domain the practice ends up using, worth doing early since DNS propagation can take a day.

## Pre-launch checklist (partial — expand as other docs identify more items)

- [ ] Both practice locations have real consultation hours entered via the admin schedule editor (`scheduleIsDemoData` is `false` for both) — never launch with seeded placeholder times still live.
- [ ] `www.<custom-domain>` and `api.<custom-domain>` are both live, and a real-browser login test confirms the session cookie is set and honored.
- [ ] Email sender domain is verified (SPF/DKIM) so confirmations don't land in spam.
- [ ] Production and any staging environment use separate MongoDB Atlas databases.

## Rollback plan

Both Vercel and Render keep previous deploys reachable — a bad deploy can be rolled back from either dashboard in under a minute without a new git push. Worth knowing this exists before the first real production incident, not discovering it during one.
