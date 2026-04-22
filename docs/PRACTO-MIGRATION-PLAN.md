# Practo → AyurGate Data Migration Plan

## Ayur Centre Pte Ltd — Singapore

**Prepared:** 10 April 2026
**Status:** Planning Phase
**Branches:** Bedok (Main) + Jurong

---

## 1. Overview

Migrate all clinic data from Practo to AyurGate for both branches of Ayur Centre Pte Ltd. Bedok is the main/primary branch. Jurong is the secondary branch.

### Data Volume (Jurong Branch — Already Exported)

| Data Type | Records | Status |
|-----------|---------|--------|
| Patients | ~7,354 | Exported ✅ |
| Appointments | ~40,790 | Exported ✅ |
| Invoices | ~23,701 | Exported ✅ |
| Payments | ~23,947 | Exported ✅ |
| Treatments Done | ~9,419 | Exported ✅ |
| Treatment Plans | ~11,481 | Exported ✅ |
| Clinical Notes | ~8,470 | Exported ✅ |
| Prescriptions | ~5,215 | Exported ✅ |
| Procedure Catalog | ~125 services | Exported ✅ |
| Expenses | 0 (empty) | No data |
| Inventory/Stock | Unknown | In Excel (separate) 📋 |

### Bedok Branch — NOT YET EXPORTED
- Need to export from Practo (same format)
- Expected to have equal or more records (main branch)

---

## 2. Documents Needed from Ayur Centre

### Must Have (Before Migration Starts)

| # | Document | Purpose | Format |
|---|----------|---------|--------|
| 1 | **Bedok Practo Export** | All 10 CSV files (same as Jurong) | CSV files |
| 2 | **Inventory Excel — Jurong** | Current stock, purchase prices, suppliers | Excel (.xlsx) |
| 3 | **Inventory Excel — Bedok** | Current stock, purchase prices, suppliers | Excel (.xlsx) |
| 4 | **Doctor/Practitioner List** | All doctors across both branches with correct names | Excel or list |
| 5 | **Medicine Master List** | Approved/correct spelling of all medicines | Excel or list |
| 6 | **Branch Details** | Address, phone, email, operating hours for each branch | Text/doc |

### Nice to Have (Helps Quality)

| # | Document | Purpose |
|---|----------|---------|
| 7 | **Supplier List** | Supplier names, contacts, what they supply |
| 8 | **Treatment Price List** | Current prices (may differ from Practo historical data) |
| 9 | **Patient Groups/Categories** | VIP patients, corporate patients, etc. |
| 10 | **Staff List** | Therapists, receptionists — for user account creation |

---

## 3. Key Challenges & Solutions

### 3.1 Duplicate Medicine Names
**Problem:** Same medicine spelled differently in Practo.

| Example Duplicates | Should Be |
|-------------------|-----------|
| ASHTA CHURNAM - 50 GM | Ashta Churnam 50g |
| ASHTA CHOOMAM 50gms | Ashta Churnam 50g |
| Ashta Choornam | Ashta Churnam 50g |
| AVIPATHI CHOORNAM | Avipathi Churnam |
| AVIPATHI CHURNAM | Avipathi Churnam |
| ANU TAILAM | Anu Tailam |
| ANU THAILAM | Anu Tailam |
| AYYAPPALAKERA TAILAM | Ayyappalakera Tailam |
| AYYAPPALAKERA THAILAM | Ayyappalakera Tailam |

**Estimated:** ~321 retail products + ~341 prescribed drugs → probably ~200-250 unique after cleaning

**Solution:**
1. We generate a de-duplication report (automated fuzzy matching)
2. Ayur Centre team reviews and confirms correct names
3. We build a mapping table (old name → correct name)
4. All imports use the mapping table

**Action Required:** Provide a master medicine list with correct spellings, or review our generated mapping.

---

### 3.2 Multi-Branch Patient De-duplication
**Problem:** Same patient may visit both Bedok and Jurong branches. Practo exports them as separate records.

**Matching Strategy:**
- **Primary match:** Mobile number (most reliable — Singapore numbers are unique)
- **Secondary match:** NRIC/National ID (if available)
- **Tertiary match:** Name + Date of Birth (fuzzy)

**Scenarios:**

| Scenario | Action |
|----------|--------|
| Same mobile in both branches | Merge → single patient, linked to both branches |
| Same NRIC in both branches | Merge → single patient |
| Same name but different mobile | Flag for manual review |
| Exists in only one branch | Import as-is |

**Action Required:** Confirm that mobile number is the best unique identifier for your patients.

---

### 3.3 Doctor/Practitioner Mapping
**Problem:** Practo has doctor names as free text (e.g., `'Dr. Karthikeyan'`, `'Siju John'`). Need to map to AyurGate practitioner accounts.

