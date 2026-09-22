# Wireframes — MVP pages (mobile-first)

Boxes are low-fidelity layout only — no color/type decisions here (see Sections 29-31 for the visual system). Mobile width shown first since it's the primary target (Section 32); desktop just widens the same regions.

---

## 1. Homepage

```
┌─────────────────────────────────┐
│ ☰   Dr. Bharathi.P               │  <- sticky header
├─────────────────────────────────┤
│                                   │
│      [ Professional photo ]      │  <- hero
│                                   │
│   Compassionate Women's Health   │
│   [ subtext about the practice ] │
│                                   │
│   [ Request an Appointment ]     │  <- primary CTA
│   [ View Practice Locations ]    │  <- secondary CTA
├─────────────────────────────────┤
│ About Dr. Bharathi.P              │
│ [ short bio excerpt ]  [More →]  │
├─────────────────────────────────┤
│ Services                          │
│ [Card] [Card] [Card] →scroll     │
├─────────────────────────────────┤
│ Practice Locations                │
│ [Nirmala card]  [JSS card]        │
├─────────────────────────────────┤
│ Emergency disclaimer (Sec 11)    │
├─────────────────────────────────┤
│ Footer: About/Services/Contact/   │
│ Privacy/Terms/Disclaimer          │
└─────────────────────────────────┘
      [ Request Appointment ]       <- sticky mobile CTA (Sec 64)
```

## 2. About page

```
┌─────────────────────────────────┐
│ ☰   Dr. Bharathi.P               │
├─────────────────────────────────┤
│ [Photo]  Dr. Bharathi.P           │
│          Gynaecologist &          │
│          Obstetrician             │
├─────────────────────────────────┤
│ Qualifications                    │
│ [QUALIFICATION TO BE PROVIDED]    │  <- placeholder per Rule 1
├─────────────────────────────────┤
│ Areas of expertise                │
│ • ... • ... • ...                 │
├─────────────────────────────────┤
│ Philosophy / approach             │
│ [bio text]                        │
├─────────────────────────────────┤
│ [ Request an Appointment ]        │
└─────────────────────────────────┘
```

## 3. Hospitals / Practice Locations page

```
┌─────────────────────────────────┐
│ ☰   Dr. Bharathi.P               │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ Nirmala Multi Specialty      │ │
│ │ Hospital                     │ │
│ │ Consultation days:           │ │
│ │  Tue · Thu · Sat · Sun       │ │
│ │ [map thumbnail]               │ │
│ │ [ Request Appointment ]       │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ JSS Hospital, Chamarajanagar │ │
│ │ Consultation days:           │ │
│ │  [configured schedule]       │ │
│ │ [ Request Appointment ]       │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

## 4. Appointment wizard (Section 27) — one screen per step, shared progress bar

```
Progress:  ●───○───○───○───○───○
         Location Schedule Details MedInfo Review Submit
