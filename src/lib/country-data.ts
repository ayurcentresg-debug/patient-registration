// Country-specific data for registration and onboarding forms

export interface CountryOption {
  code: string;
  name: string;
  flag: string;
  phonePrefix: string;
  currency: string;
  timezone: string;
}

export interface StateOption {
  value: string;
  label: string;
}

export interface AddressConfig {
  stateLabel: string;
  stateOptions: StateOption[] | null; // null = free text input
  zipLabel: string;
  zipFormat: string; // regex pattern string
  zipLength: number | null;
  showZip: boolean;
  showState: boolean;
  zipPlaceholder: string;
}

// ─── Primary Countries ───────────────────────────────────────

export const COUNTRIES: CountryOption[] = [
  { code: "SG", name: "Singapore", flag: "\u{1F1F8}\u{1F1EC}", phonePrefix: "+65", currency: "SGD", timezone: "Asia/Singapore" },
  { code: "IN", name: "India", flag: "\u{1F1EE}\u{1F1F3}", phonePrefix: "+91", currency: "INR", timezone: "Asia/Kolkata" },
  { code: "MY", name: "Malaysia", flag: "\u{1F1F2}\u{1F1FE}", phonePrefix: "+60", currency: "MYR", timezone: "Asia/Kuala_Lumpur" },
  { code: "LK", name: "Sri Lanka", flag: "\u{1F1F1}\u{1F1F0}", phonePrefix: "+94", currency: "LKR", timezone: "Asia/Colombo" },
  { code: "AE", name: "UAE", flag: "\u{1F1E6}\u{1F1EA}", phonePrefix: "+971", currency: "AED", timezone: "Asia/Dubai" },
  { code: "OTHER", name: "Other", flag: "\u{1F30D}", phonePrefix: "", currency: "USD", timezone: "UTC" },
];

// ─── Currency & Timezone Maps ────────────────────────────────

export const CURRENCY_MAP: Record<string, string> = {
  Singapore: "SGD",
  India: "INR",
  Malaysia: "MYR",
  "Sri Lanka": "LKR",
  UAE: "AED",
};

export const TIMEZONE_MAP: Record<string, string> = {
  Singapore: "Asia/Singapore",
  India: "Asia/Kolkata",
  Malaysia: "Asia/Kuala_Lumpur",
  "Sri Lanka": "Asia/Colombo",
  UAE: "Asia/Dubai",
};

// ─── India: 28 States + 8 Union Territories ─────────────────

export const INDIA_STATES: StateOption[] = [
  // States
  { value: "Andhra Pradesh", label: "Andhra Pradesh" },
  { value: "Arunachal Pradesh", label: "Arunachal Pradesh" },
  { value: "Assam", label: "Assam" },
  { value: "Bihar", label: "Bihar" },
  { value: "Chhattisgarh", label: "Chhattisgarh" },
  { value: "Goa", label: "Goa" },
  { value: "Gujarat", label: "Gujarat" },
  { value: "Haryana", label: "Haryana" },
  { value: "Himachal Pradesh", label: "Himachal Pradesh" },
  { value: "Jharkhand", label: "Jharkhand" },
  { value: "Karnataka", label: "Karnataka" },
  { value: "Kerala", label: "Kerala" },
  { value: "Madhya Pradesh", label: "Madhya Pradesh" },
  { value: "Maharashtra", label: "Maharashtra" },
  { value: "Manipur", label: "Manipur" },
  { value: "Meghalaya", label: "Meghalaya" },
  { value: "Mizoram", label: "Mizoram" },
  { value: "Nagaland", label: "Nagaland" },
  { value: "Odisha", label: "Odisha" },
  { value: "Punjab", label: "Punjab" },
  { value: "Rajasthan", label: "Rajasthan" },
  { value: "Sikkim", label: "Sikkim" },
  { value: "Tamil Nadu", label: "Tamil Nadu" },
  { value: "Telangana", label: "Telangana" },
  { value: "Tripura", label: "Tripura" },
  { value: "Uttar Pradesh", label: "Uttar Pradesh" },
  { value: "Uttarakhand", label: "Uttarakhand" },
  { value: "West Bengal", label: "West Bengal" },
  // Union Territories
  { value: "Andaman and Nicobar Islands", label: "Andaman & Nicobar Islands" },
  { value: "Chandigarh", label: "Chandigarh" },
  { value: "Dadra and Nagar Haveli and Daman and Diu", label: "Dadra & Nagar Haveli and Daman & Diu" },
  { value: "Delhi", label: "Delhi (NCT)" },
  { value: "Jammu and Kashmir", label: "Jammu & Kashmir" },
  { value: "Ladakh", label: "Ladakh" },
  { value: "Lakshadweep", label: "Lakshadweep" },
  { value: "Puducherry", label: "Puducherry" },
];

