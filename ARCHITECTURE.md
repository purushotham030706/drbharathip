# Architecture — Dr. Bharathi.P Appointment Portal

## 1. High-level system diagram

```
                          PATIENT (mobile browser)
                                   |
                                   v
                        ┌─────────────────────┐
                        │   Public Website     │  Next.js pages (SSR/static)
                        │  Home / About / ...  │
                        └──────────┬───────────┘
                                   |
                        ┌─────────────────────┐
                        │  Appointment Wizard   │  Client component (React state)
                        │ (multi-step, Sec 27) │
                        └──────────┬───────────┘
                                   |
                                   v
                        ┌─────────────────────┐
                        │     API Routes        │  /app/api/**
                        │  (Zod-validated)      │
                        └──────────┬───────────┘
                     ┌─────────────┼─────────────┐
                     v             v             v
              ┌───────────┐ ┌───────────┐ ┌────────────┐
              │  Prisma    │ │Notification│ │   Auth      │
              │  (Postgres)│ │  Service   │ │ (sessions)  │
              └───────────┘ └───────────┘ └────────────┘
                                   |
                                   v
                        ┌─────────────────────┐
                        │   Admin Dashboard     │  auth-gated, /admin/**
                        │ (Doctor: accept/     │
                        │  reject/reschedule)  │
                        └─────────────────────┘
```

Two front-of-house surfaces (public site, appointment wizard) and one back-of-house surface (admin) share the same Next.js app but are treated as visually and functionally distinct products (Rule 9) — the admin routes are simply gated behind auth middleware, not a separate deployable, to keep the MVP simple.

## 2. Stack decisions

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind | SSR for public/SEO pages, client components for the wizard and dashboard, one deployable |
| Backend | Next.js API routes / server actions (Option A, Sec 35) | No separate service to run/deploy for an MVP at this scale; can be split out later if load requires it |
| Database | PostgreSQL via Prisma | Relational model fits the schedule/appointment domain well; Prisma gives type-safe queries and migrations |
| Validation | Zod | Shared schemas importable by both client forms and API routes — one source of truth (Sec 58) |
| Auth | Auth.js (NextAuth) credentials provider, session-based, hashed passwords (bcrypt/argon2) | Doctor-only login for MVP; leaves room for 2FA/passkeys later (Sec 36) |
| Hosting | Vercel + managed Postgres (Neon/Supabase/RDS) | Matches Sec 73; zero-ops for a student-run production deploy |
| Notifications | Email (Resend/Nodemailer) behind a `NotificationService` interface | Swappable channel later without touching appointment logic (Sec 53) |

## 3. Folder structure

```
doctor-appointment/
├── app/
│   ├── page.tsx                    # Homepage
│   ├── about/page.tsx
│   ├── services/page.tsx
│   ├── hospitals/page.tsx
│   ├── appointment/page.tsx        # wizard shell (client component)
│   ├── appointment/[ref]/page.tsx  # status lookup by reference number
│   ├── contact/page.tsx
│   ├── privacy/page.tsx
│   ├── terms/page.tsx
│   │
│   ├── admin/
│   │   ├── login/page.tsx
│   │   ├── page.tsx                 # dashboard home (Sec 14)
│   │   ├── appointments/page.tsx    # table (Sec 15)
│   │   ├── appointments/[id]/page.tsx # detail + accept/reject/reschedule (Sec 15-18)
│   │   ├── patients/page.tsx
│   │   ├── patients/[id]/page.tsx
│   │   ├── calendar/page.tsx        # day/week/month (Sec 48)
│   │   ├── schedules/page.tsx       # weekly template + exceptions (Sec 6, 49, 50)
│   │   ├── content/page.tsx         # bio, services, locations (Sec 47)
│   │   └── settings/page.tsx
│   │
│   └── api/
│       ├── appointments/route.ts          # POST create, GET list (admin)
│       ├── appointments/[id]/route.ts     # GET detail, PATCH status
│       ├── availability/route.ts          # GET slots for location+date
│       ├── patients/route.ts
│       ├── patients/[id]/route.ts
│       ├── schedules/route.ts
│       ├── locations/route.ts
│       └── auth/[...nextauth]/route.ts
│
├── components/
│   ├── ui/                # design-system primitives (buttons, inputs, badges, modals)
│   ├── navbar/ footer/
│   ├── appointment/        # AppointmentStepper, LocationSelector, DatePicker, TimeSlotPicker,
│   │                       # PatientForm, MedicalHistoryForm, AppointmentReview, AppointmentSuccess
│   └── admin/              # AdminSidebar, AppointmentTable, AppointmentCard, Calendar, ScheduleEditor
│
├── lib/
│   ├── db/                 # prisma client singleton
│   ├── auth/                # session helpers, middleware
│   ├── availability/        # slot-generation + conflict-checking logic (Sec 44-46)
│   ├── notifications/       # NotificationService + email templates (Sec 54)
│   └── validation/           # Zod schemas shared by forms and API routes
│
├── prisma/
│   └── schema.prisma
│
├── middleware.ts            # protects /admin/* (Sec 55)
├── types/
├── tests/
├── .env.example
└── package.json
```

