// ─── Country-Specific Payroll Statutory Rules ──────────────────────────────
// Supports: Singapore (SG), India (IN), Malaysia (MY)

export const SUPPORTED_COUNTRIES = ["SG", "IN", "MY"] as const;
export type CountryCode = (typeof SUPPORTED_COUNTRIES)[number];

export interface StatutoryItem {
  name: string;
  amount: number;
  rate?: number;
}

export interface StatutoryResult {
  employeeContributions: StatutoryItem[];
  employerContributions: StatutoryItem[];
  taxWithholding: number;
  taxDetails?: string;
  totalEmployeeDeductions: number;
  totalEmployerCost: number;
}

export interface CountryConfig {
  currency: string;
  currencySymbol: string;
  contributions: string[];
  hasMonthlyTaxWithholding: boolean;
  label: string;
}

// ─── Country Configs ───────────────────────────────────────────────────────

const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  SG: {
    currency: "SGD",
    currencySymbol: "S$",
    contributions: ["CPF Employee", "CPF Employer", "SDL", "SHG Fund"],
    hasMonthlyTaxWithholding: false,
    label: "Singapore",
  },
  IN: {
    currency: "INR",
    currencySymbol: "\u20B9",
    contributions: ["EPF Employee", "EPF Employer", "ESI Employee", "ESI Employer", "Professional Tax"],
    hasMonthlyTaxWithholding: true,
    label: "India",
  },
  MY: {
    currency: "MYR",
    currencySymbol: "RM",
    contributions: ["EPF Employee", "EPF Employer", "SOCSO Employee", "SOCSO Employer", "EIS Employee", "EIS Employer"],
    hasMonthlyTaxWithholding: true,
    label: "Malaysia",
  },
};

export function getCountryConfig(country: string): CountryConfig {
  return COUNTRY_CONFIGS[country] || COUNTRY_CONFIGS.SG;
}

export function formatCurrencyByCountry(amount: number, country: string): string {
  const config = getCountryConfig(country);
  return `${config.currencySymbol}${amount.toFixed(2)}`;
}

// ─── Singapore SHG Fund Rate Tables ───────────────────────────────────────
// Self-Help Group contributions based on ethnicity & monthly wages
// Source: https://www.cpf.gov.sg/employer/employer-obligations/contributions-to-self-help-groups

type SHGTier = { maxWage: number; amount: number };

const SHG_RATES: Record<string, { fundName: string; tiers: SHGTier[] }> = {
  chinese: {
    fundName: "CDAC",
    tiers: [
      { maxWage: 2000, amount: 0.50 },
      { maxWage: 3500, amount: 1.00 },
      { maxWage: 5000, amount: 1.50 },
      { maxWage: 7500, amount: 2.00 },
      { maxWage: Infinity, amount: 3.00 },
    ],
  },
  malay: {
    fundName: "MBMF",
    tiers: [
      { maxWage: 1000, amount: 3.00 },
      { maxWage: 2000, amount: 4.50 },
      { maxWage: 3000, amount: 6.50 },
      { maxWage: 4000, amount: 15.00 },
      { maxWage: 6000, amount: 19.50 },
      { maxWage: 8000, amount: 22.00 },
      { maxWage: 10000, amount: 24.00 },
      { maxWage: Infinity, amount: 26.00 },
    ],
  },
  indian: {
    fundName: "SINDA",
    tiers: [
      { maxWage: 1000, amount: 1.00 },
      { maxWage: 1500, amount: 3.00 },
      { maxWage: 2500, amount: 5.00 },
      { maxWage: 4500, amount: 7.00 },
      { maxWage: 7500, amount: 9.00 },
      { maxWage: 10000, amount: 12.00 },
      { maxWage: 15000, amount: 18.00 },
      { maxWage: Infinity, amount: 30.00 },
    ],
  },
  eurasian: {
    fundName: "ECF",
    tiers: [
      { maxWage: 1000, amount: 2.00 },
      { maxWage: 1500, amount: 4.00 },
      { maxWage: 2500, amount: 6.00 },
      { maxWage: 4000, amount: 9.00 },
      { maxWage: 7000, amount: 12.00 },
      { maxWage: 10000, amount: 16.00 },
      { maxWage: Infinity, amount: 20.00 },
    ],
  },
};

