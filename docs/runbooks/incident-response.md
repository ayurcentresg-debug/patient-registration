# Runbook — Incident Response Plan

**Audience:** AyurGate owner and anyone oncall.
**Scope:** Security incidents, data breaches, production outages, and any event that triggers regulatory notification timelines.

This plan is written around the two regulatory clocks that actually bind us:

- **Singapore PDPA** — notify the PDPC and affected individuals **as soon as practicable**, and no later than **72 hours**, if a breach results in (or is likely to result in) significant harm or affects ≥ 500 individuals.
- **India DPDP Act 2023** — notify the Data Protection Board and affected Data Principals **as soon as reasonably possible** after becoming aware of a breach (DPDPA regulations; assume 72 hours as the safe upper bound until final rules are gazetted).

If the clock might be running, **assume it is**. Starting a timer is free; missing a deadline is not.

## Severity levels

| Level | Definition | Examples | Response |
|---|---|---|---|
| **SEV-1** | Confirmed data breach, OR full production outage, OR active compromise | Unauthorized data exfiltration, Railway service down >15 min, attacker with valid admin session, ransomware indicators | All hands; start clock; see §1 |
| **SEV-2** | Suspected breach, OR partial outage affecting a single feature / clinic | Spike in 401/403 pointing to credential stuffing, Stripe webhooks failing, WhatsApp messages not sending for >1 hr | Investigate within 1 hr; escalate if confirmed |
| **SEV-3** | Degraded experience, no breach risk | Slow page loads, one-off user-reported bug, email delivery delay | Normal business-hours triage |

Default to **over-reporting severity**. Downgrading later is cheap; realizing 6 hours in that a SEV-2 is actually a SEV-1 is not.

---

## §1 — SEV-1: the first 30 minutes

### Minute 0 — Start the clock

1. Open a dedicated notes doc (any format — Notion, Google Doc, even a text file). Title it `INCIDENT-YYYY-MM-DD-HHMM`.
2. Write the current UTC timestamp as **T₀**. Every log entry after this is an offset from T₀.
3. Note who the responder is, and how the incident was detected.

### Minute 0–5 — Contain (do not wait for full understanding)

Priority ordering — stop the bleeding before diagnosing.

- **Compromised admin session:** rotate `JWT_SECRET` in Railway → all tokens invalidated immediately. Users will need to re-login.
- **Leaked API key** (Stripe, Resend, Google, WhatsApp): rotate the key in the vendor dashboard, update in Railway, redeploy.
- **Active data exfiltration:** temporarily make Railway service unavailable by pausing it in the dashboard. Production downtime is preferable to continued exfiltration.
- **Ransomware / unknown intrusion:** same — pause the service, then investigate.

### Minute 5–15 — Capture evidence

Before touching anything else:

```bash
# Snapshot the database
railway run cp /data/clinic.db /data/clinic.db.incident-$(date +%Y%m%d_%H%M%S).bak

# Download Railway logs for the incident window (last N minutes)
# → Railway dashboard → Service → Logs → export
```

Save the DB snapshot and the logs to a separate location (laptop + encrypted drive, or a dedicated S3 bucket). These are the artifacts regulators will ask for.

### Minute 15–30 — Scope

Answer, with evidence:

- **What** was accessed, modified, or exfiltrated?
- **How many** users / clinics / records are affected?
- **When** did it start and end (or is it ongoing)?
- **Whose data** — Indian, Singaporean, or both? (determines which regulator)
- **Is it still happening?**

If you cannot answer these in 30 minutes, that itself is a finding — document it and escalate.

---

## §2 — Regulatory notification decision

Run this check within the first 2 hours:

```
Is personal data involved?                      YES → continue
                                                NO  → internal incident only, skip §2

Are ≥ 1 Indian Data Principals affected?        YES → DPDP notification required
Are ≥ 1 Singapore individuals affected AND
  (significant harm likely OR ≥ 500 affected)?  YES → PDPA notification required

If neither threshold is tripped but the breach
is a "notifiable data breach" under PDPA's
general standard, still notify.
```