**Solution:**
1. Extract all unique doctor names from both branches
2. Ayur Centre confirms correct name + which branch they work at
3. Create practitioner accounts in AyurGate
4. Map Practo names → AyurGate practitioner IDs

**Action Required:** Provide a list of all current and past doctors/therapists with:
- Full name
- Branch(es) they work at
- Currently active? (yes/no)

---

### 3.4 Inventory — Missing Stock Data
**Problem:** Practo doesn't export stock levels. Only sales history is available.

**What Practo Gives Us:**
- ✅ Product names (from Invoices + Prescriptions)
- ✅ Selling prices
- ✅ Sales history (what was sold, when, to whom)

**What's Missing (Need from Excel):**
- ❌ Current stock quantities
- ❌ Purchase/cost prices
- ❌ Supplier information
- ❌ Batch numbers
- ❌ Expiry dates
- ❌ Reorder levels

**Action Required:** Share inventory Excel files for both branches.

---

### 3.5 Data Quality — Extra Quotes
**Problem:** Practo CSV export wraps values in extra single quotes.
- `'B5347'` instead of `B5347`
- `"'R. Sundaram'"` instead of `R. Sundaram`
- `"'2018-08-26 18:30:00'"` instead of `2018-08-26 18:30:00`

**Solution:** Automated cleaning during import (strip extra quotes). No action needed from clinic.

---

### 3.6 Patient Number Format
**Problem:** Practo uses format like `B5347`. AyurGate has its own patient ID system.

**Solution:**
- Store Practo patient number as `legacyId` or `externalRef` field
- Generate new AyurGate patient IDs
- Maintain a mapping table for reference during transition

**Action Required:** Do you want to keep the Practo patient numbers visible (e.g., show "B5347" alongside the new ID) for a transition period?

---

## 4. Migration Phases

### Phase 1: Preparation (Week 1)
| Task | Owner | Status |
|------|-------|--------|
| Export Bedok data from Practo (all 10 CSV files) | Ayur Centre | ⬜ Pending |
| Share Inventory Excel — Jurong | Ayur Centre | ⬜ Pending |
| Share Inventory Excel — Bedok | Ayur Centre | ⬜ Pending |
| Share Doctor/Staff list for both branches | Ayur Centre | ⬜ Pending |
| Review medicine name de-duplication report | Ayur Centre | ⬜ Pending |
| Build import tool (CSV parser + cleaner + validator) | Dev Team | ⬜ Pending |
| Build de-duplication matching engine | Dev Team | ⬜ Pending |

### Phase 2: Bedok Import — Main Branch First (Week 2)
| Task | Owner | Status |
|------|-------|--------|
| Set up Bedok as primary clinic in AyurGate | Dev Team | ⬜ |
| Import Procedure Catalog (treatments + services) | Dev Team | ⬜ |
| Import Inventory (Excel + Practo retail products) | Dev Team | ⬜ |
| Import Patients | Dev Team | ⬜ |
| Import Appointments (historical) | Dev Team | ⬜ |
| Import Clinical Notes | Dev Team | ⬜ |
| Import Prescriptions | Dev Team | ⬜ |
| Import Invoices + Payments | Dev Team | ⬜ |
| **Validation checkpoint** — Ayur Centre reviews Bedok data | Ayur Centre | ⬜ |

### Phase 3: Jurong Import — Second Branch (Week 2-3)
| Task | Owner | Status |
|------|-------|--------|
| Set up Jurong as branch under Ayur Centre | Dev Team | ⬜ |
| Import Procedure Catalog | Dev Team | ⬜ |
| Import Inventory | Dev Team | ⬜ |
| Import Patients (with cross-branch de-duplication) | Dev Team | ⬜ |
| Import Appointments | Dev Team | ⬜ |
| Import Clinical Notes | Dev Team | ⬜ |
| Import Prescriptions | Dev Team | ⬜ |
| Import Invoices + Payments | Dev Team | ⬜ |
| **Validation checkpoint** — Ayur Centre reviews Jurong data | Ayur Centre | ⬜ |

### Phase 4: Validation & Go-Live (Week 3)
| Task | Owner | Status |
|------|-------|--------|
| Spot-check 50 random patients (data matches Practo) | Ayur Centre | ⬜ |
| Verify cross-branch patients are merged correctly | Ayur Centre | ⬜ |
| Verify inventory stock counts are correct | Ayur Centre | ⬜ |
| Verify financial totals match (Invoices + Payments) | Ayur Centre | ⬜ |
| Create staff login accounts | Dev Team | ⬜ |
| Train staff on AyurGate | Ayur Centre | ⬜ |
| Go live — switch from Practo to AyurGate | Both | ⬜ |
| Run Practo + AyurGate in parallel for 1 week (safety) | Ayur Centre | ⬜ |

