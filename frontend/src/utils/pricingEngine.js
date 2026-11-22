/**
 * OFFICIAL GBS STUDENT-BASED SUBSCRIPTION PRICING POLICY
 * Revised GBS Developer Policy — 100% Student-Based Subscription Model
 *
 * 1. Pricing Principle:
 *    - 100% student-based subscription model.
 *    - NO fixed tenant fees, NO basic package fees, NO additional monthly access charges.
 *    - Each institution pays only according to its category and total number of active registered students.
 *
 * 2. Official Student Subscription Rates & Full-Term Free Trial:
 *    - Free Trial            : 4 Months (1 Full Term / 120 Days) FREE for all institutions
 *    - Nursery – JHS         : GH₵ 3 / month × 4 months = GH₵ 12 per student / term
 *    - Senior High (SHS)     : GH₵ 5 / month × 4 months = GH₵ 20 per student / term
 *    - Technical / TVET      : GH₵ 10 / month × 4 months = GH₵ 40 per student / semester
 *    - University / Tertiary : GH₵ 10 / month × 4 months = GH₵ 40 per student / semester
 *
 * 3. Subscription Calculation:
 *    Monthly Subscription = Number of Active Students × Rate
 *    Term / Semester (4 Months) = Monthly Subscription × 4
 *
 * 4. Subscription Duration & Discounts:
 *    - 4-Month Term Trial : GH₵ 0 (Free Full Term / 120 Days)
 *    - 4 months (1 Term)  : 0% discount (3×4=12, 5×4=20, 10×4=40 per student)
 *    - 3 months           : 3% discount
 *    - 6 months           : 5% discount
 *    - 9 months           : 7% discount
 *    - 12 months          : 10% discount
 */

export const DEFAULT_ONBOARDING_RATES = {
  JHS: 3,        // Nursery – JHS: GH₵ 3/mo (GH₵ 12 / 4-month term)
  SHS: 5,        // SHS: GH₵ 5/mo (GH₵ 20 / 4-month term)
  TVET: 10,      // Technical / TVET: GH₵ 10/mo (GH₵ 40 / 4-month semester)
  UNIVERSITY: 10 // University: GH₵ 10/mo (GH₵ 40 / 4-month semester)
};

export const OFFICIAL_SUBSCRIPTION_PERIODS = [
  { id: "4_MONTH_TRIAL", months: 4, discountPct: 0, label: "4-Month Full Term Free Trial (120 Days • GH₵ 0)", shortLabel: "4 Mo Free Trial", isTrial: true },
  { id: "4_MONTHS", months: 4, discountPct: 0, label: "4 Months — 1 Full Term / Semester", shortLabel: "4 Months (Term)" },
  { id: "3_MONTHS", months: 3, discountPct: 3, label: "3 Months Subscription (3% Discount)", shortLabel: "3 Months" },
  { id: "6_MONTHS", months: 6, discountPct: 5, label: "6 Months Subscription (5% Discount)", shortLabel: "6 Months" },
  { id: "9_MONTHS", months: 9, discountPct: 7, label: "9 Months Subscription (7% Discount)", shortLabel: "9 Months" },
  { id: "12_MONTHS", months: 12, discountPct: 10, label: "12 Months Subscription (10% Discount)", shortLabel: "12 Months" }
];

