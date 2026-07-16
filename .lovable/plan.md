
# Tej Delivery — Production Hardening Plan

This spec is ~18 modules deep. Shipping it all in one turn produces shallow, broken work. I'll do it in **7 focused phases**, each ending in a working, verified state you can review. You approve one phase at a time.

Deferred until you provide API keys / say otherwise: **face verification** (needs AWS Rekognition or similar), **live map GPS tracking** (needs Mapbox/Google key), **SMS/Push** (needs Twilio/FCM). I'll still build the DB fields, settings UI, and stubs so wiring the provider later is a one-file change.

---

## Phase 1 — Critical fixes: Auth, RBAC, schema foundations
This is what I'll build in the **next turn** after you approve.

**Auth**
- Remove email-based role trigger (`handle_new_user`) — roles are only granted by an admin through User Management.
- Remove hardcoded demo credentials from `/auth`.
- Disable public signup: `/auth` is sign-in only. New users are provisioned by Super Admin via server function using the admin API.
- Keep one bootstrap: `admin@tej.com` seeded with `super_admin` so you can log in.
- Session-driven sidebar affordance, proper sign-out cache teardown.

**RBAC (DB-driven, granular)**
- New tables: `permissions`, `role_permissions`, `roles` (system + custom), plus keep `user_roles`. Full GRANTs + RLS.
- `has_permission(user, permission_key)` security-definer function.
- Frontend `useMyPermissions()` hook; sidebar & routes gated by permission keys, not role names.
- Backend server functions and API routes re-check permissions server-side.

**Schema hygiene (global)**
- Add `created_by`, `updated_by`, `deleted_at`, `deleted_by` to core tables.
- Missing FKs, indexes on filter/sort columns, unique constraints on codes/emails/phones.
- `updated_at` triggers everywhere.
- Central `audit_logs` table + trigger helper.

**Deliverable:** admin logs in, no other role escalates, permission model in place, schema ready for the rest.

---

## Phase 2 — User Management module
- Full CRUD for staff users (all roles listed in spec + custom roles).
- Fields: name, email, phone, employee ID, department, designation, branch, reporting manager, joining date, photo, status, notes.
- Server function using `supabaseAdmin` to create auth users + profile + role assignment atomically.
- Roles & Permissions admin UI: assign permissions to roles, create custom roles.
- Departments, Designations, Branches (settings sub-entities used here).

## Phase 3 — Delivery Partner onboarding (complete)
- Multi-step wizard: Personal → Documents (Aadhaar/PAN/DL/RC/Insurance/PUC) → Vehicle → Bank → Employment.
- Supabase Storage bucket `partner-documents` (private) + signed URLs.
- Zod validation (Aadhaar 12 digits, PAN regex, IFSC regex, phone, pincode, expiry dates).
- Document preview/replace/delete, expiry warnings.
- Onboarding cannot complete until mandatory docs uploaded.
- Partner list: filters, search, bulk actions, pagination, column visibility, CSV export.

## Phase 4 — Attendance + Deliveries + Earnings
**Attendance**: check-in/out with GPS coords, geo-fence (radius check against branch), selfie upload to storage, working hours, late/overtime calc, calendar view, manager approval/correction flow, CSV export. *(Face-match deferred.)*

**Deliveries**: create order, assign partner (manual + bulk), status timeline (pickup → OFD → delivered/failed/returned/cancelled), OTP verification, PoD photo + signature (canvas), customer feedback, reassignment, history. *(Live map tracking deferred — stores last-known coords.)*

**Earnings**: commission rule engine (per-delivery / daily / hybrid), bonuses, penalties, daily/weekly/monthly aggregation, wallet, withdrawal requests, transaction ledger, statement export.

## Phase 5 — Reports + Audit Logs + Notifications
- Reports: delivery, attendance, revenue, partner performance, payroll. Filters (date, branch, partner). PDF (jsPDF) + Excel (xlsx) + CSV export.
- Audit logs viewer with filters (actor, entity, action, date) — trigger-driven, captures old/new values, IP, user agent.
- In-app notifications table + bell dropdown. Email/SMS/Push scaffolded behind feature flags awaiting keys.

## Phase 6 — Dashboard + Settings + UI polish
- Enterprise dashboard: KPI cards, delivery/revenue/attendance trend charts (recharts), online partner map placeholder, recent activities, quick actions.
- Settings: Company profile, Branches, Departments, Designations, Roles/Permissions, Email/SMS templates, API keys, Webhooks, Security (password policy, session timeout), Backup info, System health.
- Global search (cmd-K), breadcrumbs, profile menu, notifications bell, dark/light mode toggle, empty states, loading skeletons, responsive drawer, keyboard shortcuts, WCAG basics (labels, focus, contrast tokens).

## Phase 7 — Hardening & QA
- Rate limiting on public API routes (`/api/v1/*`), CSRF for cookie-auth surfaces, input sanitization pass.
- Query optimization pass, missing indexes, N+1 fixes.
- Remove dead code, TODOs, console.logs, unused components; ESLint + tsgo clean.
- Playwright smoke tests for critical flows (login, create user, onboard partner, check-in, create delivery, view report).
- Final security scan + fix.

---

## Notes on realism
- **Face verification** stays out of scope until you provide a provider + secret; I'll add a `verification_provider` setting and a stub function so switching it on is trivial.
- **Live GPS on map** needs Mapbox/Google key. Without it, the delivery detail page shows last-known lat/lng + a link to Google Maps; I'll upgrade to a live map when the key arrives.
- **SMS/Email/Push**: templates + settings + a `notifications` table land in Phase 5; actual sending activates when you add Twilio/Resend/FCM secrets.
- Every phase ends buildable and demoable. No placeholders left behind in phases we've completed.

## What I'll do right after you approve
Start **Phase 1**: rip out demo creds + email-based role trigger, install the permissions schema, wire DB-driven RBAC end-to-end, seed only `admin@tej.com`, and add the audit-log spine. Then hand back for review before Phase 2.

Approve to proceed, or tell me which phases to reorder / drop.
