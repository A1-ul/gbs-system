import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import WindowControlsBar from "../../../components/common/WindowControlsBar";
import { GBS_SYSTEMS_CATALOG } from "../../../constants/gbsSystemsCatalog";
import { calculateOnboardingFee, getOnboardingRates, formatCedis } from "../../../utils/pricingEngine";
import "../styles/GBSCompanyWebsite.css";

export default function GBSCompanyWebsite() {
  const navigate = useNavigate();

  // Selected System Modal
  const [selectedSystem, setSelectedSystem] = useState(null);

  // Per-Student Onboarding Calculator State
  const [rates, setRates] = useState(() => getOnboardingRates());
  const [calcTier, setCalcTier] = useState("SHS");
  const [calcStudents, setCalcStudents] = useState(300);
  const [computedFee, setComputedFee] = useState(() => calculateOnboardingFee(300, "SHS"));

  // Recalculate fees when tier or student population changes
  useEffect(() => {
    setComputedFee(calculateOnboardingFee(calcStudents, calcTier));
  }, [calcStudents, calcTier]);

  // Listen for developer dynamic rate adjustments
  useEffect(() => {
    const handleRatesUpdate = (e) => {
      if (e?.detail?.rates) {
        setRates(e.detail.rates);
      } else {
        setRates(getOnboardingRates());
      }
      setComputedFee(calculateOnboardingFee(calcStudents, calcTier));
    };
    window.addEventListener("gbs_rates_updated", handleRatesUpdate);
    window.addEventListener("storage", handleRatesUpdate);
    return () => {
      window.removeEventListener("gbs_rates_updated", handleRatesUpdate);
      window.removeEventListener("storage", handleRatesUpdate);
    };
  }, [calcStudents, calcTier]);

  // Live Application Status Tracker State
  const [trackingCode, setTrackingCode] = useState("");
  const [trackingResult, setTrackingResult] = useState(null);
  const [trackingError, setTrackingError] = useState("");

  const handleTrackApplication = (e) => {
    e.preventDefault();
    setTrackingError("");
    setTrackingResult(null);

    const clean = trackingCode.trim().toUpperCase();
    if (!clean) {
      setTrackingError("Please enter your Application Reference Code (e.g. GBS-APP-2026-8942)");
      return;
    }

    try {
      const incoming = JSON.parse(localStorage.getItem("gbs_incoming_onboarding_applications") || "[]");
      const found = incoming.find(
        (a) =>
          (a.trackingReference && a.trackingReference.toUpperCase() === clean) ||
          (a.tenantUid && a.tenantUid.toUpperCase() === clean) ||
          (a.id && String(a.id).toUpperCase() === clean)
      );

      if (found) {
        setTrackingResult(found);
      } else if (clean === "GBS-APP-2026-8942") {
        setTrackingResult({
          trackingReference: "GBS-APP-2026-8942",
          institutionName: "St. Augustine Science Academy",
          institutionTier: "Senior High School (SHS)",
          totalStudentsEnrolled: 300,
          calculatedFee: 3000,
          submittedAt: "2026-10-24T10:15:00.000Z",
          status: "UNDER_DEVELOPER_REVIEW",
          headmasterName: "Arthur Pendleton",
          headmasterEmail: "admin@gbs.edu"
        });
      } else {
        setTrackingError(`Reference "${clean}" was not found. Please verify your tracking code or submit a new registration.`);
      }
    } catch {
      setTrackingError("Error reading registration ledger. Please retry.");
    }
  };

  const handleApplyNow = () => {
    navigate(`/signup/institution?tier=${calcTier}&students=${calcStudents}`);
  };

  return (
    <div className="gbs-website-root">
      {/* Universal Desktop Window Controls Bar */}
      <WindowControlsBar title="GBS Company — Executive Management Systems Ecosystem" />

      {/* Top Announcement Ticker */}
      <header className="gbs-website-ticker">
        <div className="ticker-badge">OFFICIAL ANNOUNCEMENT</div>
        <div className="ticker-text">
          <span>🏛️ GBS COMPANY: 100% Remote Self-Onboarding is LIVE. Institutions can digitize operations remotely.</span>
          <span className="ticker-hotline">📞 Executive Hotline & Emergency Line: +233 54 329 4615</span>
        </div>
        <div className="ticker-actions">
          <Link to="/presentation-engine" className="ticker-link presentation-btn">🎬 Video Presentation</Link>
          <Link to="/developer/login" className="ticker-link dev-btn">🛡️ Developer Control</Link>
        </div>
      </header>

      {/* Hero Master Header */}
      <section className="gbs-website-hero">
        <div className="hero-container">
          <div className="hero-brand-pill">
            <span className="pill-dot"></span> ENTERPRISE CLOUD ARCHITECTURE
          </div>
          <h1 className="hero-title">
            GBS COMPANY
            <span className="hero-subtitle">Industrial-Grade Institutional & Enterprise Operating Systems</span>
          </h1>
          <p className="hero-lead">
            Replace fragmented software and physical paperwork with an interconnected, 100% remote-deployable cloud ecosystem.
            Powered by high-security PostgreSQL multi-tenancy, AI-powered exam scanning, automatic offline synchronization,
            and real-life verifiable institutional controls.
          </p>

          <div className="hero-cta-group">
            <Link to="/login" className="btn-hero-primary">
              🚀 Enter System Portals & Sign In
            </Link>
            <a href="#pricing-calculator" className="btn-hero-secondary">
              📊 Per-Student Fee Calculator
            </a>
            <Link to="/presentation-engine" className="btn-hero-presentation">
              🎙️ Watch System Presentation
            </Link>
          </div>

          <div className="hero-metrics-ribbon">
            <div className="metric-cell">
              <span className="metric-val">12</span>
              <span className="metric-lbl">Enterprise Systems Catalog</span>
            </div>
            <div className="metric-cell">
              <span className="metric-val">100%</span>
              <span className="metric-lbl">Remote Autonomous Onboarding</span>
            </div>
            <div className="metric-cell">
              <span className="metric-val">0 min</span>
              <span className="metric-lbl">Developer Physical Travel Required</span>
            </div>
            <div className="metric-cell">
              <span className="metric-val">PostgreSQL</span>
              <span className="metric-lbl">Bank-Grade Multi-Tenant DB</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 1: The 12 Enterprise Systems Catalog */}
      <section className="gbs-website-section systems-section">
        <div className="section-header">
          <span className="section-eyebrow">MODULAR ENTERPRISE PORTFOLIO</span>
          <h2 className="section-title">All 12 GBS Enterprise Management Systems</h2>
          <p className="section-desc">
            Explore our standalone, decoupled software suites engineered to solve complex operations across schools,
            examinations, healthcare, retail, transport, and correctional institutions.
          </p>
        </div>

        <div className="systems-grid">
          {GBS_SYSTEMS_CATALOG.map((sys) => (
            <div key={sys.id} className="system-card">
              <div className="system-card-top">
                <span className="system-icon">{sys.icon}</span>
                <span className={`status-pill ${sys.status.toLowerCase().replace(/_/g, "-")}`}>
                  {sys.status === "LIVE_AND_OPERATIONAL" ? "LIVE & OPERATIONAL" : "READY FOR DEPLOYMENT"}
                </span>
              </div>
              <h3 className="system-name">{sys.name}</h3>
              <p className="system-tagline">{sys.tagline}</p>
              
              <div className="system-features-preview">
                <div className="preview-label">Core Capabilities:</div>
                <ul>
                  {sys.coreFeatures.slice(0, 3).map((feat, idx) => (
                    <li key={idx}>✓ {feat}</li>
                  ))}
                </ul>
              </div>

              <div className="system-card-actions">
                <button
                  type="button"
                  className="btn-system-specs"
                  onClick={() => setSelectedSystem(sys)}
                >
                  🔍 Explore Blueprint & Specs
                </button>
                {sys.status === "LIVE_AND_OPERATIONAL" ? (
                  <Link to="/login" className="btn-system-launch">
                    Launch System →
                  </Link>
                ) : (
                  <a
                    href={`https://${sys.subdomain}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-system-external"
                  >
                    View Domain ↗
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* System Modal Dialog */}
      {selectedSystem && (
        <div className="gbs-modal-overlay" onClick={() => setSelectedSystem(null)}>
          <div className="gbs-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <span className="modal-icon">{selectedSystem.icon}</span>
                <div>
                  <h3 className="modal-title">{selectedSystem.name}</h3>
                  <span className="modal-subtitle">{selectedSystem.tagline}</span>
                </div>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setSelectedSystem(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-section">
                <h4>🎯 Problem Solved & Operational Purpose</h4>
                <p>{selectedSystem.problemStatement}</p>
              </div>

              <div className="modal-section">
                <h4>⚙️ Core Architectural Features</h4>
                <div className="modal-features-grid">
                  {selectedSystem.coreFeatures.map((f, i) => (
                    <div key={i} className="modal-feature-item">
                      <span className="feature-check">✔</span> {f}
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-meta-row">
                <div className="meta-box">
                  <span className="meta-lbl">Target Audience:</span>
                  <span className="meta-val">{selectedSystem.targetAudience}</span>
                </div>
                <div className="meta-box">
                  <span className="meta-lbl">Dedicated Cloud Domain:</span>
                  <span className="meta-val code-font">{selectedSystem.subdomain}</span>
                </div>
                <div className="meta-box">
                  <span className="meta-lbl">Operational Status:</span>
                  <span className="meta-val status-val">{selectedSystem.status}</span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setSelectedSystem(null)}
              >
                Close Blueprint
              </button>
              <Link to="/login" className="btn-modal-action">
                Access System Now
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Section 2: Automated Per-Student Pricing Multiplier Engine */}
      <section id="pricing-calculator" className="gbs-website-section pricing-section">
        <div className="section-header">
          <span className="section-eyebrow">TRANSPARENT & PREDICTABLE ONBOARDING</span>
          <h2 className="section-title">Automated Per-Student Onboarding Calculator</h2>
          <p className="section-desc">
            No ambiguous quotations or arbitrary developer consulting invoices. Your one-time onboarding fee
            is calculated transparently based on total student population.
          </p>
        </div>

        <div className="calculator-card">
          <div className="calc-left">
            <label className="calc-label">1. Select Your Institutional Tier:</label>
            <div className="tier-selector-group">
              <button
                type="button"
                className={`tier-btn ${calcTier === "BASIC" ? "active" : ""}`}
                onClick={() => setCalcTier("BASIC")}
              >
                <span className="tier-name">Nursery / Primary / JHS</span>
                <span className="tier-rate">{formatCedis(rates.BASIC_PER_STUDENT)} / student</span>
              </button>
              <button
                type="button"
                className={`tier-btn ${calcTier === "SHS" ? "active" : ""}`}
                onClick={() => setCalcTier("SHS")}
              >
                <span className="tier-name">Senior High School (SHS)</span>
                <span className="tier-rate">{formatCedis(rates.SHS_PER_STUDENT)} / student</span>
              </button>
              <button
                type="button"
                className={`tier-btn ${calcTier === "UNIVERSITY" ? "active" : ""}`}
                onClick={() => setCalcTier("UNIVERSITY")}
              >
                <span className="tier-name">University / Tertiary</span>
                <span className="tier-rate">{formatCedis(rates.UNIVERSITY_PER_STUDENT)} / student</span>
              </button>
            </div>

            <div className="slider-container">
              <div className="slider-header">
                <label className="calc-label">2. Total Enrolled Student Population:</label>
                <span className="slider-count-badge">{calcStudents.toLocaleString()} Students</span>
              </div>
              <input
                type="range"
                min="50"
                max="5000"
                step="25"
                value={calcStudents}
                onChange={(e) => setCalcStudents(parseInt(e.target.value, 10))}
                className="calc-range-slider"
              />
              <div className="slider-ticks">
                <span>50</span>
                <span>500</span>
                <span>1,500</span>
                <span>3,000</span>
                <span>5,000+</span>
              </div>
            </div>

            <div className="pricing-rule-callout">
              <span className="callout-icon">💡</span>
              <p>
                <strong>Strict Fee Delineation:</strong> The calculated amount is a <em>one-time onboarding and schema setup fee</em>.
                Cloud hosting, daily automated encrypted backups, and SMS quotas are handled via separate, affordable recurring subscriptions.
              </p>
            </div>
          </div>

          <div className="calc-right">
            <div className="fee-display-box">
              <span className="fee-eyebrow">Calculated One-Time Onboarding Fee</span>
              <div className="fee-figure">{formatCedis(computedFee)}</div>
              <div className="fee-breakdown-formula">
                Formula: {calcStudents.toLocaleString()} Students × {formatCedis(
                  calcTier === "BASIC"
                    ? rates.BASIC_PER_STUDENT
                    : calcTier === "SHS"
                    ? rates.SHS_PER_STUDENT
                    : rates.UNIVERSITY_PER_STUDENT
                )}
              </div>

              <div className="fee-inclusions-list">
                <div className="inclusion-item">✔ Dedicated Multi-Tenant PostgreSQL Schema</div>
                <div className="inclusion-item">✔ Legacy Excel / Paper Record Migration Assistance</div>
                <div className="inclusion-item">✔ Video Staff Onboarding & Admin Orientation</div>
                <div className="inclusion-item">✔ Automated Biometric & Headmaster Portal Provisioning</div>
              </div>

              <button
                type="button"
                className="btn-apply-onboarding"
                onClick={handleApplyNow}
              >
                Apply for Remote Onboarding with This Quote →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: The Complete Remote Onboarding Journey */}
      <section className="gbs-website-section journey-section">
        <div className="section-header">
          <span className="section-eyebrow">ZERO DEVELOPER PHYSICAL VISITS REQUIRED</span>
          <h2 className="section-title">The Complete Remote Onboarding Journey</h2>
          <p className="section-desc">
            How institutions onboard, verify credentials, migrate records, and begin operations autonomously in four steps.
          </p>
        </div>

        <div className="journey-steps-grid">
          <div className="journey-step-card">
            <div className="step-num-pill">01</div>
            <h4 className="step-card-title">Online Application & Accreditation Upload</h4>
            <p className="step-card-text">
              Enter your institution's official details, student census, and upload national regulatory accreditation documents
              and GPS coordinates directly via our web portal.
            </p>
          </div>

          <div className="journey-step-card">
            <div className="step-num-pill">02</div>
            <h4 className="step-card-title">Cryptographic Tracking Reference Code</h4>
            <p className="step-card-text">
              Upon submission, GBS issues a unique Application Reference Code (e.g. <code>GBS-APP-2026-8942</code>)
              allowing your governing council to track review progress live 24/7.
            </p>
          </div>

          <div className="journey-step-card">
            <div className="step-num-pill">03</div>
            <h4 className="step-card-title">Developer Verification & Schema Provisioning</h4>
            <p className="step-card-text">
              The Chief Developer inspects submitted accreditation, validates biometric headmaster credentials,
              and initializes your dedicated, isolated PostgreSQL schema.
            </p>
          </div>

          <div className="journey-step-card">
            <div className="step-num-pill">04</div>
            <h4 className="step-card-title">Instant Live Launch & Cloud Activation</h4>
            <p className="step-card-text">
              Leadership receives master credentials via encrypted notification. Teachers, parents, and students access
              their specialized dashboards immediately.
            </p>
          </div>
        </div>
      </section>

      {/* Section 4: Never Discard Your Existing School Records */}
      <section className="gbs-website-section migration-section">
        <div className="migration-card-wrapper">
          <div className="migration-content">
            <span className="migration-eyebrow">LEGACY DATA PRESERVATION GUARANTEE</span>
            <h2 className="migration-title">Never Discard Your Existing School Records</h2>
            <p className="migration-body">
              Transitioning to GBS does not mean starting from zero. Whether your school keeps records in physical logbooks,
              Excel spreadsheets, legacy MySQL databases, or paper filing cabinets, our integrated
              <strong> Migration Service Engine</strong> ingests and formats your historical data seamlessly.
            </p>
            <div className="migration-bullets">
              <div className="bullet-row">
                <span className="bullet-icon">📦</span>
                <div>
                  <strong>Excel & CSV Bulk Import:</strong> Upload entire student rosters, fee payments, and historical grades in minutes.
                </div>
              </div>
              <div className="bullet-row">
                <span className="bullet-icon">🔒</span>
                <div>
                  <strong>Zero-Data-Loss Ingestion:</strong> Automated duplicate deduplication and cryptographic integrity checks.
                </div>
              </div>
              <div className="bullet-row">
                <span className="bullet-icon">🗄️</span>
                <div>
                  <strong>Digital Archive Preservation:</strong> Old academic transcripts remain searchable by alumni decades into the future.
                </div>
              </div>
            </div>
          </div>
          <div className="migration-action-box">
            <div className="action-box-inner">
              <h3>Have Legacy Records to Migrate?</h3>
              <p>Our migration engine processes legacy files directly during onboarding without interruption.</p>
              <Link to="/signup/institution" className="btn-migration-cta">
                Start Remote Onboarding Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Track Your Institution Registration */}
      <section className="gbs-website-section tracking-section">
        <div className="section-header">
          <span className="section-eyebrow">REAL-TIME ONBOARDING LEDGER</span>
          <h2 className="section-title">Track Your Institution Registration</h2>
          <p className="section-desc">
            Check the live review and provisioning status of your submitted institution onboarding application.
          </p>
        </div>

        <div className="tracking-card">
          <form onSubmit={handleTrackApplication} className="tracking-form">
            <div className="input-group">
              <label htmlFor="trackingInput">Enter Your Application Reference Code:</label>
              <div className="input-with-button">
                <input
                  id="trackingInput"
                  type="text"
                  placeholder="e.g. GBS-APP-2026-8942"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  className="tracking-input"
                />
                <button type="submit" className="btn-track-submit">
                  Check Application Status
                </button>
              </div>
            </div>
          </form>

          {trackingError && (
            <div className="tracking-alert alert-error">
              ⚠️ {trackingError}
            </div>
          )}

          {trackingResult && (
            <div className="tracking-result-card">
              <div className="result-header">
                <div className="result-title">
                  <span className="result-code">{trackingResult.trackingReference || trackingResult.tenantUid}</span>
                  <span className={`result-badge ${trackingResult.status ? trackingResult.status.toLowerCase() : "under_review"}`}>
                    {trackingResult.status || "UNDER_DEVELOPER_REVIEW"}
                  </span>
                </div>
                <span className="result-timestamp">
                  Submitted: {trackingResult.submittedAt ? new Date(trackingResult.submittedAt).toLocaleString() : "Recently"}
                </span>
              </div>

              <div className="result-details-grid">
                <div className="detail-item">
                  <span className="detail-label">Institution Name:</span>
                  <span className="detail-value">{trackingResult.institutionName}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Institutional Tier:</span>
                  <span className="detail-value">{trackingResult.institutionTier}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Declared Population:</span>
                  <span className="detail-value">{trackingResult.totalStudentsEnrolled} Students</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Headmaster / Lead Official:</span>
                  <span className="detail-value">{trackingResult.headmasterName} ({trackingResult.headmasterEmail})</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Calculated Setup Fee:</span>
                  <span className="detail-value highlight-val">{formatCedis(trackingResult.calculatedFee || 3000)}</span>
                </div>
              </div>

              <div className="result-next-steps">
                <strong>Next Step:</strong> The Chief Developer is currently inspecting your accreditation papers and preparing your isolated PostgreSQL schema. You will receive an automated confirmation when complete.
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Master Footer */}
      <footer className="gbs-website-footer">
        <div className="footer-container">
          <div className="footer-col brand-col">
            <h3 className="footer-brand">GBS COMPANY</h3>
            <p className="footer-tagline">
              Enterprise Institutional Management & Autonomous Cloud Solutions.
            </p>
            <p className="footer-lead-developer">
              Lead Architect & Chief System Engineer: Gabriel Osei<br />
              Emergency Support Line: +233 54 329 4615
            </p>
          </div>

          <div className="footer-col">
            <h4 className="footer-heading">Portals & Workspaces</h4>
            <ul className="footer-links">
              <li><Link to="/login">Universal Login Gateway</Link></li>
              <li><Link to="/login/admin">Headmaster Command Center</Link></li>
              <li><Link to="/login/teacher">Teacher Academic Suite</Link></li>
              <li><Link to="/login/student">Student Timetable & Exams</Link></li>
              <li><Link to="/login/parent">Parent Ward Supervision</Link></li>
              <li><Link to="/login/accountant">Accountant & Bursar Ledger</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4 className="footer-heading">Enterprise Subsystems</h4>
            <ul className="footer-links">
              <li><Link to="/signup/institution">100% Remote Onboarding</Link></li>
              <li><Link to="/presentation-engine">Video Presentation Engine</Link></li>
              <li><Link to="/developer/login">Developer Control Sentinel</Link></li>
              <li><Link to="/cctv">Smart Campus CCTV Hub</Link></li>
              <li><Link to="/location/live-tracking">Live Transit Tracking</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2026 GBS COMPANY OF MANAGEMENT SYSTEM. ALL RIGHTS RESERVED. REAL-LIFE PRODUCTION CERTIFIED.</p>
        </div>
      </footer>
    </div>
  );
}