```

**Step 1 — Location**
```
┌─────────────────────────────────┐
│ ← Back            Step 1 of 5    │
│ Where would you like to consult? │
│ ○ Nirmala Multi Specialty Hosp.  │
│ ○ JSS Hospital, Chamarajanagar   │
│                                   │
│               [ Continue → ]     │
└─────────────────────────────────┘
```

**Step 2 — Date & time**
```
┌─────────────────────────────────┐
│ ← Back            Step 2 of 5    │
│ [ Month calendar, greyed-out      │
│   dates = unavailable ]           │
│                                   │
│ Morning                           │
│ [09:00][09:30][10:00][10:30]     │
│ Afternoon                         │
│ [14:00][14:30] ...                │
│                                   │
│ ⓘ This is a preferred time —      │
│   confirmed only once the doctor  │
│   accepts your request.           │
│               [ Continue → ]     │
└─────────────────────────────────┘
```

**Step 3 — Patient details**
```
┌─────────────────────────────────┐
│ ← Back            Step 3 of 5    │
│ Full Name        [____________]  │
│ Age              [____]          │
│ Phone Number     [+91 _________] │
│ Email (optional) [____________]  │
│ Reason for visit                 │
│  ○ Routine  ○ Pregnancy          │
│  ○ Follow-up  ○ Menstrual        │
│  ○ Fertility  ○ Menopause        │
│  ○ Report review  ○ Other        │
│               [ Continue → ]     │
└─────────────────────────────────┘
```

**Step 4 — Medical info (optional)**
```
┌─────────────────────────────────┐
│ ← Back            Step 4 of 5    │
│ Optional — skip if not relevant  │
│ [ Large text area: conditions,   │
│   surgeries, medications,        │
│   allergies, pregnancies ]       │
│               [ Continue → ]     │
│               [ Skip → ]         │
└─────────────────────────────────┘
```

**Step 5 — Review & submit**
```
┌─────────────────────────────────┐
│ ← Back            Step 5 of 5    │
│ Location:  Nirmala Multi...      │
│ Date/Time: 12 Sep · 10:30 AM     │
│ Name:      [Patient Name]        │
│ Phone:     [Phone]               │
│ Reason:    [Reason]              │
│ [Edit any section →]             │
│                                   │
│ ☐ I confirm the above is         │
│   accurate and consent to its    │
│   use for this request.          │
│                                   │
│         [ Submit Request ]       │
└─────────────────────────────────┘
```

**Success screen (Section 12)**
```
┌─────────────────────────────────┐
│         ✓  Request Received      │
│ Thank you, [Patient Name].       │
│                                   │
│ Location: Nirmala Multi...        │
│ Date: 12 Sep 2026                 │
│ Time: 10:30 AM (preferred)        │
│                                   │
│  ● PENDING DOCTOR CONFIRMATION    │  <- status badge, amber
│                                   │
│ Reference: BRH-2026-001284        │
│ You'll be notified once reviewed. │
└─────────────────────────────────┘
```

---

## 5. Admin — Login

```
┌─────────────────────────────────┐
│         Dr. Bharathi.P            │
│         Admin Login               │
│  Email     [_______________]      │
│  Password  [_______________]      │
│           [ Log In ]              │
└─────────────────────────────────┘
```

## 6. Admin — Dashboard home (Section 14)

```
┌─────────────────────────────────┐
│ ☰  Good morning, Dr. Bharathi    │
├─────────────────────────────────┤
│ [Today: 8] [Pending: 3] [Upcoming:17]│
├─────────────────────────────────┤
│ Next appointment                  │
│ 10:30 AM · [Patient Name]         │
│ Nirmala Multi Specialty Hospital  │
│               [ View → ]         │
├─────────────────────────────────┤
│ Pending requests (3)              │
│ [row] [row] [row]   [View all →] │
└─────────────────────────────────┘
```
Sidebar (desktop) / drawer (mobile): Dashboard · Appointments · Patients · Calendar · Locations · Schedules · Blocked Dates · Notifications · Website Content · Settings · Logout (Section 47)

## 7. Admin — Appointment requests table (Section 15)

```
┌───────────────────────────────────────────────────────────┐
│ Appointments        [Filter: Pending ▾] [Search patient]   │
├────────────┬───────────┬───────┬────────┬─────────┬───────┤
│ Patient    │ Location  │ Date  │ Time   │ Reason  │Status │
├────────────┼───────────┼───────┼────────┼─────────┼───────┤
│ Patient A  │ Nirmala   │12 Sep │10:30AM │Follow-up│●Pending│
│ Patient B  │ JSS Cham. │13 Sep │11:00AM │Consult  │●Pending│
└────────────┴───────────┴───────┴────────┴─────────┴───────┘
     (row click → detail view)
```

## 8. Admin — Appointment detail (Sections 15-18)

```
┌─────────────────────────────────┐
│ ← Back to requests                │
│ Patient Information                │
│  Name / Age / Phone / Email       │
│ Appointment Information            │
│  Location / Requested date-time   │
│  Reason                           │
│ Medical Information (if provided) │
│  [collapsed text block]           │
├─────────────────────────────────┤
│ [ Accept ]  [ Reschedule ]  [ Reject ] │
└─────────────────────────────────┘

  Accept →  confirmation modal (Sec 16)
  ┌───────────────────────┐
  │ Confirm Appointment     │
  │ Patient / Date / Time / │
  │ Location                │
  │ [Cancel]   [Confirm]    │
  └───────────────────────┘

  Reject →  reason picker (Sec 17, internal only)
  Reschedule → propose alternate slot(s) (Sec 18)
```

## 9. Admin — Calendar (Section 48)

```
┌─────────────────────────────────┐
│ [Day] [Week] [Month]   ‹ Sep › │
├─────────────────────────────────┤
│ 09:00  Patient A                 │
│ 09:30  —                         │
│ 10:00  Patient B                 │
│ 10:30  Patient C                 │
└─────────────────────────────────┘
```

## 10. Admin — Schedule editor (Sections 6, 49, 50)

```
┌─────────────────────────────────┐
│ Location: [Nirmala ▾]             │
│ Weekly template                   │
│  Tue  Morning  09:00–13:00  [Edit]│
│  Thu  Morning  09:00–13:00  [Edit]│
│  Sat  Morning  09:00–13:00  [Edit]│
│  Sun  Morning  09:00–13:00  [Edit]│
│              [ + Add slot ]      │
├─────────────────────────────────┤
│ Exceptions                        │
│  24 Sep · Special hours 11–14    │
│  [ + Block a date ]              │
└─────────────────────────────────┘
```

---

## Status badge component (used across admin + patient views)

```
● Pending      (amber)
● Confirmed    (green)
● Rejected     (red)
● Cancelled    (gray)
```
Always paired with text, never color alone (Section 30, 33 — accessibility).
