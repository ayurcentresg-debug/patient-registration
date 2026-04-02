# AYUR GATE -- Database Schema

## Overview
- **Database**: SQLite (via better-sqlite3)
- **ORM**: Prisma 7.5
- **Total Models**: 44
- **Multi-tenancy**: Most models include `clinicId` for tenant isolation

## Model Categories

### Core / Multi-Tenant
| Model | Purpose | Key Fields |
|-------|---------|------------|
| **Clinic** | Tenant/clinic record | name, slug, email, country, currency, timezone, onboardingComplete, emailVerified |
| **ClinicSubscription** | Billing plan per clinic | plan (trial/starter/professional/enterprise), status, trialEndsAt, stripeCustomerId |
| **ClinicSettings** | Clinic configuration | clinicName, address, phone, email, gstRegistrationNo, currency, workingHours, workingDays |
| **User** | Staff members (all roles) | name, email, role, password, staffIdNumber, specialization, schedule, inviteToken |
| **Branch** | Multi-branch locations | name, address, phone, isMain |

### Patient Management
| Model | Purpose | Key Fields |
|-------|---------|------------|
| **Patient** | Patient records | firstName, lastName, nricId, phone, dateOfBirth, gender, medicalHistory (JSON), groups (JSON) |
| **FamilyMember** | Family linkage | patientId, linkedPatientId, relation, memberName |
| **ClinicalNote** | Medical notes | patientId, type (diagnosis/examination/treatment/etc.), title, content, doctor |
| **Document** | File attachments | patientId, name, type, url, size |
| **Vital** | Vitals tracking | patientId, bloodPressure, pulse, temperature, weight, height |
| **Communication** | Message history | patientId, type (email/whatsapp), subject, message, status |
| **Reminder** | Scheduled reminders | patientId, type, scheduledAt, status |

### Appointment System
| Model | Purpose | Key Fields |
|-------|---------|------------|
| **Appointment** | Scheduled visits | patientId, doctorId, date, time, endTime, duration, status, type, treatmentId, packageId |

### Treatment & Packages
| Model | Purpose | Key Fields |
|-------|---------|------------|
| **Treatment** | Available treatments | name, category, description, duration, price |
| **TreatmentPackage** | Multi-session packages | treatmentId, name, sessions, price, validityDays |
| **TreatmentPlan** | Patient treatment plans | patientId, doctorId, diagnosis, status |
| **TreatmentPlanItem** | Items in a plan | planId, treatmentId, sessions, frequency |
| **TreatmentMilestone** | Progress tracking | planId, title, targetDate, status |
| **PatientPackage** | Purchased packages | patientId, packageId, totalSessions, usedSessions, status |
| **PackageSession** | Session usage log | packageId, appointmentId, sessionNumber, date |
| **PackageShare** | Shared packages | packageId, sharedWithPatientId |
| **PackageRefund** | Package refunds | packageId, amount, reason |

### Billing System
| Model | Purpose | Key Fields |
|-------|---------|------------|
| **Invoice** | Bills/invoices | invoiceNumber, patientId, subtotal, tax, discount, total, paidAmount, balanceAmount, status |
| **InvoiceItem** | Line items | invoiceId, description, quantity, unitPrice, amount, itemType |
| **Payment** | Payment records | invoiceId, amount, method (cash/card/transfer), reference |
| **CreditNote** | Refund credits | invoiceId, amount, reason, status |
| **InsuranceProvider** | Insurance companies | name, contactPerson, email, phone |
| **InsuranceClaim** | Insurance claims | patientId, providerId, invoiceId, claimAmount, status |

### Inventory System
| Model | Purpose | Key Fields |
|-------|---------|------------|
| **InventoryItem** | Stock items | name, sku, category, unit, quantity, minStockLevel, costPrice, sellingPrice, expiryDate |
| **InventoryVariant** | Item variants | itemId, name, sku, quantity, costPrice, sellingPrice |
| **StockTransaction** | Stock movements | itemId, type (purchase/sale/adjustment/transfer), quantity, reference |
| **Supplier** | Vendor records | name, contactPerson, email, phone, address |
| **PurchaseOrder** | Purchase orders | supplierId, orderNumber, status, totalAmount |
| **PurchaseOrderItem** | PO line items | orderId, itemId, quantity, unitCost |

### Branch Stock & Transfers
| Model | Purpose | Key Fields |
|-------|---------|------------|
| **BranchStock** | Per-branch inventory | branchId, itemId, quantity, minStockLevel |
| **StockTransfer** | Transfer records | fromBranchId, toBranchId, status, transferNumber |
| **StockTransferItem** | Transfer line items | transferId, itemId, quantity |
| **TransferTemplate** | Saved transfer templates | name, fromBranchId, toBranchId |
| **TransferTemplateItem** | Template line items | templateId, itemId, defaultQuantity |

### Communication
| Model | Purpose | Key Fields |
|-------|---------|------------|
| **MessageTemplate** | Reusable templates | name, type (email/whatsapp/sms), category, subject, body |
| **Notification** | In-app notifications | userId, title, message, type, read, link |

### Prescriptions
| Model | Purpose | Key Fields |
|-------|---------|------------|
| **Prescription** | Digital prescriptions | patientId, doctorId, doctorName, date, diagnosis, notes |
| **PrescriptionItem** | Medicine items | prescriptionId, medicineName, dosage, frequency, duration, instructions |

### System
| Model | Purpose | Key Fields |
|-------|---------|------------|
| **AuditLog** | Activity tracking | userId, action, entity, entityId, details, ipAddress |

## Key Relationships

```
Clinic
 |-- ClinicSubscription (1:1)
 |-- ClinicSettings (1:1)
 |-- User[] (staff members)
 |-- Branch[]
 +-- [All other models via clinicId]

Patient
 |-- FamilyMember[]
 |-- Appointment[]
 |-- ClinicalNote[]
 |-- Document[]
 |-- Vital[]
 |-- Communication[]
 |-- Reminder[]
 |-- Invoice[]
 |-- Prescription[]
 |-- TreatmentPlan[]
 +-- PatientPackage[]

User (Staff)
 |-- Appointment[] (as doctor)
 +-- role: admin | doctor | therapist | pharmacist | receptionist | staff

Invoice
 |-- InvoiceItem[]
 |-- Payment[]
 +-- CreditNote[]

InventoryItem
 |-- InventoryVariant[]
 |-- StockTransaction[]
 +-- BranchStock[]
```

## Indexes

Existing indexes on:
- `Patient`: clinicId, (clinicId + patientIdNumber) unique
- `Appointment`: clinicId, date, patientId, doctorId
- `Invoice`: clinicId, patientId, date
- `User`: clinicId, (clinicId + email) unique, (clinicId + staffIdNumber) unique

**Missing indexes** (to be added):
- `InvoiceItem.invoiceId`
- `Payment.invoiceId`
- `ClinicalNote.patientId`
- `Document.patientId`
