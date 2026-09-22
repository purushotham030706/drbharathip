# Mongoose / MongoDB Schema Design

## Collection list

`adminusers`, `doctors`, `practicelocations`, `scheduleexceptions`, `patients`, `appointments`, `notifications`, `auditlogs`.

`Schedule` (the weekly template) is **embedded**, not a collection — see rationale below. Everything else is a separate collection.

## Embed vs. reference — and why

| Data | Decision | Why |
|---|---|---|
| Weekly `Schedule` (day/session/hours) | **Embedded array inside `PracticeLocation`** | Small (a handful of rows per location), always read together with the location, rarely written to, never queried independently across locations. Embedding avoids a join-like lookup on every availability check. |
| `ScheduleException` (blocked dates, special hours) | **Separate collection**, referencing `locationId` | Unlike the weekly template, this grows unboundedly over the life of the practice (every blocked date is a new row) and is queried by date range independently of reading the full location document — a separate, indexed collection is the right shape, same conclusion as the original Postgres design. |
| `MedicalHistory` | **Embedded subdocument inside `Patient`** | Strictly 1:1, optional, always fetched together with the patient, never queried on its own. No reason to pay for a second document lookup. |
| `Appointment` ↔ `Patient` / `PracticeLocation` | **Referenced** (ObjectId) | Appointments and patients each have independent lifecycles and are queried independently (e.g. "all appointments for this location today" vs "this patient's history") — embedding either into the other would duplicate data and make updates inconsistent. |
| Confirmed appointment details | **Snapshot fields embedded directly in `Appointment`**, not just a location reference | See the dedicated section below — this is the answer to the "data design question" in the brief. |

## The snapshot design (why it matters)

A `PracticeLocation` document can be edited later (address corrected, phone number updated, or — in a future multi-doctor version — reassigned). If a confirmed `Appointment` only stored `locationId` and always looked up the live `PracticeLocation` document to show "where to go," a data correction made *after* confirmation would silently rewrite what the patient was told, which is exactly the failure mode called out in the original SRS (Section 69: "Doctor changes schedule → existing confirmed appointments should NOT silently change").

The fix: at the moment an appointment is confirmed, copy the location's patient-facing details into the appointment document itself:

```ts
confirmedLocationSnapshot: {
  name: String,
  address: String,
  phone: String,
}
```

`locationId` is still kept as a reference (for admin-side reporting — "all appointments at Nirmala this month" — and for the pre-confirm availability check, which legitimately needs the *current* schedule). But once `status` transitions to `CONFIRMED`, the snapshot — not a fresh lookup — is what's shown to the patient and printed in the confirmation email. The same logic applies to `requestedDate`/`requestedTime` vs `confirmedDate`/`confirmedTime`, which were already separate fields in the original design for the same reason.

## `Patient.medicalHistory` vs. `Appointment.patientNotes` — these are different things, on purpose

Both fields hold patient-supplied text, which makes them easy to conflate. They are not interchangeable:

| Field | Scope | Written by | Example |
|---|---|---|---|
| `Patient.medicalHistory` | The patient's standing profile — persists across every appointment they ever make | The patient, once, in the optional medical-info step of the wizard (Section 10) | "Had a C-section in 2022. Allergic to penicillin." |
| `Appointment.patientNotes` | Specific to *this one appointment request* | Either the patient (e.g. "bringing my previous ultrasound report with me") at request time, or the doctor (e.g. a reschedule message: "please come 30 min earlier") after review | "Doctor has asked you to bring your previous ultrasound report" |

The reason to keep these separate rather than merging into one growing text blob per patient: `medicalHistory` is meant to answer "what does the doctor need to know about this patient in general," while `patientNotes` answers "what's specific to this visit." Collapsing them would either force the doctor to re-read a patient's entire history on every single appointment, or force the patient to re-type their history every time they book — neither is what the SRS asked for.

This is intentionally **not** a step toward a full EMR (electronic medical record) system — there's no visit-by-visit clinical charting, no prescription history, no lab results. It's exactly the two free-text fields the original SRS specified (Sections 10 and 18), named clearly enough that a future contributor won't be tempted to bolt more clinical structure onto either one without a deliberate decision to do so.

## Schema definitions

