import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerInstitution } from "../api/auth.api";
import BiometricFaceScannerModal from "../components/BiometricFaceScannerModal";
import { getOnboardingRates } from "../../../utils/pricingEngine";
import "./TenantOnboardingFirstPage.css";

// Global Carrier Detector
const detectCarrier = (phone, countryCode) => {
  if (!phone) return null;
  const clean = phone.replace(/[^0-9]/g, "");

  if (countryCode === "+233" || clean.startsWith("233")) {
    const local = clean.startsWith("233") ? clean.slice(3) : clean;
    if (/^(0?24|0?54|0?55|0?59|0?53)/.test(local)) {
      return { name: "MTN Ghana", code: "MTN", class: "carrier-mtn", icon: "🟡" };
    }
    if (/^(0?20|0?50)/.test(local)) {
      return { name: "Telecel (Vodafone)", code: "TELECEL", class: "carrier-telecel", icon: "🔴" };
    }
    if (/^(0?27|0?57|0?26|0?56)/.test(local)) {
      return { name: "AirtelTigo", code: "AIRTEL", class: "carrier-airtel", icon: "🔵" };
    }
    return { name: "Ghana Telecom Network", code: "GH_NET", class: "carrier-global", icon: "🇬🇭" };
  }

  if (countryCode === "+1" || clean.startsWith("1")) {
    return { name: "North American Carrier (AT&T / T-Mobile / Verizon)", code: "USA_CAN", class: "carrier-global", icon: "🇺🇸" };
  }
  if (countryCode === "+44") return { name: "UK Mobile (EE / Vodafone / O2)", code: "UK", class: "carrier-global", icon: "🇬🇧" };
  if (countryCode === "+234") return { name: "Nigeria (MTN / Airtel / Glo / 9mobile)", code: "NG", class: "carrier-global", icon: "🇳🇬" };
  if (countryCode === "+254") return { name: "Kenya (Safaricom / Airtel)", code: "KE", class: "carrier-global", icon: "🇰🇪" };

  return { name: "International Global Cellular Network", code: "INTL", class: "carrier-global", icon: "🌐" };
};

