/**
 * GBS Enterprise Pricing & Subscription Calculator Engine
 * Calculates automated per-student monthly and multi-month subscription fees:
 * - Nursery to JHS Level: GH₵ 5 per student × Total Students = Monthly Amount to Pay
 * - SHS Level: GH₵ 10 per student × Total Students = Monthly Amount to Pay
 * - University Level: GH₵ 20 per student × Total Students = Monthly Amount to Pay
 * Final Term Amount = Monthly Amount × Subscribed Months (3, 6, 9, 12 Months, or Lifetime [36 Months])
 * Supports:
 *   1. MONTHLY_SPREAD: Payment spread every month (tenant pays Monthly Amount each month)
 *   2. BULK_FULL_TERM: Tenant signs Terms & Conditions to pay the full subscribed term in bulk (without monthly spread)
 */

export const DEFAULT_ONBOARDING_RATES = {
  JHS: 5,        // Nursery to JHS: GH₵ 5 per student per month
  SHS: 10,       // SHS: GH₵ 10 per student per month
  UNIVERSITY: 20 // University: GH₵ 20 per student per month
};

export const SUBSCRIPTION_TERMS_CONFIG = {
  "1_MONTH_TRIAL": { id: "1_MONTH_TRIAL", months: 1, label: "1-Month Free Trial", shortLabel: "1 Month Trial", isTrial: true },
  "3_MONTHS": { id: "3_MONTHS", months: 3, label: "3 Months Subscription", shortLabel: "3 Months", isTrial: false },
  "6_MONTHS": { id: "6_MONTHS", months: 6, label: "6 Months Subscription", shortLabel: "6 Months", isTrial: false },
  "9_MONTHS": { id: "9_MONTHS", months: 9, label: "9 Months Subscription", shortLabel: "9 Months", isTrial: false },
  "12_MONTHS": { id: "12_MONTHS", months: 12, label: "12 Months (1 Year) Subscription", shortLabel: "12 Months", isTrial: false },
  "LIFETIME": { id: "LIFETIME", months: 36, label: "Lifetime Perpetual Subscription", shortLabel: "Lifetime (36 Mo Eqv.)", isTrial: false }
};

export const RECURRING_SUBSCRIPTION_PRESETS = {
  JHS: {
    monthly: 250,
    annual: 2500,
    label: "Nursery to JHS Standard Cloud Subscription (GH₵ 5 / Student / Month)"
  },
  SHS: {
    monthly: 500,
    annual: 5000,
    label: "SHS Enterprise Cloud Subscription (GH₵ 10 / Student / Month)"
  },
  UNIVERSITY: {
    monthly: 1200,
    annual: 12000,
    label: "University Collegiate Cloud Cluster (GH₵ 20 / Student / Month)"
  }
};

/**
 * Retrieve current active per-student rates (from developer configuration or defaults)
 */
export function getOnboardingRates() {
  try {
    const saved = localStorage.getItem("gbs_onboarding_rates");
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        JHS: Number(parsed.JHS) || DEFAULT_ONBOARDING_RATES.JHS,
        SHS: Number(parsed.SHS) || DEFAULT_ONBOARDING_RATES.SHS,
        UNIVERSITY: Number(parsed.UNIVERSITY) || DEFAULT_ONBOARDING_RATES.UNIVERSITY
      };
    }
  } catch { }
  return { ...DEFAULT_ONBOARDING_RATES };
}

/**
 * Update rates dynamically from the Developer Dashboard
 */
export function updateOnboardingRates(newRates) {
  const current = getOnboardingRates();
  const updated = {
    JHS: Number(newRates.JHS) || current.JHS,
    SHS: Number(newRates.SHS) || current.SHS,
    UNIVERSITY: Number(newRates.UNIVERSITY) || current.UNIVERSITY
  };
  localStorage.setItem("gbs_onboarding_rates", JSON.stringify(updated));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("gbs_rates_updated", { detail: updated }));
  }
  return updated;
}

/**
 * Resolve institution tier string to JHS, SHS, or UNIVERSITY
 */
export function resolveInstitutionTier(tier = "JHS") {
  const normTier = String(tier || "JHS").toUpperCase();
  if (normTier.includes("UNI") || normTier.includes("COLLEGE") || normTier.includes("TERTIARY")) {
    return "UNIVERSITY";
  }
  if (normTier.includes("SHS") || normTier.includes("SENIOR") || normTier.includes("SECONDARY") || normTier.includes("HIGH")) {
    return "SHS";
  }
  return "JHS";
}

