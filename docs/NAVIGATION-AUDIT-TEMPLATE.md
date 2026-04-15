# Navigation Audit Report Template

**Design System:** YODA Design System (Ayur Centre)
**Audit Date:** _______________
**Auditor:** _______________
**Interface Version:** _______________
**Viewport Tested:** _______________

---

## Section 1: Current State — Element Inventory

### 1.1 Navigation Tier Map

| Tier | Type | Component File | Trigger/Location | Width | Z-Index |
|------|------|---------------|-----------------|-------|---------|
| _1_ | _e.g., Sidebar Navigation_ | _e.g., `Sidebar.tsx`_ | _Left edge, persistent_ | _64px collapsed / 220px expanded_ | _50_ |
| _2_ | _e.g., Horizontal Tab Bar_ | _e.g., `InventoryTabs.tsx`_ | _Below page header_ | _100% content width_ | _auto_ |
| _3_ | _e.g., Back Navigation Link_ | _Inline in page component_ | _Above page header_ | _auto (text width)_ | _auto_ |

### 1.2 Tier 1 — Primary Navigation (Sidebar)

| Property | Measured Value | YODA Token | Compliant? |
|----------|:-------------:|:----------:|:----------:|
| Collapsed width | ___ px | `--sidebar-width: 64px` | Y / N |
| Expanded width | ___ px | _(none — hardcoded)_ | Y / N |
| Background | ___ | `--sidebar-bg: #1b3a2d` | Y / N |
| Transition | ___ | _(0.2s cubic-bezier)_ | Y / N |
| Logo area height | ___ px | _(none — hardcoded 64px)_ | Y / N |
| Logo icon size | ___ px | _(none — hardcoded 36x36)_ | Y / N |
| Nav item icon size | ___ px | _(w-5 h-5 = 20px)_ | Y / N |
| Nav item label font | ___ px | _(12px, semibold)_ | Y / N |
| Nav item padding | ___ | _(px-2 py-1.5)_ | Y / N |
| Active color | ___ | `--blue-500: #2d6a4f` | Y / N |
| Inactive color | ___ | `--grey-600: #6b7f73` | Y / N |
| Mobile type | ___ | _(fixed bottom bar)_ | Y / N |

**Notes:**
> _Document any deviations, anomalies, or concerns here._

### 1.3 Tier 2 — Tab Bar Navigation

Repeat this table for **each** tab bar component in the system.

**Component:** _______________  **File:** _______________  **Tab Count:** ___

| Property | Measured Value | Expected Value | Match? |
|----------|:-------------:|:--------------:|:------:|
| Container display | ___ | `flex` | Y / N |
| Container gap | ___ | `gap-0` (0px) | Y / N |
| Container overflow | ___ | `overflow-x-auto` | Y / N |
| Container margin-bottom | ___ | `mb-6` (24px) | Y / N |
| Container border-bottom | ___ | `2px solid var(--grey-200)` | Y / N |
| Tab padding-x | ___ px | _see standard_ | Y / N |
| Tab padding-y | ___ px | `py-2.5` (10px) | Y / N |
| Tab font-size | ___ px | _see standard_ | Y / N |
| Tab font-weight | ___ | `600` (semibold) | Y / N |
| Tab white-space | ___ | `nowrap` | Y / N |
| Active text color | ___ | `var(--blue-500)` | Y / N |
| Active border-bottom | ___ | `2px solid var(--blue-500)` | Y / N |
| Active background | ___ | `var(--blue-50)` | Y / N |
| Inactive text color | ___ | `var(--grey-600)` | Y / N |
| Inactive border | ___ | `2px solid transparent` | Y / N |
| Border-radius | ___ | `var(--radius-sm) var(--radius-sm) 0 0` | Y / N |
| Total width (all tabs) | ___ px | _Must fit content area_ | Y / N |

**Overflow Analysis:**

| Viewport | Content Area Width | Total Tab Width | Fits? | Action Required |
|----------|:-----------------:|:---------------:|:-----:|-----------------|
| 1440px | ___ px | ___ px | Y / N | ___ |
| 1280px | ___ px | ___ px | Y / N | ___ |
| 1024px | ___ px | ___ px | Y / N | ___ |
| 768px  | ___ px | ___ px | Y / N | ___ |