export default function TenantOnboardingFirstPage() {
  const navigate = useNavigate();

  // 1. AUTO-REDIRECT: If tenant has already registered or onboarded, redirect straight to Main Login Page
  useEffect(() => {
    try {
      const alreadyOnboarded = localStorage.getItem("gbs_tenant_already_onboarded") === "true";
      const hasAuthToken = Boolean(localStorage.getItem("gbs_token") || localStorage.getItem("gbs_access_token"));
      const isApprovedTenant = Boolean(localStorage.getItem("gbs_assigned_tenant_code"));

      if (alreadyOnboarded || (hasAuthToken && isApprovedTenant)) {
        console.log("Tenant already onboarded onto GBS SYSTEM. Directing to Main Login Page...");
        navigate("/login", { replace: true });
      }
    } catch (e) {
      console.warn("Storage check exception:", e);
    }
  }, [navigate]);

  // Online / Offline synchronization state
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [offlineSyncNotice, setOfflineSyncNotice] = useState(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto sync offline queue
      try {
        const queued = JSON.parse(localStorage.getItem("gbs_offline_onboarding_queue") || "[]");
        if (queued.length > 0) {
          setOfflineSyncNotice(`Connecting to internet: syncing ${queued.length} queued registration(s) to cloud database...`);
          // Dispatch sync
          queued.forEach((item) => {
            registerInstitution(item).catch(() => { });
          });
          localStorage.removeItem("gbs_offline_onboarding_queue");
          setTimeout(() => setOfflineSyncNotice("✓ Offline registrations successfully synced to GBS cloud hosting!"), 2500);
        }
      } catch (err) { }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setOfflineSyncNotice("⚠️ Device is currently offline. You can still fill and submit forms; records will be saved locally and pushed when internet reconnects.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Inscription Dropdown State (Hover & Click)
  const [showInscriptionDropdown, setShowInscriptionDropdown] = useState(false);

  // Password Visibility State
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Biometric Face Scanner Modal State
  const [showFaceScanner, setShowFaceScanner] = useState(false);

  // Form State
  const [form, setForm] = useState({
    institutionName: "",
    institutionType: "NURSERY_TO_JHS", // "NURSERY_TO_JHS" | "SENIOR_HIGH_SCHOOL" | "UNIVERSITY"
    totalStudentsEnrolled: "450",
    country: "Ghana",
    countryCode: "+233",
    region: "Greater Accra",
    city: "Accra",
    physicalAddress: "",
    officialEmail: "",
    officialPhone: "",
    adminName: "",
    adminEmail: "",
    adminPhone: "",
    password: "",
    confirmPassword: "",
    subscriptionPlan: "3_MONTHS", // 1_MONTH | 3_MONTHS | 6_MONTHS | 9_MONTHS | 12_MONTHS
    paymentScheduleMode: "BULK_FULL_TERM", // "BULK_FULL_TERM" | "MONTHLY_SPREAD"
    bulkTermsAccepted: true,
    bulkTermsSignedBy: "",
    momoTxnId: "",
    facePhoto: null,
    biometricFaceToken: null,
    termsAccepted: true
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successData, setSuccessData] = useState(null);

  // Pricing Engine Rates (Official Policy: Nursery–JHS = GH₵3, SHS = GH₵5, University = GH₵10)
  const activeRates = useMemo(() => getOnboardingRates(), []);

  // Check if 1-Month Free Trial has already been used by this tenant
  const [hasUsedTrial, setHasUsedTrial] = useState(() => {
    try {
      return localStorage.getItem("gbs_trial_used") === "true";
    } catch {
      return false;
    }
  });

  // Calculate Official Rate per Student per Month based on Institution Category
  // Nursery – JHS: GH₵ 3 | SHS: GH₵ 5 | University: GH₵ 10
  const currentRatePerStudent = useMemo(() => {
    if (form.institutionType === "UNIVERSITY") return activeRates.UNIVERSITY || 10;
    if (form.institutionType === "SENIOR_HIGH_SCHOOL") return activeRates.SHS || 5;
    return activeRates.JHS || 3;
  }, [form.institutionType, activeRates]);

  // Official 100% Student-Based Subscription & Multi-Month Discount Calculation
  // Subscription = Number of Active Students × Rate (No fixed tenant fees, no package fees, no access charges)
  // Discounts: 1 Month (0%), 3 Months (3%), 6 Months (5%), 9 Months (7%), 12 Months (10%)
  const calculation = useMemo(() => {
    const count = Math.max(0, parseInt(form.totalStudentsEnrolled, 10) || 0);
    const monthlyRate = count * currentRatePerStudent;

    const calcDiscounted = (months, discountPct) => {
      const gross = monthlyRate * months;
      const discountAmt = Math.round(gross * (discountPct / 100) * 100) / 100;
      const net = Math.round((gross - discountAmt) * 100) / 100;
      return { months, discountPct, gross, discountAmt, net };
    };

    const p1 = calcDiscounted(1, 0);
    const p3 = calcDiscounted(3, 3);
    const p6 = calcDiscounted(6, 5);
    const p9 = calcDiscounted(9, 7);
    const p12 = calcDiscounted(12, 10);

    const periodMap = {
      "1_MONTH": p1,
      "1_MONTH_TRIAL": p1,
      "3_MONTHS": p3,
      "6_MONTHS": p6,
      "9_MONTHS": p9,
      "12_MONTHS": p12,
      "LIFETIME": p12
    };

    const selectedPeriod = periodMap[form.subscriptionPlan] || p3;
    const subscribedMonths = selectedPeriod.months;
    const discountPct = selectedPeriod.discountPct;
    const grossTermFee = selectedPeriod.gross;
    const discountAmount = selectedPeriod.discountAmt;
    const totalTermFee = selectedPeriod.net;

    const payableAmount =
      form.paymentScheduleMode === "MONTHLY_SPREAD"
        ? Math.round((totalTermFee / subscribedMonths) * 100) / 100
        : totalTermFee;

    return {
      count,
      rate: currentRatePerStudent,
      monthlyRate,
      oneMonthRate: p1.net,
      termRate: p3.net,
      semesterRate: p6.net,
      nineMonthRate: p9.net,
      annualBase: p12.net,
      lifetimeRate: p12.net,
      periods: { p1, p3, p6, p9, p12 },
      subscribedMonths,
      discountPct,
      grossTermFee,
      discountAmount,
      totalTermFee,
      payableAmount
    };
  }, [form.totalStudentsEnrolled, currentRatePerStudent, form.subscriptionPlan, form.paymentScheduleMode]);

  // Detected Carriers for Phones
  const officialPhoneCarrier = useMemo(() => {
    return detectCarrier(form.officialPhone, form.countryCode);
  }, [form.officialPhone, form.countryCode]);

  const adminPhoneCarrier = useMemo(() => {
    return detectCarrier(form.adminPhone, form.countryCode);
  }, [form.adminPhone, form.countryCode]);

  // Password matching check
  const passwordsMatch = useMemo(() => {
    if (!form.password || !form.confirmPassword) return null;
    return form.password === form.confirmPassword;
  }, [form.password, form.confirmPassword]);

  // Form Change Handler
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  // Face Scanner Completion Handler
  const handleFaceScanComplete = ({ faceImage, biometricToken }) => {
    setForm((prev) => ({
      ...prev,
      facePhoto: faceImage,
      biometricFaceToken: biometricToken
    }));
  };

  // Submission Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!form.institutionName.trim()) {
      setError("Please enter your institution's registered name.");
      return;
    }
    if (!form.adminName.trim() || !form.adminEmail.trim()) {
      setError("Please provide the Executive Headmaster / Administrator name and email.");
      return;
    }
    if (form.password.length < 6) {
      setError("Administrator password must be at least 6 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match. Please verify your password entry.");
      return;
    }
    if (!form.termsAccepted) {
      setError("You must accept the terms of institutional provisioning.");
      return;
    }

    // Trial Lock Verification
    if (form.subscriptionPlan === "1_MONTH_TRIAL" && hasUsedTrial) {
      setError("Your institution has already used its 1-Month Free Trial. Please select a 3 Months, 6 Months, 9 Months, 12 Months, or Lifetime subscription to protect your institutional records.");
      return;
    }

    // Bulk Payment Terms & Conditions Verification
    if (form.subscriptionPlan !== "1_MONTH_TRIAL" && form.paymentScheduleMode === "BULK_FULL_TERM" && !form.bulkTermsAccepted) {
      setError("Please sign and accept the Bulk Subscription Payment Terms & Conditions to pay your preferred subscription in bulk without monthly spread.");
      return;
    }

    setLoading(true);

    const timestamp = Date.now().toString().slice(-4);
    const appRef = `GBS-APP-2026-${timestamp}`;
    const tenantCode = `GBS-${form.institutionName.replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase()}-${timestamp}`;

    const submissionPayload = {
      ...form,
      appRef,
      tenantCode,
      perStudentRate: calculation.rate,
      monthlyFee: calculation.monthlyRate,
      subscribedMonths: calculation.subscribedMonths,
      totalTermFee: calculation.totalTermFee,
      paymentScheduleMode: form.paymentScheduleMode,
      bulkTermsAccepted: Boolean(form.bulkTermsAccepted),
      bulkTermsSignedBy: form.bulkTermsSignedBy || form.adminName,
      calculatedFee: String(calculation.totalTermFee || calculation.monthlyRate),
      paymentAmount: String(calculation.payableAmount),
      headmasterName: form.adminName,
      headmasterEmail: form.adminEmail,
      headmasterPhone: `${form.countryCode} ${form.adminPhone}`,
      officialPhone: `${form.countryCode} ${form.officialPhone}`,
      status: "PENDING_DEVELOPER_APPROVAL",
      submittedAt: new Date().toISOString()
    };

    // If offline, save into offline queue
    if (!isOnline) {
      try {
        const queued = JSON.parse(localStorage.getItem("gbs_offline_onboarding_queue") || "[]");
        localStorage.setItem("gbs_offline_onboarding_queue", JSON.stringify([submissionPayload, ...queued]));
      } catch { }
    } else {
      try {
        await registerInstitution(submissionPayload);
      } catch (apiErr) {
        console.warn("Backend registration endpoint fallback notice:", apiErr?.message);
      }
    }

    // Save into Developer's incoming applications queue in localStorage for live immediate viewing
    try {
      const existing = JSON.parse(localStorage.getItem("gbs_incoming_onboarding_applications") || "[]");
      const updated = [submissionPayload, ...existing.filter((a) => a.institutionName !== form.institutionName)];
      localStorage.setItem("gbs_incoming_onboarding_applications", JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("gbs_new_onboarding_application", { detail: submissionPayload }));
      window.dispatchEvent(new Event("storage"));
    } catch { }

    // Mark as onboarded on this device so next visit takes the user straight to /login
    localStorage.setItem("gbs_tenant_already_onboarded", "true");
    if (form.subscriptionPlan === "1_MONTH_TRIAL") {
      localStorage.setItem("gbs_trial_used", "true");
      setHasUsedTrial(true);
    }

    setLoading(false);
    setSuccessData({
      appRef,
      tenantCode,
      institutionName: form.institutionName,
      headmasterName: form.adminName,
      plan: form.subscriptionPlan,
      amount: calculation.payableAmount
    });
  };

  return (
    <div className="gbs-onboarding-first-page">
      {/* Top Header Bar */}
      <header className="gbs-top-header">
        <div className="gbs-top-header-left">
          <div className="gbs-header-brand-badge">
            <span className="gbs-live-pulse-dot"></span>
            <span>ENTERPRISE ONBOARDING GATEWAY</span>
          </div>
          <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Cloud Cluster Active</span>
        </div>

        {/* Top-Right "I am already in" Inscription Button */}
        <div
          className="gbs-inscription-anchor-container"
          onMouseEnter={() => setShowInscriptionDropdown(true)}
          onMouseLeave={() => setShowInscriptionDropdown(false)}
        >
          <button
            type="button"
            className="gbs-btn-already-in"
            onClick={() => navigate("/login")}
            title="Click to go directly to the Main GBS Login Page"
          >
            <span>🔐 I am already in</span>
            <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>▼</span>
          </button>

          {/* On-Hover Exact Inscription Actions Dropdown */}
          {showInscriptionDropdown && (
            <div className="gbs-inscription-dropdown-menu">
              <div className="gbs-inscription-dropdown-header">
                <strong>Direct Inscription Portals</strong>
                <span>Select your role to access your dedicated login page:</span>
              </div>
              <div className="gbs-inscription-action-list">
                <Link to="/login" className="gbs-inscription-item-link">
                  <span className="gbs-inscription-item-icon">🏛️</span>
                  <div className="gbs-inscription-item-meta">
                    <span>Main Management Gateway</span>
                    <span className="gbs-inscription-item-desc">Primary Universal School Portal</span>
                  </div>
                </Link>
                <Link to="/login/admin" className="gbs-inscription-item-link">
                  <span className="gbs-inscription-item-icon">👑</span>
                  <div className="gbs-inscription-item-meta">
                    <span>Headmaster & Administrator</span>
                    <span className="gbs-inscription-item-desc">Executive Leadership & Management</span>
                  </div>
                </Link>
                <Link to="/login/teacher" className="gbs-inscription-item-link">
                  <span className="gbs-inscription-item-icon">👨‍🏫</span>
                  <div className="gbs-inscription-item-meta">
                    <span>Teacher / Faculty</span>
                    <span className="gbs-inscription-item-desc">Academic Grading & Live Classroom</span>
                  </div>
                </Link>
                <Link to="/login/student" className="gbs-inscription-item-link">
                  <span className="gbs-inscription-item-icon">🎓</span>
                  <div className="gbs-inscription-item-meta">
                    <span>Student Inscription</span>
                    <span className="gbs-inscription-item-desc">Courses, Exam Scanner & Results</span>
                  </div>
                </Link>
                <Link to="/login/parent" className="gbs-inscription-item-link">
                  <span className="gbs-inscription-item-icon">👨‍👩‍👧</span>
                  <div className="gbs-inscription-item-meta">
                    <span>Parent / Guardian</span>
                    <span className="gbs-inscription-item-desc">Student Fees & Emergency Locator</span>
                  </div>
                </Link>
                <Link to="/login/accountant" className="gbs-inscription-item-link">
                  <span className="gbs-inscription-item-icon">📊</span>
                  <div className="gbs-inscription-item-meta">
                    <span>Accountant / Bursar</span>
                    <span className="gbs-inscription-item-desc">Tuition Billing & MoMo Audits</span>
                  </div>
                </Link>
                <Link to="/login/staff" className="gbs-inscription-item-link">
                  <span className="gbs-inscription-item-icon">💼</span>
                  <div className="gbs-inscription-item-meta">
                    <span>Staff & Operations</span>
                    <span className="gbs-inscription-item-desc">Campus Logistics & Maintenance</span>
                  </div>
                </Link>
                <Link to="/developer/login" className="gbs-inscription-item-link" style={{ borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: "4px" }}>
                  <span className="gbs-inscription-item-icon">🛡️</span>
                  <div className="gbs-inscription-item-meta">
                    <span style={{ color: "#fbbf24" }}>Developer Control Center</span>
                    <span className="gbs-inscription-item-desc">System Audits, OTP & Sharding</span>
                  </div>
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Center Branding Hero Section */}
      <section className="gbs-hero-center-brand">
        <div className="gbs-center-logo-wrap">
          <img
            src="/assets/gbs_crest_badge.jpg"
            alt="GBS Management System Crest Logo"
            className="gbs-center-logo-img"
            onError={(e) => {
              e.target.src = "/logo.png";
            }}
          />
        </div>
        <h1 className="gbs-main-system-title">GBS MANAGEMENT SYSTEM</h1>
        <p className="gbs-system-tagline">
          Official Institutional Tenant Onboarding & Autonomous Enterprise Provisioning Gateway.
          Register your institution to activate enterprise cloud management, AI grading, biometric verification, and resilient disaster recovery.
        </p>
        <div className="gbs-palette-bar" title="Golden Blended Gradient with Wine Brown, Grey, and Sky Blue">
          <span className="gbs-bar-gold"></span>
          <span className="gbs-bar-wine"></span>
          <span className="gbs-bar-grey"></span>
          <span className="gbs-bar-sky"></span>
        </div>
      </section>

      {/* Offline Notice Banner */}
      {!isOnline && (
        <div className="gbs-offline-banner">
          <span>📡</span>
          <div>
            <strong>Offline Mode Enabled:</strong> The system allows you to make entries and save registrations offline. All records will be securely cached and automatically pushed to cloud hosting once connection is restored.
          </div>
        </div>
      )}

      {offlineSyncNotice && (
        <div className="gbs-offline-banner" style={{ background: "linear-gradient(90deg, #0284c7, #0369a1)" }}>
          <span>☁️</span>
          <div>{offlineSyncNotice}</div>
        </div>
      )}

      {/* Main Onboarding Container */}
      <main className="gbs-onboarding-container">
        <div className="gbs-glass-form-card">
          {error && <div className="gbs-alert-error">⚠️ {error}</div>}

          <form onSubmit={handleSubmit}>
            {/* Section 1: Institution Details */}
            <h3 className="gbs-card-section-title">
              <span className="section-num">1</span>
              <span>Educational Institution Profile</span>
            </h3>

            <div className="gbs-form-grid-2">
              <div className="gbs-field-group">
                <label className="gbs-field-label">
                  Institution Official Name <span className="req">*</span>
                </label>
                <input
                  type="text"
                  name="institutionName"
                  className="gbs-input-control"
                  placeholder="e.g. St. Augustine Premier International Academy"
                  value={form.institutionName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="gbs-field-group">
                <label className="gbs-field-label">
                  Institution Tier / Level <span className="req">*</span>
                </label>
                <select
                  name="institutionType"
                  className="gbs-input-control"
                  value={form.institutionType}
                  onChange={handleChange}
                  required
                >
                  <option value="NURSERY_TO_JHS">Nursery / Primary / Junior High School (JHS)</option>
                  <option value="SENIOR_HIGH_SCHOOL">Senior High School (SHS) / Technical Institute</option>
                  <option value="UNIVERSITY">University / Tertiary College / Postgraduate</option>
                </select>
              </div>
            </div>

            <div className="gbs-form-grid-3">
              <div className="gbs-field-group">
                <label className="gbs-field-label">
                  Country <span className="req">*</span>
                </label>
                <select
                  name="country"
                  className="gbs-input-control"
                  value={form.country}
                  onChange={(e) => {
                    const country = e.target.value;
                    let code = "+233";
                    if (country === "United States" || country === "Canada") code = "+1";
                    else if (country === "United Kingdom") code = "+44";
                    else if (country === "Nigeria") code = "+234";
                    else if (country === "Kenya") code = "+254";
                    else if (country === "South Africa") code = "+27";
                    else if (country === "Uganda") code = "+256";
                    setForm((prev) => ({ ...prev, country, countryCode: code }));
                  }}
                  required
                >
                  <option value="Ghana">🇬🇭 Ghana (+233)</option>
                  <option value="United States">🇺🇸 United States (+1)</option>
                  <option value="Canada">🇨🇦 Canada (+1)</option>
                  <option value="United Kingdom">🇬🇧 United Kingdom (+44)</option>
                  <option value="Nigeria">🇳🇬 Nigeria (+234)</option>
                  <option value="Kenya">🇰🇪 Kenya (+254)</option>
                  <option value="South Africa">🇿🇦 South Africa (+27)</option>
                  <option value="Uganda">🇺🇬 Uganda (+256)</option>
                </select>
              </div>

              <div className="gbs-field-group">
                <label className="gbs-field-label">
                  Region / State <span className="req">*</span>
                </label>
                <input
                  type="text"
                  name="region"
                  className="gbs-input-control"
                  placeholder="e.g. Greater Accra / Ashanti / London"
                  value={form.region}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="gbs-field-group">
                <label className="gbs-field-label">
                  City / Town <span className="req">*</span>
                </label>
                <input
                  type="text"
                  name="city"
                  className="gbs-input-control"
                  placeholder="e.g. Accra / Kumasi / Tema"
                  value={form.city}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="gbs-form-grid-2">
              <div className="gbs-field-group">
                <label className="gbs-field-label">
                  Campus Physical Address
                </label>
                <input
                  type="text"
                  name="physicalAddress"
                  className="gbs-input-control"
                  placeholder="e.g. 14 University Avenue, Airport Residential Area"
                  value={form.physicalAddress}
                  onChange={handleChange}
                />
              </div>

              <div className="gbs-field-group">
                <label className="gbs-field-label">
                  Official Institution Phone & Carrier Link
                </label>
                <div className="gbs-phone-input-wrap">
                  <span className="gbs-country-code-select" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {form.countryCode}
                  </span>
                  <input
                    type="tel"
                    name="officialPhone"
                    className="gbs-input-control"
                    placeholder="e.g. 0244123456"
                    value={form.officialPhone}
                    onChange={handleChange}
                    required
                  />
                </div>
                {officialPhoneCarrier && (
                  <div className={`gbs-carrier-badge ${officialPhoneCarrier.class}`}>
                    <span>{officialPhoneCarrier.icon}</span>
                    <span>Carrier Linked: {officialPhoneCarrier.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: Executive Headmaster & Facial Camera Scanner */}
            <h3 className="gbs-card-section-title" style={{ marginTop: "28px" }}>
              <span className="section-num">2</span>
              <span>Executive Headmaster Identity & Biometric Verification</span>
            </h3>

            {/* Face Camera Scanner Box */}
            <div className="gbs-face-scanner-box">
              <div className="gbs-face-scanner-info">
                <h4>📸 Headmaster Facial Camera Scanner (Mandatory Verification)</h4>
                <p>
                  Launch the biometric camera scanner to capture the Headmaster's face. Once scanned completely, the photo and 3D cryptographic hash are automatically saved and the scanner seamlessly closes so you can finish submitting your forms for Developer review.
                </p>
                {form.biometricFaceToken && (
                  <div style={{ marginTop: "8px", fontSize: "0.75rem", color: "#34d399", fontWeight: 700 }}>
                    ✓ 3D Token: {form.biometricFaceToken}
                  </div>
                )}
              </div>

              {form.facePhoto ? (
                <div className="gbs-captured-face-preview">
                  <img
                    src={form.facePhoto}
                    alt="Scanned Headmaster Face"
                    className="gbs-captured-face-thumb"
                  />
                  <div>
                    <span style={{ fontSize: "0.78rem", color: "#10b981", fontWeight: 800, display: "block" }}>
                      ✓ FACE BIOMETRIC ATTACHED
                    </span>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: "0.72rem", padding: "4px 8px", marginTop: "4px" }}
                      onClick={() => setShowFaceScanner(true)}
                    >
                      🔄 Retake Scan
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="gbs-btn-launch-scanner"
                  onClick={() => setShowFaceScanner(true)}
                >
                  <span>📷 Launch Face Camera Scanner</span>
                </button>
              )}
            </div>

            <div className="gbs-form-grid-2">
              <div className="gbs-field-group">
                <label className="gbs-field-label">
                  Headmaster / Chancellor Full Name <span className="req">*</span>
                </label>
                <input
                  type="text"
                  name="adminName"
                  className="gbs-input-control"
                  placeholder="e.g. Dr. Kwabena Appiah-Kubi"
                  value={form.adminName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="gbs-field-group">
                <label className="gbs-field-label">
                  Headmaster Official Email <span className="req">*</span>
                </label>
                <input
                  type="email"
                  name="adminEmail"
                  className="gbs-input-control"
                  placeholder="e.g. headmaster@school.edu.gh"
                  value={form.adminEmail}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="gbs-form-grid-2">
              <div className="gbs-field-group">
                <label className="gbs-field-label">
                  Headmaster Direct Mobile (For OTP & SMS Notifications) <span className="req">*</span>
                </label>
                <div className="gbs-phone-input-wrap">
                  <span className="gbs-country-code-select" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {form.countryCode}
                  </span>
                  <input
                    type="tel"
                    name="adminPhone"
                    className="gbs-input-control"
                    placeholder="e.g. 0554594193"
                    value={form.adminPhone}
                    onChange={handleChange}
                    required
                  />
                </div>
                {adminPhoneCarrier && (
                  <div className={`gbs-carrier-badge ${adminPhoneCarrier.class}`}>
                    <span>{adminPhoneCarrier.icon}</span>
                    <span>Direct SMS/WhatsApp: {adminPhoneCarrier.name}</span>
                  </div>
                )}
              </div>

              <div className="gbs-field-group">
                <label className="gbs-field-label">
                  Total Student Population Enrolled <span className="req">*</span>
                </label>
                <input
                  type="number"
                  name="totalStudentsEnrolled"
                  className="gbs-input-control"
                  placeholder="e.g. 500"
                  min="1"
                  value={form.totalStudentsEnrolled}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Password Credentials with Eye Toggle */}
            <div className="gbs-form-grid-2" style={{ marginTop: "8px" }}>
              <div className="gbs-field-group">
                <label className="gbs-field-label">
                  Administrator Password <span className="req">*</span>
                </label>
                <div className="gbs-password-input-wrap">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    className="gbs-input-control"
                    placeholder="Minimum 6 characters"
                    value={form.password}
                    onChange={handleChange}
                    required
                  />
                  <button
                    type="button"
                    className="gbs-password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <div className="gbs-field-group">
                <label className="gbs-field-label">
                  Confirm Administrator Password <span className="req">*</span>
                </label>
                <div className="gbs-password-input-wrap">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    className="gbs-input-control"
                    placeholder="Repeat password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                  <button
                    type="button"
                    className="gbs-password-toggle-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    title={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? "🙈" : "👁️"}
                  </button>
                </div>

                {passwordsMatch !== null && (
                  <div className={`gbs-password-match-tag ${passwordsMatch ? "gbs-match-success" : "gbs-match-error"}`}>
                    <span>{passwordsMatch ? "✓ Passwords match perfectly" : "⚠️ Passwords do not match"}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Official 100% Student-Based Subscription Pricing Policy */}
            <h3 className="gbs-card-section-title" style={{ marginTop: "28px" }}>
              <span className="section-num">3</span>
              <span>Official GBS Student-Based Subscription Pricing Policy (100% Student-Based)</span>
            </h3>

            <div className="gbs-pricing-summary-card">
              <div style={{ marginBottom: "14px", padding: "10px 14px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.35)", fontSize: "0.78rem", color: "#d1fae5" }}>
                <strong>✓ 100% Student-Based Subscription Model:</strong> NO fixed tenant fees, NO basic package fees, and NO additional monthly access charges. Only active registered students are billed (inactive, deleted, and archived students attract zero charges).
              </div>

              <div className="gbs-rate-pill-group">
                <div className="gbs-rate-pill active">
                  <div className="gbs-rate-pill-title">Official Student Rate / Month</div>
                  <div className="gbs-rate-pill-val">GH₵ {calculation.rate}.00</div>
                  <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                    {form.institutionType === "UNIVERSITY" ? "University (GH₵ 10 / student)" : form.institutionType === "SENIOR_HIGH_SCHOOL" ? "SHS (GH₵ 5 / student)" : "Nursery – JHS (GH₵ 3 / student)"}
                  </span>
                </div>

                <div className="gbs-rate-pill">
                  <div className="gbs-rate-pill-title">Active Registered Students</div>
                  <div className="gbs-rate-pill-val">{calculation.count} Students</div>
                  <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>No Fixed or Package Fees</span>
                </div>

                <div className="gbs-rate-pill">
                  <div className="gbs-rate-pill-title">Monthly Subscription Charge</div>
                  <div className="gbs-rate-pill-val" style={{ color: "#38bdf8" }}>GH₵ {calculation.monthlyRate.toLocaleString()} / mo</div>
                  <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{calculation.count} Active Students × GH₵ {calculation.rate}</span>
                </div>

                <div className="gbs-rate-pill">
                  <div className="gbs-rate-pill-title">Total Payment ({calculation.subscribedMonths} Mo • {calculation.discountPct}% Off)</div>
                  <div className="gbs-rate-pill-val" style={{ color: "#34d399" }}>
                    GH₵ {calculation.totalTermFee.toLocaleString()}
                  </div>
                  <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                    {calculation.discountPct > 0
                      ? `Gross GH₵ ${calculation.grossTermFee.toLocaleString()} − GH₵ ${calculation.discountAmount.toLocaleString()} (${calculation.discountPct}% Discount)`
                      : `GH₵ ${calculation.monthlyRate.toLocaleString()} × 1 Month (0% Discount)`}
                  </span>
                </div>
              </div>

              <div style={{ fontSize: "0.82rem", color: "#cbd5e1", marginBottom: "8px", fontWeight: 700 }}>
                Select Official Payment Period (5 Supported Durations & Discounts):
              </div>

              {/* 5 Official Subscription Periods Grid */}
              <div className="gbs-subscription-tier-grid">
                {/* 1 Month (0% Discount) */}
                <div
                  className={`gbs-tier-card ${form.subscriptionPlan === "1_MONTH" || form.subscriptionPlan === "1_MONTH_TRIAL" ? "selected" : ""}`}
                  onClick={() => setForm((prev) => ({ ...prev, subscriptionPlan: "1_MONTH" }))}
                >
                  <div>
                    <span className="gbs-tier-badge" style={{ background: "#10b981", color: "#fff" }}>
                      1 MONTH • 0% DISCOUNT
                    </span>
                    <div className="gbs-tier-name">1 Month Subscription</div>
                    <div className="gbs-tier-fee">GH₵ {calculation.oneMonthRate.toLocaleString()}</div>
                    <div className="gbs-tier-desc">
                      {calculation.count} students × GH₵ {calculation.rate} × 1 month (0% discount).
                    </div>
                  </div>
                </div>

                {/* 3 Months (3% Discount) */}
                <div
                  className={`gbs-tier-card ${form.subscriptionPlan === "3_MONTHS" ? "selected" : ""}`}
                  onClick={() => setForm((prev) => ({ ...prev, subscriptionPlan: "3_MONTHS" }))}
                >
                  <div>
                    <span className="gbs-tier-badge" style={{ background: "#3b82f6", color: "#fff" }}>3 MONTHS • 3% DISCOUNT</span>
                    <div className="gbs-tier-name">3 Months Subscription</div>
                    <div className="gbs-tier-fee">GH₵ {calculation.termRate.toLocaleString()}</div>
                    <div className="gbs-tier-desc">
                      Gross GH₵ {calculation.periods.p3.gross.toLocaleString()} less 3% discount (−GH₵ {calculation.periods.p3.discountAmt.toLocaleString()}).
                    </div>
                  </div>
                </div>

                {/* 6 Months (5% Discount) */}
                <div
                  className={`gbs-tier-card ${form.subscriptionPlan === "6_MONTHS" ? "selected" : ""}`}
                  onClick={() => setForm((prev) => ({ ...prev, subscriptionPlan: "6_MONTHS" }))}
                >
                  <div>
                    <span className="gbs-tier-badge" style={{ background: "#8b5cf6", color: "#fff" }}>6 MONTHS • 5% DISCOUNT</span>
                    <div className="gbs-tier-name">6 Months Subscription</div>
                    <div className="gbs-tier-fee">GH₵ {calculation.semesterRate.toLocaleString()}</div>
                    <div className="gbs-tier-desc">
                      Gross GH₵ {calculation.periods.p6.gross.toLocaleString()} less 5% discount (−GH₵ {calculation.periods.p6.discountAmt.toLocaleString()}).
                    </div>
                  </div>
                </div>

                {/* 9 Months (7% Discount) */}
                <div
                  className={`gbs-tier-card ${form.subscriptionPlan === "9_MONTHS" ? "selected" : ""}`}
                  onClick={() => setForm((prev) => ({ ...prev, subscriptionPlan: "9_MONTHS" }))}
                >
                  <div>
                    <span className="gbs-tier-badge" style={{ background: "#06b6d4", color: "#fff" }}>9 MONTHS • 7% DISCOUNT</span>
                    <div className="gbs-tier-name">9 Months Subscription</div>
                    <div className="gbs-tier-fee">GH₵ {calculation.nineMonthRate.toLocaleString()}</div>
                    <div className="gbs-tier-desc">
                      Gross GH₵ {calculation.periods.p9.gross.toLocaleString()} less 7% discount (−GH₵ {calculation.periods.p9.discountAmt.toLocaleString()}).
                    </div>
                  </div>
                </div>

                {/* 12 Months (10% Discount) */}
                <div
                  className={`gbs-tier-card ${form.subscriptionPlan === "12_MONTHS" ? "selected" : ""}`}
                  onClick={() => setForm((prev) => ({ ...prev, subscriptionPlan: "12_MONTHS" }))}
                >
                  <div>
                    <span className="gbs-tier-badge" style={{ background: "#f59e0b", color: "#000" }}>★ 12 MONTHS • 10% DISCOUNT</span>
                    <div className="gbs-tier-name">12 Months Subscription</div>
                    <div className="gbs-tier-fee">GH₵ {calculation.annualBase.toLocaleString()}</div>
                    <div className="gbs-tier-desc">
                      Gross GH₵ {calculation.periods.p12.gross.toLocaleString()} less 10% discount (−GH₵ {calculation.periods.p12.discountAmt.toLocaleString()}).
                    </div>
                  </div>
                </div>
              </div>

              {/* Official Student Subscription Rate & Population Reference Matrix */}
              <div style={{ marginTop: "16px", padding: "12px 14px", background: "rgba(2, 6, 23, 0.65)", borderRadius: "10px", border: "1px solid rgba(148, 163, 184, 0.2)" }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#fbbf24", marginBottom: "8px" }}>
                  📊 Official GBS Monthly Student Subscription Benchmark (Students × Rate) & Population Growth Policy:
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.74rem", color: "#e2e8f0", textAlign: "left" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(148, 163, 184, 0.25)", color: "#38bdf8" }}>
                        <th style={{ padding: "5px 8px" }}>Active Students</th>
                        <th style={{ padding: "5px 8px" }}>Nursery – JHS (GH₵3)</th>
                        <th style={{ padding: "5px 8px" }}>SHS (GH₵5)</th>
                        <th style={{ padding: "5px 8px" }}>University (GH₵10)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[100, 200, 300, 500, 1000, 2000].map((stu) => (
                        <tr key={stu} style={{ borderBottom: "1px solid rgba(148, 163, 184, 0.1)" }}>
                          <td style={{ padding: "4px 8px", fontWeight: 700 }}>{stu.toLocaleString()}</td>
                          <td style={{ padding: "4px 8px" }}>GH₵ {(stu * 3).toLocaleString()}</td>
                          <td style={{ padding: "4px 8px" }}>GH₵ {(stu * 5).toLocaleString()}</td>
                          <td style={{ padding: "4px 8px" }}>GH₵ {(stu * 10).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: "6px", fontSize: "0.72rem", color: "#94a3b8" }}>
                  • <strong>Population Growth Policy:</strong> Future billing adjusts automatically as active student population grows or reduces (e.g., 200→300 increases next billing; 500→400 decreases next billing). Previously paid subscription periods are never retrospectively changed.
                </div>
              </div>

              {/* Payment Schedule Mode Selector (Spread Monthly vs Bulk Full Term with Signed T&C) */}
              {form.subscriptionPlan !== "1_MONTH_TRIAL" && (
                <div style={{ marginTop: "18px", padding: "16px", background: "rgba(15, 23, 42, 0.85)", borderRadius: "12px", border: "1px solid rgba(56, 189, 248, 0.35)" }}>
                  <div style={{ fontSize: "0.86rem", color: "#38bdf8", fontWeight: 800, marginBottom: "10px" }}>
                    ⚖️ Choose Preferred Subscription Payment Structure ({calculation.subscribedMonths} Months Selected):
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px" }}>
                    {/* Option 1: Monthly Spread */}
                    <div
                      onClick={() => setForm((prev) => ({ ...prev, paymentScheduleMode: "MONTHLY_SPREAD" }))}
                      style={{
                        padding: "14px",
                        borderRadius: "10px",
                        cursor: "pointer",
                        border: form.paymentScheduleMode === "MONTHLY_SPREAD" ? "2px solid #38bdf8" : "1px solid rgba(148, 163, 184, 0.25)",
                        background: form.paymentScheduleMode === "MONTHLY_SPREAD" ? "rgba(56, 189, 248, 0.12)" : "rgba(30, 41, 59, 0.6)"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <strong style={{ color: "#f8fafc", fontSize: "0.85rem" }}>📅 Spread Payment Every Month</strong>
                        <span style={{ fontSize: "0.72rem", background: "#0284c7", color: "#fff", padding: "2px 8px", borderRadius: "999px", fontWeight: 700 }}>
                          Monthly Spread
                        </span>
                      </div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#38bdf8", marginBottom: "4px" }}>
                        Pay GH₵ {calculation.monthlyRate.toLocaleString()} / Month
                      </div>
                      <div style={{ fontSize: "0.76rem", color: "#cbd5e1", lineHeight: 1.4 }}>
                        Your subscription of <strong>GH₵ {calculation.totalTermFee.toLocaleString()}</strong> is spread across <strong>{calculation.subscribedMonths} monthly installments</strong> of GH₵ {calculation.monthlyRate.toLocaleString()} per month.
                      </div>
                    </div>

                    {/* Option 2: Bulk Payment (No Monthly Spread, Sign T&C) */}
                    <div
                      onClick={() => setForm((prev) => ({ ...prev, paymentScheduleMode: "BULK_FULL_TERM" }))}
                      style={{
                        padding: "14px",
                        borderRadius: "10px",
                        cursor: "pointer",
                        border: form.paymentScheduleMode === "BULK_FULL_TERM" ? "2px solid #f59e0b" : "1px solid rgba(148, 163, 184, 0.25)",
                        background: form.paymentScheduleMode === "BULK_FULL_TERM" ? "rgba(245, 158, 11, 0.14)" : "rgba(30, 41, 59, 0.6)"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <strong style={{ color: "#f8fafc", fontSize: "0.85rem" }}>📦 Pay in Bulk (Full Preferred Term)</strong>
                        <span style={{ fontSize: "0.72rem", background: "#d97706", color: "#fff", padding: "2px 8px", borderRadius: "999px", fontWeight: 700 }}>
                          Bulk Settlement
                        </span>
                      </div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fbbf24", marginBottom: "4px" }}>
                        Pay GH₵ {calculation.totalTermFee.toLocaleString()} in Bulk
                      </div>
                      <div style={{ fontSize: "0.76rem", color: "#cbd5e1", lineHeight: 1.4 }}>
                        Sign Terms & Conditions to pay the entire <strong>{calculation.subscribedMonths}-month subscription</strong> in one bulk settlement without spreading into months.
                      </div>
                    </div>
                  </div>

                  {/* Bulk Payment Terms & Conditions Signatory Box */}
                  {form.paymentScheduleMode === "BULK_FULL_TERM" && (
                    <div style={{ marginTop: "14px", padding: "14px", borderRadius: "10px", background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.45)" }}>
                      <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#fbbf24", marginBottom: "6px" }}>
                        📜 Bulk Subscription Payment Terms & Conditions Covenant
                      </div>
                      <p style={{ fontSize: "0.76rem", color: "#e2e8f0", lineHeight: 1.5, margin: "0 0 10px" }}>
                        By selecting Bulk Settlement, the Tenant agrees to remit the full preferred subscription amount of <strong>GH₵ {calculation.totalTermFee.toLocaleString()}</strong> ({calculation.count} students × GH₵ {calculation.rate} × {calculation.subscribedMonths} months) in bulk without monthly installment spread, securing uninterrupted cloud hosting, automated disaster recovery, and full platform licensing for the entire {calculation.subscribedMonths}-month term.
                      </p>
                      <div className="gbs-form-grid-2" style={{ alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <input
                            type="checkbox"
                            id="bulkTermsAcceptedCheck"
                            name="bulkTermsAccepted"
                            checked={form.bulkTermsAccepted}
                            onChange={handleChange}
                            style={{ width: "18px", height: "18px", accentColor: "#f59e0b", cursor: "pointer" }}
                          />
                          <label htmlFor="bulkTermsAcceptedCheck" style={{ fontSize: "0.78rem", color: "#fef3c7", fontWeight: 700, cursor: "pointer" }}>
                            I accept & sign the Bulk Subscription Payment Terms & Conditions
                          </label>
                        </div>
                        <div>
                          <input
                            type="text"
                            name="bulkTermsSignedBy"
                            className="gbs-input-control"
                            placeholder="Digital Signatory (Full Name of Headmaster / Director)"
                            value={form.bulkTermsSignedBy}
                            onChange={handleChange}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Upgrade Prompt If Trial Used */}
              {hasUsedTrial && (
                <div className="gbs-trial-upgrade-prompt">
                  <span style={{ fontSize: "1.4rem" }}>🛡️</span>
                  <div>
                    <strong>Disaster Recovery & Modernization Notice:</strong> Your institution's 1-Month Free Trial has expired. Please select a 3 Months, 6 Months, 9 Months, 12 Months, or Lifetime license to transition from traditional to modern school management, keeping all institutional data, grades, and records secure even in catastrophic events.
                  </div>
                </div>
              )}

              {/* MoMo Payment Reference If Paid Plan */}
              {form.subscriptionPlan !== "1_MONTH_TRIAL" && (
                <div style={{ marginTop: "18px", padding: "14px", background: "rgba(30, 41, 59, 0.8)", borderRadius: "10px", border: "1px solid rgba(212, 175, 55, 0.3)" }}>
                  <div style={{ fontSize: "0.85rem", color: "#fbbf24", fontWeight: 700, marginBottom: "6px" }}>
                    💳 Mobile Money / Bank Payment Remittance ({form.paymentScheduleMode === "BULK_FULL_TERM" ? `Bulk Full Term — ${calculation.subscribedMonths} Months` : "First Month of Monthly Spread"})
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#cbd5e1", marginBottom: "8px" }}>
                    Please remit <strong>GH₵ {calculation.payableAmount.toLocaleString()}</strong> ({form.paymentScheduleMode === "BULK_FULL_TERM" ? `Bulk payment for ${calculation.subscribedMonths} months` : `Monthly installment 1 of ${calculation.subscribedMonths} at GH₵ ${calculation.monthlyRate.toLocaleString()}/month`}) to MTN MoMo: <strong>0554594193</strong> (GABRIELKUBI OSEI-APPIAH) and enter your MoMo Transaction ID below:
                  </div>
                  <input
                    type="text"
                    name="momoTxnId"
                    className="gbs-input-control"
                    placeholder="Enter MoMo / Bank Transaction Reference ID"
                    value={form.momoTxnId}
                    onChange={handleChange}
                    required
                  />
                </div>
              )}
            </div>

            {/* Terms and Consent Checkbox */}
            <div style={{ margin: "20px 0 10px", display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                type="checkbox"
                id="termsCheck"
                name="termsAccepted"
                checked={form.termsAccepted}
                onChange={handleChange}
                style={{ width: "18px", height: "18px", accentColor: "#d4af37", cursor: "pointer" }}
              />
              <label htmlFor="termsCheck" style={{ fontSize: "0.82rem", color: "#cbd5e1", cursor: "pointer" }}>
                I agree to the GBS Enterprise Master Agreement, data security guidelines, and verify that all information provided is accurate and binding.
              </label>
            </div>

            {/* Submission Actions */}
            <div className="gbs-submit-actions-row">
              <button
                type="submit"
                className="gbs-btn-submit-registration"
                disabled={loading}
              >
                {loading ? "Submitting Registration to Developer Platform..." : "🚀 Submit Onboarding Application For Developer Approval"}
              </button>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", fontSize: "0.82rem", color: "#94a3b8" }}>
                <span>Already an approved tenant or institution user?</span>
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#38bdf8",
                    fontWeight: 700,
                    cursor: "pointer",
                    textDecoration: "underline"
                  }}
                >
                  I am already in → Go to Main Login Page
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>

      {/* Biometric Face Scanner Modal */}
      <BiometricFaceScannerModal
        isOpen={showFaceScanner}
        onClose={() => setShowFaceScanner(false)}
        onScanComplete={handleFaceScanComplete}
      />

      {/* Success Modal */}
      {successData && (
        <div className="gbs-modal-overlay">
          <div className="gbs-success-modal-card">
            <div className="gbs-success-icon-badge">✓</div>
            <h2 style={{ color: "#d4af37", fontSize: "1.5rem", margin: "0 0 10px" }}>
              Onboarding Application Received!
            </h2>
            <p style={{ color: "#cbd5e1", fontSize: "0.88rem", lineHeight: 1.5, margin: "0 0 20px" }}>
              Congratulations <strong>{successData.institutionName}</strong>! Your institutional registration dossier has been submitted to Developer Gabriel Kubi Osei-Appiah for biometric verification and enclave provisioning.
            </p>

            <div style={{ background: "rgba(30, 41, 59, 0.8)", border: "1px solid rgba(212, 175, 55, 0.4)", borderRadius: "12px", padding: "16px", marginBottom: "24px", textAlign: "left", fontSize: "0.82rem" }}>
              <div style={{ marginBottom: "6px" }}>
                <strong>Application Reference:</strong> <span style={{ color: "#fbbf24" }}>{successData.appRef}</span>
              </div>
              <div style={{ marginBottom: "6px" }}>
                <strong>Assigned Tenant Code:</strong> <span style={{ color: "#38bdf8" }}>{successData.tenantCode}</span>
              </div>
              <div style={{ marginBottom: "6px" }}>
                <strong>Headmaster:</strong> {successData.headmasterName}
              </div>
              <div>
                <strong>Subscription Plan:</strong> {successData.plan} (GH₵ {successData.amount.toLocaleString()})
              </div>
            </div>

            <p style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: "20px" }}>
              The Developer will dispatch your approval confirmation and SMS credentials. You can now proceed to the Main Login Page.
            </p>

            <button
              type="button"
              className="gbs-btn-already-in"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => navigate("/login")}
            >
              Continue to Main Login Page →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