```ts
// models/AdminUser.ts
const AdminUserSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['DOCTOR', 'STAFF'], default: 'DOCTOR' },
  doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor' },
  isActive: { type: Boolean, default: true },
  lastLoginAt: Date,
}, { timestamps: true });

// models/Doctor.ts
const DoctorSchema = new Schema({
  name: { type: String, required: true },
  title: { type: String, required: true }, // "Consultant Obstetrician & Gynaecologist, and Fertility Specialist"
  qualifications: [String],                // ["MBBS", "MS", "DMAS", "FRM"]
  bio: String,
  specializations: [String],
  phone: String,
  email: String,
  profileImageUrl: String,
  isPlaceholder: { type: Boolean, default: true },
}, { timestamps: true });

// models/PracticeLocation.ts
const ScheduleSlotSchema = new Schema({
  dayOfWeek: { type: String, enum: ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'], required: true },
  session: { type: String, enum: ['MORNING','AFTERNOON','EVENING'], required: true },
  startTime: { type: String, required: true }, // "09:00"
  endTime: { type: String, required: true },
  slotMinutes: { type: Number, default: 30 },
  active: { type: Boolean, default: true },
}, { _id: true }); // keep _id so the admin UI can target one slot for edit/delete

const PracticeLocationSchema = new Schema({
  doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
  name: { type: String, required: true },
  address: String,
  city: String,
  state: String,
  phone: String,
  mapUrl: String,
  active: { type: Boolean, default: true },
  weeklySchedule: [ScheduleSlotSchema],   // embedded — see rationale above
  scheduleIsDemoData: { type: Boolean, default: true }, // true until an admin saves real hours via the dashboard
}, { timestamps: true });

**On `scheduleIsDemoData`**: the real consultation hours for either hospital have not been provided yet. Seed data will populate `weeklySchedule` with placeholder times (e.g. a generic 09:00–13:00 morning block) purely so the appointment wizard and availability logic have something to render during development — these are **not** Dr. Bharathi's actual hours and must never be presented to a real patient as such. `scheduleIsDemoData: true` is the flag that lets the frontend show a visible "Hours shown are placeholders — confirm with the clinic" banner on the public site (and a loud warning in the admin schedule editor) for as long as it remains true. It flips to `false` automatically the first time an admin saves a schedule change via `PATCH /admin/locations/:id/schedule` — real hours entered through the dashboard, not a code deploy, are what clear it. This must not go to production with `scheduleIsDemoData: true` still set.

// models/ScheduleException.ts
const ScheduleExceptionSchema = new Schema({
  locationId: { type: Schema.Types.ObjectId, ref: 'PracticeLocation', required: true },
  date: { type: Date, required: true },
  type: { type: String, enum: ['BLOCKED', 'SPECIAL_HOURS'], required: true },
  startTime: String,
  endTime: String,
  reason: String,
}, { timestamps: true });
ScheduleExceptionSchema.index({ locationId: 1, date: 1 });

// models/Patient.ts
const MedicalHistorySchema = new Schema({
  previousPregnancies: String,
  previousSurgeries: String,
  medicalConditions: String,
  currentMedications: String,
  allergies: String,
  additionalNotes: String,
}, { _id: false });

const PatientSchema = new Schema({
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  email: String,
  address: String,
  age: Number,
  gender: String,
  medicalHistory: MedicalHistorySchema, // embedded — 1:1, optional, always read together
}, { timestamps: true });
PatientSchema.index({ phone: 1 });

// models/Appointment.ts
const LocationSnapshotSchema = new Schema({
  name: String,
  address: String,
  phone: String,
}, { _id: false });

const AppointmentSchema = new Schema({
  referenceNumber: { type: String, required: true, unique: true }, // "BRH-2026-001284"
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  locationId: { type: Schema.Types.ObjectId, ref: 'PracticeLocation', required: true },

  reason: { type: String, required: true },
  reasonDetail: String,

  requestedDate: { type: Date, required: true },
  requestedTime: { type: String, required: true },

  confirmedDate: Date,
  confirmedTime: String,
  confirmedLocationSnapshot: LocationSnapshotSchema, // see snapshot rationale above

  status: {
    type: String,
    enum: ['REQUESTED','UNDER_REVIEW','CONFIRMED','REJECTED','RESCHEDULE_REQUESTED','CANCELLED','COMPLETED','NO_SHOW'],
    default: 'REQUESTED',
    index: true,
  },

  doctorNotes: String,       // internal only — never returned on patient-facing endpoints
  patientNotes: String,
  rejectionReason: String,
  cancelledBy: { type: String, enum: ['DOCTOR', 'PATIENT'] },
  cancellationReason: String,
}, { timestamps: true });

AppointmentSchema.index({ locationId: 1, requestedDate: 1 });

// The double-booking backstop — see full explanation in the next section.
AppointmentSchema.index(
  { locationId: 1, confirmedDate: 1, confirmedTime: 1 },
  { unique: true, partialFilterExpression: { status: 'CONFIRMED' } }
);

// models/Notification.ts
const NotificationSchema = new Schema({
  appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment', required: true, index: true },
  channel: { type: String, enum: ['EMAIL','SMS','WHATSAPP'], required: true },
  type: { type: String, enum: ['REQUEST_RECEIVED','APPOINTMENT_CONFIRMED','APPOINTMENT_REJECTED','RESCHEDULE_REQUESTED','APPOINTMENT_CANCELLED'], required: true },
  recipient: { type: String, required: true },
  sentAt: Date,
  status: { type: String, default: 'PENDING' }, // PENDING | SENT | FAILED
  error: String,
}, { timestamps: true });

// models/AuditLog.ts
const AuditLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'AdminUser', required: true, index: true },
  action: { type: String, enum: ['APPOINTMENT_VIEWED','APPOINTMENT_ACCEPTED','APPOINTMENT_REJECTED','APPOINTMENT_RESCHEDULED','APPOINTMENT_CANCELLED','PATIENT_DATA_UPDATED','SCHEDULE_UPDATED','ADMIN_LOGIN'], required: true },
  appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment', index: true },
  metadata: Schema.Types.Mixed, // never put medical history or doctorNotes in here
  timestamp: { type: Date, default: Date.now },
});
```

