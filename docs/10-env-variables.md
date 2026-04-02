# AYUR GATE — Environment Variables

## Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for signing JWT tokens (min 32 chars) | `your-super-secret-key-at-least-32-chars` |
| `DB_PATH` | Path to SQLite database file | `/data/clinic.db` (Railway) or `./dev.db` (local) |

## Email Configuration (at least one provider needed)

### Resend (Recommended)
| Variable | Description | Example |
|----------|-------------|---------|
| `RESEND_API_KEY` | Resend API key for transactional emails | `re_xxxxxxxxxxxxx` |
| `EMAIL_FROM` | Sender email address | `AYUR GATE <noreply@ayurgate.com>` |

### SMTP Fallback
| Variable | Description | Example |
|----------|-------------|---------|
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP username / email | `ayurcentresg@gmail.com` |
| `SMTP_PASS` | SMTP password / app password | `xxxx xxxx xxxx xxxx` |

## Stripe (Payment Processing)
| Variable | Description | Example |
|----------|-------------|---------|
| `STRIPE_SECRET_KEY` | Stripe API secret key | `sk_live_xxxxxxxxxxxx` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_xxxxxxxxxxxx` |
| `STRIPE_PRICE_STARTER_MONTHLY` | Stripe price ID for Starter monthly | `price_xxxxxxxxxxxx` |
| `STRIPE_PRICE_STARTER_ANNUAL` | Stripe price ID for Starter annual | `price_xxxxxxxxxxxx` |
| `STRIPE_PRICE_PROFESSIONAL_MONTHLY` | Stripe price ID for Professional monthly | `price_xxxxxxxxxxxx` |
| `STRIPE_PRICE_PROFESSIONAL_ANNUAL` | Stripe price ID for Professional annual | `price_xxxxxxxxxxxx` |

## Twilio (SMS & WhatsApp)
| Variable | Description | Example |
|----------|-------------|---------|
| `TWILIO_ACCOUNT_SID` | Twilio account SID | `ACxxxxxxxxxxxx` |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | `xxxxxxxxxxxxxxxx` |
| `TWILIO_SMS_NUMBER` | Twilio phone number for SMS | `+1234567890` |
| `TWILIO_WHATSAPP_NUMBER` | Twilio WhatsApp number | `+1234567890` |

## Super Admin
| Variable | Description | Example |
|----------|-------------|---------|
| `SUPER_ADMIN_EMAIL` | Email for platform super admin login | `admin@ayurgate.com` |
| `SUPER_ADMIN_PASSWORD` | Password for super admin | `secure-password` |

## Application
| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_APP_URL` | Public URL of the application | `https://www.ayurgate.com` |
| `ADMIN_NOTIFICATION_EMAIL` | Email to receive new clinic registration alerts | `ayurcentresg@gmail.com` |
| `NODE_ENV` | Environment mode | `production` or `development` |

## Seed Scripts (Development Only)
| Variable | Description | Example |
|----------|-------------|---------|
| `SEED_ADMIN_PASSWORD` | Password for seeded admin user | `admin123` |
| `SEED_DOCTOR_PASSWORD` | Password for seeded doctor users | `doctor123` |

## Notes
- `JWT_SECRET` must be set in production. The auth module will throw an error on startup if missing.
- `DB_PATH` defaults to `./dev.db` in the project root if not set.
- Either `RESEND_API_KEY` or `SMTP_HOST` must be configured for emails to work.
- Stripe variables are only needed if payment processing is enabled.
- Twilio variables are only needed if SMS/WhatsApp features are used.
