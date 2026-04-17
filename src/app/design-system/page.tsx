"use client";

/**
 * AyurGate Design System — Reference Page
 *
 * Showcase of every brand-guide primitive. Use this to verify visual
 * implementation matches the brand style guide and to grab snippets.
 *
 * Navigate to: /design-system
 */

import { useState } from "react";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  CardKPI,
  Badge,
  StatusDot,
  CounterBadge,
  EmptyState,
  type ButtonVariant,
  type ButtonSize,
  type StatusVariant,
  type ModuleVariant,
} from "@/components/ui";

// ─── Page ────────────────────────────────────────────────────────────────

export default function DesignSystemPage() {
  return (
    <div
      style={{
        padding: "32px 40px",
        maxWidth: 1200,
        margin: "0 auto",
        background: "var(--ag-bg-page)",
        minHeight: "100vh",
      }}
    >
      {/* Page header */}
      <header style={{ marginBottom: 48 }}>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            letterSpacing: "var(--ag-tracking-wider)",
            textTransform: "uppercase",
            color: "var(--ag-text-secondary)",
            fontFamily: "var(--ag-font-heading)",
            fontWeight: "var(--ag-weight-medium)",
          }}
        >
          Design System · v1.0
        </p>
        <h1
          style={{
            margin: "4px 0 8px",
            fontSize: 32,
            fontFamily: "var(--ag-font-heading)",
            fontWeight: "var(--ag-weight-bold)",
            color: "var(--ag-text-primary)",
            letterSpacing: "var(--ag-tracking-tight)",
            lineHeight: "var(--ag-leading-tight)",
          }}
        >
          AyurGate Component Library
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            color: "var(--ag-text-secondary)",
            fontFamily: "var(--ag-font-body)",
          }}
        >
          Reference of every brand-guide primitive — buttons, inputs, cards, badges, empty states.
        </p>
      </header>

      {/* Sections */}
      <TypographySection />
      <ColorsSection />
      <ButtonsSection />
      <InputsSection />
      <BadgesSection />
      <CardsSection />
      <EmptyStateSection />
    </div>
  );
}

// ─── Typography ──────────────────────────────────────────────────────────

function TypographySection() {
  const types = [
    { label: "Display 32", size: 32, weight: 700, lh: 1.2, ls: "-0.02em", text: "Appointment Overview", font: "heading" },
    { label: "H1 24", size: 24, weight: 700, lh: 1.25, ls: "-0.01em", text: "Patient Records", font: "heading" },
    { label: "H2 20", size: 20, weight: 700, lh: 1.3, ls: "0", text: "Today's Schedule", font: "heading" },
    { label: "H3 16", size: 16, weight: 700, lh: 1.35, ls: "0", text: "Prescription Details", font: "heading" },
    { label: "H4 / Label 12", size: 12, weight: 500, lh: 1.4, ls: "0.02em", text: "BILLING SUMMARY", font: "heading" },
    { label: "Body 14", size: 14, weight: 400, lh: 1.5, ls: "0", text: "Dr. Priya Nair confirmed your appointment.", font: "body" },
    { label: "Body SM 13", size: 13, weight: 400, lh: 1.5, ls: "0", text: "Last updated 3 minutes ago.", font: "body" },
    { label: "Caption 11", size: 11, weight: 400, lh: 1.45, ls: "0.01em", text: "Created 17 Apr 2026 · Invoice #AYG-00291", font: "body" },
  ];

  return (
    <Section title="Typography" subtitle="Satoshi for headings · Inter for body">
      <Card padding="spacious">
        {types.map((t) => (
          <div
            key={t.label}
            style={{
              display: "grid",
              gridTemplateColumns: "140px 1fr",
              gap: 24,
              padding: "12px 0",
              borderBottom: "1px solid var(--ag-border-subtle)",
              alignItems: "baseline",
            }}
          >
            <span style={{ fontSize: 11, color: "var(--ag-text-secondary)", fontFamily: "var(--ag-font-body)" }}>
              {t.label}
            </span>
            <span
              style={{
                fontFamily: t.font === "heading" ? "var(--ag-font-heading)" : "var(--ag-font-body)",
                fontSize: t.size,
                fontWeight: t.weight,
                lineHeight: t.lh,
                letterSpacing: t.ls,
                color: "var(--ag-text-primary)",
              }}
            >
              {t.text}
            </span>
          </div>
        ))}
      </Card>
    </Section>
  );
}

// ─── Colors ──────────────────────────────────────────────────────────────