export function calculateSHG(monthlyWage: number, ethnicity?: string): { fundName: string; amount: number } {
  const eth = (ethnicity || "chinese").toLowerCase();
  const fund = SHG_RATES[eth];
  if (!fund) return { fundName: "SHG", amount: 0 };
  const tier = fund.tiers.find((t) => monthlyWage <= t.maxWage);
  return { fundName: fund.fundName, amount: tier?.amount || 0 };
}

// ─── Singapore CPF Rate Tables ─────────────────────────────────────────────
// Source: https://www.cpf.gov.sg/employer/employer-obligations/how-much-cpf-contributions-to-pay

// ─── CPF contribution rates — effective 1 Jan 2026 ───
// Source: CPF Board (official rate table PDF, 1 Jan 2026 edition)

// Full rates — Singaporean & PR 3rd year+
function getCPFRatesFull(age: number): { employee: number; employer: number } {
  if (age <= 55) return { employee: 0.20, employer: 0.17 };
  if (age <= 60) return { employee: 0.17, employer: 0.155 }; // 2026: bumped from prev years
  if (age <= 65) return { employee: 0.115, employer: 0.12 }; // 2026
  if (age <= 70) return { employee: 0.075, employer: 0.09 };
  return { employee: 0.05, employer: 0.075 };
}

// PR 1st year Graduated/Graduated (G/G) — both employer & employee phased in
function getCPFRatesPR1GG(age: number): { employee: number; employer: number } {
  if (age <= 55) return { employee: 0.05, employer: 0.04 };
  if (age <= 60) return { employee: 0.05, employer: 0.04 };
  if (age <= 65) return { employee: 0.05, employer: 0.035 };
  if (age <= 70) return { employee: 0.05, employer: 0.035 };
  return { employee: 0.05, employer: 0.035 };
}

// PR 1st year Full/Graduated (F/G) — full employer, graduated employee
function getCPFRatesPR1FG(age: number): { employee: number; employer: number } {
  if (age <= 55) return { employee: 0.05, employer: 0.17 };
  if (age <= 60) return { employee: 0.05, employer: 0.155 };
  if (age <= 65) return { employee: 0.05, employer: 0.12 };
  if (age <= 70) return { employee: 0.05, employer: 0.09 };
  return { employee: 0.05, employer: 0.075 };
}

// PR 2nd year Graduated/Graduated (G/G)
function getCPFRatesPR2GG(age: number): { employee: number; employer: number } {
  if (age <= 55) return { employee: 0.15, employer: 0.09 };
  if (age <= 60) return { employee: 0.125, employer: 0.06 };
  if (age <= 65) return { employee: 0.075, employer: 0.035 };
  if (age <= 70) return { employee: 0.05, employer: 0.035 };
  return { employee: 0.05, employer: 0.035 };
}

// PR 2nd year Full/Graduated (F/G)
function getCPFRatesPR2FG(age: number): { employee: number; employer: number } {
  if (age <= 55) return { employee: 0.15, employer: 0.17 };
  if (age <= 60) return { employee: 0.125, employer: 0.155 };
  if (age <= 65) return { employee: 0.075, employer: 0.12 };
  if (age <= 70) return { employee: 0.05, employer: 0.09 };
  return { employee: 0.05, employer: 0.075 };
}