/**
 * Calculate monthly and multi-month subscription pricing
 * Formula:
 *   Monthly Amount = Total Students × Rate Per Student (5 / 10 / 20 Cedis)
 *   Total Term Amount = Monthly Amount × Subscribed Months (3, 6, 9, 12, or 36 for Lifetime)
 */
export function calculateSubscriptionPricing({
  tier = "JHS",
  studentCount = 0,
  subscriptionPlan = "3_MONTHS",
  paymentScheduleMode = "MONTHLY_SPREAD"
} = {}) {
  const rates = getOnboardingRates();
  const effectiveTier = resolveInstitutionTier(tier);
  const rate = rates[effectiveTier] || DEFAULT_ONBOARDING_RATES[effectiveTier];
  const count = Math.max(0, parseInt(studentCount, 10) || 0);

  // Monthly amount = rate per student * total students in the registered institution
  const monthlyFee = count * rate;

  const termMeta = SUBSCRIPTION_TERMS_CONFIG[subscriptionPlan] || SUBSCRIPTION_TERMS_CONFIG["3_MONTHS"];
  const subscribedMonths = termMeta.months;
  const isTrial = Boolean(termMeta.isTrial);

  // Final term amount = monthlyFee * subscribedMonths
  const totalTermFee = isTrial ? 0 : monthlyFee * subscribedMonths;
  const mode = paymentScheduleMode === "BULK_FULL_TERM" ? "BULK_FULL_TERM" : "MONTHLY_SPREAD";

  // Amount payable immediately based on chosen mode (spread monthly vs bulk full term)
  const amountDueNow = isTrial ? 0 : (mode === "BULK_FULL_TERM" ? totalTermFee : monthlyFee);

  return {
    tier: effectiveTier,
    studentCount: count,
    rate,
    monthlyFee,
    subscribedMonths,
    subscriptionPlan: termMeta.id,
    subscriptionLabel: termMeta.label,
    isTrial,
    totalTermFee,
    paymentScheduleMode: mode,
    amountDueNow,
    formattedRate: `GH₵ ${rate.toFixed(2)}`,
    formattedMonthlyFee: formatCedis(monthlyFee),
    formattedTotalTermFee: formatCedis(totalTermFee),
    formattedAmountDueNow: formatCedis(amountDueNow),
    termBreakdown: {
      trial1Month: 0,
      months3: monthlyFee * 3,
      months6: monthlyFee * 6,
      months9: monthlyFee * 9,
      months12: monthlyFee * 12,
      lifetime: monthlyFee * 36
    }
  };
}

/**
 * Calculate the base monthly onboarding/subscription fee
 * Formula: Monthly Fee = Total Student Population × Rate Per Student (5 / 10 / 20 Cedis)
 */
export function calculateOnboardingFee(tier = "JHS", studentCount = 0, subscriptionPlan = "3_MONTHS", paymentScheduleMode = "MONTHLY_SPREAD") {
  const subPricing = calculateSubscriptionPricing({ tier, studentCount, subscriptionPlan, paymentScheduleMode });
  return {
    tier: subPricing.tier,
    studentCount: subPricing.studentCount,
    rate: subPricing.rate,
    monthlyFee: subPricing.monthlyFee,
    subscribedMonths: subPricing.subscribedMonths,
    totalTermFee: subPricing.totalTermFee,
    amountDueNow: subPricing.amountDueNow,
    totalFee: subPricing.monthlyFee,
    formattedFee: subPricing.formattedMonthlyFee,
    formattedTotalTermFee: subPricing.formattedTotalTermFee,
    formattedAmountDueNow: subPricing.formattedAmountDueNow,
    formattedRate: subPricing.formattedRate,
    currency: "GH₵",
    termBreakdown: subPricing.termBreakdown,
    recurring: {
      monthly: subPricing.monthlyFee || RECURRING_SUBSCRIPTION_PRESETS[subPricing.tier].monthly,
      annual: (subPricing.monthlyFee * 12) || RECURRING_SUBSCRIPTION_PRESETS[subPricing.tier].annual,
      label: RECURRING_SUBSCRIPTION_PRESETS[subPricing.tier].label
    }
  };
}

/**
 * Helper to format amounts in Ghanaian Cedis (GH₵)
 */
export function formatCedis(amount = 0) {
  const num = Number(amount) || 0;
  return `GH₵ ${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
