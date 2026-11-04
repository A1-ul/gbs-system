/**
 * OFFICIAL GBS STUDENT-BASED SUBSCRIPTION PRICING POLICY
 * Revised GBS Developer Policy — 100% Student-Based Subscription Model
 *
 * 1. Pricing Principle:
 *    - 100% student-based subscription model.
 *    - NO fixed tenant fees, NO basic package fees, NO additional monthly access charges.
 *    - Each institution pays only according to its category and total number of active registered students.
 *
 * 2. Official Student Subscription Rates:
 *    - Nursery – JHS : GH₵ 3 per active student / month
 *    - SHS           : GH₵ 5 per active student / month
 *    - University    : GH₵ 10 per active student / month
 *
 * 3. Subscription Calculation:
 *    Monthly Subscription = Number of Active Students × Rate
 *
 * 4. Subscription Duration & Discounts (5 Payment Periods):
 *    - 1 month   : 0% discount
 *    - 3 months  : 3% discount
 *    - 6 months  : 5% discount
 *    - 9 months  : 7% discount
 *    - 12 months : 10% discount
 */

export const DEFAULT_ONBOARDING_RATES = {
  JHS: 3,        // Nursery – JHS: GH₵ 3 per student per month
  SHS: 5,        // SHS: GH₵ 5 per student per month
  UNIVERSITY: 10 // University: GH₵ 10 per student per month
};

export const OFFICIAL_SUBSCRIPTION_PERIODS = [
  { id: "1_MONTH", months: 1, discountPct: 0, label: "1 Month Subscription (0% Discount)", shortLabel: "1 Month" },
  { id: "3_MONTHS", months: 3, discountPct: 3, label: "3 Months Subscription (3% Discount)", shortLabel: "3 Months" },
  { id: "6_MONTHS", months: 6, discountPct: 5, label: "6 Months Subscription (5% Discount)", shortLabel: "6 Months" },
  { id: "9_MONTHS", months: 9, discountPct: 7, label: "9 Months Subscription (7% Discount)", shortLabel: "9 Months" },
  { id: "12_MONTHS", months: 12, discountPct: 10, label: "12 Months Subscription (10% Discount)", shortLabel: "12 Months" }
];

export const SUBSCRIPTION_TERMS_CONFIG = {
  "1_MONTH": { id: "1_MONTH", months: 1, discountPct: 0, label: "1 Month Subscription (0% Discount)", shortLabel: "1 Month", isTrial: false },
  "1_MONTH_TRIAL": { id: "1_MONTH_TRIAL", months: 1, discountPct: 0, label: "1 Month Subscription (0% Discount)", shortLabel: "1 Month", isTrial: false },
  "3_MONTHS": { id: "3_MONTHS", months: 3, discountPct: 3, label: "3 Months Subscription (3% Discount)", shortLabel: "3 Months", isTrial: false },
  "6_MONTHS": { id: "6_MONTHS", months: 6, discountPct: 5, label: "6 Months Subscription (5% Discount)", shortLabel: "6 Months", isTrial: false },
  "9_MONTHS": { id: "9_MONTHS", months: 9, discountPct: 7, label: "9 Months Subscription (7% Discount)", shortLabel: "9 Months", isTrial: false },
  "12_MONTHS": { id: "12_MONTHS", months: 12, discountPct: 10, label: "12 Months Subscription (10% Discount)", shortLabel: "12 Months", isTrial: false },
  "LIFETIME": { id: "LIFETIME", months: 12, discountPct: 10, label: "12 Months Subscription (10% Discount)", shortLabel: "12 Months", isTrial: false }
};

export const OFFICIAL_POPULATION_BENCHMARK_TABLE = [
  { students: 100, nurseryJhs: 300, shs: 500, university: 1000 },
  { students: 200, nurseryJhs: 600, shs: 1000, university: 2000 },
  { students: 300, nurseryJhs: 900, shs: 1500, university: 3000 },
  { students: 500, nurseryJhs: 1500, shs: 2500, university: 5000 },
  { students: 1000, nurseryJhs: 3000, shs: 5000, university: 10000 },
  { students: 2000, nurseryJhs: 6000, shs: 10000, university: 20000 }
];

