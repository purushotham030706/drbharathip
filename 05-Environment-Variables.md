# Environment Variables

## server/.env (never committed — provide server/.env.example without real values)

```
# Database
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/doctor-appointment

# Session
SESSION_SECRET=<long random string>          # signs the session-id cookie
SESSION_COOKIE_NAME=sid

# CSRF
CSRF_SECRET=<long random string>

# Server
PORT=4000
NODE_ENV=production
CLIENT_ORIGIN=https://www.drbharathi.example   # must be a subdomain of the SAME custom domain as
                                                # the API (see Deployment Plan) — SameSite=Strict
                                                # cookies won't work across unrelated domains like
                                                # a vercel.app frontend + onrender.com backend

# Email (provider example: Resend)
EMAIL_PROVIDER=resend
EMAIL_API_KEY=<key>
EMAIL_FROM="Dr. Bharathi.P Clinic <no-reply@drbharathi.example>"

# Rate limiting (optional, if using a hosted store instead of in-memory)
RATE_LIMIT_WINDOW_MINUTES=15
RATE_LIMIT_MAX_ATTEMPTS=5
```

## client/.env (Vite — only variables prefixed `VITE_` are exposed to the browser bundle; treat everything here as public)

```
VITE_API_BASE_URL=https://api.drbharathi.example/api   # same custom domain as the frontend, different subdomain
```

Nothing else belongs in the client env — no API keys, no secrets. Anything the browser needs that's sensitive (e.g. talking to the email provider) must go through the server instead.

## Rules

- `server/.env.example` is committed with placeholder values and a comment per variable; `server/.env` is gitignored.
- Never commit `MONGODB_URI` with real credentials, even to a private repo — rotate immediately if it happens.
- `SESSION_SECRET` and `CSRF_SECRET` should be generated with something like `openssl rand -base64 48`, not typed by hand.
- Production and staging (if you set one up on Render/Vercel) should use different `MONGODB_URI` values pointing at different databases, so testing never touches real patient data.