function ColorsSection() {
  const teals = [
    { token: "--ag-teal-900", hex: "#063B3D" },
    { token: "--ag-teal-800", hex: "#0A5D60" },
    { token: "--ag-teal-700", hex: "#0D7377", note: "PRIMARY" },
    { token: "--ag-teal-600", hex: "#119CA0" },
    { token: "--ag-teal-100", hex: "#E0F4F5" },
    { token: "--ag-teal-50", hex: "#F0FAFB" },
  ];

  const saffrons = [
    { token: "--ag-saffron-900", hex: "#6B3A00" },
    { token: "--ag-saffron-700", hex: "#8F5200" },
    { token: "--ag-saffron-600", hex: "#B5740A", note: "ACCENT" },
    { token: "--ag-saffron-100", hex: "#FAF0D7" },
    { token: "--ag-saffron-50", hex: "#FEFBF3" },
  ];

  const neutrals = [
    { token: "--ag-neutral-900", hex: "#1A1917" },
    { token: "--ag-neutral-700", hex: "#3D3B37" },
    { token: "--ag-neutral-500", hex: "#6C6A65" },
    { token: "--ag-neutral-200", hex: "#D4D1CA" },
    { token: "--ag-neutral-100", hex: "#ECEAE4" },
    { token: "--ag-neutral-50", hex: "#F7F6F2", note: "PAGE BG" },
  ];

  return (
    <Section title="Color System" subtitle="Teal (primary) · Saffron (accent) · Warm-tinted neutrals">
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        <ColorGroup title="Teal — Primary Brand" swatches={teals} />
        <ColorGroup title="Saffron — Heritage Accent" swatches={saffrons} />
        <ColorGroup title="Neutral — Warm Grays" swatches={neutrals} />
      </div>
    </Section>
  );
}