export const RECURRING_SUBSCRIPTION_PRESETS = {
  JHS: {
    monthly: 300,
    annual: 3240,
    label: "Nursery – JHS Student-Based Subscription (GH₵ 3 / Active Student / Month)"
  },
  SHS: {
    monthly: 500,
    annual: 5400,
    label: "SHS Student-Based Subscription (GH₵ 5 / Active Student / Month)"
  },
  UNIVERSITY: {
    monthly: 1000,
    annual: 10800,
    label: "University Student-Based Subscription (GH₵ 10 / Active Student / Month)"
  }
};

/**
 * Retrieve current active per-student rates (from developer configuration or official defaults: GH₵3, GH₵5, GH₵10)
 */
export function getOnboardingRates() {
  try {
    const savedV2 = localStorage.getItem("gbs_official_student_rates_v2");
    if (savedV2) {
      const parsed = JSON.parse(savedV2);
      return {
        JHS: Number(parsed.JHS) || DEFAULT_ONBOARDING_RATES.JHS,
        SHS: Number(parsed.SHS) || DEFAULT_ONBOARDING_RATES.SHS,
        UNIVERSITY: Number(parsed.UNIVERSITY) || DEFAULT_ONBOARDING_RATES.UNIVERSITY
      };
    }
    // Migrate legacy 5/10/20 storage to Official Revised Policy 3/5/10
    localStorage.setItem("gbs_official_student_rates_v2", JSON.stringify(DEFAULT_ONBOARDING_RATES));
    localStorage.setItem("gbs_onboarding_rates", JSON.stringify(DEFAULT_ONBOARDING_RATES));
  } catch { }
  return { ...DEFAULT_ONBOARDING_RATES };
}

/**
 * Authorize & update official student rates dynamically from the Developer Dashboard
 */
export function updateOnboardingRates(newRates) {
  const current = getOnboardingRates();
  const updated = {
    JHS: Number(newRates.JHS) || current.JHS,
    SHS: Number(newRates.SHS) || current.SHS,
    UNIVERSITY: Number(newRates.UNIVERSITY) || current.UNIVERSITY
  };
  try {
    localStorage.setItem("gbs_official_student_rates_v2", JSON.stringify(updated));
    localStorage.setItem("gbs_onboarding_rates", JSON.stringify(updated));
  } catch { }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("gbs_rates_updated", { detail: updated }));
  }
  return updated;
}

/**
 * Resolve institution tier string to JHS (Nursery–JHS), SHS, or UNIVERSITY
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
 * Section 6 & 9 Rule:
 * Automatically count active registered students without double-counting.
 * Inactive, deleted, and archived students must NOT attract charges.
 */
export function countActiveBillableStudents(studentRecords = [], fallbackCount = 0) {
  if (!Array.isArray(studentRecords) || studentRecords.length === 0) {
    return {
      activeCount: Math.max(0, parseInt(fallbackCount, 10) || 0),
      excludedInactiveOrArchivedCount: 0,
      duplicatesRemovedCount: 0
    };
  }

  const seenKeys = new Set();
  let activeCount = 0;
  let excludedInactiveOrArchivedCount = 0;
  let duplicatesRemovedCount = 0;

  for (const s of studentRecords) {
    if (!s || typeof s !== "object") continue;
    const status = String(s.status || s.enrollmentStatus || "ACTIVE").toUpperCase();
    const isInactive =
      s.isActive === false ||
      s.isDeleted === true ||
      s.isArchived === true ||
      ["INACTIVE", "DELETED", "ARCHIVED", "SUSPENDED", "WITHDRAWN", "GRADUATED", "ALUMNI"].includes(status);

    if (isInactive) {
      excludedInactiveOrArchivedCount += 1;
      continue;
    }

    const uniqueKey = String(
      s.id || s.studentId || s.admissionNumber || s.indexNumber || s.email || `${s.firstName || ""}_${s.lastName || ""}_${s.dateOfBirth || ""}`
    )
      .trim()
      .toLowerCase();

    if (uniqueKey && seenKeys.has(uniqueKey)) {
      duplicatesRemovedCount += 1;
      continue;
    }
    if (uniqueKey) seenKeys.add(uniqueKey);
    activeCount += 1;
  }

  return {
    activeCount,
    excludedInactiveOrArchivedCount,
    duplicatesRemovedCount
  };
}

