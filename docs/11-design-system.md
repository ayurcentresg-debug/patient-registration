# AYUR GATE — Components & Design System

## Brand Colors

The app uses CSS variables for theming. Note: variable names use `--blue-*` for historical reasons but actually contain green values.

### Light Mode
| Variable | Value | Usage |
|----------|-------|-------|
| `--blue-50` | `#f0fdf4` | Light backgrounds |
| `--blue-100` | `#dcfce7` | Subtle backgrounds |
| `--blue-200` | `#a7d7be` | Borders, dividers |
| `--blue-500` | `#2d6a4f` | Primary color (buttons, links, accents) |
| `--blue-600` | `#14532d` | Dark primary (gradients, headings) |
| `--blue-700` | `#1a3c34` | Darkest primary |

### Dark Mode
Dark mode inverts backgrounds and adjusts opacity of accent colors.

### Brand Gradient
```css
background: linear-gradient(135deg, #14532d, #2d6a4f);
```

### Warm Background
```css
background: #fefbf6; /* Used on auth pages, onboarding */
```

## Shared Style Tokens (src/lib/styles.ts)

Reusable style constants used across 45+ files:

```typescript
// Card container
export const cardStyle = "rounded-2xl border p-5 shadow-sm bg-[var(--card-bg)] border-[var(--card-border)]";

// Primary button
export const btnPrimary = "px-4 py-2 rounded-lg text-white font-medium text-[13px] transition-all hover:opacity-90 bg-[var(--blue-500)]";

// Form input
export const inputStyle = "w-full px-3 py-2 rounded-lg text-[14px] border outline-none bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)]";

// Filter chip
export const chipBase = "px-3 py-1.5 rounded-full text-[12px] font-medium transition-all cursor-pointer";
```

## Shared Components (src/components/)

| Component | File | Purpose |
|-----------|------|---------|
| **LayoutShell** | LayoutShell.tsx | Root layout wrapper — decides sidebar/auth based on route |
| **Sidebar** | Sidebar.tsx | Navigation sidebar (desktop: left panel, mobile: bottom bar) |
| **AuthProvider** | AuthProvider.tsx | Auth context provider — verifies JWT, provides user data |
| **ThemeProvider** | ThemeProvider.tsx | Dark/light mode toggle with localStorage persistence |
| **Toast** | Toast.tsx | Success/error notification popup (auto-dismiss) |
| **TrialBanner** | TrialBanner.tsx | Trial countdown banner shown across all pages |
| **EmailVerifyBanner** | EmailVerifyBanner.tsx | Email verification prompt shown on dashboard |
| **ErrorBoundary** | ErrorBoundary.tsx | React error boundary with branded fallback UI |
| **Skeleton** | Skeleton.tsx | Loading placeholder components (SkeletonCard, SkeletonTable, etc.) |
| **StatsCard** | StatsCard.tsx | Dashboard stat card (value + label + trend) |
| **DashboardCharts** | DashboardCharts.tsx | Recharts-based charts (revenue, appointments, trends) |
| **ConfirmDialog** | ConfirmDialog.tsx | Confirmation modal for destructive actions |
| **HelpTip** | HelpTip.tsx | Tooltip helper for form fields |
| **BarcodeScanner** | BarcodeScanner.tsx | Camera-based barcode/QR scanner for inventory |
| **AdminTabs** | AdminTabs.tsx | Tab navigation for admin panel sections |
| **BillingTabs** | BillingTabs.tsx | Tab navigation for billing sections |
| **InventoryTabs** | InventoryTabs.tsx | Tab navigation for inventory sections |
| **CommunicationTabs** | CommunicationTabs.tsx | Tab navigation for communication sections |
| **TreatmentTabs** | TreatmentTabs.tsx | Tab navigation for treatment sections |

## Shared Utilities (src/lib/)

| Module | File | Purpose |
|--------|------|---------|
| **auth** | auth.ts | JWT creation/verification, password hashing, OTP generation |
| **db** | db.ts | Prisma client initialization with SQLite adapter |
| **tenant-db** | tenant-db.ts | Multi-tenant Prisma extension (auto clinicId filtering) |
| **email** | email.ts | Email sending (Resend primary, SMTP fallback) |
| **email-templates** | email-templates.ts | Branded HTML email templates |
| **formatters** | formatters.ts | Date/currency formatting (formatDate, formatCurrency, timeAgo, etc.) |
| **styles** | styles.ts | Shared CSS class constants (cardStyle, btnPrimary, etc.) |
| **csv-export** | csv-export.ts | Generate CSV downloads for tables |
| **rate-limit** | rate-limit.ts | In-memory rate limiter by IP |
| **stripe** | stripe.ts | Stripe client initialization |
| **sms** | sms.ts | Twilio SMS sending |
| **whatsapp** | whatsapp.ts | Twilio WhatsApp messaging |
| **validation** | validation.ts | Input validators (NRIC checksum, phone normalization) |
| **get-clinic-id** | get-clinic-id.ts | Extract clinicId from JWT in API routes |
| **super-admin-auth** | super-admin-auth.ts | Super admin JWT handling |

## Shared Formatters (src/lib/formatters.ts)

```typescript
formatDate(date)          // "02 Apr 2026"
formatDateShort(date)     // "02/04/2026"
formatDateLong(date)      // "Wednesday, 02 April 2026"
formatDateTime(date)      // "02 Apr 2026, 2:30 PM"
formatCurrency(amount)    // "$50.00" (uses clinic currency)
formatCurrencyExact(amount) // "$50.00" (always 2 decimals)
timeAgo(date)             // "3 hours ago", "2 days ago"
```

## Animations

```css
.yoda-fade-in {
  animation: yodaFadeIn 0.4s ease-out;
}
@keyframes yodaFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

## Responsive Breakpoints
- **Mobile**: < 768px (bottom navigation, single column)
- **Tablet**: 768px - 1024px (sidebar collapses)
- **Desktop**: > 1024px (full sidebar, multi-column layouts)