### PDPA notification (Singapore)

- **Who:** Personal Data Protection Commission (PDPC)
- **Channel:** <https://www.pdpc.gov.sg/> → Report Data Breach form
- **Deadline:** ≤ 72 hours from awareness
- **Content:** incident summary, personal data types affected, number of individuals, containment steps, remediation plan
- **Notify affected individuals:** "as soon as practicable" after notifying PDPC, with a description of what happened and steps they can take

### DPDP notification (India)

- **Who:** Data Protection Board of India
- **Channel:** as specified in the final DPDPA rules (watch <https://www.meity.gov.in/>)
- **Deadline:** "as soon as reasonably possible" — treat as ≤ 72 hours
- **Content:** nature of breach, categories of data, number of Data Principals, consequences, measures taken
- **Notify affected Data Principals:** required — specifics per final rules

### Other stakeholders

Also notify, outside the regulatory clock:
- **Customer clinics** — always, as soon as scope is known. Do not delay waiting for regulator response.
- **Cyber-insurance carrier** (if one is in place) — within whatever window the policy requires, often 24–48 hrs.
- **Legal counsel** — before any public communication.

---

## §3 — Outage-only SEV-1 (no data involved)

When it's confirmed to be an availability incident, not a breach:

1. Same containment + evidence steps as §1.
2. Notify customer clinics when downtime exceeds **15 minutes**. Use whatever channel they expect (email, in-app banner). Don't wait for them to notice.
3. Target resolution path, in priority order:
   - Railway rollback to last known good deploy (see `runbooks/deployment.md`)
   - Railway status page — check if it's a platform-wide issue
   - DNS / domain issue — check GoDaddy
4. Post-incident: public-facing status update to clinics, even if brief.

---

## §4 — Post-incident review

Mandatory for every SEV-1 and SEV-2. Hold within **5 business days** of resolution.

Format (aim for 1–2 pages in the notes doc started at T₀):

- **Timeline** — what happened, when, what we did
- **Impact** — who was affected, how
- **Root cause** — not "the feature broke"; the underlying technical or process cause
- **What went well / what didn't** — honest, no blame
- **Action items** — each with an owner and a date; add them to the project tracker
- **Preventive controls** — what changes to code, monitoring, or process would have prevented this or caught it sooner

Share the write-up internally. If a customer was impacted, share a redacted version with them — it builds more trust than silence.

---

## §5 — Backup and recovery

- Database: SQLite file at `/data/clinic.db` on Railway volume.
- **Current backup cadence:** manual (not yet automated). This is a gap — tracked in the Master Project Plan under Sprint 12+.
- **Recovery objective (target):** RPO 1 hr, RTO 4 hr. We are not there yet without automated backups.
- To restore from backup: stop Railway service, upload backup to the volume at `/data/clinic.db`, restart service.

Until backup automation lands, **after any DB-affecting change during an incident**, take a manual backup (command in §1, minute 5–15).

---

## §6 — Key contacts

Fill these in and keep the list up-to-date. Blank lines here are a finding.

| Role | Name | Contact |
|---|---|---|
| Incident commander (primary) | _(owner)_ | _(phone / email)_ |
| Incident commander (backup) | _TBD_ | _TBD_ |
| Legal counsel | _TBD_ | _TBD_ |
| Cyber-insurance carrier | _TBD (none today)_ | _TBD_ |
| Railway support | Railway dashboard → Help | <help@railway.app> |
| Stripe support | Stripe dashboard → Support | — |
| Google Cloud support | — | Console → Support |
| Meta/WhatsApp Business support | — | Business Help Center |

---

## §7 — Quarterly tabletop

Once per quarter, run a 45-minute tabletop exercise on a hypothetical scenario (e.g. "attacker downloaded the user table"). The goal is not to solve it — it's to find gaps in this runbook. Update the runbook after each exercise.