/**
 * Calculate multi-month payment and discount for a given monthly charge and duration
 * Supports 1, 3, 6, 9, and 12 months with 0%, 3%, 5%, 7%, and 10% discounts.
 */
export function calculateDiscountedPeriodTotal(monthlyCharge = 0, months = 1, discountPct = 0) {
  const grossTotal = Number(monthlyCharge || 0) * Number(months || 1);
  const discountAmount = Math.round(grossTotal * (Number(discountPct || 0) / 100) * 100) / 100;
  const netTotal = Math.round((grossTotal - discountAmount) * 100) / 100;
  return {
    months: Number(months || 1),
    discountPct: Number(discountPct || 0),
    grossTotal,
    discountAmount,
    netTotal
  };
}

/**
 * Calculate 100% Student-Based Subscription Pricing
 * Formula:
 *   Monthly Charge = Active Students × Official Student Rate (GH₵3 / GH₵5 / GH₵10)
 *   Gross Term Total = Monthly Charge × Months (1, 3, 6, 9, or 12)
 *   Discount = 0% (1 mo), 3% (3 mo), 5% (6 mo), 7% (9 mo), 10% (12 mo)
 *   Net Total Payment = Gross Term Total - Discount
 */
export function calculateSubscriptionPricing({
  tier = "JHS",
  studentCount = 0,
  studentRecords = null,
  subscriptionPlan = "3_MONTHS",
  paymentScheduleMode = "BULK_FULL_TERM"
} = {}) {
  const rates = getOnboardingRates();
  const effectiveTier = resolveInstitutionTier(tier);
  const rate = rates[effectiveTier] || DEFAULT_ONBOARDING_RATES[effectiveTier];

  const studentAudit = Array.isArray(studentRecords) && studentRecords.length > 0
    ? countActiveBillableStudents(studentRecords, studentCount)
    : {
      activeCount: Math.max(0, parseInt(studentCount, 10) || 0),
      excludedInactiveOrArchivedCount: 0,
      duplicatesRemovedCount: 0
    };

  const count = studentAudit.activeCount;

  // 100% student-based: zero fixed tenant fees, zero basic package fees, zero access fees
  const fixedTenantFee = 0;
  const basicPackageFee = 0;
  const additionalAccessFee = 0;

  // Monthly subscription = Number of Active Students × Rate
  const monthlyFee = count * rate;

  const termMeta = SUBSCRIPTION_TERMS_CONFIG[subscriptionPlan] || SUBSCRIPTION_TERMS_CONFIG["3_MONTHS"];
  const subscribedMonths = termMeta.months;
  const discountPct = termMeta.discountPct || 0;
  const isTrial = false; // Official policy: 5 payment periods (1, 3, 6, 9, 12 months)

  const periodCalc = calculateDiscountedPeriodTotal(monthlyFee, subscribedMonths, discountPct);
  const grossTermFee = periodCalc.grossTotal;
  const discountAmount = periodCalc.discountAmount;
  const totalTermFee = periodCalc.netTotal;

  const mode = paymentScheduleMode === "MONTHLY_SPREAD" ? "MONTHLY_SPREAD" : "BULK_FULL_TERM";
  const effectiveMonthlyInstallment = subscribedMonths > 0 ? Math.round((totalTermFee / subscribedMonths) * 100) / 100 : monthlyFee;
  const amountDueNow = mode === "MONTHLY_SPREAD" ? effectiveMonthlyInstallment : totalTermFee;

  // Pre-calculate all 5 official durations for display tables
  const period1Month = calculateDiscountedPeriodTotal(monthlyFee, 1, 0);
  const period3Months = calculateDiscountedPeriodTotal(monthlyFee, 3, 3);
  const period6Months = calculateDiscountedPeriodTotal(monthlyFee, 6, 5);
  const period9Months = calculateDiscountedPeriodTotal(monthlyFee, 9, 7);
  const period12Months = calculateDiscountedPeriodTotal(monthlyFee, 12, 10);

  return {
    tier: effectiveTier,
    categoryLabel: effectiveTier === "UNIVERSITY" ? "University" : effectiveTier === "SHS" ? "SHS" : "Nursery – JHS",
    studentCount: count,
    excludedInactiveOrArchivedCount: studentAudit.excludedInactiveOrArchivedCount,
    duplicatesRemovedCount: studentAudit.duplicatesRemovedCount,
    rate,
    fixedTenantFee,
    basicPackageFee,
    additionalAccessFee,
    monthlyFee,
    subscribedMonths,
    discountPct,
    grossTermFee,
    discountAmount,
    totalTermFee,
    effectiveMonthlyInstallment,
    subscriptionPlan: termMeta.id,
    subscriptionLabel: termMeta.label,
    isTrial,
    paymentScheduleMode: mode,
    amountDueNow,
    formattedRate: `GH₵ ${rate.toFixed(2)}`,
    formattedMonthlyFee: formatCedis(monthlyFee),
    formattedGrossTermFee: formatCedis(grossTermFee),
    formattedDiscountAmount: formatCedis(discountAmount),
    formattedTotalTermFee: formatCedis(totalTermFee),
    formattedAmountDueNow: formatCedis(amountDueNow),
    termBreakdown: {
      month1: period1Month.netTotal,
      trial1Month: period1Month.netTotal,
      months3: period3Months.netTotal,
      months6: period6Months.netTotal,
      months9: period9Months.netTotal,
      months12: period12Months.netTotal,
      lifetime: period12Months.netTotal,
      details: {
        "1_MONTH": period1Month,
        "3_MONTHS": period3Months,
        "6_MONTHS": period6Months,
        "9_MONTHS": period9Months,
        "12_MONTHS": period12Months
      }
    }
  };
}