## 4. Availability & conflict logic (Sections 44-46)

`GET /api/availability?location=<id>&date=<date>` computes slots as:

```
weeklySchedule(location, dayOfWeek)
  minus  scheduleExceptions(location, date)      # BLOCKED removes the day/window entirely
  minus  confirmedAppointments(location, date)   # already-taken slots
  [optionally] minus pendingRequestCount over a soft cap, if the doctor wants to
               cap how many *requests* can pile up on one slot before it's hidden
→ list of "HH:mm" strings at `slotMinutes` granularity
```

This is a **read-time calculation, not a stored table** — there's no `AvailableSlot` model. It's derived every time from `Schedule` + `ScheduleException` + confirmed `Appointment` rows, which is what keeps "doctor changes her schedule" from silently corrupting old data (Section 69 edge case: existing confirmed appointments must not change retroactively — because they're stored as their own rows, not as pointers into the weekly template).

**Double-booking protection (Section 46)** happens at accept-time, not request-time:
1. Frontend/availability endpoint is advisory only — never trusted for confirmation.
2. On `PATCH /api/appointments/:id` with `status: CONFIRMED`, the backend re-runs the same availability check inside a DB transaction.
3. A partial unique index (see the comment in `schema.prisma`) on `(locationId, confirmedDate, confirmedTime) WHERE status = 'CONFIRMED'` gives a hard backstop against race conditions even if two accepts land concurrently — the second write fails at the DB level and the API returns a "slot just got taken, please reschedule" error rather than a 500.

## 5. Appointment state machine (Section 13)

Enforced in one place — `lib/appointments/transitions.ts` — as an explicit allow-list, not inferred from UI state:

```
REQUESTED            → UNDER_REVIEW, REJECTED, RESCHEDULE_REQUESTED, CONFIRMED
UNDER_REVIEW         → CONFIRMED, REJECTED, RESCHEDULE_REQUESTED
RESCHEDULE_REQUESTED → REQUESTED (patient accepts new time), CANCELLED
CONFIRMED            → CANCELLED, COMPLETED, NO_SHOW
REJECTED, CANCELLED, COMPLETED, NO_SHOW  → (terminal)
```

The API rejects any PATCH that isn't in this table, independent of whatever the admin UI happens to send — this is what "never trust client-side validation" (Rule 4) means for a state machine specifically.

## 6. Notification architecture (Section 53)

```
Appointment Service  →  NotificationService.send(type, appointment)
                              │
                     (channel resolved by config, not by caller)
                              │
                          EmailProvider   (MVP)
                          SmsProvider     (V3, same interface)
                          WhatsAppProvider(V3, same interface)
```

Every send is written to the `Notification` table first (`status: PENDING`), then attempted; success/failure updates the row. This gives the admin dashboard a debuggable log ("did the patient actually get notified?") without needing the email provider's own dashboard.

## 7. Security checklist mapped to implementation (Section 39, 55)

- `middleware.ts` gates `/admin/*` and `/api/**` admin-only routes by checking the session — never by obscuring the URL.
- All patient-facing API routes are rate-limited (e.g. Upstash/Redis token bucket) to blunt scripted spam of the request endpoint.
- Zod schemas run server-side regardless of what the client already validated.
- `doctorNotes` and `MedicalHistory` fields are never included in any notification payload or logged in `AuditLog.metadata`.
- Patient records (`GET /api/patients/:id`) require an authenticated admin session; there is no patient login in the MVP, so there's no "logged-in patient" identity to leak data to in the first place.

## 8. Deployment pipeline (Section 73)

```
GitHub → Vercel (preview deploys per PR) → staging → production
                                              │
                                     managed Postgres (Neon/RDS)
                                     with automated backups
```

Staging must run the full patient + doctor flow end-to-end before any production promotion (Section 68 test list), especially the accept/reject/reschedule paths and the double-booking guard.