## Double-booking prevention in MongoDB — the honest explanation

The brief specifically asked not to blindly translate the Postgres partial unique index without explaining the MongoDB equivalent and its limits. Here it is:

**The good news**: MongoDB natively supports partial unique indexes (`partialFilterExpression`), so this is actually *more* directly supported than in Prisma (which needed a raw SQL migration). The index above enforces, at the storage-engine level, that no two documents can have the same `(locationId, confirmedDate, confirmedTime)` while `status: 'CONFIRMED'`. This holds even under concurrent writes — MongoDB's index enforcement is atomic per document write, so if two `accept` requests race, the second write throws an `E11000 duplicate key error`.

**The limitation to know about**: the unique index prevents two *documents* from both ending up `CONFIRMED` at the same slot — but the accept operation itself typically involves reading current state, checking it's still available, then writing. Between the read and the write, another admin action (rare, since there's one admin, but not impossible with a staff account later) could interleave. Two mitigations:
1. **The unique index is the actual backstop** — even if the read-then-write race happens, the *second* write will fail with a duplicate-key error rather than silently double-booking. The application catches that specific error and returns "this slot was just taken — please choose another time," rather than a generic 500.
2. For the read-check-write sequence itself, wrap it in a MongoDB **multi-document transaction** (`session.withTransaction`) — Atlas clusters are always replica sets, so transactions are available without extra setup. This narrows the race window but the unique index remains the thing that actually guarantees correctness even if transaction isolation is imperfect.

Net effect: same guarantee as the Postgres version, achieved with a native Mongo feature instead of a raw migration — this is one place MERN is arguably simpler, not a downgrade.

## Availability calculation (unchanged approach, Mongo-flavored)

No `AvailableSlot` collection, per the brief. `GET /api/availability?locationId&date` computes:

```
weeklySchedule = practiceLocation.weeklySchedule.filter(dayOfWeek matches date)
exceptions      = ScheduleException.find({ locationId, date })
confirmed       = Appointment.find({ locationId, confirmedDate: date, status: 'CONFIRMED' })

slots = generateSlots(weeklySchedule, slotMinutes)
        minus blocked ranges from exceptions (BLOCKED removes; SPECIAL_HOURS replaces the window)
        minus times already in `confirmed`
```

This is a plain read across two-to-three small, indexed queries — cheap enough to run on every page load without caching for the traffic level this app expects (a single-doctor practice), so no materialized "availability" collection is introduced.
