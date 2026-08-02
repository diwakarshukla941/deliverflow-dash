# Tej Delivery — Delivery Partner Mobile App (React Native + Expo) Build Prompt

Copy everything below into your AI builder / use as the spec for the Expo app.

---

## 1. What to build

A React Native (Expo, TypeScript) app for **delivery boys (delivery partners)** of
"Tej Delivery". It authenticates against the same Supabase backend used by the web
dashboard and calls the dashboard's `/api/v1/*` REST endpoints for all business
actions (attendance check-in / check-out with selfie + GPS).

Partners are **created by staff in the dashboard** — the app has **no public signup**.
A partner logs in with the email/password that staff created for them; the
`auth.users.id` is stored on `delivery_partners.user_id`, which links account → partner row.

## 2. Backend connection details

```
API_BASE_URL (prod)    = https://tej-delivery.lovable.app/api/v1
API_BASE_URL (preview) = https://project--a7b2cc57-9c74-467d-ba7c-bb93b6f02ad7-dev.lovable.app/api/v1
SUPABASE_URL           = https://mnjqzubeujzbuibikkar.supabase.co
SUPABASE_ANON_KEY      = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uanF6dWJldWp6YnVpYmlra2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MjQ3MDksImV4cCI6MjA5OTUwMDcwOX0.IJHmm-0C-iTgXKQ2aS7d7n8tWwJrLEznglniPRUkUSc
STORAGE_BUCKET         = "attendance"   (private)
```

Auth flow:
1. `supabase.auth.signInWithPassword({ email, password })` using `@supabase/supabase-js`
   with `AsyncStorage` (or `expo-secure-store`) as the session store, `persistSession: true`,
   `autoRefreshToken: true`, `detectSessionInUrl: false`.
2. For every REST call, send the current access token:
   `Authorization: Bearer <session.access_token>`.
   Always read the token fresh via `supabase.auth.getSession()` right before the call
   (it auto-refreshes); a missing/expired token returns `401 {"error":"unauthorized"}`.
3. On `401`, try one refresh, then sign out and return to the login screen.

CORS is open (`*`) on all `/api/v1/*` routes, `OPTIONS` preflight supported.

## 3. Database schema (Supabase / Postgres, schema `public`)

### Enums
```sql
app_role: super_admin | admin | hr | operations | finance | manager | dispatcher |
          team_leader | branch_manager | warehouse_manager | inventory_manager |
          customer_support | delivery_manager | auditor
partner_status:    active | suspended | deactivated | blacklisted | resigned | pending
attendance_status: checked_in | checked_out | absent | on_leave
delivery_status:   pending | assigned | picked_up | in_transit | delivered | cancelled | failed
payment_mode:      cash | upi | card | wallet | online | other
```

### `delivery_partners` (the partner profile — one row per delivery boy)
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid → auth.users | links the login account |
| partner_code | text NOT NULL | unique business code, e.g. `TEJ-0007` |
| full_name | text NOT NULL | |
| phone | text NOT NULL | |
| email | text | |
| date_of_birth | date | |
| gender | text | |
| profile_photo_url | text | |
| address_line1, address_line2, city, state, postal_code, country | text | `country` defaults `IN` |
| emergency_contact_name / _phone / _relation | text | |
| government_id_type, government_id_number | text | KYC (Aadhaar/PAN/…) |
| driving_license_number | text | |
| driving_license_expiry | date | |
| vehicle_type, vehicle_number, vehicle_model | text | |
| bank_account_holder, bank_account_number, bank_ifsc, bank_name, upi_id | text | payout |
| joining_date | date | |
| employment_type | text | |
| status | partner_status | default `pending` |
| notes | text | staff only |
| qr_code | text | |
| push_token, device_id, app_version, os_version | text | **the app writes these** |
| last_login_at, last_seen_at | timestamptz | **the app writes these** |
| created_by / updated_by / deleted_by | uuid | audit |
| created_at / updated_at | timestamptz | |
| deleted_at | timestamptz | soft delete |

### `attendance` (one row per partner per day)
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| partner_id | uuid → delivery_partners.id | |
| attendance_date | date | server-forced to `current_date` for partners |
| check_in_at / check_out_at | timestamptz | |
| check_in_image_url / check_out_image_url | text | selfie (storage path/URL) |
| check_in_lat / check_in_lng / check_out_lat / check_out_lng | numeric | GPS |
| device_id | text, device_info | jsonb |
| remarks | text | |
| status | attendance_status | default `checked_in` |
| face_recognition_id, face_verification_status, ai_confidence | text/numeric | future AI verification |
| created_at / updated_at / created_by / updated_by | | |

### Other tables (dashboard-side, **not** reachable by partner accounts)
`profiles` (internal staff), `user_roles`, `permissions`, `role_permissions`, `audit_logs`.

### Security model the app must respect (RLS is enforced server-side)
- A partner can read **only their own** `delivery_partners` row and **only their own** `attendance` rows.
- A partner can insert attendance only for themselves, and may update **only today's** row,
  and only the check-out fields / remarks — a DB trigger overwrites everything else.
- A partner cannot change `status`, bank fields, KYC fields, `partner_code`, `full_name` or `notes`.
  Attempting it silently keeps the old values (trigger) or returns `422 validation_error` (API).
- Suspended / non-`active` partners are blocked from check-in with `403 account_inactive`.