// ─── Malaysia: 13 States + 3 Federal Territories ────────────

export const MALAYSIA_STATES: StateOption[] = [
  { value: "Johor", label: "Johor" },
  { value: "Kedah", label: "Kedah" },
  { value: "Kelantan", label: "Kelantan" },
  { value: "Melaka", label: "Melaka" },
  { value: "Negeri Sembilan", label: "Negeri Sembilan" },
  { value: "Pahang", label: "Pahang" },
  { value: "Penang", label: "Penang" },
  { value: "Perak", label: "Perak" },
  { value: "Perlis", label: "Perlis" },
  { value: "Sabah", label: "Sabah" },
  { value: "Sarawak", label: "Sarawak" },
  { value: "Selangor", label: "Selangor" },
  { value: "Terengganu", label: "Terengganu" },
  // Federal Territories
  { value: "Kuala Lumpur", label: "Kuala Lumpur (FT)" },
  { value: "Putrajaya", label: "Putrajaya (FT)" },
  { value: "Labuan", label: "Labuan (FT)" },
];

// ─── Sri Lanka: 9 Provinces ─────────────────────────────────

export const SRI_LANKA_PROVINCES: StateOption[] = [
  { value: "Central", label: "Central" },
  { value: "Eastern", label: "Eastern" },
  { value: "North Central", label: "North Central" },
  { value: "North Western", label: "North Western" },
  { value: "Northern", label: "Northern" },
  { value: "Sabaragamuwa", label: "Sabaragamuwa" },
  { value: "Southern", label: "Southern" },
  { value: "Uva", label: "Uva" },
  { value: "Western", label: "Western" },
];

// ─── UAE: 7 Emirates ────────────────────────────────────────

export const UAE_EMIRATES: StateOption[] = [
  { value: "Abu Dhabi", label: "Abu Dhabi" },
  { value: "Ajman", label: "Ajman" },
  { value: "Dubai", label: "Dubai" },
  { value: "Fujairah", label: "Fujairah" },
  { value: "Ras Al Khaimah", label: "Ras Al Khaimah" },
  { value: "Sharjah", label: "Sharjah" },
  { value: "Umm Al Quwain", label: "Umm Al Quwain" },
];

// ─── Address Configuration per Country ──────────────────────

export const COUNTRY_ADDRESS_CONFIG: Record<string, AddressConfig> = {
  Singapore: {
    stateLabel: "Region",
    stateOptions: null,
    zipLabel: "Postal Code",
    zipFormat: "^\\d{6}$",
    zipLength: 6,
    showZip: true,
    showState: false,
    zipPlaceholder: "e.g. 460084",
  },
  India: {
    stateLabel: "State",
    stateOptions: INDIA_STATES,
    zipLabel: "Pincode",
    zipFormat: "^\\d{6}$",
    zipLength: 6,
    showZip: true,
    showState: true,
    zipPlaceholder: "e.g. 600001",
  },
  Malaysia: {
    stateLabel: "State",
    stateOptions: MALAYSIA_STATES,
    zipLabel: "Postcode",
    zipFormat: "^\\d{5}$",
    zipLength: 5,
    showZip: true,
    showState: true,
    zipPlaceholder: "e.g. 50000",
  },
  "Sri Lanka": {
    stateLabel: "Province",
    stateOptions: SRI_LANKA_PROVINCES,
    zipLabel: "Postal Code",
    zipFormat: "^\\d{5}$",
    zipLength: 5,
    showZip: true,
    showState: true,
    zipPlaceholder: "e.g. 10100",
  },
  UAE: {
    stateLabel: "Emirate",
    stateOptions: UAE_EMIRATES,
    zipLabel: "P.O. Box",
    zipFormat: "^\\d{1,6}$",
    zipLength: 6,
    showZip: false,
    showState: true,
    zipPlaceholder: "",
  },
  Other: {
    stateLabel: "State / Province",
    stateOptions: null,
    zipLabel: "Zip / Postal Code",
    zipFormat: "^.{3,10}$",
    zipLength: 10,
    showZip: true,
    showState: true,
    zipPlaceholder: "Zip / Postal Code",
  },
};