/**
 * Section 7 Rule: Student Population Growth Policy
 * Recalculates future invoice amounts when active student population increases or decreases,
 * while strictly preserving previously paid subscription periods without retrospective changes.
 */
export function calculatePopulationGrowthBillingAdjustment({
  tier = "JHS",
  previousStudents = 200,
  newActiveStudents = 300,
  subscriptionPlan = "3_MONTHS",
  currentPeriodAlreadyPaid = true
} = {}) {
  const prevCalc = calculateSubscriptionPricing({ tier, studentCount: previousStudents, subscriptionPlan });
  const nextCalc = calculateSubscriptionPricing({ tier, studentCount: newActiveStudents, subscriptionPlan });
  const studentDelta = nextCalc.studentCount - prevCalc.studentCount;
  const monthlyDelta = nextCalc.monthlyFee - prevCalc.monthlyFee;
  const nextTermDelta = nextCalc.totalTermFee - prevCalc.totalTermFee;

  return {
    tier: nextCalc.tier,
    categoryLabel: nextCalc.categoryLabel,
    ratePerStudent: nextCalc.rate,
    previousStudents: prevCalc.studentCount,
    newActiveStudents: nextCalc.studentCount,
    studentDelta,
    direction: studentDelta > 0 ? "INCREASED" : studentDelta < 0 ? "DECREASED" : "UNCHANGED",
    previousMonthlyCharge: prevCalc.monthlyFee,
    nextMonthlyCharge: nextCalc.monthlyFee,
    monthlyDelta,
    previousPeriodTotal: prevCalc.totalTermFee,
    nextBillingPeriodTotal: nextCalc.totalTermFee,
    nextTermDelta,
    retrospectiveChangeApplied: false,
    policyNotice: currentPeriodAlreadyPaid
      ? "Previously paid subscription period remains locked and unchanged. Updated student population applies strictly to the next billing invoice."
      : "Active student population updated for upcoming billing invoice."
  };
}

/**
 * Calculate the onboarding/subscription fee (wrapper for compatibility)
 */
export function calculateOnboardingFee(tier = "JHS", studentCount = 0, subscriptionPlan = "3_MONTHS", paymentScheduleMode = "BULK_FULL_TERM") {
  const subPricing = calculateSubscriptionPricing({ tier, studentCount, subscriptionPlan, paymentScheduleMode });
  return {
    tier: subPricing.tier,
    categoryLabel: subPricing.categoryLabel,
    studentCount: subPricing.studentCount,
    rate: subPricing.rate,
    monthlyFee: subPricing.monthlyFee,
    subscribedMonths: subPricing.subscribedMonths,
    discountPct: subPricing.discountPct,
    grossTermFee: subPricing.grossTermFee,
    discountAmount: subPricing.discountAmount,
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
      annual: subPricing.termBreakdown.months12 || RECURRING_SUBSCRIPTION_PRESETS[subPricing.tier].annual,
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