### 1.4 Tier 3 — Back Navigation

| Page Route | Element Type | Target href | Has Icon? | Icon Type | Font | Color | Spacing (mb) | Pattern |
|-----------|:-----------:|------------|:---------:|-----------|------|-------|:------------:|:-------:|
| _e.g., /inventory/[id]_ | _Link_ | _/inventory_ | _Y_ | _chevron-left_ | _15px semi_ | _var(--blue-500)_ | _mb-4 (16px)_ | _B_ |

**Pattern Key:**
- **Pattern A**: Icon button inline with title (32x32 bordered square, chevron icon, inside header flex row)
- **Pattern B**: Text link above header ("← Back to [Parent]", standalone, mb-4, blue-500)
- **Pattern C**: No back navigation (top-level tab page)
- **Pattern D**: Button with router.push (non-link, grey bordered)

**Notes:**
> _Flag any pages missing back navigation or using inconsistent patterns._

---

## Section 2: Navigation Type Classification Matrix

### 2.1 Classification Reference

| Type | Structural Characteristics | Interaction Pattern | Visual Indicators | Typical Design System Standard | When to Use |
|------|---------------------------|--------------------|--------------------|-------------------------------|-------------|
| **Sidebar / Nav Rail** | Vertical list, fixed position, persistent across pages | Click to navigate between top-level sections | Icons (always) + labels (on expand/hover), active indicator bar or background | MD3 Navigation Rail (collapsed), MD3 Navigation Drawer (expanded) | 5-8 top-level destinations, desktop-first |
| **Horizontal Tab Bar** | Horizontal row below header, underline or pill indicator | Click to switch views within a section; no page reload expected (but can be route-based) | Text labels, active underline/background, bottom border on container | MD3 Tabs (Primary or Secondary), Apple HIG Segmented Control | 2-9 sub-views within a module |
| **Breadcrumb** | Horizontal chain with separator characters (/ or >) | Click any ancestor to jump up hierarchy | Plain text links with separators, current item non-linked | MD3 does not specify; Apple HIG discourages; common in enterprise | Deep hierarchies (3+ levels) |
| **Back Link** | Single link pointing to parent, above or beside page title | Click to return one level | Text with left-arrow icon, typically blue/primary color | Apple HIG "Back" button (top-left), MD3 back arrow in Top App Bar | Detail/edit pages, 2-level hierarchy |
| **Bottom Navigation** | Horizontal bar fixed to screen bottom | Tap to switch top-level sections | Icons + labels, active color fill or indicator | MD3 Navigation Bar, Apple HIG Tab Bar | Mobile-first, 3-5 destinations |
| **Drawer** | Off-screen panel, slides in from edge | Toggle via hamburger icon | Overlay or push, scrim behind | MD3 Navigation Drawer, Apple HIG sidebar (iPadOS) | Many destinations, progressive disclosure |

### 2.2 Classification for This Interface

| Tier | Classified As | Justification |
|------|--------------|---------------|
| _Tier 1_ | ___ | _List 3 characteristics that justify this classification_ |
| _Tier 2_ | ___ | ___ |
| _Tier 3_ | ___ | ___ |

---

## Section 3: Spacing & Layout Audit Table

### 3.1 Page-Level Spacing

| Page Route | Outer Padding (mobile) | Outer Padding (desktop) | Fade Animation | Background Override | Compliant? |
|-----------|:---------------------:|:----------------------:|:--------------:|:-------------------:|:----------:|
| _Standard_ | `p-6` (24px) | `md:p-8` (32px) | `yoda-fade-in` | _none_ | _baseline_ |
| _e.g., /inventory/stock-audit_ | ___ | ___ | ___ | ___ | Y / N |

### 3.2 Section Spacing (Vertical Rhythm)