function ColorGroup({ title, swatches }: { title: string; swatches: { token: string; hex: string; note?: string }[] }) {
  return (
    <Card padding="default">
      <h3 style={{ margin: "0 0 12px", fontSize: 13, fontFamily: "var(--ag-font-heading)", fontWeight: 700 }}>
        {title}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {swatches.map((s) => (
          <div key={s.token} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                background: s.hex,
                borderRadius: "var(--ag-radius-sm)",
                border: "1px solid var(--ag-border-subtle)",
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontFamily: "var(--ag-font-mono)", color: "var(--ag-text-primary)" }}>
                {s.token}
              </div>
              <div style={{ fontSize: 10, color: "var(--ag-text-secondary)", fontFamily: "var(--ag-font-mono)" }}>
                {s.hex} {s.note && <span style={{ color: "var(--ag-accent)", fontWeight: 700, marginLeft: 4 }}>{s.note}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Buttons ─────────────────────────────────────────────────────────────

function ButtonsSection() {
  const [loading, setLoading] = useState(false);
  const variants: ButtonVariant[] = ["primary", "secondary", "ghost", "danger", "saffron"];
  const sizes: ButtonSize[] = ["xs", "sm", "md", "lg", "xl"];

  return (
    <Section title="Buttons" subtitle="5 variants × 5 sizes × 5 states">
      <Card padding="spacious">
        <Label>All variants (md size)</Label>
        <Row>
          {variants.map((v) => (
            <Button key={v} variant={v}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </Button>
          ))}
        </Row>

        <Label>All sizes (primary variant)</Label>
        <Row>
          {sizes.map((s) => (
            <Button key={s} size={s}>
              {s.toUpperCase()} · Save
            </Button>
          ))}
        </Row>

        <Label>States</Label>
        <Row>
          <Button>Default</Button>
          <Button disabled>Disabled</Button>
          <Button loading>Saving…</Button>
          <Button
            onClick={() => {
              setLoading(true);
              setTimeout(() => setLoading(false), 1800);
            }}
            loading={loading}
          >
            {loading ? "Saving…" : "Click me"}
          </Button>
        </Row>

        <Label>Full width + icon</Label>
        <Row>
          <Button fullWidth iconLeft={<span>+</span>}>
            New Appointment
          </Button>
        </Row>
      </Card>
    </Section>
  );
}

// ─── Inputs ──────────────────────────────────────────────────────────────

function InputsSection() {
  const [email, setEmail] = useState("priya@");
  const valid = email.includes("@") && email.endsWith(".sg");

  return (
    <Section title="Form Inputs" subtitle="40px height · 6px radius · label always above">
      <Card padding="spacious">
        <div style={{ display: "grid", gap: 20, maxWidth: 400 }}>
          <Input label="Patient Name" placeholder="e.g. Rajan Mehta" />
          <Input label="Date of Birth" type="date" required />
          <Input
            label="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={!valid ? "Enter a valid email address" : undefined}
            success={valid ? "Valid email address" : undefined}
            required
          />
          <Input label="Mobile" hint="Include country code, e.g. +65 9123 4567" />
          <Input label="Read-only" value="AYG-00291" disabled />
        </div>
      </Card>
    </Section>
  );
}

// ─── Badges ──────────────────────────────────────────────────────────────

function BadgesSection() {
  const statuses: StatusVariant[] = ["active", "pending", "confirmed", "cancelled", "draft", "expired", "urgent", "new"];
  const modules: ModuleVariant[] = ["appointments", "prescriptions", "inventory", "billing", "reports"];

  return (
    <Section title="Badges & Status" subtitle="Pill shape · 20px height · Satoshi Bold 11px">
      <Card padding="spacious">
        <Label>Status badges</Label>
        <Row>
          {statuses.map((s) => (
            <Badge key={s} variant={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Badge>
          ))}
        </Row>

        <Label>Module chips</Label>
        <Row>
          {modules.map((m) => (
            <Badge key={m} module={m}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </Badge>
          ))}
        </Row>

        <Label>Status dots</Label>
        <Row>
          <StatusDot status="online" label="Online / Active" />
          <StatusDot status="away" label="Away / Pending" />
          <StatusDot status="offline" label="Offline" />
          <StatusDot status="error" label="Error" />
          <StatusDot status="syncing" label="Syncing…" />
        </Row>

        <Label>Counter badges</Label>
        <Row>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CounterBadge count={3} /> Unread messages
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CounterBadge count={12} /> Alerts
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CounterBadge count={142} /> Notifications
          </span>
        </Row>
      </Card>
    </Section>
  );
}

// ─── Cards ───────────────────────────────────────────────────────────────

function CardsSection() {
  return (
    <Section title="Cards & KPIs" subtitle="3 paddings · 4 elevations · module color strips">
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <CardKPI
          label="Total Appointments"
          value="284"
          delta={{ value: "12% vs last month", trend: "up" }}
          moduleColor="var(--ag-module-appointments)"
        />
        <CardKPI
          label="Active Prescriptions"
          value="87"
          delta={{ value: "3 pending review", trend: "neutral" }}
          moduleColor="var(--ag-module-prescriptions)"
        />
        <CardKPI
          label="Low Stock Items"
          value="6"
          delta={{ value: "2 out of stock", trend: "down" }}
          moduleColor="var(--ag-module-inventory)"
        />
        <CardKPI
          label="Revenue (Apr)"
          value="₹4.2L"
          delta={{ value: "18% vs Mar", trend: "up" }}
          moduleColor="var(--ag-module-billing)"
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <Card elevation="dp1">
          <CardHeader
            title="Today's Schedule"
            meta="Friday, 17 Apr 2026"
            actions={
              <>
                <Badge variant="new" size="sm">3 new</Badge>
                <Button size="sm" variant="ghost">View all</Button>
              </>
            }
          />
          <CardBody>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { time: "09:00", patient: "Rajan Mehta", type: "Consultation", status: "confirmed" as const },
                { time: "10:30", patient: "Aisha Fernandez", type: "Follow-up", status: "pending" as const },
                { time: "14:00", patient: "Lim Wei Jie", type: "Prescription", status: "confirmed" as const },
              ].map((a) => (
                <div key={a.time} style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: "var(--ag-font-body)", fontSize: 14 }}>
                  <span style={{ fontFamily: "var(--ag-font-mono)", fontSize: 13, color: "var(--ag-text-secondary)", minWidth: 48 }}>{a.time}</span>
                  <span style={{ flex: 1, color: "var(--ag-text-primary)" }}>{a.patient}</span>
                  <span style={{ color: "var(--ag-text-secondary)", fontSize: 13 }}>{a.type}</span>
                  <Badge variant={a.status} size="sm">{a.status}</Badge>
                </div>
              ))}
            </div>
          </CardBody>
          <CardFooter>
            <Button variant="ghost" size="sm">Cancel</Button>
            <Button size="sm">Mark complete</Button>
          </CardFooter>
        </Card>
      </div>
    </Section>
  );
}

// ─── Empty States ────────────────────────────────────────────────────────

function EmptyStateSection() {
  return (
    <Section title="Empty States" subtitle="Typography + icon character only — no illustrations">
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <EmptyState
          iconChar="A"
          moduleColor="var(--ag-module-appointments)"
          title="No Appointments"
          description="Schedule your first appointment to get started."
          primaryAction={<Button>+ New Appointment</Button>}
          secondaryLink={{ label: "Import from CSV", href: "#" }}
          compact
        />
        <EmptyState
          iconChar="Rx"
          moduleColor="var(--ag-module-prescriptions)"
          title="No Prescriptions"
          description="Prescriptions will appear here after a consultation."
          primaryAction={<Button variant="secondary">+ New Prescription</Button>}
          compact
        />
        <EmptyState
          iconChar="₹"
          moduleColor="var(--ag-module-billing)"
          title="No Invoices Yet"
          description="Invoices are generated after a session is completed."
          primaryAction={<Button variant="ghost">View Appointments</Button>}
          compact
        />
      </div>
    </Section>
  );
}

// ─── Shared mini-components ──────────────────────────────────────────────

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 48 }}>
      <div style={{ marginBottom: 16 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 20,
            fontFamily: "var(--ag-font-heading)",
            fontWeight: "var(--ag-weight-bold)",
            color: "var(--ag-text-primary)",
          }}
        >
          {title}
        </h2>
        <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--ag-text-secondary)", fontFamily: "var(--ag-font-body)" }}>
          {subtitle}
        </p>
      </div>
      {children}
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        margin: "16px 0 8px",
        fontSize: 11,
        letterSpacing: "var(--ag-tracking-wider)",
        textTransform: "uppercase",
        color: "var(--ag-text-secondary)",
        fontFamily: "var(--ag-font-heading)",
        fontWeight: "var(--ag-weight-medium)",
      }}
    >
      {children}
    </p>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        alignItems: "center",
      }}
    >
      {children}
    </div>
  );
}
