# AyurGate CME — Complete Platform Plan

**Continuing Medical Education for Ayurveda Practitioners**
Version 1.0 · April 2026

---

## 1. Vision

A dedicated CME platform where Ayurveda doctors, therapists, and students can:
- Discover and enroll in accredited courses, workshops, and conferences
- Earn CME credits required for professional licensing/renewal
- Download official certificates
- Track their learning progress

Instructors and training institutes can:
- List their courses
- Collect payments
- Track enrollments
- Earn commission-adjusted revenue

---

## 2. Product Positioning

| | |
|---|---|
| **Target market** | Singapore, India, Malaysia, UAE, UK |
| **Users — learners** | Ayurveda doctors (BAMS), therapists, students |
| **Users — providers** | Ayurveda colleges, institutes, senior consultants |
| **Monetization** | 15–20% commission per paid enrollment + premium listings |
| **Differentiator** | First Ayurveda-specific CME platform with license renewal tracking |

---

## 3. Domain Strategy

### Recommended: `cme.ayurgate.com` (subdomain)

**Pros:**
- Shares branding with AyurGate (trust)
- Shares user accounts (SSO — existing AyurGate users auto-access)
- Simpler SSL + DNS
- Can share backend infrastructure

**Alternative: `ayurgatecme.com` (separate domain)**
- Standalone branding, independent SEO
- Requires separate SSL, DNS, deployment
- Users need separate account (unless federated SSO)

**Decision matrix:**
- Want to leverage existing AyurGate user base → subdomain
- Want to sell/spin off CME as standalone product → separate domain

---

## 4. Technical Architecture

### Option A — Monorepo with shared infrastructure (Recommended)
```
ayurgate/
├── apps/
│   ├── clinic/          ← existing clinic management
│   └── cme/             ← new CME platform
├── packages/
│   ├── db/              ← shared Prisma schema
│   ├── auth/            ← shared SSO logic
│   └── ui/              ← shared design system
```

**Pros:** Share users/auth, deploy independently, share components

### Option B — Separate Next.js project
```
ayurgate-cme/
├── src/
├── prisma/
└── package.json
```

**Pros:** Full independence, separate deploy pipeline, different tech stack possible

**For this plan, assume Option A (monorepo).**

