# AYUR GATE — User Flows

## 1. New Clinic Registration

```
Visit ayurgate.com
  |
  v
Click "Start Free Trial" -> /register
  |
  v
Fill form: Clinic Name, Owner Name, Email, Phone, Password, Country, City
  |
  v
Submit -> POST /api/clinic/register
  |
  v
System creates: Clinic + Subscription (7-day trial) + Admin User + Settings
  |
  v
Auto-login (JWT cookie set) -> Redirect to /onboarding
  |
  v
Step 1: Clinic Profile (address, contact, email verification)
  |
  v
Step 2: Working Hours (days, hours, duration, currency, tax)
  |
  v
Step 3: Add First Doctor (optional)
  |
  v
"Go to Dashboard" -> JWT reissued with onboardingComplete: true
  |
  v
Dashboard with trial banner showing days remaining
```

## 2. Staff Login

```
Visit /login
  |
  v
Enter email + password
  |
  v
[If 2FA enabled] -> Enter Google Authenticator code
  |
  v
JWT created with role + clinicId
  |
  v
Redirect based on role:
  - admin/receptionist/staff -> /dashboard
  - doctor/therapist -> /doctor
```

## 3. Patient Registration

```
Dashboard -> Patients -> "Add Patient"
  |
  v
Fill form: Name, NRIC, Phone, DOB, Gender, Address, Medical History
  |
  v
Duplicate detection runs (name + phone match)
  |
  v
NRIC validation (Singapore checksum) + Phone normalization
  |
  v
Submit -> POST /api/patients
  |
  v
Auto-generate Patient ID (P10001, P10002, ...)
  |
  v
Redirect to patient detail page
```

## 4. Appointment Booking

```
Dashboard -> Appointments -> "New Appointment"
  |
  v
Select Patient (search by name/phone)
  |
  v
Select Doctor -> System loads doctor's available slots
  |
  v
Select Date + Time Slot
  |
  v
Choose Appointment Type (Consultation/Follow-up/Procedure)
  |
  v
Optionally link to Treatment or Package
  |
  v
Submit -> POST /api/appointments
  |
  v
Appointment appears on calendar
  |
  v
Status updates: Scheduled -> Confirmed -> In-Progress -> Completed
```

## 5. Billing Flow

```
Patient visits clinic -> Appointment completed
  |
  v
Billing -> "Create Invoice"
  |
  v
Select Patient -> Add line items:
  - Consultation fee (from doctor's fee)
  - Treatment charges
  - Medicine items (from inventory)
  - Package sessions
  - Custom items
  |
  v
Apply discount (% or fixed) -> Calculate tax (GST)
  |
  v
Submit -> POST /api/invoices
  |
  v
Invoice created with status: "unpaid"
  |
  v
Record payment: Cash / Card / Bank Transfer / PayNow
  |
  v
If full payment: Status -> "paid"
If partial: Status -> "partial", balance tracked
  |
  v
Generate PDF receipt -> Print or email to patient
```

## 6. Prescription Flow

```
Doctor views patient -> "New Prescription"
  |
  v
Add medicines (search from inventory database)
  |
  v
Set dosage, frequency, duration, instructions for each
  |
  v
Add diagnosis notes
  |
  v
Submit -> POST /api/prescriptions
  |
  v
Options:
  - Print PDF (clinic letterhead)
  - Share via WhatsApp
  - Convert to Invoice (auto-creates billing items)
```

## 7. Inventory Purchase & Receiving

```
Inventory -> Purchase Orders -> "New PO"
  |
  v
Select Supplier -> Add items (or use Smart Suggestions)
  |
  v
Submit PO -> Status: "pending"
  |
  v
When stock arrives: Open PO -> "Receive"
  |
  v
Enter received quantities (may differ from ordered)
  |
  v
Confirm -> Stock quantities auto-updated
  |
  v
PO status -> "received"
```

## 8. Stock Transfer Between Branches

```
Inventory -> Transfers -> "New Transfer"
  |
  v
Select From Branch -> Select To Branch
  |
  v
Add items + quantities (or load from Transfer Template)
  |
  v
Submit -> Status: "pending"
  |
  v
Receiving branch reviews -> "Accept" or "Reject"
  |
  v
On accept: Stock deducted from source, added to destination
  |
  v
Notification sent to relevant staff
```

## 9. Staff Invite

```
Admin -> Staff -> "Add Staff"
  |
  v
Fill: Name, Email, Role, Phone
  |
  v
For doctors: Add Specialization, Fee, Schedule
  |
  v
Toggle "Send Email Invite" ON
  |
  v
Submit -> POST /api/staff
  |
  v
System: Creates User record + generates invite token
  |
  v
Email sent with branded template: "You're invited to join [Clinic Name]"
  |
  v
Staff clicks link -> /invite/[token]
  |
  v
Sets password -> Account activated -> Can login
```

## 10. Trial to Paid Conversion

```
Trial expires (7 days after registration)
  |
  v
TrialBanner shows "Trial Expired" -> CTA to /pricing
  |
  v
User selects plan (Starter or Professional, Monthly or Annual)
  |
  v
Click "Subscribe" -> Stripe Checkout session created
  |
  v
Stripe hosted checkout page -> Enter card details
  |
  v
Payment successful -> Stripe webhook fires
  |
  v
POST /api/stripe/webhook:
  - Update ClinicSubscription: plan, status, period dates
  - Set Stripe customer ID and subscription ID
  |
  v
User redirected back -> Full access restored
```

## 11. Doctor Portal Daily Workflow

```
Doctor logs in -> Redirected to /doctor
  |
  v
Doctor Dashboard shows:
  - Today's appointment count
  - Pending appointments
  - Patient stats
  - Low stock alerts
  |
  v
Click appointment -> View patient details
  |
  v
Update status: "In Progress" -> "Completed"
  |
  v
Add clinical notes (diagnosis, examination, treatment)
  |
  v
Create prescription if needed
  |
  v
Next appointment...
```

## 12. Email Verification

```
During onboarding (Step 1) or via dashboard banner:
  |
  v
Click "Send Code" -> POST /api/verify-email { action: "send" }
  |
  v
6-digit OTP emailed to clinic email
  |
  v
Enter code in input field
  |
  v
Click "Verify" -> POST /api/verify-email { action: "verify", code: "123456" }
  |
  v
Success: emailVerified = true on Clinic record
  |
  v
Banner disappears from dashboard
```