## 4. REST API contract (`/api/v1`)

All responses are JSON. All require `Authorization: Bearer <access_token>`.
Errors: `{ "error": "<code>", "message"?: string, "issues"?: ZodIssue[] }`.
Common codes: `unauthorized` (401), `not_a_partner` (403), `account_inactive` (403),
`forbidden` (403), `validation_error` (422), `db_error` (400/500).

### `GET /me`
```json
{ "user_id": "uuid", "partner": { ...delivery_partners row... } | null, "roles": ["..."] }
```
Use on app boot: if `partner` is null → this account isn't a delivery partner, sign out with a message.

### `POST /attendance/check-in`
Body (all optional):
```json
{ "check_in_image_url": "https://…", "lat": 17.385, "lng": 78.4867,
  "device_id": "…", "device_info": { "model": "…", "os": "…", "app_version": "…" },
  "remarks": "…" }
```
`201 { "data": { ...attendance row... } }` ·
`409 { "error": "already_checked_in", "data": {…} }` ·
`403 { "error": "account_inactive", "status": "suspended" }`

### `POST /attendance/check-out`
Body: `{ "check_out_image_url", "lat", "lng", "remarks" }` (all optional)
`200 { "data": {…} }` · `409 not_checked_in` · `409 already_checked_out`

### `GET /attendance/today`
Returns today's row or null → drives the home screen state machine.

### `GET /attendance?page=1&limit=20&from=YYYY-MM-DD&to=YYYY-MM-DD`
```json
{ "data": [ … ], "pagination": { "page": 1, "limit": 20, "total": 57 } }
```

### `GET /delivery-partners/:id` and `PATCH /delivery-partners/:id`
A partner may PATCH **only** their own row and only these self-service fields:
`phone, email, profile_photo_url, address_line1, address_line2, city, state, postal_code,
emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
push_token, device_id, app_version, os_version`.
Any other key → `422 validation_error` (schema is `strict()`).

## 5. Selfie upload (Supabase Storage)

Bucket `attendance` is **private**. From the app, upload with the signed-in Supabase client:
```ts
const path = `${partner.id}/${date}/checkin-${Date.now()}.jpg`;
await supabase.storage.from('attendance').upload(path, blob, { contentType: 'image/jpeg' });
const { data } = await supabase.storage.from('attendance').createSignedUrl(path, 60 * 60 * 24 * 365);
// send data.signedUrl (or the raw path) as check_in_image_url
```
If storage policies reject the upload, add bucket policies for `authenticated` scoped to
`storage.foldername(name)[1] = partner id` on the dashboard side first.

## 6. App screens & behaviour

1. **Splash / bootstrap** — restore session, call `GET /me`, route accordingly.
2. **Login** — email + password only, no signup, no social. Show "Contact your supervisor"
   for account issues. On success PATCH `push_token/device_id/app_version/os_version`.
3. **Home / Attendance** — big status card driven by `GET /attendance/today`:
   - no row → **Check in** button
   - `check_in_at` set, no `check_out_at` → live shift timer + **Check out**
   - both set → "Shift complete", summary of hours.
   Check-in flow: request camera + foreground location permission → front-camera selfie
   (`expo-camera`) → `expo-location.getCurrentPositionAsync` → upload selfie → POST endpoint.
   Block with a clear message if location is denied or accuracy is poor.
4. **Attendance history** — paginated list from `GET /attendance`, grouped by month,
   each item showing date, in/out time, total hours, thumbnails, map pin.
5. **Profile** — read-only KYC/vehicle/bank sections (greyed with a lock icon + "managed by
   office"), editable contact/address/emergency block via `PATCH /delivery-partners/:id`.
6. **Settings** — language, logout (clear Supabase session + local cache), app version.
7. **Blocked state** — if `partner.status !== 'active'`, show a full-screen notice with the
   status and disable check-in.

## 7. Technical requirements

- Expo SDK (latest), TypeScript, Expo Router, React Query for data, Zustand or Context for session.
- Libraries: `@supabase/supabase-js`, `@react-native-async-storage/async-storage`,
  `expo-camera`, `expo-location`, `expo-image-manipulator` (compress selfies to ≤ 500 KB),
  `expo-secure-store`, `expo-notifications` (push token), `react-native-maps` (optional).
- One typed `api.ts` client: base URL from `expo-constants` extra, injects bearer token,
  parses the `{ data, error }` envelope, retries once on 401 after refresh.
- Generate TS types from the schema above (or reuse the dashboard's `Database` type).
- Offline-tolerant: queue a failed check-in/out and retry when connectivity returns; never
  duplicate (server returns 409 which the app treats as success).
- Never ship the service role key. Only the anon key belongs in the app.

## 8. Acceptance checks

- Staff creates a partner + login in the dashboard → that user can log in on mobile and sees their own name.
- Check-in from the app appears instantly on the dashboard Attendance page with selfie and GPS.
- Check-out updates the same row; hours match.
- A second check-in the same day is rejected with 409.
- A suspended partner cannot check in.
- Partner cannot see any other partner's data via the API.

---

> Note: currently the dashboard does **not** yet create Supabase auth accounts for delivery
> partners (only for internal staff), and there are no `deliveries` / `earnings` tables yet.
> Those must be added on the dashboard side before the corresponding app screens can work.