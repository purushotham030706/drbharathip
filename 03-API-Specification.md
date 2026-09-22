# API Specification

Base URL: `/api`. All request/response bodies are JSON. All admin routes require a valid session cookie (`requireAuth` middleware) plus CSRF token on mutations.

## Public (patient-facing, no auth)

| Method | Path | Purpose |
|---|---|---|
| GET | `/doctor` | Doctor profile (name, qualifications, bio, specializations) |
| GET | `/locations` | Active practice locations |
| GET | `/services` | Active services list |
| GET | `/availability?locationId=&date=` | Requestable time slots for a location/date |
| POST | `/appointments` | Create an appointment request. Body: `{ patient: {...}, locationId, requestedDate, requestedTime, reason, reasonDetail?, medicalHistory? }`. Returns `{ referenceNumber, status: 'REQUESTED' }` |
| POST | `/appointments/status` | Patient looks up their own request status. Body: `{ referenceNumber, phone }` — a `POST` with the phone number in the body, not a `GET` with it in the query string, so it never lands in the URL, browser history, proxy logs, or server access logs. See response shape below. |

### `POST /appointments/status` — response shape

Deliberately minimal — this is a status check, not a patient portal. The response must never include medical history, `doctorNotes`, audit data, or any field not needed to answer "what's happening with my appointment":

```json
{
  "referenceNumber": "BRH-2026-001284",
  "status": "CONFIRMED",
  "location": { "name": "Nirmala Multi Specialty Hospital" },
  "requestedDate": "2026-09-12",
  "requestedTime": "10:30",
  "confirmedDate": "2026-09-12",
  "confirmedTime": "10:30",
  "patientNotes": "Doctor has asked you to bring your previous ultrasound report."
}
```

`confirmedDate`/`confirmedTime` are `null` while still `REQUESTED`/`UNDER_REVIEW`. `patientNotes` is included only if the doctor has actually written one for this appointment (e.g. a reschedule message) — it is never backfilled from `Patient.medicalHistory`, which this endpoint has no reason to touch at all (see the schema doc's note on `patientNotes` vs. `medicalHistory`). `rejectionReason` is intentionally omitted here too if it would ever contain anything beyond the fixed friendly categories in Section 17 — safest default is to include only the reason category, never free text, if rejection reasons are ever extended to allow free text later.

## Admin auth

| Method | Path | Purpose |
|---|---|---|
| POST | `/admin/auth/login` | `{ email, password }` → sets session cookie |
| POST | `/admin/auth/logout` | Destroys session |
| GET | `/admin/auth/session` | Returns current admin user if session valid (for frontend to check auth state on load) |

## Admin — appointments

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/appointments?status=&locationId=&search=&page=` | Paginated, filterable list (Section 15 table) |
| GET | `/admin/appointments/:id` | Full detail incl. patient + medical history |
| PATCH | `/admin/appointments/:id/accept` | `{ confirmedDate, confirmedTime }` → transitions to `CONFIRMED`, snapshots location, sends notification |
| PATCH | `/admin/appointments/:id/reject` | `{ rejectionReason }` → transitions to `REJECTED`, sends notification |
| PATCH | `/admin/appointments/:id/reschedule` | `{ proposedDate, proposedTime, patientNotes? }` → transitions to `RESCHEDULE_REQUESTED`, sends notification |
| PATCH | `/admin/appointments/:id/cancel` | `{ cancellationReason }` → transitions to `CANCELLED` |
| PATCH | `/admin/appointments/:id/complete` | Marks a past confirmed appointment `COMPLETED` |
| PATCH | `/admin/appointments/:id/no-show` | Marks `NO_SHOW` |

Each mutating route re-validates the state transition against the allow-list (Section 5 of the architecture doc) server-side regardless of current status shown on the client.

## Admin — patients

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/patients?search=` | Search by name/phone/reference |
| GET | `/admin/patients/:id` | Profile + appointment history |

## Admin — schedules & locations

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/locations` | All locations (incl. inactive, for admin editing) |
| POST | `/admin/locations` | Create a location |
| PATCH | `/admin/locations/:id` | Update location details/active flag |
| PATCH | `/admin/locations/:id/schedule` | Replace the `weeklySchedule` array |
| GET | `/admin/locations/:id/exceptions?from=&to=` | List blocked dates / special hours in a range |
| POST | `/admin/locations/:id/exceptions` | Add a blocked date or special-hours override |
| DELETE | `/admin/exceptions/:id` | Remove an exception |

## Admin — dashboard, calendar, notifications

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/dashboard` | Today's count / pending count / upcoming count / next appointment (Section 14) |
| GET | `/admin/calendar?view=day\|week\|month&date=` | Appointments for calendar rendering |
| GET | `/admin/notifications?appointmentId=` | Notification history (Section 20/54 "view notification history") |

## Error format (consistent across all routes)

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Human-readable message", "details": [ ... ] } }
```

Never leak stack traces, Mongoose error internals, or duplicate-key details to the client — map `E11000` on the appointment slot index to a specific `SLOT_ALREADY_CONFIRMED` code with a friendly message, and log the raw error server-side only.
