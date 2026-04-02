# AYUR GATE -- Tech Stack

## Core Framework
| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.1 |
| Language | TypeScript | 5.x |
| Runtime | Node.js | 24.x |
| Bundler | Turbopack (dev), Webpack (prod) | -- |

## Frontend
| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| UI Library | React | 19.2.4 | Component rendering |
| CSS Framework | Tailwind CSS | 4.x | Utility-first styling |
| Charts | Recharts | 3.8.1 | Dashboard visualizations |
| Forms | react-hook-form | 7.72.0 | Form state management |
| QR/Barcode | html5-qrcode | 2.3.8 | Barcode scanning for inventory |
| QR Generation | qrcode | 1.5.4 | QR code generation |

## Backend
| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| API | Next.js API Routes | 16.2.1 | RESTful endpoints |
| ORM | Prisma | 7.5.0 | Database access and schema |
| Database | SQLite via better-sqlite3 | 12.8.0 | File-based relational DB |
| DB Adapter | @prisma/adapter-better-sqlite3 | 7.5.0 | Prisma-SQLite bridge |
| Auth | jose | 6.2.2 | JWT creation and verification |
| Password | bcryptjs | 3.0.3 | Password hashing (12 rounds) |
| 2FA | otpauth | 9.5.0 | TOTP for Google Authenticator |

## Email & Communication
| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Email (Primary) | Resend | 6.10.0 | Transactional email delivery |
| Email (Fallback) | Nodemailer | 8.0.3 | SMTP fallback (Gmail etc.) |
| SMS | Twilio | 5.13.1 | SMS notifications |
| WhatsApp | Twilio WhatsApp | -- | Patient messaging |

## Payments
| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Payment Gateway | Stripe | 21.0.1 | Subscription billing, checkout |

## Infrastructure
| Component | Technology | Purpose |
|-----------|-----------|---------|
| Hosting | Railway | Cloud deployment, auto-deploy |
| Domain | GoDaddy | ayurgate.com DNS management |
| SSL | Railway (auto) | HTTPS certificates |
| Repository | GitHub | Version control, CI/CD trigger |
| Database Storage | Railway Volume | Persistent SQLite at /data/clinic.db |

## PWA
| Component | Purpose |
|-----------|---------|
| Service Worker (sw.js) | Offline caching, install prompt |
| Web App Manifest | App metadata, icons, theme |

## Dev Dependencies
| Component | Technology | Version |
|-----------|-----------|---------|
| CSS Tooling | @tailwindcss/postcss | 4.x |
| Linting | ESLint + eslint-config-next | 9.x |
| Type Checking | TypeScript | 5.x |

## Unused Dependencies (cleanup candidates)
| Package | Size | Status |
|---------|------|--------|
| xlsx | ~450KB | Not imported anywhere -- remove |
| date-fns | ~50KB | Replaced by src/lib/formatters.ts -- remove |
| @heroicons/react | ~200KB | Minimal usage -- evaluate removal |