export const SUBSCRIPTION_TERMS_CONFIG = {
  "4_MONTH_TRIAL": { id: "4_MONTH_TRIAL", months: 4, discountPct: 0, label: "4-Month Full Term Free Trial (120 Days)", shortLabel: "4 Mo Trial", isTrial: true },
  "1_MONTH_TRIAL": { id: "4_MONTH_TRIAL", months: 4, discountPct: 0, label: "4-Month Full Term Free Trial (120 Days)", shortLabel: "4 Mo Trial", isTrial: true },
  "4_MONTHS": { id: "4_MONTHS", months: 4, discountPct: 0, label: "4 Months — 1 Full Term / Semester (Monthly × 4)", shortLabel: "4 Months (Term)", isTrial: false },
  "1_TERM": { id: "4_MONTHS", months: 4, discountPct: 0, label: "4 Months — 1 Full Term / Semester (Monthly × 4)", shortLabel: "1 Term (4 Mo)", isTrial: false },
  "1_MONTH": { id: "1_MONTH", months: 1, discountPct: 0, label: "1 Month Continuation (0% Discount)", shortLabel: "1 Month", isTrial: false },
  "3_MONTHS": { id: "3_MONTHS", months: 3, discountPct: 3, label: "3 Months Subscription (3% Discount)", shortLabel: "3 Months", isTrial: false },
  "6_MONTHS": { id: "6_MONTHS", months: 6, discountPct: 5, label: "6 Months Subscription (5% Discount)", shortLabel: "6 Months", isTrial: false },
  "9_MONTHS": { id: "9_MONTHS", months: 9, discountPct: 7, label: "9 Months Subscription (7% Discount)", shortLabel: "9 Months", isTrial: false },
  "12_MONTHS": { id: "12_MONTHS", months: 12, discountPct: 10, label: "12 Months Subscription (10% Discount)", shortLabel: "12 Months", isTrial: false },
  "LIFETIME": { id: "LIFETIME", months: 12, discountPct: 10, label: "12 Months Subscription (10% Discount)", shortLabel: "12 Months", isTrial: false }
};

export const OFFICIAL_POPULATION_BENCHMARK_TABLE = [
  { students: 100, nurseryJhs: 1200, shs: 2000, tvet: 4000, university: 4000, monthlyJhs: 300, monthlyShs: 500, monthlyTvet: 1000, monthlyUni: 1000 },
  { students: 200, nurseryJhs: 2400, shs: 4000, tvet: 8000, university: 8000, monthlyJhs: 600, monthlyShs: 1000, monthlyTvet: 2000, monthlyUni: 2000 },
  { students: 300, nurseryJhs: 3600, shs: 6000, tvet: 12000, university: 12000, monthlyJhs: 900, monthlyShs: 1500, monthlyTvet: 3000, monthlyUni: 3000 },
  { students: 500, nurseryJhs: 6000, shs: 10000, tvet: 20000, university: 20000, monthlyJhs: 1500, monthlyShs: 2500, monthlyTvet: 5000, monthlyUni: 5000 },
  { students: 1000, nurseryJhs: 12000, shs: 20000, tvet: 40000, university: 40000, monthlyJhs: 3000, monthlyShs: 5000, monthlyTvet: 10000, monthlyUni: 10000 },
  { students: 2000, nurseryJhs: 24000, shs: 40000, tvet: 80000, university: 80000, monthlyJhs: 6000, monthlyShs: 10000, monthlyTvet: 20000, monthlyUni: 20000 }
];

export const RECURRING_SUBSCRIPTION_PRESETS = {
  JHS: {
    monthly: 300,
    term4Months: 1200,
    annual: 3240,
    label: "Nursery – JHS Student-Based Subscription (GH₵ 3/mo • GH₵ 12 / Term)"
  },
  SHS: {
    monthly: 500,
    term4Months: 2000,
    annual: 5400,
    label: "SHS Student-Based Subscription (GH₵ 5/mo • GH₵ 20 / Term)"
  },
  TVET: {
    monthly: 1000,
    term4Months: 4000,
    annual: 10800,
    label: "Technical / TVET Student-Based Subscription (GH₵ 10/mo • GH₵ 40 / Semester)"
  },
  UNIVERSITY: {
    monthly: 1000,
    term4Months: 4000,
    annual: 10800,
    label: "University Student-Based Subscription (GH₵ 10/mo • GH₵ 40 / Semester)"
  }
};

/**
 * Retrieve current active per-student rates (GH₵3 JHS, GH₵5 SHS, GH₵10 TVET, GH₵10 University)
 */
