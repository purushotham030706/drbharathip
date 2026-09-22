# Updated Folder Structure

The structure you proposed is adopted as-is, with two small, explained additions.

```
doctor-appointment/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/            # design-system primitives (buttons, inputs, badges, modals)
│   │   │   ├── appointment/   # AppointmentStepper, LocationSelector, DatePicker, TimeSlotPicker,
│   │   │   │                  # PatientForm, MedicalHistoryForm, AppointmentReview, AppointmentSuccess
│   │   │   └── admin/         # AdminSidebar, AppointmentTable, AppointmentCard, Calendar, ScheduleEditor
│   │   ├── pages/
│   │   │   ├── public/        # Home, About, Services, Hospitals, Contact, Privacy, Terms
│   │   │   ├── appointment/   # the wizard + success + status-lookup pages
│   │   │   └── admin/         # Login, Dashboard, Appointments, PatientProfile, Calendar, Schedules
│   │   ├── layouts/           # PublicLayout, AdminLayout (sidebar/topbar shell)
│   │   ├── hooks/             # useSession, useAvailability, useAppointment, etc.
│   │   ├── services/          # thin fetch wrappers per API resource (appointments.ts, auth.ts, ...)
│   │   ├── lib/                # zod schemas shared with server where practical, date/time helpers
│   │   ├── routes/            # ← addition: React Router route tree + AdminRoute guard, kept
│   │   │                        separate from pages/ so route-guarding logic isn't scattered
│   │   ├── types/
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── config/            # db connection, session store config, env loading
│   │   ├── controllers/       # thin — parse req, call service, shape response
│   │   ├── middleware/        # requireAuth, csrf, rateLimit, errorHandler, validate(zodSchema)
│   │   ├── models/            # Mongoose schemas (one file per collection, Section 2 of schema doc)
│   │   ├── routes/            # Express routers, one per resource, mounted in app.ts
│   │   ├── services/          # business logic: appointmentService, availabilityService,
│   │   │                        notificationService, auditService — controllers stay thin,
│   │   │                        services hold the state-machine + conflict-check logic
│   │   ├── validators/        # Zod schemas for request bodies (shared shape with client/src/lib
│   │   │                        where a monorepo tool like a shared package makes sense; otherwise
│   │   │                        duplicated intentionally rather than tightly coupling deploys)
│   │   ├── utils/              # reference-number generator, date/slot helpers
│   │   ├── types/
│   │   └── app.ts
│   ├── tests/                  # ← addition: kept at the server root rather than inside src/,
│   │                              so ts-node/jest config doesn't need to special-case excluding
│   │                              test files from the production build
│   └── package.json
│
├── README.md
└── .gitignore
```

## Why these two additions

- **`client/src/routes/`**: with Next.js, the file-based router *was* the auth boundary (middleware.ts gated `/admin/*` by convention). React Router doesn't give you that for free — someone has to explicitly wrap admin routes in a guard component. Keeping that guard and the route tree in one place makes it obvious, on inspection, that every admin page is actually protected, rather than trusting that each page remembered to check auth itself.
- **`server/tests/`**: a minor convention choice — keeping tests out of `src/` avoids needing to teach the TypeScript build config to exclude `*.test.ts` files from what gets shipped to Render.

No other deviation from what you specified — everything else matches your proposed layout exactly.