| Between | Expected Gap | Tailwind Class | Pixels |
|---------|:-----------:|:--------------:|:------:|
| Page edge → h1 title | _0 (padding handles it)_ | _(page padding)_ | _24/32_ |
| h1 title → subtitle | `mt-0.5` | `mt-0.5` | 2 |
| Header block → Tab bar | `mb-6` | `mb-6` | 24 |
| Tab bar → Content | `mb-6` _(on tab container)_ | `mb-6` | 24 |
| Section → Section | `mb-6` | `mb-6` | 24 |
| Back link → Header | `mb-4` | `mb-4` | 16 |
| Stats card grid gap | `gap-4` | `gap-4` | 16 |
| Filter elements gap | `gap-3` | `gap-3` | 12 |

### 3.3 Component-Level Measurements

| Component | Property | Expected | Measured | Deviation | Severity |
|-----------|----------|:--------:|:--------:|:---------:|:--------:|
| _e.g., Stats card_ | padding | `p-4` (16px) | ___ | ___ px | _L/M/H_ |
| _e.g., Detail card_ | padding | `p-6` (24px) | ___ | ___ px | _L/M/H_ |
| _e.g., Filter input_ | padding | `px-3 py-2` | ___ | ___ px | _L/M/H_ |
| _e.g., Table header_ | padding | `px-4 py-3` | ___ | ___ px | _L/M/H_ |
| _e.g., Table cell_ | padding | `px-4 py-2.5` | ___ | ___ px | _L/M/H_ |

### 3.4 Grid & Column Audit

| Page | Grid System | Columns (mobile) | Columns (desktop) | Gap | Breakpoint | Consistent? |
|------|:----------:|:----------------:|:-----------------:|:---:|:----------:|:-----------:|
| _e.g., Dashboard stats_ | Tailwind grid | `grid-cols-2` | `md:grid-cols-4` | `gap-4` | `md` (768px) | Y / N |

---

## Section 4: Findings & Recommendations

### 4.1 Finding Template

Repeat this block for each finding.

---

**Finding ID:** F-___
**Severity:** CRITICAL / HIGH / MEDIUM / LOW
**Dimension:** _Consistency / Back Button / Spacing / Classification / Tabs_
**Location:** _File path and line number(s)_

**Problem Statement:**
> _What inconsistency or anomaly was identified? Be specific — include measured values._

**Current Value:** ___
**Expected Value:** ___
**Deviation:** ___ px / ___ % / _pattern mismatch_

**Recommendation:**
> _What should change? Include exact values._

**Specification:**

| Property | Current | Recommended |
|----------|:-------:|:-----------:|
| _e.g., padding-x_ | _12px (px-3)_ | _16px (px-4)_ |

**Design System Reference:**
> _Which YODA token, MD3 guideline, or internal standard applies?_

**Implementation Priority:** P1 (immediate) / P2 (next sprint) / P3 (backlog)
**Impact:** _What breaks or degrades if unfixed? What improves if fixed?_

---

### 4.2 Findings Summary Table

| ID | Severity | Dimension | Summary | Priority | Status |
|----|:--------:|-----------|---------|:--------:|:------:|
| F-001 | ___ | ___ | _One-line summary_ | P_ | Open / Fixed |

---

## Section 5: Visual Annotation Guidelines

### 5.1 Annotation Symbols

Use these markers when annotating screenshots or wireframes:

| Symbol | Meaning | Usage |
|:------:|---------|-------|
| `[!]` | **Alignment break** | Element is misaligned from grid or siblings |
| `[~]` | **Spacing deviation** | Spacing differs from expected token value |
| `[?]` | **Hierarchy inconsistency** | Element weight/size doesn't match its hierarchy level |
| `[X]` | **Missing element** | Expected element (e.g., back button) is absent |
| `[#]` | **Pattern mismatch** | Element uses a different pattern than established standard |
| `[+]` | **Recommendation** | Suggested addition or enhancement |

### 5.2 Measurement Notation

When documenting deviations, use this format:

```
[Component] [Property]: [Measured]px → [Expected]px (Δ[Difference]px, [%]%)

Example:
InventoryTabs px: 12px → 16px (Δ4px, 33%)
StockAudit h1 font-size: 28px → 24px (Δ4px, 17%)
```

### 5.3 Severity Classification

