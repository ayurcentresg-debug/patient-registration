# AYUR GATE — Features

## Patient Management
- **Patient Registration**: Comprehensive form with personal details, NRIC/ID validation (Singapore checksum), phone normalization, duplicate detection
- **Medical History**: Stored as JSON — allergies, past conditions, surgical history, medications
- **Family Linking**: Link family members to existing patient records with relationship types (spouse, parent, child, sibling, etc.)
- **Patient Groups**: Tag patients into custom groups for segmentation
- **Patient Merge**: Detect and merge duplicate patient records
- **Document Upload**: Attach files (reports, scans) to patient records
- **Vitals Tracking**: Blood pressure, pulse, temperature, weight, height
- **Photo Upload**: Patient profile photos
- **Patient Search**: Full-text search across name, phone, email, NRIC with pagination (50 per page)

## Appointment Scheduling
- **Calendar Views**: Day, Week, Month views with color-coded status
- **Doctor Slot System**: Each doctor has configurable schedule (working days, hours, slot duration)
- **Appointment Types**: Consultation, Follow-up, Procedure, Emergency
- **Status Workflow**: Scheduled -> Confirmed -> In-Progress -> Completed (or Cancelled/No-Show)
- **Walk-in Support**: Quick registration for unregistered walk-in patients
- **Treatment Linking**: Link appointments to specific treatments and packages
- **Package Sessions**: Auto-deduct sessions from purchased packages
- **Mini Calendar**: Quick date navigation sidebar

## Billing & Invoicing
- **Invoice Generation**: Auto-numbered invoices with line items
- **Item Types**: Consultation fee, treatment, medicine, package, custom
- **Payment Tracking**: Multiple payment methods (cash, card, bank transfer, PayNow)
- **Partial Payments**: Track balance amounts across multiple payments
- **GST/Tax**: Configurable tax rates with GST registration number
- **PDF Export**: Generate printable invoices and receipts
- **Credit Notes**: Issue refunds and credit adjustments
- **Insurance Claims**: Track claims with insurance providers
- **CSV Export**: Export invoice data for accounting

## Prescriptions
- **Digital Prescriptions**: Create prescriptions with medicine items
- **Medicine Database**: Search from inventory medicines
- **Medicine Categories**: Ayurvedic categories (Kashayam, Choornam, Arishtam, Tailam, etc.)
- **Dosage & Instructions**: Dosage, frequency, duration, special instructions
- **PDF Generation**: Print-ready prescription PDFs with clinic letterhead
- **WhatsApp Share**: Send prescription summary via WhatsApp
- **Invoice Conversion**: Convert prescription to billing invoice

## Inventory Management
- **Stock Tracking**: Real-time quantity tracking with min-stock alerts
- **Ayurvedic Categories**: Medicines, Oils, Powders, Decoctions, Tablets, Equipment, etc.
- **Variant Support**: Size/weight variants per item (e.g., 100ml, 200ml, 500ml)
- **Barcode/QR Scanning**: Scan items for stock audit and receiving
- **Stock Audit**: Physical count verification with variance detection
- **Purchase Orders**: Create POs to suppliers, track receiving
- **Smart PO Suggestions**: Auto-suggest items below reorder level
- **Expiry Management**: Track expiry dates, auto-alerts for expiring stock
- **Low Stock Alerts**: Dashboard widget and notification system
- **Stock Movement History**: Visual graph of stock changes over time
- **Reports**: Stock valuation, movement history, expiry reports, fast-moving items
- **CSV Import**: Bulk import inventory from CSV files

## Multi-Branch
- **Branch Management**: Add/manage multiple clinic locations
- **Branch Stock**: Per-branch inventory tracking with min-stock levels
- **Stock Transfers**: Transfer stock between branches with approval workflow
- **Transfer Templates**: Save frequently used transfer configurations
- **Branch Comparison**: Side-by-side stock comparison view
- **Branch-level Reporting**: Filter all reports by branch
- **Transfer Reports**: Track all inter-branch movements

