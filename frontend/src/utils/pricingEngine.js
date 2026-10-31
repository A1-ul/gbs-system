/**
 * GBS Enterprise Pricing & Calculator Engine
 * Calculates automated per-student onboarding fees and manages configurable rates.
 * JHS: GH₵ 5 per student
 * SHS: GH₵ 10 per student
 * University: GH₵ 20 per student
 * Rates are dynamically configurable by the Developer.
 */

export const DEFAULT_ONBOARDING_RATES = {
  JHS: 5,        // GH₵ 5 per student
  SHS: 10,       // GH₵ 10 per student
  UNIVERSITY: 20 // GH₵ 20 per student
};

export const RECURRING_SUBSCRIPTION_PRESETS = {
  JHS: {
    monthly: 250,
    annual: 2500,
    label: "JHS Standard Cloud Subscription"
  },
  SHS: {
    monthly: 500,
    annual: 5000,
    label: "SHS Enterprise Cloud Subscription"
  },
  UNIVERSITY: {
    monthly: 1200,
    annual: 12000,
    label: "University Collegiate Cloud Cluster"
  }
};

/**
 * Retrieve current active onboarding rates (from developer configuration or defaults)
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
  } catch {}
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
 * Calculate the exact one-time onboarding fee
 * Formula: Total Onboarding Fee = Total Student Population × Rate Per Student
 */
export function calculateOnboardingFee(tier = "JHS", studentCount = 0) {
  const rates = getOnboardingRates();
  const normTier = (tier || "JHS").toUpperCase();
  
  let effectiveTier = "JHS";
  if (normTier.includes("SHS") || normTier.includes("SENIOR")) {
    effectiveTier = "SHS";
  } else if (normTier.includes("UNI") || normTier.includes("COLLEGE") || normTier.includes("TERTIARY")) {
    effectiveTier = "UNIVERSITY";
  }

  const rate = rates[effectiveTier] || DEFAULT_ONBOARDING_RATES[effectiveTier];
  const count = Math.max(0, parseInt(studentCount, 10) || 0);
  const totalFee = count * rate;

  return {
    tier: effectiveTier,
    studentCount: count,
    rate,
    totalFee,
    formattedFee: formatCedis(totalFee),
    formattedRate: `GH₵ ${rate.toFixed(2)}`,
    currency: "GH₵",
    recurring: RECURRING_SUBSCRIPTION_PRESETS[effectiveTier]
  };
}

/**
 * Helper to format amounts in Ghanaian Cedis (GH₵)
 */
export function formatCedis(amount = 0) {
  const num = Number(amount) || 0;
  return `GH₵ ${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
