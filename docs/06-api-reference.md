# AYUR GATE — API Reference

All API routes are under `/api/`. Authentication is via `auth_token` httpOnly cookie (JWT).

## Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | No | Login with email + password (+ optional TOTP) |
| GET | `/api/auth/me` | Yes | Get current user profile |
| POST | `/api/auth/change-password` | Yes | Change password |
| POST | `/api/auth/forgot-password` | No | Request password reset email |
| POST | `/api/auth/reset-password` | No | Reset password with token |
| POST | `/api/auth/totp-setup` | Yes | Generate TOTP secret for 2FA setup |
| POST | `/api/auth/totp-verify` | Yes | Verify and enable 2FA |
| GET | `/api/auth/totp-status` | Yes | Check if 2FA is enabled |
| POST | `/api/auth/totp-disable` | Yes | Disable 2FA |

## Clinic Registration & Onboarding

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/clinic/register` | No | Register new clinic (creates Clinic + Subscription + Admin User + Settings) |
| GET | `/api/onboarding` | Yes | Get onboarding status and pre-filled data |
| POST | `/api/onboarding` | Yes | Save onboarding step data (step 1, 2, or 3/complete) |
| POST | `/api/verify-email` | Yes | Send or verify email OTP (action: "send" or "verify") |

## Patients

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/patients` | Yes | List patients (search, pagination, gender filter) |
| POST | `/api/patients` | Yes | Create new patient (auto-generates patient ID) |
| GET | `/api/patients/[id]` | Yes | Get patient detail with all relations |
| PUT | `/api/patients/[id]` | Yes | Update patient record |
| DELETE | `/api/patients/[id]` | Yes | Delete patient and all related data |
| GET | `/api/patients/[id]/balance` | Yes | Get patient billing balance |
| POST | `/api/patients/merge` | Yes | Merge duplicate patient records |

## Appointments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/appointments` | Yes | List appointments (date range, doctor, status filters) |
| POST | `/api/appointments` | Yes | Create appointment |
| GET | `/api/appointments/[id]` | Yes | Get appointment detail |
| PUT | `/api/appointments/[id]` | Yes | Update appointment (status, reschedule) |
| DELETE | `/api/appointments/[id]` | Yes | Cancel/delete appointment |

## Doctors & Slots

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/doctors` | Yes | List doctors/therapists (thin wrapper over User model) |
| GET | `/api/doctors/[id]/slots` | Yes | Get available time slots for a doctor on a date |

## Billing & Invoices

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/invoices` | Yes | List invoices (pagination, status filter, date range) |
| POST | `/api/invoices` | Yes | Create invoice with line items |
| GET | `/api/invoices/[id]` | Yes | Get invoice detail with items and payments |
| PUT | `/api/invoices/[id]` | Yes | Update invoice |
| DELETE | `/api/invoices/[id]` | Yes | Delete invoice |
| GET | `/api/billing/stats` | Yes | Get billing statistics (today, month, pending) |
| POST | `/api/invoices/[id]/payment` | Yes | Record payment against invoice |
| GET | `/api/credit-notes` | Yes | List credit notes |
| POST | `/api/credit-notes` | Yes | Create credit note |

## Prescriptions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/prescriptions` | Yes | List prescriptions (search, date filter) |
| POST | `/api/prescriptions` | Yes | Create prescription with medicine items |
| GET | `/api/prescriptions/[id]` | Yes | Get prescription detail |
| PUT | `/api/prescriptions/[id]` | Yes | Update prescription |
| DELETE | `/api/prescriptions/[id]` | Yes | Delete prescription |

## Inventory

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/inventory` | Yes | List inventory items (search, category, low stock filter) |
| POST | `/api/inventory` | Yes | Create inventory item |
| GET | `/api/inventory/[id]` | Yes | Get item detail with variants and transactions |
| PUT | `/api/inventory/[id]` | Yes | Update item |
| DELETE | `/api/inventory/[id]` | Yes | Delete item |
| POST | `/api/inventory/import` | Yes | Bulk import from CSV |

## Medicines

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/medicines` | Yes | Search medicines from inventory (for prescription autocomplete) |