// Helper: get address config for a country name
export function getAddressConfig(country: string): AddressConfig {
  return COUNTRY_ADDRESS_CONFIG[country] || COUNTRY_ADDRESS_CONFIG["Other"];
}

// Helper: get phone prefix
export function getPhonePrefix(country: string): string {
  const c = COUNTRIES.find(c => c.name === country);
  return c?.phonePrefix || "";
}

// ─── Clinic Types ───────────────────────────────────────────

export const CLINIC_TYPES = [
  { value: "ayurveda", label: "Ayurveda Clinic", desc: "Traditional Ayurvedic practice", icon: "\u{1F33F}" },
  { value: "panchakarma", label: "Panchakarma Centre", desc: "Detox & Panchakarma therapies", icon: "\u{1F9D8}" },
  { value: "wellness", label: "Wellness & Spa", desc: "Holistic wellness centre", icon: "\u2728" },
  { value: "multi", label: "Multi-Therapy", desc: "Multiple therapy types", icon: "\u{1F3E5}" },
  { value: "yoga", label: "Yoga Therapy", desc: "Yoga & pranayama practice", icon: "\u{1FA77}" },
  { value: "general", label: "General Practice", desc: "General healthcare clinic", icon: "\u2695\uFE0F" },
];

// ─── Practitioner Counts ────────────────────────────────────

export const PRACTITIONER_COUNTS = ["1-5", "5-10", "10-20", "20+"];

// ─── Referral Sources ───────────────────────────────────────

export const REFERRAL_SOURCES = [
  { value: "google", label: "Google Search" },
  { value: "social", label: "Social Media" },
  { value: "referral", label: "Friend / Colleague" },
  { value: "conference", label: "Conference / Event" },
  { value: "blog", label: "Blog / Article" },
  { value: "other", label: "Other" },
];

// ─── Password Rules & Validation ────────────────────────────

export const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8, label: "At least 8 characters" },
  { test: (p: string) => /[a-z]/.test(p), label: "Contains a lowercase letter" },
  { test: (p: string) => /[A-Z]/.test(p), label: "Contains an uppercase letter" },
  { test: (p: string) => /[0-9]/.test(p), label: "Contains a number" },
  { test: (p: string) => /[#?!@$%^&*\-]/.test(p), label: "Contains a symbol (#?!@$%^&*-)" },
];

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors = PASSWORD_RULES.filter(r => !r.test(password)).map(r => r.label);
  return { valid: errors.length === 0, errors };
}

export function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: "", color: "#e5e7eb" };
  const passed = PASSWORD_RULES.filter(r => r.test(password)).length;
  if (passed <= 1) return { score: passed, label: "Weak", color: "#ef4444" };
  if (passed === 2) return { score: passed, label: "Fair", color: "#f59e0b" };
  if (passed === 3) return { score: passed, label: "Good", color: "#eab308" };
  if (passed === 4) return { score: passed, label: "Strong", color: "#22c55e" };
  return { score: passed, label: "Very Strong", color: "#059669" };
}

// ─── Country-specific defaults ──────────────────────────────

export function getCountryDefaults(country: string) {
  return {
    currency: CURRENCY_MAP[country] || "USD",
    timezone: TIMEZONE_MAP[country] || "UTC",
    // India & Sri Lanka: Mon-Sat typical, rest Mon-Fri
    workingDays: (country === "India" || country === "Sri Lanka")
      ? [1, 2, 3, 4, 5, 6]
      : [1, 2, 3, 4, 5],
    // Tax label
    taxLabel: country === "India" ? "GSTIN" : country === "Singapore" ? "GST Reg. No" : country === "Malaysia" ? "SST No" : "Tax Reg. No",
  };
}