## Treatment & Packages
- **Treatment Catalog**: Define treatments with categories, duration, and pricing
- **Treatment Packages**: Multi-session packages (e.g., 10 sessions of Abhyangam)
- **Package Purchase**: Patients buy packages, sessions auto-tracked
- **Session Logging**: Record each session usage with appointment linkage
- **Package Sharing**: Share packages between family members
- **Package Refunds**: Process refunds on unused sessions
- **Treatment Plans**: Create multi-step treatment plans with milestones

## Staff Management
- **Unified Staff Model**: All roles in one model (Doctor, Therapist, Pharmacist, Receptionist, Admin)
- **Role-Based Access**: Different UI and permissions per role
- **Staff ID Auto-generation**: Prefix-based IDs (D10001, T10001, P10001, R10001, A10001)
- **Schedule Builder**: Configure working days, hours, and slot duration per doctor
- **Email Invites**: Invite staff via email with secure token links (7-day expiry)
- **Password Management**: Admin can trigger password setup for staff

## Doctor Portal
- **Dedicated Dashboard**: Appointment count, patient stats, today's schedule
- **Own Appointments**: View and manage only their own appointments
- **Patient Access**: View patient records linked to their appointments
- **Clinical Notes**: Add diagnosis, examination, and treatment notes
- **Low Stock Alerts**: See inventory alerts relevant to their practice

## Communication
- **WhatsApp Templates**: Pre-built templates for appointment reminders, follow-ups, billing
- **Email Templates**: Branded email templates for patient communication
- **Message History**: Track all sent communications per patient
- **Template Variables**: Dynamic fields ({patientName}, {appointmentDate}, etc.)

## Dashboard & Analytics
- **Stats Cards**: Today's patients, appointments, revenue, pending bills
- **Weekly Revenue Chart**: Line chart of 7-day revenue trend
- **Appointment Status Breakdown**: Pie chart of appointment statuses
- **Monthly Revenue Trend**: Bar chart of revenue over recent months
- **Top Treatments**: Most booked treatments
- **Revenue by Payment Method**: Cash vs Card vs Transfer breakdown
- **Quick Actions**: Fast access to common tasks

## Admin Panel
- **Clinic Settings**: Name, address, contact, logo, GST, working hours, currency
- **Staff Management**: Add/edit/remove staff with role assignment
- **Branch Management**: Add/edit branches
- **Audit Logs**: System activity tracking (infrastructure ready, logging pending)

## Onboarding & Verification
- **3-Step Wizard**: Clinic Profile -> Working Hours -> First Doctor (after trial signup)
- **Email Verification**: 6-digit OTP, non-blocking, 10-min expiry
- **Skip Option**: Users can skip and complete later
- **Welcome Checklist**: Dashboard widget tracking setup progress (planned)

## Subscription & Billing
- **7-Day Free Trial**: Full access, no credit card required
- **Stripe Integration**: Checkout sessions for plan upgrades
- **Plan Tiers**: Starter (basic), Professional (full), Enterprise (custom)
- **Trial Banner**: Countdown shown across all pages
- **Trial Expiry**: Redirect to pricing page when trial ends

## Super Admin Panel
- **Clinic Dashboard**: View all registered clinics
- **Subscription Management**: Monitor plans, trials, payment status
- **User Counts**: Staff and patient counts per clinic
- **Registration Alerts**: Email notification on new clinic signups

## PWA & Mobile
- **Installable**: Add to home screen on mobile devices
- **Service Worker**: Basic caching for offline awareness
- **Responsive Design**: Mobile-first layout with bottom navigation on small screens
- **Touch Targets**: Buttons and inputs sized for mobile interaction

## Accessibility & UX
- **Dark Mode**: Toggle between light and dark themes
- **Loading Skeletons**: Shimmer placeholders while content loads
- **Error Boundaries**: Graceful error handling with branded error pages
- **ARIA Landmarks**: Main content areas tagged with role="main"
- **Toast Notifications**: Consistent success/error feedback
