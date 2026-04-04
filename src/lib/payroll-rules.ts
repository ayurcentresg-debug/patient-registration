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

// ─── Singapore (SG) ────────────────────────────────────────────────────────

function calculateSingapore(grossSalary: number, options?: { age?: number; annualIncome?: number; ethnicity?: string }): StatutoryResult {
  const age = options?.age || 30;
  const OW_CEILING = 8000; // Ordinary Wage ceiling per month (updated 1 Jan 2026)
  const AW_CEILING = 102000; // Annual ceiling
  const CPF_ANNUAL_LIMIT = 37740; // Annual CPF contribution limit

  // CPF rates by age group (effective 1 Jan 2026)
  let cpfEmployeeRate: number;
  let cpfEmployerRate: number;
  if (age <= 55) {
    cpfEmployeeRate = 0.20;
    cpfEmployerRate = 0.17;
  } else if (age <= 60) {
    cpfEmployeeRate = 0.18;
    cpfEmployerRate = 0.16;
  } else if (age <= 65) {
    cpfEmployeeRate = 0.125;
    cpfEmployerRate = 0.125;
  } else if (age <= 70) {
    cpfEmployeeRate = 0.075;
    cpfEmployerRate = 0.09;
  } else {
    cpfEmployeeRate = 0.05;
    cpfEmployerRate = 0.075;
  }

  // CPF is calculated on capped ordinary wages
  const cpfBase = Math.min(grossSalary, OW_CEILING);
  const cpfEmployee = Math.round(cpfBase * cpfEmployeeRate * 100) / 100;
  const cpfEmployer = Math.round(cpfBase * cpfEmployerRate * 100) / 100;

  // SDL: 0.25% of monthly remuneration, min S$2, max S$11.25
  let sdl = grossSalary * 0.0025;
  sdl = Math.max(2, Math.min(11.25, sdl));
  sdl = Math.round(sdl * 100) / 100;

  // SHG Fund: based on ethnicity and salary tier
  const shgResult = calculateSHG(grossSalary, options?.ethnicity);

  const employeeContributions: StatutoryItem[] = [
    { name: "CPF Employee", amount: cpfEmployee, rate: cpfEmployeeRate * 100 },
    { name: `SHG Fund (${shgResult.fundName})`, amount: shgResult.amount },
  ];

  const employerContributions: StatutoryItem[] = [
    { name: "CPF Employer", amount: cpfEmployer, rate: cpfEmployerRate * 100 },
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
  options?: { age?: number; annualIncome?: number; ethnicity?: string }
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
