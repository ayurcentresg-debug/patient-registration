#!/usr/bin/env python3
"""Generate AYUR GATE Payroll/Payslip/KET Feature Sheet PDF - Clean 2-Color Professional"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
)

# ─── 2 Colors Only: Navy + Gold ─────────────────────────────
NAVY = HexColor("#1a1f36")
GOLD = HexColor("#c8a951")
GOLD_LIGHT = HexColor("#fdf8ec")
GREY_900 = HexColor("#111827")
GREY_700 = HexColor("#374151")
GREY_500 = HexColor("#6b7280")
GREY_200 = HexColor("#e5e7eb")
GREY_50 = HexColor("#f9fafb")
WHITE = white

OUTPUT = "/Users/karthik/Cladue CODE1/patient-registration/docs/AYURGATE-Payroll-Features.pdf"
W_PAGE = A4[0] - 70  # usable width

styles = getSampleStyleSheet()
styles.add(ParagraphStyle('SHead', fontSize=16, textColor=NAVY, fontName='Helvetica-Bold', spaceBefore=16, spaceAfter=4))
styles.add(ParagraphStyle('SSub', fontSize=10, textColor=GREY_500, fontName='Helvetica', spaceAfter=10))
styles.add(ParagraphStyle('Cell', fontSize=10, leading=14, textColor=GREY_700, fontName='Helvetica'))
styles.add(ParagraphStyle('CellB', fontSize=10, leading=14, textColor=GREY_900, fontName='Helvetica-Bold'))
styles.add(ParagraphStyle('HeadCell', fontSize=10, leading=14, textColor=WHITE, fontName='Helvetica-Bold'))
styles.add(ParagraphStyle('Note', fontSize=9, leading=13, textColor=GREY_500, fontName='Helvetica-Oblique'))
styles.add(ParagraphStyle('WC', fontSize=11, leading=17, textColor=WHITE, alignment=TA_CENTER))


def c(text): return Paragraph(text, styles['Cell'])
def b(text): return Paragraph(text, styles['CellB'])
def h(text): return Paragraph(text, styles['HeadCell'])


def tbl(headers, rows, widths):
    data = [[h(x) for x in headers]] + rows
    t = Table(data, colWidths=widths, hAlign='LEFT', repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('LINEBELOW', (0, 0), (-1, 0), 2, GOLD),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, GREY_50]),
        ('GRID', (0, 0), (-1, -1), 0.5, GREY_200),
        ('TOPPADDING', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 9),
        ('TOPPADDING', (0, 1), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 7),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    return t


def gold_divider():
    data = [[""]]
    t = Table(data, colWidths=[W_PAGE], rowHeights=[3])
    t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), GOLD), ('TOPPADDING', (0,0), (-1,-1), 0), ('BOTTOMPADDING', (0,0), (-1,-1), 0)]))
    return t


def section(title, subtitle=None):
    elems = [
        gold_divider(),
        Spacer(1, 8),
        Paragraph(title, styles['SHead']),
    ]
    if subtitle:
        elems.append(Paragraph(subtitle, styles['SSub']))
    return elems


def draw_header(canvas_obj, doc):
    w, ht = A4
    canvas_obj.saveState()
    canvas_obj.setFillColor(NAVY)
    canvas_obj.rect(0, ht - 90, w, 90, fill=1, stroke=0)
    canvas_obj.setFillColor(GOLD)
    canvas_obj.rect(0, ht - 90, w, 3, fill=1, stroke=0)
    canvas_obj.setFillColor(WHITE)
    canvas_obj.setFont('Helvetica-Bold', 26)
    canvas_obj.drawCentredString(w/2, ht - 42, "AYUR GATE")
    canvas_obj.setFont('Helvetica', 11)
    canvas_obj.setFillColor(GOLD)
    canvas_obj.drawCentredString(w/2, ht - 62, "Payroll  |  Payslip  |  KET")
    canvas_obj.setFont('Helvetica', 9)
    canvas_obj.setFillColor(HexColor("#94a3b8"))
    canvas_obj.drawCentredString(w/2, ht - 78, "MOM & CPF Compliant  -  Singapore  |  India  |  Malaysia")
    # Footer
    canvas_obj.setFillColor(GOLD)
    canvas_obj.rect(35, 30, w - 70, 1, fill=1, stroke=0)
    canvas_obj.setFillColor(GREY_500)
    canvas_obj.setFont('Helvetica', 8)
    canvas_obj.drawCentredString(w/2, 16, "www.ayurgate.com   |   ayurgate@gmail.com   |   info@ayurgate.com")
    canvas_obj.restoreState()


def draw_later(canvas_obj, doc):
    w, ht = A4
    canvas_obj.saveState()
    canvas_obj.setFillColor(NAVY)
    canvas_obj.rect(0, ht - 26, w, 26, fill=1, stroke=0)
    canvas_obj.setFillColor(GOLD)
    canvas_obj.rect(0, ht - 26, w, 2, fill=1, stroke=0)
    canvas_obj.setFillColor(WHITE)
    canvas_obj.setFont('Helvetica-Bold', 9)
    canvas_obj.drawString(20, ht - 18, "AYUR GATE")
    canvas_obj.setFillColor(GOLD)
    canvas_obj.setFont('Helvetica', 8)
    canvas_obj.drawRightString(w - 20, ht - 18, "Payroll  |  Payslip  |  KET Features")
    # Footer
    canvas_obj.setFillColor(GOLD)
    canvas_obj.rect(35, 30, w - 70, 1, fill=1, stroke=0)
    canvas_obj.setFillColor(GREY_500)
    canvas_obj.setFont('Helvetica', 8)
    canvas_obj.drawString(35, 16, "www.ayurgate.com")
    canvas_obj.drawRightString(w - 35, 16, f"Page {doc.page}")
    canvas_obj.restoreState()


def build():
    doc = SimpleDocTemplate(OUTPUT, pagesize=A4, topMargin=100, bottomMargin=45, leftMargin=35, rightMargin=35)
    story = []

    # ══════════════════════════════════════════════════════════
    # PAGE 1: PAYROLL MODULE
    # ══════════════════════════════════════════════════════════

    story.extend(section("PAYROLL MODULE", "Automated monthly payroll with MOM overtime, CPF & multi-country statutory compliance"))

    story.append(tbl(
        ["Feature", "Details"],
        [
            [b("One-Click Generation"), c("Generate monthly payroll for all active staff in a single click")],
            [b("Payroll Workflow"), c("<b>Draft</b> &rarr; <b>Confirmed</b> &rarr; <b>Paid</b> - amounts locked after confirmation")],
            [b("Working Days"), c("Auto-calculate working days per month, excludes Sundays/rest days")],
            [b("Commission"), c("Auto-pull commission payouts from sales & treatment records")],
            [b("Unpaid Leave"), c("Auto-deduct beyond 2-day threshold: daily rate x excess leave days")],
            [b("Editable in Draft"), c("Edit overtime hours, bonus, allowances while payroll is in draft status")],
            [b("Audit Trail"), c("Full log of every payroll create, edit, confirm & payment action")],
        ],
        [140, W_PAGE - 140]
    ))

    story.append(Spacer(1, 14))
    story.extend(section("MOM OVERTIME COMPLIANCE", "Singapore Employment Act Part IV - automatic overtime calculation"))

    story.append(tbl(
        ["Item", "Formula / Rule"],
        [
            [b("Hourly Basic Rate"), c("(12 x Monthly Basic Salary) / (52 x 44)")],
            [b("OT Rate"), c("<b>1.5 x Hourly Basic Rate</b>")],
            [b("Non-Workman Cap"), c("OT calculated on max <b>S$2,600</b> basic salary")],
            [b("Workman Threshold"), c("Part IV covers workmen earning up to <b>S$4,500</b>")],
            [b("Monthly OT Limit"), c("Warning triggered if OT exceeds <b>72 hours/month</b>")],
            [b("Auto-Calculation"), c("Server-side OT pay calculation from recorded OT hours for SG staff")],
        ],
        [150, W_PAGE - 150]
    ))

    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════
    # PAGE 2: CPF + STATUTORY DEDUCTIONS
    # ══════════════════════════════════════════════════════════

    story.extend(section("CPF CONTRIBUTION RATES", "Auto-calculated by age band based on employee date of birth"))

    story.append(tbl(
        ["Age Group", "Employee", "Employer", "Total"],
        [
            [b("55 & below"), c("20%"), c("17%"), b("37%")],
            [b("Above 55 to 60"), c("18%"), c("16%"), b("34%")],
            [b("Above 60 to 65"), c("12.5%"), c("12.5%"), b("25%")],
            [b("Above 65 to 70"), c("7.5%"), c("9%"), b("16.5%")],
            [b("Above 70"), c("5%"), c("7.5%"), b("12.5%")],
        ],
        [135, 110, 110, 100]
    ))
    story.append(Spacer(1, 4))
    story.append(Paragraph("* PR Graduated rates (Year 1, 2, 3+) supported  |  Ordinary Wage Ceiling: S$8,000/month  |  Foreigners: No CPF, SDL only", styles['Note']))

    story.append(Spacer(1, 16))
    story.extend(section("STATUTORY DEDUCTIONS - ALL COUNTRIES", "Automatically calculated during payroll generation"))

    story.append(tbl(
        ["Country", "Deduction", "Rate", "Notes"],
        [
            [b("Singapore"), b("SDL"), c("0.25% of gross"), c("Min S$2, Max S$11.25 (Employer)")],
            [b("Singapore"), b("SHG Fund"), c("Tiered by wage"), c("CDAC / MBMF / SINDA / ECF by ethnicity")],
            [b("India"), b("EPF"), c("12% / 12%"), c("Employee & Employer on basic up to INR 15,000")],
            [b("India"), b("ESI"), c("0.75% / 3.25%"), c("If salary &le; INR 21,000")],
            [b("India"), b("TDS"), c("Slab-based"), c("New Regime 2024-25 with cess")],
            [b("India"), b("Prof. Tax"), c("Up to INR 200"), c("State-dependent monthly cap")],
            [b("Malaysia"), b("EPF"), c("11% / 12-13%"), c("Tiered by salary bracket")],
            [b("Malaysia"), b("SOCSO"), c("0.5% / 1.75%"), c("On salary up to RM 4,000")],
            [b("Malaysia"), b("EIS"), c("0.2% / 0.2%"), c("On salary up to RM 4,000")],
        ],
        [80, 75, 105, W_PAGE - 260]
    ))

    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════
    # PAGE 3: PAYSLIP MODULE
    # ══════════════════════════════════════════════════════════

    story.extend(section("PAYSLIP MODULE", "MOM-compliant itemized payslip - print-ready A4 with clinic branding"))

    story.append(tbl(
        ["Payslip Section", "Items Displayed"],
        [
            [b("Earnings"), c("Basic Salary<br/>All fixed allowances (itemized with individual amounts)<br/>Overtime: Hours + Rate + Calculated Amount<br/>Bonus, Public Holiday Premium, Rest Day Premium<br/>Commission earnings")],
            [b("Deductions"), c("CPF Employee contribution<br/>Tax withholding (country-specific)<br/>Unpaid leave deduction (days x daily rate)<br/>Custom deductions (itemized)")],
            [b("Employer Contributions"), c("CPF Employer contribution<br/>SDL (Skills Development Levy)<br/>SHG Fund (CDAC/MBMF/SINDA/ECF)<br/>Or: EPF Employer / ESI / SOCSO for India & Malaysia")],
            [b("MOM Salary Breakdown"), c("<b>Hourly Basic Rate</b> per MOM formula<br/><b>Daily Basic Rate</b> & <b>Daily Gross Rate</b><br/><b>OT Rate (1.5x)</b> with salary cap display<br/>OT warning if exceeding 72 hrs or non-workman cap")],
            [b("Payment Info"), c("Payment mode: Bank Transfer / Cash / Cheque<br/>Payment date & payroll status<br/>Notes field")],
            [b("Summary"), c("<b>Gross Pay</b> | <b>Total Deductions</b> | <b>Net Pay</b>")],
        ],
        [140, W_PAGE - 140]
    ))

    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════
    # PAGE 4: KET MODULE
    # ══════════════════════════════════════════════════════════

    story.extend(section("KEY EMPLOYMENT TERMS (KET)", "MOM-compliant 5-section document - auto-prefilled from staff & salary records"))

    story.append(tbl(
        ["Section", "Contents"],
        [
            [b("A. Employment Details"), c("Company name & place of work<br/>Employee name, NRIC/FIN, Staff ID<br/>Job title & main duties<br/>Employment type: Permanent / Contract / Part-Time<br/>Employment start date & end date (if contract)")],
            [b("B. Working Hours\n    & Rest"), c("Daily working hours with start/end time<br/>Break duration<br/>Working days per week<br/>Rest day: weekly or fortnightly rotation")],
            [b("C. Salary &\n    Allowances"), c("Salary period & payment frequency (hourly/daily/weekly/monthly)<br/>OT payment period & frequency<br/>Basic Salary & Gross Salary rates<br/><b>OT Rate: auto-calculated as 1.5x hourly</b><br/>Fixed allowances table (itemized with amounts)<br/>Fixed deductions table (itemized with amounts)<br/>CPF applicability (auto-detect by residency status)")],
            [b("D. Leave\n    Entitlements"), c("<b>Annual Leave:</b> 7 days Year 1, +1 per year of service, max 14 days<br/><b>Outpatient Sick Leave:</b> 5 to 14 days by months of service<br/><b>Hospitalisation Leave:</b> 15 to 60 days by months of service<br/><b>Part-Time Pro-Ration:</b> auto-calculated if &lt;35 hrs/week<br/>Other leave: bereavement, jury duty etc.")],
            [b("E. Probation\n    & Notice"), c("Probation period length (months)<br/>Probation start & end dates<br/>Notice period for termination by either party")],
        ],
        [120, W_PAGE - 120]
    ))

    story.append(Spacer(1, 14))

    # KET Features box
    story.extend(section("KET FEATURES"))
    story.append(tbl(
        ["Feature", "Description"],
        [
            [b("Auto-Prefill"), c("KET fields auto-populated from staff profile & salary configuration")],
            [b("Print Ready"), c("Branded HTML output matching MOM official KET template format")],
            [b("Auto-Supersede"), c("New KET automatically supersedes previous active KET for same employee")],
            [b("Audit Trail"), c("Full version history with timestamps on every create, edit & delete")],
        ],
        [130, W_PAGE - 130]
    ))

    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════
    # PAGE 5: PART-TIME + SUMMARY + CONTACT
    # ══════════════════════════════════════════════════════════

    story.extend(section("PART-TIME STAFF SUPPORT", "Automatic detection and MOM-compliant pro-ration"))

    story.append(tbl(
        ["Feature", "How It Works"],
        [
            [b("Auto-Detection"), c("Staff working <b>&lt;35 hours/week</b> automatically classified as part-time")],
            [b("MOM Half-Day Rounding"), c("Fraction &lt;0.25 = ignore  |  0.25 to 0.75 = 0.5 day  |  &ge;0.75 = round up to 1 day")],
            [b("Leave Pro-Ration"), c("Annual leave, sick leave & public holidays pro-rated by weekly hours ratio")],
            [b("Pro-Ration Formula"), c("Part-time weekly hours / Full-time weekly hours (default 44 hrs)")],
            [b("Workman Classification"), c("Workman / Non-workman flag determines OT eligibility & salary cap")],
        ],
        [145, W_PAGE - 145]
    ))

    story.append(Spacer(1, 20))
    story.extend(section("FEATURE SUMMARY"))

    story.append(tbl(
        ["Capability", "Payroll", "Payslip", "KET"],
        [
            [b("Auto-Calculation"), c("OT, CPF, SDL, SHG,\nleave deductions"), c("All rates & amounts\ndisplayed"), c("OT rate, leave days\nauto-prefilled")],
            [b("MOM Compliant"), c("Part IV thresholds,\n72-hr OT cap"), c("Itemized format per\nMOM requirements"), c("Official 5-section\nMOM template")],
            [b("CPF Integration"), c("Age-band rates,\nPR graduated"), c("Employee & employer\ncontributions shown"), c("CPF applicability\nauto-detected")],
            [b("Multi-Country"), c("SG + India + MY\nstatutory formulas"), c("Country-specific\ncontributions"), c("Singapore-focused\ndocument")],
            [b("Audit Trail"), c("Every action logged"), c("Generated from\nconfirmed payroll"), c("Version history &\nauto-supersede")],
            [b("Print Ready"), c("Review before\nconfirming"), c("A4 branded output\nwith clinic logo"), c("Branded HTML\nMOM template")],
        ],
        [110, 130, 130, 130]
    ))

    story.append(Spacer(1, 28))

    # Contact Footer
    ct_data = [[Paragraph(
        "<b>AYUR GATE</b><br/>"
        "MOM &amp; CPF Compliant Clinic Management Platform<br/><br/>"
        "Website: <b>www.ayurgate.com</b><br/>"
        "Email: <b>ayurgate@gmail.com</b>  |  <b>info@ayurgate.com</b><br/><br/>"
        "<i>Start with a free 7-day trial. No credit card required.</i>",
        styles['WC']
    )]]
    ct = Table(ct_data, colWidths=[W_PAGE])
    ct.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), NAVY),
        ('TOPPADDING', (0, 0), (-1, -1), 20),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 20),
        ('LEFTPADDING', (0, 0), (-1, -1), 20),
        ('RIGHTPADDING', (0, 0), (-1, -1), 20),
        ('ROUNDEDCORNERS', [8, 8, 8, 8]),
    ]))
    story.append(ct)

    doc.build(story, onFirstPage=draw_header, onLaterPages=draw_later)
    print(f"PDF generated: {OUTPUT}")


if __name__ == "__main__":
    build()