## Suppliers & Purchase Orders

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/suppliers` | Yes | List suppliers |
| POST | `/api/suppliers` | Yes | Create supplier |
| GET | `/api/purchase-orders` | Yes | List purchase orders |
| POST | `/api/purchase-orders` | Yes | Create purchase order |
| PUT | `/api/purchase-orders/[id]` | Yes | Update PO (receive, cancel) |

## Stock Transfers

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/transfers` | Yes | List stock transfers |
| POST | `/api/transfers` | Yes | Create transfer |
| PUT | `/api/transfers/[id]` | Yes | Update transfer (approve, receive, cancel) |

## Branches

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/branches` | Yes | List branches |
| POST | `/api/branches` | Yes | Create branch |
| PUT | `/api/branches/[id]` | Yes | Update branch |

## Staff

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/staff` | Yes | List staff (role filter, search, clinical-only) |
| POST | `/api/staff` | Yes | Create staff member (auto-generate ID, optional email invite) |
| GET | `/api/staff/[id]` | Yes | Get staff detail |
| PUT | `/api/staff/[id]` | Yes | Update staff |
| DELETE | `/api/staff/[id]` | Yes | Delete staff (checks future appointments) |

## Staff Invites

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/invite/[token]` | No | Validate invite token |
| POST | `/api/invite/[token]` | No | Accept invite (set password) |

## Treatments & Packages

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/treatments` | Yes | List treatments |
| POST | `/api/treatments` | Yes | Create treatment |
| GET | `/api/treatment-plans` | Yes | List treatment plans |
| POST | `/api/treatment-plans` | Yes | Create treatment plan |
| GET | `/api/patient-packages` | Yes | List patient packages |
| POST | `/api/patient-packages` | Yes | Purchase package for patient |

## Clinical Notes & Documents

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/clinical-notes` | Yes | List clinical notes for patient |
| POST | `/api/clinical-notes` | Yes | Create clinical note |
| GET | `/api/documents` | Yes | List documents for patient |
| POST | `/api/documents` | Yes | Upload document |
| GET | `/api/vitals` | Yes | List vitals for patient |
| POST | `/api/vitals` | Yes | Record vitals |

## Communication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/communications` | Yes | List communications for patient |
| POST | `/api/communications` | Yes | Send communication (email/WhatsApp) |
| GET | `/api/templates` | Yes | List message templates |
| POST | `/api/templates` | Yes | Create template |
| POST | `/api/templates/seed` | Yes | Seed default templates |

## Dashboard & Reports

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/dashboard` | Yes | Dashboard stats and chart data |
| GET | `/api/reports` | Yes | Report data (period filter: today/week/month/year) |

## Settings

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/settings` | Yes | Get clinic settings |
| PUT | `/api/settings` | Yes | Update clinic settings |

## Insurance

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/insurance` | Yes | List insurance providers and claims |
| POST | `/api/insurance` | Yes | Create insurance provider or claim |

## Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/notifications` | Yes | List user notifications |
| PUT | `/api/notifications` | Yes | Mark notifications as read |

## Reminders

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/reminders` | Yes | List reminders |
| POST | `/api/reminders` | Yes | Create reminder |

## Doctor Portal

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/doctor/dashboard` | Yes (doctor) | Doctor-specific dashboard stats |

## Stripe Payments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/stripe/checkout` | Yes | Create Stripe checkout session |
| POST | `/api/stripe/webhook` | No | Stripe webhook handler |

## Super Admin

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/super-admin/login` | No | Super admin login |
| GET | `/api/super-admin/clinics` | SA | List all clinics with stats |
| GET | `/api/super-admin/stats` | SA | Platform-wide statistics |

## Audit Logs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/audit-logs` | Yes | List audit log entries |

## Public

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/public/clinic/[slug]` | No | Public clinic info by slug |