export function getOnboardingRates() {
  try {
    const savedV3 = localStorage.getItem("gbs_official_student_rates_v3");
    if (savedV3) {
      const parsed = JSON.parse(savedV3);
      return {
        JHS: Number(parsed.JHS) || DEFAULT_ONBOARDING_RATES.JHS,
        SHS: Number(parsed.SHS) || DEFAULT_ONBOARDING_RATES.SHS,
        TVET: Number(parsed.TVET) || DEFAULT_ONBOARDING_RATES.TVET,
        UNIVERSITY: Number(parsed.UNIVERSITY) || DEFAULT_ONBOARDING_RATES.UNIVERSITY
      };
    }
    localStorage.setItem("gbs_official_student_rates_v3", JSON.stringify(DEFAULT_ONBOARDING_RATES));
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
    TVET: Number(newRates.TVET) || Number(newRates.UNIVERSITY) || current.TVET,
    UNIVERSITY: Number(newRates.UNIVERSITY) || current.UNIVERSITY
  };
  try {
    localStorage.setItem("gbs_official_student_rates_v3", JSON.stringify(updated));
    localStorage.setItem("gbs_official_student_rates_v2", JSON.stringify(updated));
    localStorage.setItem("gbs_onboarding_rates", JSON.stringify(updated));
  } catch { }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("gbs_rates_updated", { detail: updated }));
  }
  return updated;
}

/**
 * Resolve institution tier string to JHS (Nursery–JHS), SHS, TVET, or UNIVERSITY
 */
export function resolveInstitutionTier(tier = "JHS") {
  const normTier = String(tier || "JHS").toUpperCase();
  if (normTier.includes("UNI") || normTier.includes("COLLEGE") || normTier.includes("TERTIARY")) {
    return "UNIVERSITY";
  }
  if (normTier.includes("TECH") || normTier.includes("TVET") || normTier.includes("VOCAT") || normTier.includes("POLYTECH")) {
    return "TVET";
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
  subscriptionPlan = "4_MONTH_TRIAL",
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

  const termMeta = SUBSCRIPTION_TERMS_CONFIG[subscriptionPlan] || SUBSCRIPTION_TERMS_CONFIG["4_MONTH_TRIAL"];
  const subscribedMonths = termMeta.months;
  const discountPct = termMeta.discountPct || 0;
  const isTrial = Boolean(termMeta.isTrial);

  const periodCalc = calculateDiscountedPeriodTotal(monthlyFee, subscribedMonths, discountPct);
  const grossTermFee = periodCalc.grossTotal;
  const discountAmount = periodCalc.discountAmount;
  const totalTermFee = isTrial ? 0 : periodCalc.netTotal;

  const mode = paymentScheduleMode === "MONTHLY_SPREAD" ? "MONTHLY_SPREAD" : "BULK_FULL_TERM";
  const effectiveMonthlyInstallment = isTrial ? 0 : (subscribedMonths > 0 ? Math.round((totalTermFee / subscribedMonths) * 100) / 100 : monthlyFee);
  const amountDueNow = isTrial ? 0 : (mode === "MONTHLY_SPREAD" ? effectiveMonthlyInstallment : totalTermFee);

  // Pre-calculate term & multi-month durations
  const period1Month = calculateDiscountedPeriodTotal(monthlyFee, 1, 0);
  const period3Months = calculateDiscountedPeriodTotal(monthlyFee, 3, 3);
  const period4Months = calculateDiscountedPeriodTotal(monthlyFee, 4, 0);
  const period6Months = calculateDiscountedPeriodTotal(monthlyFee, 6, 5);
  const period9Months = calculateDiscountedPeriodTotal(monthlyFee, 9, 7);
  const period12Months = calculateDiscountedPeriodTotal(monthlyFee, 12, 10);

  return {
    tier: effectiveTier,
    categoryLabel: effectiveTier === "UNIVERSITY" ? "University" : effectiveTier === "TVET" ? "Technical / TVET" : effectiveTier === "SHS" ? "SHS" : "Nursery – JHS",
    studentCount: count,
    excludedInactiveOrArchivedCount: studentAudit.excludedInactiveOrArchivedCount,
    duplicatesRemovedCount: studentAudit.duplicatesRemovedCount,
    rate,
    termRatePerStudent: rate * 4,
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
      trial4Months: 0,
      months4: period4Months.netTotal,
      months3: period3Months.netTotal,
      months6: period6Months.netTotal,
      months9: period9Months.netTotal,
      months12: period12Months.netTotal,
      lifetime: period12Months.netTotal,
      details: {
        "1_MONTH": period1Month,
        "4_MONTHS": period4Months,
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