### Tech stack
- **Frontend:** Next.js 16, React 19, Tailwind CSS 4
- **Backend:** Next.js API routes, Prisma 7.5
- **DB:** PostgreSQL (for CME scale — SQLite won't cut it for marketplaces)
- **Auth:** Shared with AyurGate (JWT cookie, single sign-on)
- **Payments:** Stripe (as already used in AyurGate)
- **Email:** Same SMTP as AyurGate (Resend or Gmail SMTP)
- **PDF:** PDFKit or Puppeteer for certificate generation
- **File storage:** Cloudflare R2 or S3 for course materials, certificates, videos
- **Video hosting:** Mux or Cloudflare Stream (if online courses)
- **Search:** Algolia or MeiliSearch (for course discovery)
- **Analytics:** PostHog (same as AyurGate)

---

## 5. Data Model

### Core entities
```
User (shared with AyurGate)
  ├── CmeProfile
  │     ├── licenseNumber
  │     ├── specialty
  │     ├── requiredCredits (per year)
  │     ├── earnedCredits (this cycle)
  │     └── renewalDate
  │
  └── Enrollment[]
        ├── courseId
        ├── status (enrolled | in-progress | completed | certified)
        ├── paymentStatus
        ├── startedAt, completedAt
        ├── score (if graded)
        └── certificateId

Provider (new model — course creators)
  ├── name (institute / individual)
  ├── accreditationBody
  ├── payoutStripeAccountId
  ├── commissionRate (default 20%)
  └── courses[]

Course
  ├── title, description, thumbnail
  ├── providerId
  ├── type (workshop | conference | online | hybrid)
  ├── category (panchakarma | nutrition | pulse-diagnosis | marma | etc.)
  ├── level (beginner | intermediate | advanced)
  ├── durationHours
  ├── cmeCredits (number of credits earned)
  ├── price + currency
  ├── capacity (max students)
  ├── startDate, endDate (for live events)
  ├── location (physical or "online")
  ├── accreditationIds[]
  ├── syllabus (JSON)
  ├── materials[] (PDFs, videos)
  ├── status (draft | published | cancelled)
  └── enrollments[]

Module (online courses)
  ├── courseId
  ├── title
  ├── videoUrl
  ├── durationMinutes
  ├── order
  ├── quiz[]
  └── passingScore

Quiz / QuizAttempt
  ├── moduleId
  ├── questions (JSON)
  ├── passingScore
  └── attempts[]

Certificate
  ├── enrollmentId
  ├── userId
  ├── courseId
  ├── issueDate
  ├── certificateNumber (AYG-CME-2026-00001)
  ├── accreditationBody
  ├── cmeCredits
  ├── qrCode (verification URL)
  └── pdfUrl

Payment
  ├── enrollmentId
  ├── amount
  ├── stripePaymentIntentId
  ├── status (pending | succeeded | refunded)
  ├── platformFee (20% commission)
  ├── providerPayout (80%)
  └── createdAt

Payout
  ├── providerId
  ├── amount
  ├── stripeTransferId
  ├── period (monthly)
  └── status (pending | paid)

Review
  ├── courseId
  ├── userId (enrolled)
  ├── rating (1-5)
  ├── comment
  └── helpful count

Accreditation
  ├── body (e.g. "NCISM India", "SDGE Dubai")
  ├── name
  ├── code
  └── country
```

---

## 6. Phase 1 — Discovery + Certificates (4 weeks)

### Scope
Core platform for browsing, enrolling, completing, and getting certified.
**No payments yet** — courses are either free or handled externally.

### Week 1 — Foundation
- [ ] Set up subdomain `cme.ayurgate.com`
- [ ] Migrate to PostgreSQL
- [ ] Shared auth with AyurGate (SSO)
- [ ] CME-specific DB models (Prisma migration)
- [ ] Landing page + signup flow
- [ ] User CME profile (license number, specialty, credit tracker)

### Week 2 — Course Catalog
- [ ] Course listing page with filters:
  - Category (Panchakarma, Nutrition, Pulse Diagnosis, Marma, etc.)
  - Level, duration, price (free/paid)
  - Location (online/in-person)
  - Date range
  - Accreditation body
- [ ] Course detail page (syllabus, instructor, dates, reviews)
- [ ] Search bar + autocomplete
- [ ] Category browsing (cards, grid/list toggle)
- [ ] Featured courses carousel on home

### Week 3 — Enrollment + Learning
- [ ] Enrollment flow (register for course)
- [ ] "My Courses" dashboard
- [ ] Progress tracking (for online modules)
- [ ] Video player for online courses (Mux integration)
- [ ] Downloadable materials (PDFs, slides)
- [ ] Quiz/assessment module
- [ ] Attendance tracking for live workshops (QR code check-in)

### Week 4 — Certificates + Credits
- [ ] PDF certificate generation (Puppeteer)
- [ ] QR code verification URL
- [ ] Certificate download page
- [ ] Public verification page (anyone can verify a cert)
- [ ] CME credit accumulation dashboard
- [ ] Credit report export (for licensing boards)
- [ ] Email notifications (enrollment confirm, completion, certificate ready)

### Phase 1 Deliverables
- Learner-facing site fully functional
- Admin can manually add courses
- Free courses work end-to-end
- Certificates are professionally designed and downloadable
- No payment flow yet (placeholder "Enroll" button for paid courses)

---

## 7. Phase 2 — Payments + Commission (3 weeks)

### Scope
Turn the platform into a marketplace with paid enrollments and revenue sharing.

### Week 1 — Provider Onboarding
- [ ] Provider signup flow (institutes / individual experts)
- [ ] Provider dashboard
- [ ] Course creation wizard (multi-step form)
- [ ] Upload course materials (videos, PDFs, images)
- [ ] Draft → Review → Publish workflow
- [ ] Admin moderation (approve/reject courses)
- [ ] Stripe Connect onboarding for providers

### Week 2 — Payments
- [ ] Stripe checkout integration
- [ ] Payment intent creation
- [ ] Commission split (20% platform, 80% provider) via Stripe Connect
- [ ] Payment confirmation → auto-enrollment
- [ ] Receipt generation (PDF)
- [ ] Refund flow (admin-initiated)
- [ ] Discount codes (percentage off, fixed amount)
- [ ] Bulk enrollment discounts (for clinics booking 5+)

### Week 3 — Provider Revenue + Reporting
- [ ] Provider revenue dashboard
- [ ] Monthly payouts (automated via Stripe Connect)
- [ ] Earnings history
- [ ] Student enrollment reports
- [ ] Platform admin dashboard:
  - Total revenue, commission
  - Top providers, top courses
  - Refund requests
  - Payout schedule
- [ ] 1099 / tax reports for providers

### Phase 2 Deliverables
- Providers can self-onboard and list courses
- Full payment processing with commission split
- Automated monthly payouts to providers
- Admin has full visibility into platform revenue

---

## 8. Key Screens

### Learner-facing
1. Landing page (hero, categories, featured, testimonials)
2. Course catalog (grid + filters)
3. Course detail (enrollment CTA, syllabus, reviews)
4. Checkout (Phase 2)
5. My Dashboard (enrolled, completed, credits earned)
6. Course player (video + quiz)
7. Certificate page (view + download)
8. Profile (license info, credit tracker)

### Provider-facing
1. Provider signup
2. Provider dashboard (enrollments, revenue)
3. Course editor
4. Student roster per course
5. Payout history
6. Reviews/ratings

### Admin-facing
1. Course moderation queue
2. Provider approval
3. Revenue reports
4. Accreditation body management
5. Refund requests
6. Featured course management

---

## 9. Integrations Needed

| Integration | Purpose | Phase |
|-------------|---------|-------|
| Stripe | Payments + Connect | 2 |
| Mux / Cloudflare Stream | Video hosting | 1 |
| Cloudflare R2 / S3 | File storage | 1 |
| Resend / Gmail SMTP | Transactional email | 1 |
| PDFKit / Puppeteer | Certificate generation | 1 |
| PostgreSQL (Supabase/Neon) | Database | 1 |
| Algolia / MeiliSearch | Course search | 2 |
| Google Calendar | Add workshops to calendar | 1 |
| Zoom | Live online workshops | 2 |

---

## 10. Business Model

### Revenue streams
1. **Commission on paid courses** (15–20%)
   - Tiered: 20% for <$5k/month providers, 15% for premium partners
2. **Featured listing fees** ($50/month for homepage placement)
3. **Certificate verification API** (sell to licensing boards)
4. **Enterprise packages** (clinics buying bulk licenses for their staff)

### Free tier (to bootstrap)
- 3 course listings free for new providers
- Free certificate for any free course

### Pricing benchmarks (market research)
- CE Broker (US medical CME): 15-20% commission
- Coursera/Udemy: 50% commission (too high for niche)
- Niche platforms (CEUReview, etc.): 20-25%

**Recommended: 20% commission** — fair for niche Ayurveda market

---

## 11. Accreditation Bodies to Partner With

| Body | Country | Notes |
|------|---------|-------|
| NCISM | India | National Commission for Indian System of Medicine |
| SDGE | Dubai | Health Authority |
| Traditional & Complementary Medicine Practitioners Board | Singapore | |
| Malaysian Medical Council | Malaysia | |
| Ayurvedic Medical Association of India (AMAI) | India | Professional body |

**Action:** Get at least 1 partnership lined up before Phase 1 launch to validate credit recognition.

---

## 12. SEO + Discovery Strategy

- SEO-optimized course landing pages (schema.org Course)
- Blog posts: "CME credits for Ayurveda doctors in Singapore"
- Rich snippets for reviews, prices, dates
- Sitemap submission to Google/Bing
- Social sharing cards for each course
- YouTube channel with course previews

---

## 13. Launch Strategy

### Pre-launch (Month -1)
- Recruit 5-10 initial providers (free listings for first 3 courses)
- Partnership with 1 accreditation body (Singapore or India)
- Design certificate template
- Beta invite list from existing AyurGate clinics

### Launch (Month 0)
- `cme.ayurgate.com` goes live
- 20+ courses available at launch
- Mix of free + paid
- Email blast to AyurGate clinic network
- LinkedIn/IG campaign targeting Ayurveda doctors

### Growth (Month 1-3)
- Add 50+ courses
- Self-serve provider onboarding
- First revenue targets
- Collect testimonials

---

## 14. Risks + Mitigations

| Risk | Mitigation |
|------|------------|
| Accreditation not recognized | Partner with recognized body before launch |
| Low provider supply at launch | Recruit 10 initial partners manually |
| Payment disputes | Use Stripe Connect's built-in dispute resolution |
| Video bandwidth costs | Use Mux/Cloudflare Stream (pay-per-use) |
| Certificate fraud | QR code verification + unique cert numbers |
| Regulatory compliance (personal data) | PDPA (SG) + GDPR if serving EU |

---

## 15. Estimated Effort

| Phase | Duration | Full-time dev-weeks |
|-------|----------|---------------------|
| Phase 1 | 4 weeks | 4 |
| Phase 2 | 3 weeks | 3 |
| Admin tooling | 1 week | 1 |
| Launch prep | 1 week | 1 |
| **Total** | **~9 weeks** | **9 dev-weeks** |

With 1 developer full-time: ~2 months to launch.
With 1 dev + 1 designer: ~6 weeks.

---

## 16. Infrastructure Costs (Monthly Estimate)

| Service | Free/Low | Scale (500+ users) |
|---------|----------|-------------------|
| Railway hosting | $20 | $50 |
| PostgreSQL (Supabase) | $0 | $25 |
| Mux video | $0 (1GB) | $30 (10GB) |
| R2/S3 storage | $5 | $15 |
| Stripe | 2.9% + $0.30 per txn | same |
| Email (Resend) | $0 (3k) | $20 (50k) |
| Domain + SSL | $1/mo | $1/mo |
| Algolia search | $0 (10k ops) | $50 |
| **Total** | **~$30/mo** | **~$200/mo** |

---

## 17. Go/No-Go Checklist (Before Launch)

Phase 1 launch requires:
- [ ] 10+ courses listed (5 free, 5 paid)
- [ ] At least 1 accreditation partnership
- [ ] Certificate template approved by legal
- [ ] Privacy policy + Terms of service
- [ ] PDPA/GDPR compliance review
- [ ] Payment system tested (Phase 2)
- [ ] Email flows tested (confirmation, reminders, certificates)
- [ ] Mobile responsiveness verified
- [ ] Load testing (100 concurrent users)

---

## 18. Next Actions for User

1. **Decide domain:** subdomain vs separate domain
2. **Pick accreditation body to approach first**
3. **Decide Phase 1 MVP scope** — ship minimal or complete?
4. **Recruit 5-10 initial providers** (leverage Ayurveda network)
5. **Commit to a launch date** (e.g. 3 months out)

Then: build Phase 1 → soft launch to AyurGate clinic network → iterate → Phase 2.

---

*This document is intentionally detailed. Use it as a blueprint — you can hand it to any developer and they'll know exactly what to build.*

*Last updated: April 2026*