// Determine PR year from prStartDate
function getPRYear(prStartDate?: string | Date | null): number {
  if (!prStartDate) return 3; // default to full rates if unknown
  const start = new Date(prStartDate);
  const now = new Date();
  const yearsDiff = (now.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (yearsDiff < 1) return 1;
  if (yearsDiff < 2) return 2;
  return 3;
}

// ─── Singapore (SG) ────────────────────────────────────────────────────────

function calculateSingapore(grossSalary: number, options?: {
  age?: number;
  annualIncome?: number;
  ethnicity?: string;
  residencyStatus?: string;
  prStartDate?: string | Date | null;
  dateOfBirth?: string | Date | null;
  cpfRateType?: string; // "graduated_graduated" | "full_graduated" — PR 1st/2nd year only
}): StatutoryResult {
  // Calculate age from DOB if available, otherwise use provided age
  let age = options?.age || 30;
  if (options?.dateOfBirth) {
    const dob = new Date(options.dateOfBirth);
    const today = new Date();
    age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
  }

  const residency = (options?.residencyStatus || "singaporean").toLowerCase();
  const OW_CEILING = 8000; // Ordinary Wage ceiling per month (updated 1 Jan 2026)

  // ── Foreigner: No CPF, no SHG — only SDL ──
  if (residency === "foreigner") {
    let sdl = grossSalary * 0.0025;
    sdl = Math.max(2, Math.min(11.25, sdl));
    sdl = Math.round(sdl * 100) / 100;

    return {
      employeeContributions: [],
      employerContributions: [
        { name: "SDL", amount: sdl, rate: 0.25 },
      ],
      taxWithholding: 0,
      taxDetails: "Foreigner — No CPF. Employer pays levy separately. Tax filed via IRAS.",
      totalEmployeeDeductions: 0,
      totalEmployerCost: sdl,
    };
  }

  // ── Singaporean / PR — CPF rates by residency & age ──
  let cpfRates: { employee: number; employer: number };
  let rateLabel = "";

  if (residency === "pr") {
    const prYear = getPRYear(options?.prStartDate);
    const isFG = (options?.cpfRateType || "graduated_graduated") === "full_graduated";
    if (prYear === 1) {
      cpfRates = isFG ? getCPFRatesPR1FG(age) : getCPFRatesPR1GG(age);
      rateLabel = isFG ? " (PR 1st yr F/G)" : " (PR 1st yr G/G)";
    } else if (prYear === 2) {
      cpfRates = isFG ? getCPFRatesPR2FG(age) : getCPFRatesPR2GG(age);
      rateLabel = isFG ? " (PR 2nd yr F/G)" : " (PR 2nd yr G/G)";
    } else {
      cpfRates = getCPFRatesFull(age);
      rateLabel = " (PR 3rd yr+)";
    }
  } else {
    cpfRates = getCPFRatesFull(age);
  }

  // CPF is calculated on capped ordinary wages
  const cpfBase = Math.min(grossSalary, OW_CEILING);
  const cpfEmployee = Math.round(cpfBase * cpfRates.employee * 100) / 100;
  const cpfEmployer = Math.round(cpfBase * cpfRates.employer * 100) / 100;

  // SDL: 0.25% of monthly remuneration, min S$2, max S$11.25
  let sdl = grossSalary * 0.0025;
  sdl = Math.max(2, Math.min(11.25, sdl));
  sdl = Math.round(sdl * 100) / 100;

  // SHG Fund: based on ethnicity and salary tier (Singaporean & PR only)
  const shgResult = calculateSHG(grossSalary, options?.ethnicity);

  const employeeContributions: StatutoryItem[] = [
    { name: `CPF Employee${rateLabel}`, amount: cpfEmployee, rate: cpfRates.employee * 100 },
    { name: `SHG Fund (${shgResult.fundName})`, amount: shgResult.amount },
  ];

  const employerContributions: StatutoryItem[] = [
    { name: `CPF Employer${rateLabel}`, amount: cpfEmployer, rate: cpfRates.employer * 100 },
    { name: "SDL", amount: sdl, rate: 0.25 },
  ];

  const totalEmployeeDeductions = cpfEmployee + shgResult.amount;
  const totalEmployerCost = cpfEmployer + sdl;

  return {
    employeeContributions,
    employerContributions,
    taxWithholding: 0, // Singapore: no monthly tax withholding
    taxDetails: "Tax filed annually by employee (IRAS)",
    totalEmployeeDeductions,
    totalEmployerCost,
  };
}

// ─── India (IN) ────────────────────────────────────────────────────────────

function calculateIndia(grossSalary: number, options?: { age?: number; annualIncome?: number }): StatutoryResult {
  const EPF_CEILING = 15000; // EPF applicable on basic + DA up to 15,000
  const ESI_CEILING = 21000; // ESI applicable if salary <= 21,000

  // EPF: 12% employee, 12% employer (on basic up to ceiling)
  // For simplicity, we use grossSalary capped at ceiling as the EPF wage base
  const epfBase = Math.min(grossSalary, EPF_CEILING);
  const epfEmployee = Math.round(epfBase * 0.12 * 100) / 100;
  const epfEmployer = Math.round(epfBase * 0.12 * 100) / 100;

  // ESI: Employee 0.75%, Employer 3.25% (if gross <= 21,000)
  let esiEmployee = 0;
  let esiEmployer = 0;
  if (grossSalary <= ESI_CEILING) {
    esiEmployee = Math.round(grossSalary * 0.0075 * 100) / 100;
    esiEmployer = Math.round(grossSalary * 0.0325 * 100) / 100;
  }

  // Professional Tax: max 200/month (simplified default)
  const professionalTax = grossSalary >= 15000 ? 200 : grossSalary >= 10000 ? 150 : 0;

  // TDS (Tax Deducted at Source) — New Regime 2024-25
  // Monthly approximation based on annual projection
  const annualIncome = (options?.annualIncome || grossSalary * 12);
  const standardDeduction = 75000;
  const taxableIncome = Math.max(0, annualIncome - standardDeduction);

  let annualTax = 0;
  if (taxableIncome > 1500000) {
    annualTax = (taxableIncome - 1500000) * 0.30 + 150000 + 60000 + 30000 + 20000;
  } else if (taxableIncome > 1200000) {
    annualTax = (taxableIncome - 1200000) * 0.20 + 150000 + 60000 + 30000;
  } else if (taxableIncome > 1000000) {
    annualTax = (taxableIncome - 1000000) * 0.15 + 150000 + 60000;
  } else if (taxableIncome > 700000) {
    annualTax = (taxableIncome - 700000) * 0.10 + 150000;
  } else if (taxableIncome > 300000) {
    annualTax = (taxableIncome - 300000) * 0.05;
  }

  // Add 4% health & education cess
  annualTax = annualTax * 1.04;
  const monthlyTDS = Math.round((annualTax / 12) * 100) / 100;

  const employeeContributions: StatutoryItem[] = [
    { name: "EPF Employee", amount: epfEmployee, rate: 12 },
  ];
  if (esiEmployee > 0) {
    employeeContributions.push({ name: "ESI Employee", amount: esiEmployee, rate: 0.75 });
  }
  if (professionalTax > 0) {
    employeeContributions.push({ name: "Professional Tax", amount: professionalTax });
  }

  const employerContributions: StatutoryItem[] = [
    { name: "EPF Employer", amount: epfEmployer, rate: 12 },
  ];
  if (esiEmployer > 0) {
    employerContributions.push({ name: "ESI Employer", amount: esiEmployer, rate: 3.25 });
  }

  const totalEmployeeDeductions = epfEmployee + esiEmployee + professionalTax + monthlyTDS;
  const totalEmployerCost = epfEmployer + esiEmployer;

  return {
    employeeContributions,
    employerContributions,
    taxWithholding: monthlyTDS,
    taxDetails: `TDS (New Regime): Annual taxable ${formatCurrencyByCountry(taxableIncome, "IN")}, Monthly TDS ${formatCurrencyByCountry(monthlyTDS, "IN")}`,
    totalEmployeeDeductions,
    totalEmployerCost,
  };
}

// ─── Malaysia (MY) ─────────────────────────────────────────────────────────

function calculateMalaysia(grossSalary: number, options?: { age?: number; annualIncome?: number }): StatutoryResult {
  // EPF: Employee 11%, Employer 12% (salary <= RM5,000) or 13% (>RM5,000)
  const epfEmployeeRate = 0.11;
  const epfEmployerRate = grossSalary <= 5000 ? 0.12 : 0.13;
  const epfEmployee = Math.round(grossSalary * epfEmployeeRate * 100) / 100;
  const epfEmployer = Math.round(grossSalary * epfEmployerRate * 100) / 100;

  // SOCSO: Employee 0.5%, Employer 1.75% (on salary up to RM4,000)
  const SOCSO_CEILING = 4000;
  const socsoBase = Math.min(grossSalary, SOCSO_CEILING);
  const socsoEmployee = Math.round(socsoBase * 0.005 * 100) / 100;
  const socsoEmployer = Math.round(socsoBase * 0.0175 * 100) / 100;

  // EIS: Employee 0.2%, Employer 0.2% (on salary up to RM4,000)
  const EIS_CEILING = 4000;
  const eisBase = Math.min(grossSalary, EIS_CEILING);
  const eisEmployee = Math.round(eisBase * 0.002 * 100) / 100;
  const eisEmployer = Math.round(eisBase * 0.002 * 100) / 100;

  // PCB (Monthly Tax Deduction) — simplified annual projection approach
  const annualIncome = grossSalary * 12;

  // Malaysia tax brackets (annual chargeable income after personal relief RM9,000)
  const relief = 9000;
  const taxableIncome = Math.max(0, annualIncome - relief);

  let annualTax = 0;
  if (taxableIncome > 100000) {
    annualTax = (taxableIncome - 100000) * 0.25 + 10900 + 3800 + 1800 + 600 + 150;
  } else if (taxableIncome > 70000) {
    annualTax = (taxableIncome - 70000) * 0.19 + 3800 + 1800 + 600 + 150;
  } else if (taxableIncome > 50000) {
    annualTax = (taxableIncome - 50000) * 0.11 + 1800 + 600 + 150;
  } else if (taxableIncome > 35000) {
    annualTax = (taxableIncome - 35000) * 0.06 + 600 + 150;
  } else if (taxableIncome > 20000) {
    annualTax = (taxableIncome - 20000) * 0.03 + 150;
  } else if (taxableIncome > 5000) {
    annualTax = (taxableIncome - 5000) * 0.01;
  }

  const monthlyPCB = Math.round((annualTax / 12) * 100) / 100;

  const employeeContributions: StatutoryItem[] = [
    { name: "EPF Employee", amount: epfEmployee, rate: 11 },
    { name: "SOCSO Employee", amount: socsoEmployee, rate: 0.5 },
    { name: "EIS Employee", amount: eisEmployee, rate: 0.2 },
  ];

  const employerContributions: StatutoryItem[] = [
    { name: "EPF Employer", amount: epfEmployer, rate: epfEmployerRate * 100 },
    { name: "SOCSO Employer", amount: socsoEmployer, rate: 1.75 },
    { name: "EIS Employer", amount: eisEmployer, rate: 0.2 },
  ];

  const totalEmployeeDeductions = epfEmployee + socsoEmployee + eisEmployee + monthlyPCB;
  const totalEmployerCost = epfEmployer + socsoEmployer + eisEmployer;

  return {
    employeeContributions,
    employerContributions,
    taxWithholding: monthlyPCB,
    taxDetails: `PCB: Annual taxable RM${taxableIncome.toFixed(2)}, Monthly PCB RM${monthlyPCB.toFixed(2)}`,
    totalEmployeeDeductions,
    totalEmployerCost,
  };
}

// ─── Main Calculator ───────────────────────────────────────────────────────

export function calculateStatutory(
  country: string,
  grossSalary: number,
  options?: { age?: number; annualIncome?: number; ethnicity?: string; residencyStatus?: string; prStartDate?: string | Date | null; dateOfBirth?: string | Date | null; cpfRateType?: string }
): StatutoryResult {
  switch (country) {
    case "IN":
      return calculateIndia(grossSalary, options);
    case "MY":
      return calculateMalaysia(grossSalary, options);
    case "SG":
    default:
      return calculateSingapore(grossSalary, options);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MOM Employment Act — Salary Conversion & OT Calculation (Singapore)
// Source: Employment Act Part IV, MOM.gov.sg
// ═══════════════════════════════════════════════════════════════════════════

// Part IV coverage thresholds
export const MOM_PART4_CAP_NON_WORKMAN = 2600;
export const MOM_PART4_CAP_WORKMAN = 4500;
export const MOM_MAX_OT_HOURS_PER_MONTH = 72;
export const MOM_MAX_DAILY_HOURS = 12; // including OT
export const MOM_NORMAL_WEEKLY_HOURS = 44;
export const MOM_PART_TIME_THRESHOLD = 35; // hours per week

/**
 * Check if employee is covered by Part IV (Hours of Work / OT).
 */
export function isPartIVCovered(monthlyBasic: number, isWorkman: boolean): boolean {
  if (isWorkman) return monthlyBasic <= MOM_PART4_CAP_WORKMAN;
  return monthlyBasic <= MOM_PART4_CAP_NON_WORKMAN;
}

/**
 * MOM hourly basic rate of pay.
 * Formula: (12 × Monthly basic) / (52 × 44)
 * The 44 is always statutory max normal weekly hours, regardless of actual hours.
 */
export function momHourlyBasicRate(monthlyBasic: number): number {
  return (12 * monthlyBasic) / (52 * 44);
}

/**
 * MOM daily basic rate of pay (for OT / rest day work).
 * Formula: (12 × Monthly basic) / (52 × working days per week)
 */
export function momDailyBasicRate(monthlyBasic: number, workingDaysPerWeek: number): number {
  if (workingDaysPerWeek <= 0) return 0;
  return (12 * monthlyBasic) / (52 * workingDaysPerWeek);
}

/**
 * MOM gross daily rate of pay (for PH / paid leave).
 * Formula: (12 × Monthly gross) / (52 × working days per week)
 */
export function momDailyGrossRate(monthlyGross: number, workingDaysPerWeek: number): number {
  if (workingDaysPerWeek <= 0) return 0;
  return (12 * monthlyGross) / (52 * workingDaysPerWeek);
}

/**
 * MOM overtime rate of pay (1.5× hourly basic rate).
 * For non-workmen above $2,600, OT is capped at $2,600 basic for calculation.
 */
export function momOvertimeRate(monthlyBasic: number, isWorkman: boolean): number {
  // Cap non-workman basic at $2,600 for OT calculation
  const cappedBasic = isWorkman ? monthlyBasic : Math.min(monthlyBasic, MOM_PART4_CAP_NON_WORKMAN);
  return momHourlyBasicRate(cappedBasic) * 1.5;
}

/**
 * Calculate OT pay for given hours.
 */
export function calculateOTPay(
  monthlyBasic: number,
  otHours: number,
  isWorkman: boolean
): { otRate: number; otPay: number; covered: boolean; warning?: string } {
  const covered = isPartIVCovered(monthlyBasic, isWorkman);
  if (!covered) {
    // Not covered by Part IV — no statutory OT entitlement
    // Still calculate at 1.5x for reference if employer wants to pay
    const otRate = momOvertimeRate(monthlyBasic, isWorkman);
    return {
      otRate,
      otPay: Math.round(otRate * otHours * 100) / 100,
      covered: false,
      warning: `Employee salary exceeds Part IV cap (${isWorkman ? "S$4,500 workman" : "S$2,600 non-workman"}). OT is calculated but not statutory.`,
    };
  }

  const otRate = momOvertimeRate(monthlyBasic, isWorkman);
  let warning: string | undefined;
  if (otHours > MOM_MAX_OT_HOURS_PER_MONTH) {
    warning = `OT hours (${otHours}) exceed MOM monthly limit of ${MOM_MAX_OT_HOURS_PER_MONTH} hours.`;
  }

  return {
    otRate,
    otPay: Math.round(otRate * otHours * 100) / 100,
    covered: true,
    warning,
  };
}

/**
 * MOM incomplete month salary calculation.
 * Formula: Monthly salary × (calendar days employed / total calendar days in month)
 */
export function momIncompleteMonthSalary(
  monthlySalary: number,
  daysEmployed: number,
  totalDaysInMonth: number
): number {
  if (totalDaysInMonth <= 0) return 0;
  return Math.round((monthlySalary * daysEmployed / totalDaysInMonth) * 100) / 100;
}

// ═══════════════════════════════════════════════════════════════════════════
// MOM Part-Time Employment — Pro-Ration
// Source: Employment of Part-Time Employees Regulations
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Pro-ration factor for part-time employees.
 * Factor = PT weekly hours / FT weekly hours (default 44).
 */
export function partTimeProRationFactor(ptWeeklyHours: number, ftWeeklyHours: number = 44): number {
  if (ftWeeklyHours <= 0) return 0;
  return ptWeeklyHours / ftWeeklyHours;
}

/**
 * Round to nearest half day (MOM part-time rounding rule).
 * < 0.25 → ignore, ≥ 0.25 → round up to 0.5
 */
function roundToHalfDay(days: number): number {
  const whole = Math.floor(days);
  const fraction = days - whole;
  if (fraction < 0.25) return whole;
  if (fraction < 0.75) return whole + 0.5;
  return whole + 1;
}

/**
 * Pro-rate annual leave for part-time employee.
 */
export function partTimeAnnualLeave(
  ftEntitlementDays: number,
  ptWeeklyHours: number,
  ftWeeklyHours: number = 44
): number {
  const raw = ftEntitlementDays * partTimeProRationFactor(ptWeeklyHours, ftWeeklyHours);
  return roundToHalfDay(raw);
}

/**
 * Pro-rate sick leave for part-time employee.
 */
export function partTimeSickLeave(
  ftOutpatientDays: number,
  ftHospitalisationDays: number,
  ptWeeklyHours: number,
  ftWeeklyHours: number = 44
): { outpatient: number; hospitalisation: number } {
  const factor = partTimeProRationFactor(ptWeeklyHours, ftWeeklyHours);
  return {
    outpatient: roundToHalfDay(ftOutpatientDays * factor),
    hospitalisation: roundToHalfDay(ftHospitalisationDays * factor),
  };
}

/**
 * Pro-rate public holiday entitlement for part-time employee.
 * Singapore has 11 gazetted public holidays per year.
 */
export function partTimePublicHolidays(
  ptWeeklyHours: number,
  ftWeeklyHours: number = 44,
  totalPH: number = 11
): number {
  const raw = totalPH * partTimeProRationFactor(ptWeeklyHours, ftWeeklyHours);
  return roundToHalfDay(raw);
}

/**
 * Full-time annual leave entitlement by years of service (MOM minimum).
 * 7 days for 1st year, +1 per year up to 14 days.
 */
export function ftAnnualLeaveEntitlement(yearsOfService: number): number {
  if (yearsOfService < 1) return 0; // entitled after 3 months, full after 1 year
  return Math.min(7 + (yearsOfService - 1), 14);
}

/**
 * Full-time sick leave entitlement by months of service (MOM minimum).
 */
export function ftSickLeaveEntitlement(monthsOfService: number): { outpatient: number; hospitalisation: number } {
  if (monthsOfService < 3) return { outpatient: 0, hospitalisation: 0 };
  if (monthsOfService < 4) return { outpatient: 5, hospitalisation: 15 };
  if (monthsOfService < 5) return { outpatient: 8, hospitalisation: 30 };
  if (monthsOfService < 6) return { outpatient: 11, hospitalisation: 45 };
  return { outpatient: 14, hospitalisation: 60 };
}

export interface MOMSalaryBreakdown {
  hourlyBasicRate: number;
  dailyBasicRate: number;
  dailyGrossRate: number;
  overtimeRate: number;
  isPartIVCovered: boolean;
  isPartTime: boolean;
  proRationFactor: number | null;
}

/**
 * Get full MOM salary breakdown for display / payslip.
 */
export function getMOMSalaryBreakdown(opts: {
  monthlyBasic: number;
  monthlyGross: number;
  workingDaysPerWeek: number;
  isWorkman: boolean;
  employmentType: string;
  weeklyContractedHours?: number;
}): MOMSalaryBreakdown {
  const isPartTime = opts.employmentType === "part_time";
  const proRationFactor = isPartTime && opts.weeklyContractedHours
    ? partTimeProRationFactor(opts.weeklyContractedHours)
    : null;

  return {
    hourlyBasicRate: Math.round(momHourlyBasicRate(opts.monthlyBasic) * 100) / 100,
    dailyBasicRate: Math.round(momDailyBasicRate(opts.monthlyBasic, opts.workingDaysPerWeek) * 100) / 100,
    dailyGrossRate: Math.round(momDailyGrossRate(opts.monthlyGross, opts.workingDaysPerWeek) * 100) / 100,
    overtimeRate: Math.round(momOvertimeRate(opts.monthlyBasic, opts.isWorkman) * 100) / 100,
    isPartIVCovered: isPartIVCovered(opts.monthlyBasic, opts.isWorkman),
    isPartTime,
    proRationFactor,
  };
}