| Severity | Criteria | Examples |
|----------|----------|---------|
| **CRITICAL** | Functionality broken, data loss risk, accessibility failure | Back button navigates to wrong page, no keyboard access |
| **HIGH** | Visible inconsistency affecting usability or comprehension | Same component looks different across pages, missing navigation |
| **MEDIUM** | Spacing or sizing deviation noticeable on inspection | 4px padding difference, wrong font size, breakpoint mismatch |
| **LOW** | Minor deviation, cosmetic, unlikely to affect users | 2px alignment difference, subtle color shade variation |

### 5.4 Cross-Reference Format

Link findings to recommendations using the Finding ID:

```
Observation: Tab padding is 12px on InventoryTabs but 20px on BillingTabs [See F-001]
Recommendation: Standardize to 16px [See R-001]
```

---

## Section 6: Design System Reference — YODA

### 6.1 YODA Color Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--blue-500` | `#2d6a4f` | Primary action, active states, links |
| `--blue-50` | `#f0faf4` | Active tab background, hover states |
| `--grey-900` | `#1e2a24` | Page titles, primary text |
| `--grey-700` | `#4a5d52` | Secondary text, button text |
| `--grey-600` | `#6b7f73` | Subtitles, inactive tabs, labels |
| `--grey-500` | `#9baa9f` | Placeholder text, tertiary text |
| `--grey-400` | `#c8d1cb` | Input borders, dividers |
| `--grey-300` | `#dfe5e1` | Card borders, lighter dividers |
| `--grey-200` | `#eef1ef` | Tab bar border, subtle backgrounds |
| `--green` | `#059669` | Success states, positive values |
| `--red` | `#dc2626` | Error states, negative values, destructive actions |
| `--orange` | `#ea580c` | Warning states |
| `--sidebar-bg` | `#1b3a2d` | Sidebar background |

### 6.2 YODA Layout Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--sidebar-width` | `64px` | Collapsed sidebar width |
| `--radius` | `8px` | Card border-radius, large elements |
| `--radius-sm` | `5px` | Input border-radius, tabs, buttons, chips |
| `--radius-pill` | `100px` | Full-round elements (badges, avatars) |
| `--shadow-sm` | `0 1px 2px rgba(30,42,36,0.06)` | Stats cards, subtle elevation |
| `--shadow-card` | `0 1px 10px rgba(30,42,36,0.05)` | Content cards |
| `--shadow-md` | `0 5px 20px rgba(30,42,36,0.07)` | Dropdown menus |
| `--shadow-lg` | `0 8px 30px rgba(30,42,36,0.1)` | Modals, overlays |
| `--background` | `#f8f6f2` | Page background (warm linen) |

### 6.3 YODA Spacing Scale (Tailwind-mapped)

| Tailwind | Pixels | YODA Usage |
|:--------:|:------:|------------|
| `0.5` | 2px | Title-to-subtitle gap (`mt-0.5`) |
| `1` | 4px | Icon-to-text gap in back links (`gap-1`) |
| `1.5` | 6px | Tight element gaps |
| `2` | 8px | Small internal padding |
| `2.5` | 10px | Tab vertical padding (`py-2.5`) |
| `3` | 12px | Filter element gap (`gap-3`), compact tab padding (`px-3`) |
| `4` | 16px | Standard tab padding (`px-4`), stats grid gap (`gap-4`), back link margin (`mb-4`) |
| `5` | 20px | Wide tab padding (`px-5`) |
| `6` | 24px | Section spacing (`mb-6`), page padding mobile (`p-6`) |
| `8` | 32px | Page padding desktop (`md:p-8`) |

### 6.4 YODA Typography Scale

