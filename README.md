# Dr. Bharathi P Appointment Portal

MERN monorepo for the approved appointment-request portal. It intentionally starts with no real credentials, no production data, and no consultation-hour seed data.

## Applications

- `client/`: React, Vite, and TypeScript public site plus future `/admin/*` dashboard.
- `server/`: Express, TypeScript, MongoDB/Mongoose API.

## Local setup

1. Copy `server/.env.example` to `server/.env` and replace every placeholder with development-only values.
2. Copy `client/.env.example` to `client/.env`.
3. Start both applications with `pnpm dev`.

The API health check will be available at `http://localhost:4000/api/health` after MongoDB is configured and connected.

## Safety notes

- Never place secrets in `client/.env`; Vite exposes all `VITE_*` variables to the browser.
- The production deployment must use `www.<custom-domain>` and `api.<custom-domain>` under the same domain to preserve the approved `SameSite=Strict` session-cookie design.
- Future schedule seed data must use `scheduleIsDemoData: true` until Dr. Bharathi has entered verified consultation hours in the admin dashboard.