---

## 5. Data Mapping — Practo → AyurGate

### Patients
| Practo Field | AyurGate Field | Notes |
|-------------|---------------|-------|
| Patient Number | externalRef / legacyId | Keep for reference |
| Patient Name | name | Clean extra quotes |
| Mobile Number | phone | Primary de-dup key |
| Email Address | email | |
| Gender | gender | M/F → Male/Female |
| Date of Birth | dateOfBirth | |
| National Id | nationalId (NRIC) | Sensitive — encrypt |
| Address | address | |
| Blood Group | bloodGroup | |
| Medical History | medicalHistory | |
| Referred By | referralSource | |
| Groups | tags | |
| Remarks + Patient Notes | notes | Combine both |

### Appointments
| Practo Field | AyurGate Field | Notes |
|-------------|---------------|-------|
| Date | scheduledAt | |
| Patient Number | patientId | Via mapping table |
| DoctorName | practitionerId | Via doctor mapping |
| Status | status | Map: Scheduled → confirmed |
| Notes | notes | |
| Checked In At | checkedInAt | |
| Checked Out At | checkedOutAt | |

### Invoices
| Practo Field | AyurGate Field | Notes |
|-------------|---------------|-------|
| Date | date | |
| Invoice Number | invoiceNumber | Keep Practo number |
| Patient Number | patientId | Via mapping |
| Doctor Name | practitionerId | Via mapping |
| Treatment Name | lineItem.name | |
| Unit Cost | lineItem.unitPrice | |
| Quantity | lineItem.quantity | |
| Discount + DiscountType | lineItem.discount | PERCENT or AMOUNT |
| Type | lineItem.type | treatment or retail |
| Tax name + Tax Percent | lineItem.tax | |

### Payments
| Practo Field | AyurGate Field | Notes |
|-------------|---------------|-------|
| Date | date | |
| Receipt Number | receiptNumber | |
| Invoice Number | invoiceId | Link to invoice |
| Amount Paid | amount | |
| Payment Mode | paymentMethod | Cash/Card/etc |
| Card Type | cardType | |
| Refund | isRefund | |
| Refunded amount | refundAmount | |

### Prescriptions
| Practo Field | AyurGate Field | Notes |
|-------------|---------------|-------|
| Date | date | |
| Patient Number | patientId | Via mapping |
| Drug Name | medication.name | Use cleaned name |
| Drug Type | medication.type | |
| Dosage + Dosage Unit | medication.dosage | Combine |
| Before Food / After Food | medication.timing | |
| Morning/Afternoon/Night | medication.schedule | |
| Duration + Duration Unit | medication.duration | |
| Instruction | medication.instructions | |

### Inventory (from Excel + Practo)
| Source | AyurGate Field | Notes |
|--------|---------------|-------|
| Practo: Treatment Name (retail) | product.name | Cleaned/de-duped |
| Practo: Unit Cost | product.sellingPrice | |
| Excel: Stock quantity | product.currentStock | |
| Excel: Purchase price | product.costPrice | |
| Excel: Supplier | product.supplier | |
| Excel: Batch number | product.batchNumber | |
| Excel: Expiry date | product.expiryDate | |

---

## 6. Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Data loss during migration | High | Full backup before import, rollback plan |
| Duplicate patients across branches | Medium | Automated matching + manual review |
| Wrong medicine mappings | Medium | Clinic reviews de-dup report before import |
| Financial data mismatch | High | Verify totals match Practo reports |
| Staff resistance to new system | Medium | Training + parallel run period |
| Missing inventory data | Low | Manual stock count as fallback |

---

## 7. Checklist — What Ayur Centre Needs to Prepare

- [ ] Export Bedok branch data from Practo (all CSV files)
- [ ] Share Jurong inventory Excel
- [ ] Share Bedok inventory Excel
- [ ] List of all doctors/therapists (both branches, current + past)
- [ ] Review medicine name de-duplication report (we will generate this)
- [ ] Confirm patient de-duplication key (mobile number recommended)
- [ ] Decide: show old Practo patient numbers? (yes/no)
- [ ] Nominate 1-2 staff members for validation/testing
- [ ] Pick a go-live date

---

## 8. Timeline Summary

| Week | Activity |
|------|----------|
| **Week 1** | Collect documents + Build import tools |
| **Week 2** | Import Bedok (main) + Start Jurong |
| **Week 3** | Complete Jurong + Validation + Staff training |
| **Week 3-4** | Go live + Parallel run with Practo |

---

*This is a living document. Updated as migration progresses.*