| Usage | Size | Weight | Tracking | Color Token |
|-------|:----:|:------:|:--------:|:-----------:|
| Page title (h1) | `24px` | `700` (bold) | `tight` | `--grey-900` |
| Section title (h2) | `18px` | `700` (bold) | `tight` | `--grey-900` |
| Page subtitle | `15px` | `400` (normal) | _default_ | `--grey-600` |
| Body text | `15px` | `400` | _default_ | `--grey-700` |
| Tab label (standard) | `15px` | `600` (semibold) | _default_ | `--grey-600` / `--blue-500` |
| Tab label (compact) | `13px` | `600` (semibold) | _default_ | `--grey-600` / `--blue-500` |
| Input text | `15px` | `400` | _default_ | `--grey-900` |
| Label / caption | `13px` | `600` (semibold) | `wide` | `--grey-600` |
| Table header | `13px` | `700` (bold) | `wider` | `--grey-600` |
| Chip / badge | `12px` | `700` (bold) | `wide` | _varies_ |
| Small text | `12px` | `500` (medium) | `tight` | `--grey-500` |
| Stat card value | `24-30px` | `700` (bold) | `tight` | _varies_ |

### 6.5 YODA Standard Patterns

**Page Layout Standard:**
```
<div className="p-6 md:p-8 yoda-fade-in">
  <div className="mb-6">
    <h1 className="text-[24px] font-bold tracking-tight"
        style={{ color: "var(--grey-900)" }}>
      Module Name
    </h1>
    <p className="text-[15px] mt-0.5"
       style={{ color: "var(--grey-600)" }}>
      Module description
    </p>
  </div>
  <ModuleTabs />
  {/* Content */}
</div>
```

**Tab Bar Standard:**
```
Container: flex gap-0 mb-6 overflow-x-auto
           borderBottom: 2px solid var(--grey-200)

Tab Item:  px-4 py-2.5 text-[14px] font-semibold whitespace-nowrap
           Active:   color var(--blue-500), borderBottom 2px solid var(--blue-500),
                     background var(--blue-50), borderRadius var(--radius-sm) top
           Inactive: color var(--grey-600), borderBottom 2px solid transparent
```

**Back Link Standard:**
```
<Link href="/parent"
  className="inline-flex items-center gap-1 text-[15px]
             font-semibold hover:underline mb-4"
  style={{ color: "var(--blue-500)" }}>
  <svg className="w-4 h-4" ...>chevron-left</svg>
  Back to Parent
</Link>
```

**Card Standard:**
```
const cardStyle = {
  background: "var(--white)",
  border: "1px solid var(--grey-300)",
  borderRadius: "var(--radius)",        // 8px
  boxShadow: "var(--shadow-card)",
};
```

**Input Standard:**
```
const inputStyle = {
  border: "1px solid var(--grey-400)",
  borderRadius: "var(--radius-sm)",     // 5px
  color: "var(--grey-900)",
  background: "var(--white)",
  fontSize: "15px",
};
// Tailwind: px-3 py-2 text-[15px]
```

**Stats Card Grid Standard:**
```
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
  <div className="p-4" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}>
    <p className="text-[14px] font-semibold uppercase tracking-wide"
       style={{ color: "var(--grey-600)" }}>Label</p>
    <p className="text-[24px] font-bold mt-1 tracking-tight"
       style={{ color: "var(--grey-900)" }}>Value</p>
  </div>
</div>
```

---

## Appendix A: Audit Checklist

Use this as a pre-flight check before delivering the audit report.

- [ ] All Tier 1 (sidebar) measurements documented
- [ ] All Tier 2 (tab bar) components measured and compared
- [ ] All Tier 3 (back navigation) pages catalogued with pattern classification
- [ ] Page padding audited for every route
- [ ] Header hierarchy (h1/h2/subtitle) verified for consistency
- [ ] Stats card grids checked for column/gap/breakpoint uniformity
- [ ] Tab overflow tested at 1440px, 1280px, 1024px, 768px viewports
- [ ] Navigation classification justified with 3+ characteristics per tier
- [ ] All findings have severity, priority, and design system reference
- [ ] Recommendations include exact pixel/token values
- [ ] Cross-references link observations to recommendations

---

## Appendix B: Completed Audit History

| Date | Auditor | Version | Findings | Critical | Fixed |
|------|---------|---------|:--------:|:--------:|:-----:|
| _2026-03-30_ | _Claude_ | _v1 (pre-fix)_ | _10_ | _0_ | _10/10_ |
| _2026-03-30_ | _Claude_ | _v2 (post-fix)_ | _3_ | _0_ | _pending_ |
