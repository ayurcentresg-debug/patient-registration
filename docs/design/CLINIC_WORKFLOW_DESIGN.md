# Clinic Workflow & Package Management System — Design Document

**Ayurveda Clinic Management System | Singapore | CASEtrust Compliant**
**Date:** 2026-03-27 | **Version:** 1.0

---

## Table of Contents

1. [Patient Journey Workflow](#1-patient-journey-workflow)
2. [Package Tiers & Pricing](#2-package-tiers--pricing)
3. [Package Lifecycle Management](#3-package-lifecycle-management)
4. [Installment Payment Handling](#4-installment-payment-handling)
5. [Family Group & Multi-User Access](#5-family-group--multi-user-access)
6. [Cancellation & No-Show Policy](#6-cancellation--no-show-policy)
7. [Automated Communication System](#7-automated-communication-system)
8. [Refund & Cancellation Workflow](#8-refund--cancellation-workflow)
9. [Database Schema Extensions](#9-database-schema-extensions)
10. [Technical Architecture](#10-technical-architecture)
11. [Legal Terms & Conditions](#11-legal-terms--conditions)
12. [Implementation Roadmap](#12-implementation-roadmap)

---

## 1. Patient Journey Workflow

### Visual Workflow Diagram (All Patient Paths)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BOOKING STAGE                                │
│                                                                     │
│  Phone / Walk-in / Online                                           │
│       │                                                             │
│       ▼                                                             │
│  ┌─────────────────────┐                                            │
│  │  Service Selection   │                                            │
│  │  ○ Consultation Only │                                            │
│  │  ○ Treatment Only    │                                            │
│  │  ○ Both (Consult +   │                                            │
│  │    Treatment)        │                                            │
│  └────────┬────────────┘                                            │
│           │                                                          │
│  ┌────────▼────────────┐    ┌──────────────────────┐                │
│  │ Existing Patient?    │    │ PACKAGE CHECK         │                │
│  │ Yes → Show active    │───▶│ Has active package?   │                │
│  │       packages       │    │ Yes → Apply session   │                │
│  │ No  → New registration│    │ No  → Single / Buy    │                │
│  └────────┬────────────┘    └──────────────────────┘                │
└───────────┼─────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     REGISTRATION / CHECK-IN                         │
│                                                                     │
│  ┌─────────────────────┐                                            │
│  │ Verify / Complete     │                                            │
│  │ Registration Form     │                                            │
│  │ • Confirm service type│                                            │
│  │ • Modify if needed    │                                            │
│  │ • Sign consent forms  │                                            │
│  └────────┬────────────┘                                            │
└───────────┼─────────────────────────────────────────────────────────┘
            │
    ┌───────┴────────┬──────────────────┐
    ▼                ▼                  ▼
┌─────────┐   ┌───────────┐   ┌──────────────┐
│CONSULT  │   │TREATMENT  │   │BOTH          │
│ONLY     │   │ONLY       │   │              │
└────┬────┘   └─────┬─────┘   └──────┬───────┘
     │              │                 │
     ▼              │          ┌──────▼───────┐
┌──────────┐        │          │ Consultation  │
│Doctor    │        │          │ First         │
│Consult   │        │          └──────┬───────┘
└────┬─────┘        │                 │
     │              │          ┌──────▼───────┐
     ▼              │          │ Doctor Decides│
┌──────────────┐    │          │ Next Step:    │
│Doctor Decision│    │          │ ○ Meds Only   │
│              │    │          │ ○ Treatment   │
│○ Meds Only   │    │          │ ○ Both        │
│○ Treatment   │    │          │ ○ No action   │
│○ Both        │    │          └──────┬───────┘
│○ Follow-up   │    │                 │
│○ No action   │    ▼                 ▼
└──────┬───────┘    │          ┌──────────────┐
       │            │          │ Route to      │
       ▼            │          │ Treatment OR  │
┌──────────────────────────────┤ Pharmacy OR   │
│         TREATMENT PATH       │ Both          │
│                              └───────────────┘
│  ┌─────────────────────────┐
│  │ Package or Single?       │
│  │                          │
│  │ Has Package → Deduct     │
│  │ No Package → Buy or      │
│  │   Single Session         │
│  └────────┬────────────────┘
│           ▼
│  ┌─────────────────────────┐
│  │ Therapist Assignment     │
│  │ (Gender-matched)         │
│  │ → Treatment Session      │
│  └────────┬────────────────┘
└───────────┼──────────────────────────────────────────────────────────
            │
            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        BILLING / CHECKOUT                           │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Consultation  │  │ Treatment    │  │ Pharmacy     │              │
│  │ Fee           │  │ (Session or  │  │ (Inventory-  │              │
│  │               │  │  Package     │  │  based)      │              │
│  │               │  │  deduction)  │  │              │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         └─────────────────┼─────────────────┘                       │
│                           ▼                                          │
│                ┌──────────────────┐                                  │
│                │ Combined Invoice  │                                  │
│                │ (All line items)  │                                  │
│                │                   │                                  │
│                │ Payment:          │                                  │
│                │ Cash / Card / UPI │                                  │
│                │ / Insurance       │                                  │
│                └──────────────────┘                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Decision Points

| Decision Point | Who Decides | Options | System Action |
|---|---|---|---|
| Service type at booking | Patient | Consult / Treatment / Both | Sets workflow path |
| Modify service at check-in | Patient + Receptionist | Change service type | Updates appointment |
| Post-consultation action | Doctor | Meds / Treatment / Both / None | Creates prescription/treatment order |
| Package vs single session | Patient | Buy package or pay per session | Routes to billing path |
| Therapist assignment | System (auto) | Gender-matched available therapist | Filters by gender + availability |

---

## 2. Package Tiers & Pricing

### Baseline Reference
Single session base rate: **S$70/session** (varies by treatment S$40–S$95)

### Recommended Package Tiers

| Tier | Sessions | Discount | Per Session | Total | Savings | Target Patient |
|---|---|---|---|---|---|---|
| **Single Session** | 1 | 0% | S$70.00 | S$70.00 | — | First-timers, one-off |
| **Starter (5)** | 5 | 10% | S$63.00 | S$315.00 | S$35 | Trial commitment |
| **Standard (10)** | 10 | 20% | S$56.00 | S$560.00 | S$140 | Regular patients |
| **Premium (20)** | 20 | 25% | S$52.50 | S$1,050.00 | S$350 | Committed long-term |
| **Annual Wellness** | 36 | 30% | S$49.00 | S$1,764.00 | S$756 | Chronic care/family |

**Why these tiers work for Ayurveda:**
- Ayurveda treatments (Panchakarma, Abhyanga) require multiple sequential sessions for efficacy — 5-session minimum is typical for a treatment course
- 10-session (Standard) aligns with a standard Panchakarma protocol
- 20+ sessions serve chronic conditions (arthritis, skin disorders) requiring sustained care
- **vs Spa/Gym:** Spas typically offer 5/10/20 packages; gyms use monthly memberships. Ayurveda benefits from session-based (not time-based) since treatments are clinical, not recreational

### Alternative Pricing Models

#### A. Condition-Based Packages
| Package | Includes | Price | Rationale |
|---|---|---|---|
| Panchakarma Detox | 7 Abhyanga + 5 Swedana + 3 Vasti | S$1,200 | Full protocol pricing |
| Back Pain Relief | 8 Kati Vasti + 4 Pizhichil | S$890 | Condition-specific |
| Stress Management | 6 Shirodhara + 4 Abhyanga | S$780 | Wellness outcome |

**Ayurveda advantage:** Condition-based packages mirror clinical protocols — patients understand they're buying a treatment plan, not just sessions. This differs from spas (which sell relaxation bundles) and gyms (which sell access time).

#### B. Membership Model (Monthly)
| Plan | Sessions/Month | Monthly Fee | Effective Per Session |
|---|---|---|---|
| Wellness Basic | 2 | S$120 | S$60 |
| Wellness Plus | 4 | S$210 | S$52.50 |
| Wellness Premium | 8 | S$380 | S$47.50 |

**Note:** Monthly membership works better for maintenance patients (post-treatment phase), not during active Panchakarma protocols. Spa/gym industries prefer this model, but Ayurveda clinics should offer it as a complement, not primary.

#### C. Gift Vouchers
Gift vouchers operate identically to patient packages with these additions:
- Purchaser details stored separately from recipient
- Voucher code generated (GV-XXXXXX)
- Recipient activates at first use (validity starts from activation, not purchase)
- Transferable by default
- Same expiry, refund, and T&C rules apply
- Can be monetary value (S$X credit) or session-based (X sessions of Treatment Y)

---

## 3. Package Lifecycle Management

### States

```
PURCHASED → ACTIVE → IN_USE → EXHAUSTED
                 │         │
                 │         └→ EXPIRED (validity ended with remaining sessions)
                 │
                 └→ SUSPENDED (payment issue / admin hold)
                 │
                 └→ CANCELLED → REFUNDED
```

### Lifecycle Rules

| Stage | Trigger | System Action |
|---|---|---|
| **Purchase** | Payment confirmed (full or first installment) | Create PackageSubscription, set status=ACTIVE, expiresAt = purchaseDate + 1 year |
| **Activation** | First payment received | Start validity countdown; for gift vouchers, activation on first redemption |
| **Session Use** | Appointment completed | Decrement `sessionsRemaining`, create PackageUsage record |
| **Exhausted** | `sessionsRemaining` = 0 | Status → EXHAUSTED, prompt renewal offer |
| **Expiry** | Current date > `expiresAt` | Status → EXPIRED, notify patient; unused sessions forfeited (unless rollover) |
| **Suspension** | Installment overdue > 7 days | Status → SUSPENDED, block booking |
| **Cancellation** | Patient request + admin approval | Status → CANCELLED, trigger refund workflow |
| **Extension** | Super Admin override | Extend `expiresAt` with reason code + audit log |

### Validity: 1-Year Default (Non-Negotiable)

Aligned with Singapore CASEtrust guidelines and Consumer Protection (Fair Trading) Act:
- **Spa/gym standard:** 1 year is industry standard in Singapore for prepaid packages
- **CASEtrust requirement:** Clear validity period must be stated at point of sale
- **Ayurveda rationale:** Treatment protocols (especially Panchakarma cycles) typically complete within 3-6 months; 1 year provides generous buffer

### Super Admin Extension — Reason Codes

| Code | Reason | Max Extension |
|---|---|---|
| MED | Medical leave / hospitalization | Up to 6 months |
| BRV | Bereavement | Up to 3 months |
| TRV | Extended travel | Up to 3 months |
| HDR | Financial hardship | Up to 3 months |
| CLI | Clinic closure / renovation | Equivalent days |
| OTH | Other (requires written justification) | Up to 3 months |

### Branch Flexibility
- Packages usable at **any branch** — session deducted from same PackageSubscription
- Branch recorded in each PackageUsage for reporting
- No price differential between branches (if pricing varies, the package price at purchase governs)

---

## 4. Installment Payment Handling

### Core Principle
**Sessions unlocked proportionally to payment received.** Patient pays 50% = 50% of sessions available.

### Installment Calculation

For a 10-session package at 20% discount (S$560 total):

| Installment | Amount | Cumulative Paid | Sessions Available | Per-Session Cost |
|---|---|---|---|---|
| 1st (at purchase) | S$280 | S$280 (50%) | 5 sessions | S$56/session |
| 2nd (due in 30 days) | S$280 | S$560 (100%) | 10 sessions | S$56/session |

### Session Availability Formula

```
availableSessions = floor(totalPaid / pricePerSession)
```

Where `pricePerSession` = totalPackagePrice / sessionCount (discounted rate).

### Booking Restriction Logic

```
IF sessionsUsed >= availableSessions THEN
  BLOCK booking
  SEND payment reminder
  MESSAGE: "You've used all sessions covered by your current payment.
            Please pay the remaining balance of S${balanceAmount} to
            unlock sessions ${sessionsUsed + 1} through ${totalSessions}."
```

### Installment Reminder Schedule

| Trigger | Channel | Message |
|---|---|---|
| 7 days before installment due | WhatsApp + Email | Friendly reminder with amount and due date |
| On due date | WhatsApp + SMS | Payment due today with payment link |
| 3 days overdue | WhatsApp + SMS + Email | Urgent: booking restricted until payment |
| 7 days overdue | SMS + Email | Package SUSPENDED, all future bookings cancelled |

### Supported Installment Plans

| Plan | Split | Payment Schedule |
|---|---|---|
| **2 installments** | 50% / 50% | At purchase + 30 days |
| **3 installments** | 40% / 30% / 30% | At purchase + 30 days + 60 days |
| **Monthly (for Annual Wellness)** | 12 equal | Monthly on purchase date |

---

## 5. Family Group & Multi-User Access

### Family Group Structure

```
┌──────────────────────────────────────┐
│           FAMILY GROUP               │
│                                      │
│  Owner (Package Purchaser)           │
│  ├── Self (primary patient)          │
│  ├── Spouse (linked patient)         │
│  ├── Child 1 (linked patient)        │
│  └── Parent (linked patient)         │
│                                      │
│  Shared Package: 20-Session Premium  │
│  Sessions Remaining: 14              │
│  Validity: 2027-03-27                │
└──────────────────────────────────────┘
```

### Permission Model

| Role | Can Book | Can Use Sessions | Can View Balance | Can Add Members | Can Cancel Package | Receives Notifications |
|---|---|---|---|---|---|---|
| **Owner** | Yes | Yes | Yes | Yes | Yes | All (own + family usage) |
| **Adult Member** | Yes (self only) | Yes | Own usage only | No | No | Own appointments only |
| **Minor Member** | No (parent books) | Yes | No | No | No | None (parent notified) |

### Family Usage Notifications (to Owner)

When a family member uses a session, the owner receives:

```
[WhatsApp to Owner]
Package Usage Alert
Your family member {memberName} used 1 session today:
- Treatment: Abhyanga Massage
- Therapist: Dr. Priya
- Branch: Novena
- Date: 27 Mar 2026, 2:00 PM

Remaining Sessions: 13 of 20
Package Valid Until: 27 Mar 2027
```

### Adding Family Members to Package

1. Owner must have an active package
2. Family members must be registered patients linked via FamilyMember relation
3. Owner explicitly grants access via "Share Package" action
4. System verifies family relationship exists in database
5. Max 5 members per family group (configurable)

---

## 6. Cancellation & No-Show Policy

### Recommended Thresholds

| Window | Action | Session Deducted? | Rationale |
|---|---|---|---|
| **24+ hours before** | Free cancellation | No | Industry standard; allows rebooking |
| **4–24 hours before** | Late cancellation | No, but warning issued | Ayurveda prep (oils, herbs) may begin; grace period for clinical relationship |
| **2–4 hours before** | Late cancel with penalty | 0.5 session deducted | Therapist assigned, herbs prepared, slot unreclaimable |
| **< 2 hours before** | Last-minute cancel | 1 full session deducted | Full prep done; therapist idle; mirrors medical practice standards |
| **No-show** | No-show | 1 full session deducted | Standard across medical + wellness industries |

**Industry Comparison:**
- **Medical clinics:** Typically charge full fee for < 24 hour cancellations (stricter)
- **Spas:** Typically charge 50% for < 24 hours, 100% for no-shows
- **Gyms:** Usually no cancellation penalty (class-based) but forfeit session
- **Our recommendation:** The 2-hour hard cutoff for Ayurveda is justified because treatments require physical preparation (heating oils, preparing herbs) that cannot be reused

### Implementation Rules

```
ON appointment.cancel:
  hoursUntil = (appointment.dateTime - now) / 3600000

  IF hoursUntil >= 24:
    status = "cancelled_free"
    sessionsDeducted = 0

  ELIF hoursUntil >= 4:
    status = "cancelled_late_warning"
    sessionsDeducted = 0
    SEND warning: "This is a late cancellation. Future late cancellations
    within 4 hours may incur a 0.5 session charge."
    INCREMENT patient.lateCancelCount

  ELIF hoursUntil >= 2:
    status = "cancelled_late_penalty"
    sessionsDeducted = 0.5  // requires partial deduction support

  ELSE:
    status = "cancelled_last_minute"
    sessionsDeducted = 1

ON appointment.noshow:
  status = "no_show"
  sessionsDeducted = 1
```

### Patient Communication

Cancellation policy is communicated:
1. At package purchase (in T&C)
2. In appointment confirmation message
3. In 24-hour reminder message
4. In cancellation confirmation message (showing deduction if any)

---

## 7. Automated Communication System

### Channel Priority

| Communication Type | Primary | Secondary | Tertiary |
|---|---|---|---|
| Appointment reminders | WhatsApp | SMS | Email |
| Package expiry warnings | Email | WhatsApp | SMS |
| Payment reminders | WhatsApp | SMS | Email |
| Session confirmations | WhatsApp | — | Email |
| Family usage alerts | WhatsApp | — | — |

**Ayurveda-specific rationale:** WhatsApp is the dominant messaging platform in Singapore (85%+ penetration). Appointment reminders via WhatsApp achieve 95%+ read rates vs 20% for email. SMS serves as fallback for patients without WhatsApp.

### Communication Triggers

#### Appointment Reminders
| When | Channel | Message Template |
|---|---|---|
| At booking | WhatsApp + Email | Confirmation with date, time, therapist, preparation instructions |
| 48 hours before | WhatsApp | Reminder with Ayurveda-specific prep tips (e.g., "Please avoid heavy meals 2 hours before your Abhyanga session") |
| 2 hours before | WhatsApp | Final reminder with clinic directions and parking info |
| Post-session (1 hour after) | WhatsApp | Thank you + remaining balance + next appointment suggestion |

#### Package Expiry Warnings
| When | Channel | Urgency | Message |
|---|---|---|---|
| **3 months before** | Email | Low | "Your package has {X} sessions remaining, valid until {date}. Book your next session to stay on track with your wellness plan." |
| **1 month before** | WhatsApp + Email | Medium | "Reminder: {X} sessions expire on {date}. That's about {X} sessions in {30} days — would you like us to schedule them?" |
| **2 weeks before** | WhatsApp + SMS | High | "Urgent: {X} unused sessions expire in 14 days. Call us or book online now to use your remaining sessions." |
| **1 week before** | WhatsApp + SMS + Email | Critical | "FINAL NOTICE: {X} sessions expire on {date}. After this date, unused sessions will be forfeited per our T&C." |

**Rationale for tiered timing:**
- 3 months: Allows patients to plan treatment schedules around work/travel
- 1 month: Creates urgency while providing enough time to book multiple sessions
- 2 weeks: Most patients can accommodate 2-4 sessions in 2 weeks
- 1 week: Last resort; some patients will book only under deadline pressure

#### Post-Session Confirmation
```
[WhatsApp]
Session Complete — {treatmentName}

Thank you, {patientName}!

Session Details:
- Treatment: {treatmentName}
- Therapist: {therapistName}
- Duration: {duration} min
- Branch: {branchName}

Package Status:
- Sessions Used: {used} of {total}
- Sessions Remaining: {remaining}
- Valid Until: {expiryDate}
{IF installment_balance > 0}
- Payment Balance: S${balance} (next installment due {dueDate})
{/IF}

{IF remaining <= 3}
Running low on sessions! Renew now for continued savings.
{/IF}

Book your next session: {bookingLink}
```

### Communication Rules
- **Only send when package is ACTIVE** — no messages for EXPIRED, CANCELLED, or REFUNDED packages
- **Respect quiet hours:** No messages between 9 PM – 8 AM SGT
- **Frequency cap:** Max 1 marketing/reminder message per day per patient
- **Opt-out:** Patients can opt out of non-essential communications (but appointment confirmations and payment reminders are mandatory)

---

## 8. Refund & Cancellation Workflow

### Refund Process Flow

```
Patient Request
     │
     ▼
┌─────────────────────┐
│ Staff Initiates      │
│ Refund in System     │
│                      │
│ • Verify sessions    │
│   used vs purchased  │
│ • Calculate refund   │
│   amount             │
│ • Generate refund    │
│   intimation notice  │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ Patient Receives     │
│ Refund Intimation    │
│                      │
│ • Breakdown shown    │
│ • Refund amount      │
│ • T&C referenced     │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ Digital              │
│ Acknowledgment Form  │
│                      │
│ • Patient reviews    │
│ • E-signature        │
│ • Date stamped       │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ Admin Approval       │
│                      │
│ • Manager sign-off   │
│ • Finance team notif │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐     ┌──────────────────┐
│ Refund Processed     │────▶│ Financial System  │
│                      │     │ Update            │
│ • Payment reversed   │     │ • Sales adjusted  │
│ • Package → REFUNDED │     │ • Insurance coord │
│ • Audit trail logged │     │ • GST adjustment  │
└──────────────────────┘     └──────────────────┘
```

### Refund Calculation Formula

```
sessionsUsed = total sessions - remaining sessions
perSessionRate = packagePrice / totalSessions  (discounted rate, NOT full rate)
usedValue = sessionsUsed * perSessionRate
adminFee = packagePrice * 0.05  (5% administrative fee, max S$50)
refundAmount = totalPaid - usedValue - adminFee

IF refundAmount < 0:
  refundAmount = 0  // No additional charge
```

**Example:** 10-session package at S$560, patient used 3 sessions, paid S$560:
- usedValue = 3 × S$56 = S$168
- adminFee = S$560 × 5% = S$28
- refundAmount = S$560 - S$168 - S$28 = **S$364**

### Digital Acknowledgment Form Template

```
═══════════════════════════════════════════════
REFUND ACKNOWLEDGMENT FORM
{ClinicName} — CASEtrust Accredited
═══════════════════════════════════════════════

Date: {date}
Reference: REF-{refundId}

PATIENT DETAILS
Name: {patientName}
Patient ID: {patientIdNumber}
NRIC/FIN: {nricId}
Contact: {phone}

PACKAGE DETAILS
Package: {packageName} ({treatmentName})
Purchase Date: {purchaseDate}
Purchase Price: S${packagePrice}
Sessions Purchased: {totalSessions}
Sessions Used: {usedSessions}
Sessions Forfeited: {forfeitedSessions}

REFUND CALCULATION
Total Paid:                S${totalPaid}
Value of Used Sessions:   -S${usedValue}
  ({usedSessions} × S${perSessionRate})
Administrative Fee (5%):  -S${adminFee}
───────────────────────────────────
REFUND AMOUNT:             S${refundAmount}

Refund Method: {originalPaymentMethod}
Expected Processing: 7-14 business days

ACKNOWLEDGMENT
I, {patientName}, acknowledge that:
1. I have reviewed the refund calculation above
2. I understand unused sessions are forfeited upon refund
3. I agree to the refund amount of S${refundAmount}
4. I understand this cancels all future bookings under this package

Signature: ____________________  Date: ________

Staff Processed By: {staffName}
Manager Approved By: _______________
═══════════════════════════════════════════════
```

### Insurance Coordination

For practices carrying advance payment insurance (required by CASEtrust for prepaid packages > S$500):

1. **At refund initiation:** System flags if original package value exceeds insurance threshold
2. **Insurance claim adjustment:** Refunded amount reduces the insured liability
3. **Reporting:** Monthly reconciliation report showing:
   - Total prepaid packages outstanding
   - Total insured value
   - Refunds processed (reducing insured liability)
   - Net insured exposure
4. **Compliance:** System prevents refund processing if it would create an under-insured gap

---

## 9. Database Schema Extensions

### New Models Required

```prisma
// ─── Package Subscriptions (Active Packages) ────────────────────────

model PackageSubscription {
  id                String   @id @default(cuid())
  subscriptionNumber String  @unique  // PKG-XXXXXX

  // Owner (purchaser)
  patientId         String

  // Package reference
  treatmentId       String
  packageId         String   // TreatmentPackage reference
  treatmentName     String   // denormalized
  packageName       String   // denormalized

  // Session tracking
  totalSessions     Int
  sessionsUsed      Int      @default(0)
  sessionsRemaining Int      // computed: totalSessions - sessionsUsed

  // Pricing
  totalPrice        Float    // package price at time of purchase
  pricePerSession   Float    // for installment calculations

  // Payment tracking
  totalPaid         Float    @default(0)
  balanceAmount     Float    @default(0)
  installmentPlan   String?  // JSON: [{amount, dueDate, status}]

  // Validity
  purchasedAt       DateTime @default(now())
  activatedAt       DateTime? // for gift vouchers: when first used
  expiresAt         DateTime  // purchasedAt + 1 year

  // Status
  status            String   @default("active")
  // active | suspended | exhausted | expired | cancelled | refunded

  // Branch
  purchaseBranch    String?

  // Gift voucher
  isGiftVoucher     Boolean  @default(false)
  giftVoucherCode   String?  @unique
  purchaserName     String?  // if bought as gift
  purchaserPhone    String?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  patient           Patient  @relation(fields: [patientId], references: [id])
  treatment         Treatment @relation(fields: [treatmentId], references: [id])
  treatmentPkg      TreatmentPackage @relation(fields: [packageId], references: [id])

  usages            PackageUsage[]
  familyAccess      PackageFamilyAccess[]
  installments      PackageInstallment[]
  extensions        PackageExtension[]
  refund            PackageRefund?
}

// ─── Session Usage Tracking ──────────────────────────────────────────

model PackageUsage {
  id                String   @id @default(cuid())
  subscriptionId    String
  appointmentId     String?  // linked appointment

  // Who used it
  usedByPatientId   String   // could be family member
  usedByName        String   // denormalized

  // Session details
  sessionsDeducted  Float    @default(1)  // supports 0.5 for partial deductions
  reason            String   // "session" | "no_show" | "late_cancel" | "consultation"

  // Branch
  branch            String?

  usedAt            DateTime @default(now())

  subscription      PackageSubscription @relation(fields: [subscriptionId], references: [id])
}

// ─── Family Package Access ───────────────────────────────────────────

model PackageFamilyAccess {
  id                String   @id @default(cuid())
  subscriptionId    String
  patientId         String   // family member patient ID
  memberName        String
  accessLevel       String   @default("member") // "owner" | "member" | "minor"
  grantedAt         DateTime @default(now())
  revokedAt         DateTime?

  subscription      PackageSubscription @relation(fields: [subscriptionId], references: [id])
}

// ─── Installment Tracking ────────────────────────────────────────────

model PackageInstallment {
  id                String   @id @default(cuid())
  subscriptionId    String
  installmentNumber Int      // 1, 2, 3...
  amount            Float
  dueDate           DateTime
  paidDate          DateTime?
  status            String   @default("pending") // pending | paid | overdue
  paymentMethod     String?
  paymentReference  String?
  remindersSent     Int      @default(0)

  subscription      PackageSubscription @relation(fields: [subscriptionId], references: [id])
}

// ─── Package Extensions (Super Admin) ────────────────────────────────

model PackageExtension {
  id                String   @id @default(cuid())
  subscriptionId    String
  reasonCode        String   // MED | BRV | TRV | HDR | CLI | OTH
  reasonDetail      String?
  previousExpiry    DateTime
  newExpiry         DateTime
  extendedBy        String   // admin user
  approvedBy        String?  // super admin

  createdAt         DateTime @default(now())

  subscription      PackageSubscription @relation(fields: [subscriptionId], references: [id])
}

// ─── Refund Records ──────────────────────────────────────────────────

model PackageRefund {
  id                String   @id @default(cuid())
  subscriptionId    String   @unique

  // Calculation
  sessionsUsed      Int
  sessionsForfeited Int
  usedValue         Float
  adminFee          Float
  refundAmount      Float

  // Process
  status            String   @default("initiated")
  // initiated | intimation_sent | acknowledged | approved | processed | completed

  // Digital acknowledgment
  acknowledgedAt    DateTime?
  signatureData     String?  // base64 signature image

  // Approval
  processedBy       String?
  approvedBy        String?

  // Payment
  refundMethod      String?
  refundReference   String?
  refundedAt        DateTime?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  subscription      PackageSubscription @relation(fields: [subscriptionId], references: [id])
}

// ─── Consultation Record (Post-Consult Actions) ─────────────────────

model ConsultationRecord {
  id                String   @id @default(cuid())
  appointmentId     String   @unique
  patientId         String
  doctorId          String

  // Doctor's decision
  action            String   // "medication" | "treatment" | "both" | "follow_up" | "none"

  // Prescriptions
  prescriptions     String?  // JSON: [{medicineId, name, dosage, frequency, duration}]

  // Treatment recommendation
  recommendedTreatmentId String?
  recommendedSessions    Int?
  treatmentNotes         String?

  // Follow-up
  followUpDate      DateTime?
  followUpNotes     String?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

### Relation Updates to Existing Models

```prisma
// Add to Patient model:
  packageSubscriptions PackageSubscription[]

// Add to Treatment model:
  subscriptions PackageSubscription[]

// Add to TreatmentPackage model:
  subscriptions PackageSubscription[]

// Add to Appointment model:
  subscriptionId     String?  // link to active package subscription
  packageSubscription PackageSubscription? @relation(...)
  consultationRecord ConsultationRecord?
```

---

## 10. Technical Architecture

### API Integrations Required

#### WhatsApp Business API
- **Provider:** Twilio WhatsApp or WhatsApp Business API (Meta direct)
- **Use:** Appointment reminders, package alerts, payment reminders
- **Template messages:** Pre-approved by Meta for transactional use
- **Cost:** ~S$0.05/message (template) in Singapore

#### SMS Gateway
- **Provider:** Twilio or local SG provider (Nexmo/Vonage)
- **Use:** Fallback for WhatsApp, payment urgency
- **Cost:** ~S$0.04/SMS in Singapore

#### Email
- **Provider:** SendGrid or Amazon SES
- **Use:** Package expiry, formal notices, refund documents, invoices
- **Templates:** HTML responsive templates with clinic branding

#### Payment Gateway
- **Provider:** Stripe SG or PayNow (local)
- **Use:** Online package purchases, installment processing
- **Features needed:** Recurring payments, partial refunds, PayNow QR

### Key API Endpoints (New)

```
# Package Subscriptions
POST   /api/packages/subscribe          — Purchase a package
GET    /api/packages/subscriptions       — List subscriptions (with filters)
GET    /api/packages/subscriptions/:id   — Subscription detail
PUT    /api/packages/subscriptions/:id   — Update (admin)
POST   /api/packages/subscriptions/:id/use  — Record session usage
POST   /api/packages/subscriptions/:id/extend  — Extend validity

# Family Access
POST   /api/packages/subscriptions/:id/family  — Grant family access
DELETE /api/packages/subscriptions/:id/family/:memberId — Revoke

# Installments
GET    /api/packages/subscriptions/:id/installments
POST   /api/packages/subscriptions/:id/installments/:num/pay
POST   /api/packages/installments/check-overdue  — Cron job endpoint

# Refunds
POST   /api/packages/subscriptions/:id/refund/initiate
POST   /api/packages/subscriptions/:id/refund/acknowledge
POST   /api/packages/subscriptions/:id/refund/approve
POST   /api/packages/subscriptions/:id/refund/process

# Gift Vouchers
POST   /api/packages/gift-vouchers  — Create gift voucher
GET    /api/packages/gift-vouchers/:code  — Lookup by code
POST   /api/packages/gift-vouchers/:code/activate

# Consultation Flow
POST   /api/consultations/:appointmentId  — Record consultation outcome
GET    /api/consultations/:appointmentId  — Get consultation record

# Communications
POST   /api/communications/send-reminder
POST   /api/communications/send-expiry-warning
POST   /api/communications/check-scheduled  — Cron job
```

### Cron Jobs / Scheduled Tasks

| Job | Frequency | Action |
|---|---|---|
| Package expiry check | Daily 8 AM | Find packages expiring in 90/30/14/7 days, send reminders |
| Installment due check | Daily 8 AM | Find installments due in 7/0/-3/-7 days, send reminders/suspend |
| Session balance alerts | After each session | Send post-session summary (triggered, not cron) |
| Monthly insurance report | 1st of month | Generate prepaid liability report |

---

## 11. Legal Terms & Conditions

### Template: Package Terms & Conditions

```
═══════════════════════════════════════════════════════════════
TERMS AND CONDITIONS — PREPAID TREATMENT PACKAGES
{Clinic Name} Pte Ltd | UEN: {UEN}
CASEtrust Accredited | Effective: {Date}
═══════════════════════════════════════════════════════════════

1. DEFINITIONS
1.1 "Package" means a prepaid bundle of treatment sessions
    purchased from the Clinic.
1.2 "Owner" means the patient who purchases the Package.
1.3 "Authorized User" means any family member granted access
    to use sessions from the Package by the Owner.
1.4 "Session" means one treatment appointment of the type
    specified in the Package.

2. PURCHASE AND PAYMENT
2.1 Packages may be purchased in full or via approved
    installment plans (2 or 3 installments).
2.2 For installment purchases, sessions are available
    proportionally to payments received.
2.3 Full payment of all installments is due within 90 days
    of purchase unless otherwise agreed.
2.4 Overdue installments (> 7 days) will result in
    suspension of booking privileges.

3. VALIDITY AND EXPIRY
3.1 All Packages are valid for twelve (12) months from the
    date of purchase.
3.2 Unused sessions at the end of the validity period are
    forfeited and non-refundable.
3.3 The Clinic may, at its sole discretion, extend the
    validity period in exceptional circumstances (medical
    leave, bereavement) upon written request with
    supporting documentation.
3.4 Package validity shall not be extended beyond 18 months
    from the original purchase date under any circumstances.

4. USAGE RULES
4.1 Sessions must be booked in advance through the Clinic's
    booking system or by phone.
4.2 Packages are valid at all Clinic branches.
4.3 Each session corresponds to one treatment of the type
    specified at purchase. Treatment type cannot be changed
    after purchase unless approved by management.
4.4 The Clinic reserves the right to assign therapists based
    on availability and clinical suitability.

5. FAMILY SHARING
5.1 Package Owners may authorize up to five (5) registered
    family members to use sessions from their Package.
5.2 Family members must be registered patients of the Clinic
    with a verified family relationship.
5.3 The Owner will be notified when family members use
    sessions.
5.4 The Owner remains responsible for all usage and payments
    regardless of which family member uses the session.

6. CANCELLATION AND RESCHEDULING
6.1 Free cancellation: 24 or more hours before the
    appointment.
6.2 Late cancellation (2-24 hours): First two instances per
    Package are free; subsequent instances may incur a 0.5
    session deduction.
6.3 Last-minute cancellation (less than 2 hours) or
    no-show: 1 full session deducted from the Package.
6.4 The Clinic will make reasonable efforts to accommodate
    rescheduling requests subject to availability.

7. REFUNDS
7.1 Refund requests must be submitted in writing to the
    Clinic.
7.2 Refund amount = Total Paid - (Sessions Used × Per-
    Session Rate) - Administrative Fee (5%, capped at S$50).
7.3 Refunds are processed within 14 business days of
    approved acknowledgment.
7.4 Refunds are made via the original payment method where
    possible.
7.5 No refunds are available for Packages with fewer than 3
    unused sessions remaining.
7.6 Gift vouchers are non-refundable after activation but
    are transferable.

8. GIFT VOUCHERS
8.1 Gift vouchers are activated upon first use by the
    recipient.
8.2 Validity period of 12 months begins from date of first
    activation, not purchase.
8.3 Gift vouchers are transferable to any registered patient
    of the Clinic.
8.4 Unused gift voucher value is non-refundable to the
    purchaser after activation.

9. LIABILITY AND DISCLAIMERS
9.1 The Clinic maintains advance payment insurance in
    accordance with CASEtrust requirements for all prepaid
    packages exceeding S$500.
9.2 In the event of permanent clinic closure, prepaid
    package holders will be refunded the pro-rata unused
    value per the insurance policy.
9.3 The Clinic is not liable for treatment outcomes. All
    treatments are provided based on Ayurvedic principles
    and the professional judgment of qualified practitioners.

10. DATA PROTECTION
10.1 Patient data is handled in accordance with the Personal
     Data Protection Act 2012 (PDPA) of Singapore.
10.2 Usage data, including family member activity, is shared
     only with the Package Owner and authorized Clinic staff.

11. DISPUTE RESOLUTION
11.1 Disputes shall first be resolved through the Clinic's
     internal complaint process.
11.2 Unresolved disputes may be referred to the Consumers
     Association of Singapore (CASE) for mediation.
11.3 These Terms are governed by the laws of Singapore.

12. AMENDMENTS
12.1 The Clinic reserves the right to amend these Terms with
     30 days' written notice to affected Package holders.
12.2 Amendments shall not apply retroactively to reduce the
     value of existing Packages.

Acknowledgment:
I have read, understood, and agree to the above Terms and
Conditions.

Patient Name: ___________________
NRIC/FIN: ___________________
Signature: ___________________
Date: ___________________
═══════════════════════════════════════════════════════════════
```

---

## 12. Implementation Roadmap

### Phase 1: Core Package System (Weeks 1-3)
**Priority: Critical — enables revenue**

1. Database schema: PackageSubscription, PackageUsage, PackageInstallment
2. Package purchase flow (full payment)
3. Session deduction on appointment completion
4. Package balance display in patient profile
5. Booking integration: show active packages at booking time

### Phase 2: Installment & Billing Integration (Weeks 4-5)
**Priority: High — enables flexible payment**

1. Installment plan creation and tracking
2. Session availability calculation (proportional to payment)
3. Installment payment recording
4. Billing system integration: package invoices
5. Booking restriction when sessions exhausted

### Phase 3: Family Sharing (Week 6)
**Priority: Medium — differentiator**

1. PackageFamilyAccess model
2. "Share Package" UI in patient profile
3. Family member booking with package selection
4. Owner notification on family usage

### Phase 4: Communication Automation (Weeks 7-8)
**Priority: High — reduces churn**

1. WhatsApp Business API integration
2. Appointment reminder sequences
3. Package expiry warning sequences
4. Post-session summary messages
5. Payment reminder automation
6. Scheduled jobs for automated triggers

### Phase 5: Consultation Flow & Doctor Actions (Week 9)
**Priority: Medium — clinical workflow**

1. ConsultationRecord model
2. Post-consultation action UI (prescribe meds, recommend treatment, both)
3. Prescription integration with inventory
4. Treatment recommendation flow

### Phase 6: Refund & Compliance (Week 10)
**Priority: Medium — legal requirement**

1. Refund calculation engine
2. Digital acknowledgment form with signature capture
3. Refund approval workflow
4. Insurance liability reporting
5. CASEtrust compliance documentation

### Phase 7: Gift Vouchers & Advanced Features (Weeks 11-12)
**Priority: Low — nice-to-have**

1. Gift voucher creation and activation
2. Package extension (Super Admin)
3. Cancellation policy enforcement (session deduction)
4. Package renewal and loyalty incentives
5. Reporting dashboard (utilization, revenue, expiry)

---

## Enhancement Evaluation

### Partial Session Deduction (0.5 sessions)
**Recommendation: Implement**
- Consultations = 0.5 session deduction from treatment packages
- Late cancellations = 0.5 session penalty
- **Ayurveda benefit:** Allows doctors to offer brief follow-up consults within treatment packages without consuming a full session
- **vs Spa/Gym:** Spas rarely offer this; gyms don't need it. This is unique to clinical settings where consultations complement treatment

### Rollover Policy
**Recommendation: Implement (limited)**
- Allow up to 2 unused sessions to roll over on renewal
- Only available when patient renews (not auto-rollover)
- **Ayurveda benefit:** Treatment plans sometimes extend beyond expected timeline; rollover reduces patient anxiety about losing value and encourages renewal
- **vs Spa/Gym:** Gyms typically don't roll over; some premium spas offer this as loyalty perk

### Package Upgrade/Downgrade
**Recommendation: Implement upgrade only**
- Mid-term upgrade: pro-rata credit from current package applied to new package
- Downgrade: not recommended (creates refund complexity)
- **Ayurveda benefit:** Patients who start with Starter (5) and see results want to upgrade — friction-free upgrade retains them
- **vs Spa/Gym:** Gyms allow plan changes freely; spas typically don't

### Loyalty Incentives
**Recommendation: Implement**
- 1 bonus session on renewal of 10+ session packages
- 5% additional discount on annual renewals
- **Ayurveda benefit:** Ayurveda requires sustained commitment; loyalty rewards reinforce the therapeutic relationship
- **vs Spa/Gym:** Both industries use loyalty rewards extensively; Ayurveda should too

### Branch-Specific Pricing
**Recommendation: Defer**
- Not needed for Singapore market (small geography)
- Only implement if expanding to multiple cities/countries
- **Current approach:** Package price at purchase applies across all branches

### Corporate/Family Group Packages
**Recommendation: Implement in Phase 7**
- Bulk discount: 5% on top of package discount for groups of 3+
- Family package UI already supports the access model
- **Ayurveda benefit:** Family wellness is central to Ayurvedic philosophy; group packages align with this
- **vs Spa/Gym:** Corporate packages are standard in gyms; family packages are rare in spas
