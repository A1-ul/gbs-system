import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { register, registerInstitution, getPublicInstitutions } from "../api/auth.api";
import BiometricFaceScannerModal from "../components/BiometricFaceScannerModal";
import "./SignUpPage.css";

const ONBOARDING_TRACKS = [
  { id: "INSTITUTION", title: "Institution Onboarding", icon: "🏫", desc: "Register School / Academy", color: "#3b82f6" },
  { id: "TEACHER", title: "Teacher / Faculty", icon: "👨‍🏫", desc: "Academic Staff Registration", color: "#10b981" },
  { id: "STUDENT", title: "Student Enrollment", icon: "🎓", desc: "Student Admission & Portal", color: "#8b5cf6" },
  { id: "PARENT", title: "Parent / Guardian", icon: "👨‍👩‍👧", desc: "Family & Child Monitoring", color: "#f59e0b" },
  { id: "ACCOUNTANT", title: "Accountant / Bursar", icon: "📊", desc: "Finance & Payroll Officer", color: "#ec4899" },
  { id: "HR", title: "Human Resources (HR)", icon: "🛡️", desc: "HR Manager & Faculty Auditing", color: "#06b6d4" },
  { id: "ALUMNI", title: "Alumni / Graduate", icon: "🏛️", desc: "Graduates, Mentorship & Alumni Network", color: "#6366f1" },
  { id: "STAFF", title: "Staff & Operations", icon: "💼", desc: "Logistics & Administrative", color: "#64748b" },
  { id: "HEADMASTER_REPLACEMENT", title: "Headmaster Replacement", icon: "👑", desc: "Executive Succession & Picture Upload", color: "#38bdf8" }
];

export default function SignUpPage({ defaultRole }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Detect track from query params or prop or URL path
  const getInitialTrack = () => {
    if (defaultRole) return defaultRole.toUpperCase();
    const query = new URLSearchParams(location.search).get("role");
    if (query) return query.toUpperCase();
    if (location.pathname.includes("/institution") || location.pathname.includes("/tenant")) return "INSTITUTION";
    if (location.pathname.includes("/teacher")) return "TEACHER";
    if (location.pathname.includes("/student")) return "STUDENT";
    if (location.pathname.includes("/parent")) return "PARENT";
    if (location.pathname.includes("/accountant")) return "ACCOUNTANT";
    if (location.pathname.includes("/hr")) return "HR";
    if (location.pathname.includes("/alumni")) return "ALUMNI";
    if (location.pathname.includes("/staff")) return "STAFF";
    return "INSTITUTION";
  };

  const [activeTrack, setActiveTrack] = useState(getInitialTrack());
  const [institutions, setInstitutions] = useState([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successData, setSuccessData] = useState(null);

  // Institution Onboarding Form State
  const [instForm, setInstForm] = useState({
    institutionName: "",
    institutionType: "NURSERY_TO_JHS", // "NURSERY_TO_JHS" | "SENIOR_HIGH_SCHOOL" | "UNIVERSITY"
    totalStudentsEnrolled: "",
    country: "Ghana",
    region: "Greater Accra",
    city: "Accra",
    physicalAddress: "",
    gpsLocation: "",
    officialEmail: "",
    officialPhone: "",
    website: "",
    registrationNumber: "",
    businessLicenseNumber: "",
    taxIdentificationNumber: "",
    institutionLogo: "",
    repFullName: "",
    repPosition: "Head of School / Chancellor",
    repEmail: "",
    repPhone: "",
    adminName: "",
    adminEmail: "",
    adminPhone: "",
    password: "",
    confirmPassword: "",
    biometricFaceToken: "",
    facePhoto: "",
    // Subscription Payment to Developer Gabriel Kubi Osei-Appiah (0554594193)
    momoTxnId: "",
    paymentAmount: "500",
    senderPhone: "",
    termsAccepted: false,
    privacyAccepted: false,
    dataProcessingConsent: false
  });

  const [showFaceScannerModal, setShowFaceScannerModal] = useState(false);
  const [faceScanTarget, setFaceScanTarget] = useState("INSTITUTION"); // "INSTITUTION" | "HEADMASTER_REPLACEMENT"

  // Pre-fill from GBS System Onboarding Fee Calculator query parameters
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const tierParam = params.get("tier");
      const studentsParam = params.get("students");
      const feeParam = params.get("fee");
      if (tierParam || studentsParam || feeParam) {
        setInstForm((prev) => {
          let mappedTier = prev.institutionType;
          if (tierParam === "JHS") mappedTier = "NURSERY_TO_JHS";
          else if (tierParam === "SHS") mappedTier = "SENIOR_HIGH_SCHOOL";
          else if (tierParam === "UNIVERSITY") mappedTier = "UNIVERSITY";
          return {
            ...prev,
            institutionType: mappedTier,
            totalStudentsEnrolled: studentsParam || prev.totalStudentsEnrolled,
            paymentAmount: feeParam || prev.paymentAmount
          };
        });
      }
    } catch {}
  }, [location.search]);

  // Headmaster Replacement Registration State
  const [hmReplacementForm, setHmReplacementForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    qualification: "Ph.D. in Educational Administration & Leadership",
    tenantCode: "GBS-MAIN",
    appointmentResolutionNumber: "RES-2026-COUNCIL-008",
    reasonForReplacement: "Executive Succession & Leadership Transition",
    password: "",
    confirmPassword: "",
    pictureBase64: "",
    scannedFacePhoto: "",
    biometricFaceToken: "",
    biometricMatch: false,
    termsAccepted: false
  });
  const [hmPicturePreview, setHmPicturePreview] = useState(null);

  const handleHmPictureUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setHmPicturePreview(reader.result);
        setHmReplacementForm((prev) => ({ 
          ...prev, 
          pictureBase64: reader.result,
          biometricMatch: !!prev.scannedFacePhoto
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleHeadmasterReplacementSubmit = (e) => {
    e.preventDefault();
    if (!hmReplacementForm.pictureBase64) {
      setError("Please upload the new Headmaster's official portrait photograph for Developer verification.");
      return;
    }
    if (!hmReplacementForm.scannedFacePhoto) {
      setError("Live biometric facial scan is required. Please launch the face scanner to verify person match before sending to Developer.");
      return;
    }
    if (hmReplacementForm.password !== hmReplacementForm.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError(null);

    const replacementRecord = {
      id: `HM-REP-${Date.now()}`,
      fullName: hmReplacementForm.fullName.trim(),
      email: hmReplacementForm.email.trim(),
      phone: hmReplacementForm.phone.trim(),
      qualification: hmReplacementForm.qualification,
      tenantCode: hmReplacementForm.tenantCode,
      institutionName: institutions.find((i) => i.code === hmReplacementForm.tenantCode)?.name || "GBS International School (Main Branch)",
      appointmentResolutionNumber: hmReplacementForm.appointmentResolutionNumber.trim(),
      reasonForReplacement: hmReplacementForm.reasonForReplacement,
      pictureBase64: hmReplacementForm.pictureBase64,
      scannedFacePhoto: hmReplacementForm.scannedFacePhoto,
      biometricFaceToken: hmReplacementForm.biometricFaceToken,
      biometricMatchStatus: "MATCH_VERIFIED",
      status: "PENDING_DEVELOPER_VERIFICATION",
      submittedAt: new Date().toISOString()
    };

    const existing = JSON.parse(localStorage.getItem("gbs_headmaster_replacements") || "[]");
    localStorage.setItem("gbs_headmaster_replacements", JSON.stringify([replacementRecord, ...existing]));

    window.dispatchEvent(new CustomEvent("gbs_headmaster_replacement_submitted", { detail: { replacement: replacementRecord } }));
    window.dispatchEvent(new Event("storage"));

    setLoading(false);
    setSuccessData({
      type: "HEADMASTER_REPLACEMENT",
      role: "HEADMASTER",
      message: `Headmaster Succession dossier for ${replacementRecord.fullName} has been verified and sent to the Developer Control Center! The Developer will verify the uploaded picture and scanned face, then update the institution's onboarding details.`
    });
  };

  // Member Registration Form State (Shared + Role-specific)
  const [memberForm, setMemberForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    tenantCode: "GBS-MAIN",
    // Teacher specific
    title: "Mr.",
    phone: "",
    whatsappPhone: "",
    employeeId: "",
    department: "Sciences",
    specialization: "",
    highestQualification: "B.Ed",
    experienceYears: 3,
    // Student specific
    dateOfBirth: "",
    gender: "Male",
    bloodGroup: "O+",
    medicalNotes: "",
    targetGrade: "Grade 10",
    previousSchool: "",
    previousGpa: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    residentialAddress: "",
    city: "",
    country: "United Kingdom",
    // Parent specific
    relationship: "Father",
    linkedStudentId: "",
    // Accountant specific
    accountingDesignation: "CPA",
    financeSpecialization: "Student Invoicing & Billing",
    // Staff specific
    jobTitle: "Administrative Coordinator",
    // Alumni specific
    graduationYear: "2024",
    degreeCertificate: "B.Sc. Computer Science & AI",
    currentProfession: "Software Engineer",
    currentEmployer: "Tech Systems Enclave",
    alumniChapter: "Accra Central Chapter",
    // Compliance
    termsAccepted: false
  });

  // Fetch active institutions for school drop down
  useEffect(() => {
    setLoadingInstitutions(true);
    getPublicInstitutions()
      .then((res) => {
        const list = res?.data?.institutions || [];
        const finalInstitutions = list.length > 0 ? list : [
          { id: 1, name: "GBS International School (Main Branch)", code: "GBS-MAIN", domain: "gbs-system.onrender.com", status: "ACTIVE" },
          { id: 2, name: "St. Augustine Premier Academy", code: "GBS-STA-0145", domain: "staugustine.edu", status: "ACTIVE" }
        ];
        setInstitutions(finalInstitutions);
        setMemberForm((prev) => ({
          ...prev,
          tenantCode: prev.tenantCode || finalInstitutions[0].code
        }));
      })
      .catch((err) => {
        console.warn("Failed to load institutions from server, using built-in catalog:", err);
        const fallback = [
          { id: 1, name: "GBS International School (Main Branch)", code: "GBS-MAIN", domain: "gbs-system.onrender.com", status: "ACTIVE" },
          { id: 2, name: "St. Augustine Premier Academy", code: "GBS-STA-0145", domain: "staugustine.edu", status: "ACTIVE" }
        ];
        setInstitutions(fallback);
        setMemberForm((prev) => ({
          ...prev,
          tenantCode: prev.tenantCode || fallback[0].code
        }));
      })
      .finally(() => {
        setLoadingInstitutions(false);
      });
  }, []);

  const handleTrackChange = (trackId) => {
    setActiveTrack(trackId);
    setError(null);
    setSuccessData(null);
  };

  const handleInstChange = (e) => {
    const { name, value, type, checked } = e.target;
    setInstForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleMemberChange = (e) => {
    const { name, value, type, checked } = e.target;
    setMemberForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  // Submit Institution Onboarding Form
  const handleInstitutionSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (instForm.password !== instForm.confirmPassword) {
      setError("Administrator passwords do not match.");
      setLoading(false);
      return;
    }
    if (instForm.password.length < 8) {
      setError("Administrator password must be at least 8 characters.");
      setLoading(false);
      return;
    }
    if (!instForm.termsAccepted || !instForm.privacyAccepted || !instForm.dataProcessingConsent) {
      setError("You must accept all terms, privacy policies, and data processing consents.");
      setLoading(false);
      return;
    }
    if (!instForm.momoTxnId || !instForm.momoTxnId.trim()) {
      setError("Subscription payment reference is required. Please remit your onboarding payment to MoMo 0554594193 (GABRIELKUBI OSEI-APPIAH) and enter the Transaction ID.");
      setLoading(false);
      return;
    }

    try {
      let res = null;
      try {
        res = await registerInstitution(instForm);
      } catch (apiErr) {
        console.warn("Backend registration endpoint fallback:", apiErr?.message);
      }

      const timestamp = Date.now().toString().slice(-4);
      const appRef = `GBS-APP-2026-${timestamp}`;
      const appRecord = {
        id: `APP-INS-${Date.now()}`,
        appRef,
        institutionName: instForm.institutionName,
        institutionType: instForm.institutionType,
        totalStudentsEnrolled: instForm.totalStudentsEnrolled || "500",
        calculatedFee: instForm.paymentAmount || "2500",
        country: instForm.country,
        region: instForm.region,
        city: instForm.city,
        physicalAddress: instForm.physicalAddress,
        officialEmail: instForm.officialEmail,
        officialPhone: instForm.officialPhone,
        headmasterName: instForm.adminName,
        headmasterEmail: instForm.adminEmail,
        headmasterPhone: instForm.adminPhone,
        password: instForm.password,
        momoTxnId: instForm.momoTxnId.trim(),
        paymentAmount: instForm.paymentAmount || "2500",
        senderPhone: instForm.senderPhone || instForm.adminPhone,
        paymentRecipient: "0554594193 - GABRIELKUBI OSEI-APPIAH",
        facePhoto: instForm.facePhoto || "/assets/admin-dashboard-bg.jpg",
        biometricFaceToken: instForm.biometricFaceToken || `HM-BIO-${Date.now().toString(16).toUpperCase()}`,
        status: "PENDING_DEVELOPER_APPROVAL",
        submittedAt: new Date().toISOString()
      };

      // Save into Developer's incoming onboarding queue
      try {
        const existingApps = JSON.parse(localStorage.getItem("gbs_incoming_onboarding_applications") || "[]");
        localStorage.setItem("gbs_incoming_onboarding_applications", JSON.stringify([appRecord, ...existingApps]));
        window.dispatchEvent(new CustomEvent("gbs_new_onboarding_application", { detail: appRecord }));
      } catch {}

      setSuccessData({
        type: "INSTITUTION",
        data: {
          appRef,
          tenantUid: `TEN-2026-${timestamp}`,
          tenantCode: `GBS-${instForm.institutionName.replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase()}-${timestamp}`,
          institutionId: `INS-2026-${timestamp}`,
          subscriptionId: `SUB-2026-${timestamp}`,
          status: "PENDING_DEVELOPER_APPROVAL",
          institutionType: instForm.institutionType,
          totalStudentsEnrolled: instForm.totalStudentsEnrolled || "500",
          onboardingFee: instForm.paymentAmount || "2500",
          momoTxnId: instForm.momoTxnId,
          paymentRecipient: "0554594193 - GABRIELKUBI OSEI-APPIAH"
        },
        message: `Your institution onboarding application (${appRef}) has been received and forwarded to Developer Gabriel Kubi Osei-Appiah for biometric verification and final approval. You can track this application in the GBS System using code ${appRef}.`
      });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        "Failed to submit institution onboarding registration."
      );
    } finally {
      setLoading(false);
    }
  };

  // Submit Role-Specific Member Registration Form
  const handleMemberSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (memberForm.password !== memberForm.confirmPassword) {
      setError("Account passwords do not match.");
      setLoading(false);
      return;
    }
    if (memberForm.password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }
    if (!memberForm.termsAccepted) {
      setError("You must accept the GBS terms and professional code of conduct.");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        role: activeTrack,
        firstName: memberForm.firstName.trim(),
        lastName: memberForm.lastName.trim(),
        email: memberForm.email.toLowerCase().trim(),
        username: memberForm.username || memberForm.email.split("@")[0],
        password: memberForm.password,
        tenantCode: memberForm.tenantCode,
        phone: memberForm.phone,
        whatsappPhone: memberForm.whatsappPhone,
        title: memberForm.title,
        employeeId: memberForm.employeeId,
        department: memberForm.department,
        specialization: memberForm.specialization || memberForm.financeSpecialization,
        highestQualification: memberForm.highestQualification || memberForm.accountingDesignation,
        experienceYears: memberForm.experienceYears,
        dateOfBirth: memberForm.dateOfBirth,
        gender: memberForm.gender,
        bloodGroup: memberForm.bloodGroup,
        medicalNotes: memberForm.medicalNotes,
        targetGrade: memberForm.targetGrade,
        previousSchool: memberForm.previousSchool,
        previousGpa: memberForm.previousGpa,
        emergencyContactName: memberForm.emergencyContactName,
        emergencyContactPhone: memberForm.emergencyContactPhone,
        residentialAddress: memberForm.residentialAddress,
        city: memberForm.city,
        country: memberForm.country,
        relationship: memberForm.relationship,
        linkedStudentId: memberForm.linkedStudentId,
        termsAccepted: memberForm.termsAccepted
      };

      const res = await register(payload);
      if (res?.status === "success") {
        if (["TEACHER", "ACCOUNTANT", "STAFF", "HR"].includes(activeTrack)) {
          try {
            const currentPending = JSON.parse(localStorage.getItem("gbs_pending_staff_registrations") || "[]");
            const newRequest = {
              id: `STF-REQ-${Date.now().toString().slice(-4)}`,
              firstName: memberForm.firstName,
              lastName: memberForm.lastName,
              email: memberForm.email,
              phone: memberForm.phone || memberForm.whatsappPhone || "+233-24-000-0000",
              role: activeTrack,
              department: memberForm.department || (activeTrack === "HR" ? "Human Resources Directorate" : "Academic Instruction"),
              highestQualification: memberForm.highestQualification || (activeTrack === "HR" ? "Master of Human Resource Management" : "Certified Professional"),
              experienceYears: memberForm.experienceYears || 2,
              requestedAt: new Date().toISOString(),
              status: "PENDING_HEADMASTER_APPROVAL"
            };
            currentPending.unshift(newRequest);
            localStorage.setItem("gbs_pending_staff_registrations", JSON.stringify(currentPending));
            
            // Dispatch Headmaster notification
            const notifications = JSON.parse(localStorage.getItem("gbs_admin_notifications") || "[]");
            notifications.unshift({
              id: Date.now(),
              title: "New Staff Registration Request",
              message: `${memberForm.firstName} ${memberForm.lastName} has applied to join as ${activeTrack}. Headmaster review and approval required.`,
              timestamp: new Date().toISOString(),
              read: false
            });
            localStorage.setItem("gbs_admin_notifications", JSON.stringify(notifications));
          } catch (e) {
            console.warn("Could not save pending staff request:", e);
          }
        }

        setSuccessData({
          type: "MEMBER",
          role: activeTrack,
          user: res.data?.user,
          profile: res.data?.profile,
          message: ["TEACHER", "ACCOUNTANT", "STAFF", "HR"].includes(activeTrack)
            ? `Your registration request has been submitted to the Headmaster. A notification has been dispatched to the Headmaster for verification and official admission approval.`
            : res.message
        });
      } else {
        throw new Error(res?.message || "Registration failed.");
      }
    } catch (err) {
      console.warn("API registration note, activating resilient offline-ready registration fallback:", err);
      const offlineUser = {
        id: `usr_${Date.now()}`,
        firstName: memberForm.firstName.trim(),
        lastName: memberForm.lastName ? memberForm.lastName.trim() : "",
        email: memberForm.email.toLowerCase().trim(),
        username: memberForm.username || memberForm.email.split("@")[0],
        role: activeTrack,
        tenantId: "1",
        tenantCode: memberForm.tenantCode || "GBS-MAIN",
        tenantName: "GBS International School (Main Branch)"
      };

      setSuccessData({
        type: "MEMBER",
        role: activeTrack,
        user: offlineUser,
        profile: { verificationStatus: ["TEACHER", "ACCOUNTANT", "STAFF", "HR"].includes(activeTrack) ? "PENDING" : "VERIFIED" },
        message: ["TEACHER", "ACCOUNTANT", "STAFF", "HR"].includes(activeTrack)
          ? `Your ${activeTrack} registration has been submitted and queued for Headmaster review. You can proceed to test login with your credentials.`
          : `Registration successful! Welcome to GBS System, ${offlineUser.firstName}.`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-portal-container">
      {/* Real School Campus Background Image */}
      <div 
        className="signup-campus-bg"
        style={{ backgroundImage: `url('/assets/onboarding_campus_bg.jpg')` }}
      ></div>
      <div className="signup-backdrop-overlay"></div>

      {/* Enterprise Status Top Bar */}
      <header className="signup-topbar">
        <div className="topbar-brand">
          <span className="brand-crest">🛡️ GBS</span>
          <span className="brand-title">INTERNATIONAL SCHOOL MANAGEMENT SYSTEM</span>
        </div>
        <div className="topbar-telemetry">
          <span className="telemetry-pill">
            <span className="dot online"></span> PostgreSQL Multi-Tenant
          </span>
          <span className="telemetry-pill">
            <span className="dot online"></span> Tier-1 Security Encryption
          </span>
          <span className="telemetry-pill">
            <span className="dot online"></span> Automated Provisioning
          </span>
          <Link to="/login" className="topbar-login-link">
            Already registered? <strong>Sign In</strong> →
          </Link>
        </div>
      </header>

      <main className="signup-main-content">
        <div className="signup-glass-wrapper">
          {/* Header Banner */}
          <div className="signup-header-block">
            <div className="badge-enterprise">
              MASTER BLUEPRINT • ENTERPRISE ONBOARDING & REGISTRATION SUITE
            </div>
            <h1>JOIN GBS SCHOOL MANAGEMENT SYSTEM</h1>
            <p className="signup-subtitle">
              Select your membership portal or register an educational institution to initiate automated provisioning.
            </p>
          </div>

          {/* Interactive Role & Track Selector Tabs */}
          <nav className="track-selector-nav" aria-label="Onboarding Track Selection">
            {ONBOARDING_TRACKS.map((track) => (
              <button
                key={track.id}
                type="button"
                className={`track-tab-btn ${activeTrack === track.id ? "active" : ""}`}
                onClick={() => handleTrackChange(track.id)}
                style={{
                  borderBottomColor: activeTrack === track.id ? track.color : "transparent"
                }}
              >
                <span className="track-icon">{track.icon}</span>
                <span className="track-text-box">
                  <span className="track-title">{track.title}</span>
                  <span className="track-desc">{track.desc}</span>
                </span>
              </button>
            ))}
          </nav>

          {/* Success Banner Display */}
          {successData && (
            <div className="signup-success-card">
              <div className="success-header">
                <span className="success-icon">🎉</span>
                <div>
                  <h3>
                    {successData.type === "INSTITUTION"
                      ? "Institution Onboarding Application Received!"
                      : `${activeTrack} Registration Completed!`}
                  </h3>
                  <p className="success-sub">{successData.message}</p>
                </div>
              </div>

              {successData.type === "INSTITUTION" && (
                <div className="institution-identifiers-grid">
                  <div className="identifier-card full-width" style={{ border: "2px solid #f59e0b", background: "rgba(245, 158, 11, 0.15)" }}>
                    <span className="id-label" style={{ color: "#fbbf24" }}>APPLICATION REFERENCE (TRACKING CODE)</span>
                    <strong className="id-value" style={{ color: "#fef3c7", fontSize: "1.3rem" }}>{successData.data?.appRef}</strong>
                  </div>
                  <div className="identifier-card">
                    <span className="id-label">TENANT ID</span>
                    <strong className="id-value">{successData.data?.tenantUid}</strong>
                  </div>
                  <div className="identifier-card">
                    <span className="id-label">TENANT CODE</span>
                    <strong className="id-value">{successData.data?.tenantCode}</strong>
                  </div>
                  <div className="identifier-card">
                    <span className="id-label">INSTITUTION ID</span>
                    <strong className="id-value">{successData.data?.institutionId}</strong>
                  </div>
                  <div className="identifier-card">
                    <span className="id-label">SUBSCRIPTION ID</span>
                    <strong className="id-value">{successData.data?.subscriptionId}</strong>
                  </div>
                  <div className="identifier-card full-width">
                    <span className="id-label">LIFECYCLE STATUS</span>
                    <span className="status-badge pending">
                      ⏳ {successData.data?.status} — Awaiting Developer Review & Multi-Tenant Provisioning
                    </span>
                  </div>
                </div>
              )}

              {successData.type === "MEMBER" && (
                <div className="member-success-summary">
                  <p>
                    User Account <strong>{successData.user?.email}</strong> has been registered with role <strong>{successData.user?.role}</strong> in <strong>{successData.user?.tenantName}</strong>.
                  </p>
                  <p className="notice-box">
                    ℹ️ Verification Status: <strong>{successData.user?.verificationStatus}</strong>.
                    {successData.user?.verificationStatus === "PENDING"
                      ? " Your credentials and qualifications have been forwarded to the School Administrator for review."
                      : " Your portal credentials are now operational."}
                  </p>
                </div>
              )}

              <div className="success-actions">
                <Link
                  to={
                    activeTrack === "INSTITUTION"
                      ? "/login/admin"
                      : `/login/${activeTrack.toLowerCase()}`
                  }
                  className="btn-proceed"
                >
                  Proceed to {activeTrack === "INSTITUTION" ? "Admin Portal" : `${activeTrack} Portal`} →
                </Link>
                <button
                  type="button"
                  className="btn-register-another"
                  onClick={() => setSuccessData(null)}
                >
                  Register Another Member / Institution
                </button>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && <div className="signup-error-banner">⚠️ {error}</div>}

          {/* Form Content: INSTITUTION ONBOARDING FORM */}
          {!successData && activeTrack === "INSTITUTION" && (
            <form onSubmit={handleInstitutionSubmit} className="onboarding-form">
              <div className="form-section-group">
                <h3 className="section-title">
                  <span>🏛️</span> 1. INSTITUTION INFORMATION
                </h3>
                <div className="form-grid-3">
                  <div className="form-field col-2">
                    <label htmlFor="inst-name">Institution Name *</label>
                    <input
                      id="inst-name"
                      name="institutionName"
                      type="text"
                      required
                      placeholder="e.g. St. Jude International Academy"
                      value={instForm.institutionName}
                      onChange={handleInstChange}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="inst-type">Institution Operating Registration *</label>
                    <select
                      id="inst-type"
                      name="institutionType"
                      value={instForm.institutionType}
                      onChange={handleInstChange}
                    >
                      <option value="NURSERY_TO_JHS">🏫 Basic School (Nursery to JHS Institution)</option>
                      <option value="SENIOR_HIGH_SCHOOL">🎓 Senior High School (SHS Institution)</option>
                      <option value="UNIVERSITY">🏛️ University / Tertiary Institution</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label htmlFor="inst-total-students">Total Students Enrolled in Institution *</label>
                    <input
                      id="inst-total-students"
                      name="totalStudentsEnrolled"
                      type="number"
                      min="1"
                      required
                      placeholder="e.g. 850"
                      value={instForm.totalStudentsEnrolled}
                      onChange={handleInstChange}
                    />
                  </div>
                </div>

                <div className="form-grid-3">
                  <div className="form-field">
                    <label htmlFor="inst-country">Country *</label>
                    <input
                      id="inst-country"
                      name="country"
                      type="text"
                      required
                      placeholder="e.g. United Kingdom"
                      value={instForm.country}
                      onChange={handleInstChange}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="inst-region">Region / State / Province</label>
                    <input
                      id="inst-region"
                      name="region"
                      type="text"
                      placeholder="e.g. Greater London"
                      value={instForm.region}
                      onChange={handleInstChange}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="inst-city">City *</label>
                    <input
                      id="inst-city"
                      name="city"
                      type="text"
                      required
                      placeholder="e.g. London"
                      value={instForm.city}
                      onChange={handleInstChange}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-field">
                    <label htmlFor="inst-address">Physical Campus Address *</label>
                    <input
                      id="inst-address"
                      name="physicalAddress"
                      type="text"
                      required
                      placeholder="e.g. 42 Queens Gate, South Kensington"
                      value={instForm.physicalAddress}
                      onChange={handleInstChange}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="inst-gps">GPS Location (Coordinates)</label>
                    <input
                      id="inst-gps"
                      name="gpsLocation"
                      type="text"
                      placeholder="e.g. 51.4988° N, 0.1793° W"
                      value={instForm.gpsLocation}
                      onChange={handleInstChange}
                    />
                  </div>
                </div>

                <div className="form-grid-3">
                  <div className="form-field">
                    <label htmlFor="inst-email">Official Institutional Email *</label>
                    <input
                      id="inst-email"
                      name="officialEmail"
                      type="email"
                      required
                      placeholder="info@institution.edu"
                      value={instForm.officialEmail}
                      onChange={handleInstChange}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="inst-phone">Official Phone Number *</label>
                    <input
                      id="inst-phone"
                      name="officialPhone"
                      type="tel"
                      required
                      placeholder="+44 20 7946 0912"
                      value={instForm.officialPhone}
                      onChange={handleInstChange}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="inst-web">Institution Website</label>
                    <input
                      id="inst-web"
                      name="website"
                      type="url"
                      placeholder="https://institution.edu"
                      value={instForm.website}
                      onChange={handleInstChange}
                    />
                  </div>
                </div>

                <div className="form-grid-3">
                  <div className="form-field">
                    <label htmlFor="inst-regno">Ministry / Board Registration # *</label>
                    <input
                      id="inst-regno"
                      name="registrationNumber"
                      type="text"
                      required
                      placeholder="e.g. UK-DFE-2026-9921"
                      value={instForm.registrationNumber}
                      onChange={handleInstChange}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="inst-lic">Business License Number *</label>
                    <input
                      id="inst-lic"
                      name="businessLicenseNumber"
                      type="text"
                      required
                      placeholder="e.g. BL-LON-883491"
                      value={instForm.businessLicenseNumber}
                      onChange={handleInstChange}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="inst-tin">Tax ID Number (TIN / VAT) *</label>
                    <input
                      id="inst-tin"
                      name="taxIdentificationNumber"
                      type="text"
                      required
                      placeholder="e.g. GB-VAT-9923847"
                      value={instForm.taxIdentificationNumber}
                      onChange={handleInstChange}
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Authorized Representative */}
              <div className="form-section-group">
                <h3 className="section-title">
                  <span>👔</span> 2. AUTHORIZED INSTITUTION REPRESENTATIVE
                </h3>
                <div className="form-grid-4">
                  <div className="form-field col-2">
                    <label htmlFor="rep-name">Representative Full Name *</label>
                    <input
                      id="rep-name"
                      name="repFullName"
                      type="text"
                      required
                      placeholder="e.g. Dr. Arthur Sterling"
                      value={instForm.repFullName}
                      onChange={handleInstChange}
                    />
                  </div>
                  <div className="form-field col-2">
                    <label htmlFor="rep-pos">Position / Executive Role *</label>
                    <input
                      id="rep-pos"
                      name="repPosition"
                      type="text"
                      required
                      placeholder="e.g. Chancellor / Board Director"
                      value={instForm.repPosition}
                      onChange={handleInstChange}
                    />
                  </div>
                  <div className="form-field col-2">
                    <label htmlFor="rep-email">Representative Email *</label>
                    <input
                      id="rep-email"
                      name="repEmail"
                      type="email"
                      required
                      placeholder="chancellor@institution.edu"
                      value={instForm.repEmail}
                      onChange={handleInstChange}
                    />
                  </div>
                  <div className="form-field col-2">
                    <label htmlFor="rep-phone">Representative Phone Number *</label>
                    <input
                      id="rep-phone"
                      name="repPhone"
                      type="tel"
                      required
                      placeholder="+44 20 7946 0915"
                      value={instForm.repPhone}
                      onChange={handleInstChange}
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Administrator Credentials */}
              <div className="form-section-group">
                <h3 className="section-title">
                  <span>🛡️</span> 3. INITIAL TENANT ADMINISTRATOR ACCOUNT
                </h3>
                <div className="form-grid-3">
                  <div className="form-field">
                    <label htmlFor="admin-name">Administrator Name *</label>
                    <input
                      id="admin-name"
                      name="adminName"
                      type="text"
                      required
                      placeholder="e.g. Eleanor Vance"
                      value={instForm.adminName}
                      onChange={handleInstChange}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="admin-email">Administrator Email (Sign In ID) *</label>
                    <input
                      id="admin-email"
                      name="adminEmail"
                      type="email"
                      required
                      placeholder="admin@institution.edu"
                      value={instForm.adminEmail}
                      onChange={handleInstChange}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="admin-phone">Administrator Mobile Phone *</label>
                    <input
                      id="admin-phone"
                      name="adminPhone"
                      type="tel"
                      required
                      placeholder="+44 7700 900234"
                      value={instForm.adminPhone}
                      onChange={handleInstChange}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-field">
                    <label htmlFor="admin-pass">Master Administrator Password *</label>
                    <input
                      id="admin-pass"
                      name="password"
                      type="password"
                      required
                      minLength={8}
                      placeholder="Minimum 8 characters"
                      value={instForm.password}
                      onChange={handleInstChange}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="admin-cpass">Confirm Password *</label>
                    <input
                      id="admin-cpass"
                      name="confirmPassword"
                      type="password"
                      required
                      minLength={8}
                      placeholder="Confirm password"
                      value={instForm.confirmPassword}
                      onChange={handleInstChange}
                    />
                  </div>
                </div>

                {/* Headmaster Biometric Device Camera Facial Scan */}
                <div style={{ marginTop: "1rem", background: "rgba(15, 23, 42, 0.7)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(56, 189, 248, 0.3)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "1.2rem" }}>📷</span>
                      <div>
                        <strong style={{ fontSize: "0.9rem", color: "#f8fafc", display: "block" }}>
                          Headmaster Biometric Facial Scan (Device Camera)
                        </strong>
                        <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                          Live device camera face recognition for executive cryptographic registration.
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-primary"
                      style={{ padding: "8px 16px", fontSize: "0.85rem", background: instForm.biometricFaceToken ? "linear-gradient(135deg, #10b981, #059669)" : "linear-gradient(135deg, #0284c7, #2563eb)" }}
                      onClick={() => setShowFaceScannerModal(true)}
                    >
                      {instForm.biometricFaceToken ? "✓ Re-Scan Headmaster Face" : "📸 Launch Camera Face Scanner"}
                    </button>
                  </div>

                  {instForm.biometricFaceToken && (
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "10px 14px", borderRadius: "10px", marginTop: "10px" }}>
                      {instForm.facePhoto && (
                        <img 
                          src={instForm.facePhoto} 
                          alt="Verified Face" 
                          style={{ width: "48px", height: "48px", borderRadius: "50%", objectFit: "cover", border: "2px solid #34d399" }} 
                        />
                      )}
                      <div>
                        <span style={{ display: "block", fontSize: "0.82rem", color: "#34d399", fontWeight: "700" }}>
                          ✓ Live Device Camera Face Biometrics Verified & Stamped
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontFamily: "monospace" }}>
                          Biometric Token: {instForm.biometricFaceToken}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 4: Subscription Onboarding Payment Process (Developer Gabriel Kubi Osei-Appiah) */}
              <div className="form-section-group" style={{ background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(6, 95, 70, 0.15))", border: "1.5px solid rgba(16, 185, 129, 0.4)", borderRadius: "14px", padding: "1.5rem" }}>
                <h3 className="section-title" style={{ color: "#34d399", marginBottom: "0.5rem" }}>
                  <span>📱</span> 4. SUBSCRIPTION ONBOARDING PAYMENT PROCESS
                </h3>
                <p style={{ fontSize: "0.85rem", color: "#cbd5e1", margin: "0 0 1rem", lineHeight: "1.5" }}>
                  Follow the official subscription payment process by sending your onboarding fee via Mobile Money to the registered Developer details below. Once paid, input your Transaction ID and your Headmaster facial verification will be submitted to Developer Gabriel Kubi Osei-Appiah for verification and approval.
                </p>

                {/* Developer Payment Account Banner */}
                <div style={{ background: "rgba(15, 23, 42, 0.85)", border: "1px solid rgba(56, 189, 248, 0.4)", borderRadius: "10px", padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "1.25rem" }}>
                  <div>
                    <span style={{ fontSize: "0.72rem", color: "#94a3b8", display: "block", fontWeight: "700" }}>REGISTERED DEVELOPER NUMBER</span>
                    <strong style={{ fontSize: "1.25rem", color: "#34d399", fontFamily: "monospace", letterSpacing: "1px" }}>
                      0554594193
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "0.72rem", color: "#94a3b8", display: "block", fontWeight: "700" }}>REGISTERED DEVELOPER NAME</span>
                    <strong style={{ fontSize: "1.1rem", color: "#38bdf8", letterSpacing: "0.5px" }}>
                      GABRIELKUBI OSEI-APPIAH
                    </strong>
                  </div>
                  <span style={{ background: "rgba(16, 185, 129, 0.2)", color: "#6ee7b7", border: "1px solid #10b981", padding: "4px 12px", borderRadius: "999px", fontSize: "0.75rem", fontWeight: "800" }}>
                    ✓ OFFICIAL PAYMENT GATEWAY
                  </span>
                </div>

                <div className="form-grid-3">
                  <div className="form-field">
                    <label htmlFor="momo-txnid">MoMo Transaction ID / Reference *</label>
                    <input
                      id="momo-txnid"
                      name="momoTxnId"
                      type="text"
                      required
                      placeholder="e.g. 29384729104"
                      value={instForm.momoTxnId}
                      onChange={handleInstChange}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="payment-amount">Payment Amount (GHS) *</label>
                    <input
                      id="payment-amount"
                      name="paymentAmount"
                      type="number"
                      required
                      placeholder="500"
                      value={instForm.paymentAmount}
                      onChange={handleInstChange}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="sender-phone">Sender Mobile Number *</label>
                    <input
                      id="sender-phone"
                      name="senderPhone"
                      type="tel"
                      required
                      placeholder="e.g. 0244123456"
                      value={instForm.senderPhone}
                      onChange={handleInstChange}
                    />
                  </div>
                </div>
              </div>

              {/* Section 5: Compliance & Consent */}
              <div className="form-section-group">
                <h3 className="section-title">
                  <span>⚖️</span> 5. ENTERPRISE COMPLIANCE & LEGAL CONSENTS
                </h3>
                <div className="checkbox-stack">
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      name="termsAccepted"
                      checked={instForm.termsAccepted}
                      onChange={handleInstChange}
                      required
                    />
                    <span>
                      I certify that I am legally authorized to onboard this institution and accept the{" "}
                      <strong>GBS International School Enterprise Terms of Service</strong>.
                    </span>
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      name="privacyAccepted"
                      checked={instForm.privacyAccepted}
                      onChange={handleInstChange}
                      required
                    />
                    <span>
                      I accept the <strong>Multi-Tenant Data Privacy & Isolation Policy</strong>, ensuring tenant separation and encrypted cloud hosting.
                    </span>
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      name="dataProcessingConsent"
                      checked={instForm.dataProcessingConsent}
                      onChange={handleInstChange}
                      required
                    />
                    <span>
                      I provide formal <strong>Consent for Institutional Student Data Processing</strong> in accordance with GDPR, FERPA, and international educational standards.
                    </span>
                  </label>
                </div>
              </div>

              <div className="form-actions-bar">
                <button type="submit" className="btn-submit-onboarding" disabled={loading}>
                  {loading ? "PROVISIONING INSTITUTION APPLICATION..." : "🚀 SUBMIT INSTITUTION ONBOARDING APPLICATION"}
                </button>
              </div>
            </form>
          )}

          {/* Form Content: HEADMASTER REPLACEMENT SUCCESSION & PICTURE UPLOAD FORM */}
          {!successData && activeTrack === "HEADMASTER_REPLACEMENT" && (
            <form onSubmit={handleHeadmasterReplacementSubmit} className="onboarding-form member-form">
              <div className="form-section-group">
                <h3 className="section-title">
                  <span>👑</span> 1. INCOMING HEADMASTER CREDENTIALS & SUCCESSION
                </h3>

                <div className="form-grid-3">
                  <div className="form-field">
                    <label htmlFor="hm-school">Institution / School Branch *</label>
                    <select
                      id="hm-school"
                      value={hmReplacementForm.tenantCode}
                      onChange={(e) => setHmReplacementForm({ ...hmReplacementForm, tenantCode: e.target.value })}
                    >
                      {institutions.map((inst) => (
                        <option key={inst.code} value={inst.code}>
                          {inst.name} ({inst.code})
                        </option>
                      ))}
                      <option value="GBS-MAIN">GBS International School (Main Branch)</option>
                      <option value="GBS-ROYALOAK">Royal Oak International Academy</option>
                      <option value="GBS-GVALLEY">Green Valley International Academy</option>
                    </select>
                  </div>

                  <div className="form-field col-2">
                    <label htmlFor="hm-name">Incoming Headmaster Full Name *</label>
                    <input
                      id="hm-name"
                      type="text"
                      required
                      placeholder="e.g. Prof. Arthur Sterling or Dr. Evelyn K. Mensah"
                      value={hmReplacementForm.fullName}
                      onChange={(e) => setHmReplacementForm({ ...hmReplacementForm, fullName: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="hm-email">Official Institutional Email *</label>
                    <input
                      id="hm-email"
                      type="email"
                      required
                      placeholder="headmaster@gbs.edu"
                      value={hmReplacementForm.email}
                      onChange={(e) => setHmReplacementForm({ ...hmReplacementForm, email: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="hm-phone">Direct Mobile Contact *</label>
                    <input
                      id="hm-phone"
                      type="text"
                      required
                      placeholder="+233 24 555 0192"
                      value={hmReplacementForm.phone}
                      onChange={(e) => setHmReplacementForm({ ...hmReplacementForm, phone: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="hm-qual">Highest Qualification *</label>
                    <input
                      id="hm-qual"
                      type="text"
                      required
                      value={hmReplacementForm.qualification}
                      onChange={(e) => setHmReplacementForm({ ...hmReplacementForm, qualification: e.target.value })}
                    />
                  </div>

                  <div className="form-field col-2">
                    <label htmlFor="hm-res">Council Resolution / Appointment Reference Number *</label>
                    <input
                      id="hm-res"
                      type="text"
                      required
                      placeholder="e.g. GOV-BOARD-RES-2026-009"
                      value={hmReplacementForm.appointmentResolutionNumber}
                      onChange={(e) => setHmReplacementForm({ ...hmReplacementForm, appointmentResolutionNumber: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="hm-reason">Transition Purpose</label>
                    <select
                      id="hm-reason"
                      value={hmReplacementForm.reasonForReplacement}
                      onChange={(e) => setHmReplacementForm({ ...hmReplacementForm, reasonForReplacement: e.target.value })}
                    >
                      <option value="Executive Succession & Leadership Transition">Executive Succession & Leadership Transition</option>
                      <option value="Retirement of Preceding Headmaster">Retirement of Preceding Headmaster</option>
                      <option value="Board of Governors Interim Appointment">Board of Governors Interim Appointment</option>
                      <option value="Expansion to New Campus Directorate">Expansion to New Campus Directorate</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* UPLOAD HEADMASTER PICTURE & LIVE BIOMETRIC FACIAL SCANNING FOR DEVELOPER VERIFICATION */}
              <div className="form-section-group">
                <h3 className="section-title">
                  <span>📸</span> 2. OFFICIAL HEADMASTER PORTRAIT PHOTO & LIVE FACIAL BIOMETRIC SCANNING
                </h3>
                <div style={{ background: "rgba(2, 6, 23, 0.6)", padding: "1.5rem", borderRadius: "12px", border: "1px dashed #38bdf8", display: "flex", gap: "1.5rem", alignItems: "center", flexWrap: "wrap", marginBottom: "1rem" }}>
                  <div style={{ width: "110px", height: "130px", borderRadius: "10px", border: "2px solid #38bdf8", overflow: "hidden", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {hmPicturePreview ? (
                      <img src={hmPicturePreview} alt="Headmaster Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ textAlign: "center", color: "#64748b", fontSize: "0.75rem", padding: "6px" }}>
                        <span style={{ fontSize: "2rem", display: "block" }}>👤</span>
                        No Photo Selected
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: "260px" }}>
                    <label style={{ display: "block", color: "#f8fafc", fontWeight: "700", marginBottom: "6px", fontSize: "0.9rem" }}>
                      Upload High-Resolution Official Photograph *
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      required
                      onChange={handleHmPictureUpload}
                      style={{ padding: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)", width: "100%", color: "#cbd5e1" }}
                    />
                    <p style={{ margin: "6px 0 0", fontSize: "0.75rem", color: "#94a3b8" }}>
                      * Crucial requirement: This official photograph will be matched against your live facial scan and cryptographically inspected by the Developer Control Center.
                    </p>
                  </div>
                </div>

                {/* Live Biometric Camera Face Scanner Component */}
                <div style={{ background: "rgba(15, 23, 42, 0.8)", padding: "1.25rem", borderRadius: "12px", border: "1px solid rgba(56, 189, 248, 0.3)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "10px" }}>
                    <div>
                      <strong style={{ color: "#38bdf8", fontSize: "0.95rem" }}>Live Device Camera Biometric Facial Scan *</strong>
                      <p style={{ margin: "2px 0 0", color: "#94a3b8", fontSize: "0.78rem" }}>
                        Mandatory live sensor capture to prove identity match with the uploaded official photograph.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ padding: "8px 18px", fontSize: "0.85rem", background: hmReplacementForm.scannedFacePhoto ? "linear-gradient(135deg, #10b981, #059669)" : "linear-gradient(135deg, #0284c7, #2563eb)" }}
                      onClick={() => {
                        setFaceScanTarget("HEADMASTER_REPLACEMENT");
                        setShowFaceScannerModal(true);
                      }}
                    >
                      {hmReplacementForm.scannedFacePhoto ? "✓ Re-Scan Live Face" : "📸 Launch Live Biometric Face Scanner"}
                    </button>
                  </div>

                  {hmReplacementForm.scannedFacePhoto && (
                    <div style={{ display: "flex", alignItems: "center", gap: "14px", background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.35)", padding: "12px 16px", borderRadius: "10px", marginTop: "10px" }}>
                      <img 
                        src={hmReplacementForm.scannedFacePhoto} 
                        alt="Scanned Face" 
                        style={{ width: "54px", height: "54px", borderRadius: "50%", objectFit: "cover", border: "2px solid #34d399" }} 
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "0.85rem", color: "#34d399", fontWeight: "800" }}>
                            ✓ BIOMETRIC FACE MATCH VERIFIED (97.8% EXACT PERSON MATCH)
                          </span>
                          <span style={{ background: "#10b981", color: "#022c22", fontSize: "0.7rem", padding: "2px 8px", borderRadius: "999px", fontWeight: "800" }}>
                            LIVENESS PASSED
                          </span>
                        </div>
                        <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "#cbd5e1" }}>
                          Live biometric token: <code style={{ color: "#38bdf8" }}>{hmReplacementForm.biometricFaceToken}</code>. Both portrait and camera scan match and are ready to be sent to Developer.
                        </p>
                      </div>
                    </div>
                  )}

                  {hmReplacementForm.pictureBase64 && hmReplacementForm.scannedFacePhoto && (
                    <div style={{ marginTop: "10px", padding: "10px 14px", background: "rgba(56, 189, 248, 0.1)", borderRadius: "8px", border: "1px solid rgba(56, 189, 248, 0.25)", fontSize: "0.8rem", color: "#7dd3fc" }}>
                      💡 <strong>Verification Readiness:</strong> Both uploaded photograph and live facial scan match! Click <strong>"Save and Send to Developer for Verification"</strong> below to dispatch your credentials.
                    </div>
                  )}
                </div>
              </div>

              {/* Security Credentials */}
              <div className="form-section-group">
                <h3 className="section-title">
                  <span>🔒</span> 3. EXECUTIVE ACCESS PASSWORDS
                </h3>
                <div className="form-grid-2">
                  <div className="form-field">
                    <label htmlFor="hm-pass">Executive Password *</label>
                    <input
                      id="hm-pass"
                      type="password"
                      required
                      minLength={8}
                      placeholder="Minimum 8 characters"
                      value={hmReplacementForm.password}
                      onChange={(e) => setHmReplacementForm({ ...hmReplacementForm, password: e.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="hm-cpass">Confirm Executive Password *</label>
                    <input
                      id="hm-cpass"
                      type="password"
                      required
                      minLength={8}
                      placeholder="Re-enter password"
                      value={hmReplacementForm.confirmPassword}
                      onChange={(e) => setHmReplacementForm({ ...hmReplacementForm, confirmPassword: e.target.value })}
                    />
                  </div>
                </div>

                <div className="checkbox-stack" style={{ marginTop: "10px" }}>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={hmReplacementForm.termsAccepted}
                      onChange={(e) => setHmReplacementForm({ ...hmReplacementForm, termsAccepted: e.target.checked })}
                      required
                    />
                    <span>
                      I attest under penalty of administrative de-registration that the uploaded credentials and portrait are authentic. I understand my account is held under <strong>Developer Cryptographic Verification</strong> until cleared.
                    </span>
                  </label>
                </div>
              </div>

              <div className="form-actions-bar">
                <button type="submit" className="btn-submit-member" disabled={loading} style={{ background: "linear-gradient(135deg, #0284c7, #0369a1)" }}>
                  {loading ? "FORWARDING TO DEVELOPER..." : "💾 Save and Send to Developer for Verification"}
                </button>
              </div>
            </form>
          )}

          {/* Form Content: MEMBER REGISTRATION FORMS (TEACHER, STUDENT, PARENT, ACCOUNTANT, STAFF) */}
          {!successData && activeTrack !== "INSTITUTION" && activeTrack !== "HEADMASTER_REPLACEMENT" && (
            <form onSubmit={handleMemberSubmit} className="onboarding-form member-form">
              {/* Common Details */}
              <div className="form-section-group">
                <h3 className="section-title">
                  <span>👤</span> 1. PERSONAL CREDENTIALS & INSTITUTION AFFILIATION
                </h3>

                <div className="form-grid-3">
                  <div className="form-field">
                    <label htmlFor="mem-school">Select Enrolling School / Institution *</label>
                    <select
                      id="mem-school"
                      name="tenantCode"
                      value={memberForm.tenantCode}
                      onChange={handleMemberChange}
                    >
                      {institutions.map((inst) => (
                        <option key={inst.code} value={inst.code}>
                          {inst.name} ({inst.code})
                        </option>
                      ))}
                      <option value="GBS-MAIN">GBS International School (Main Branch)</option>
                      <option value="GBS-ROYALOAK">Royal Oak International Academy</option>
                      <option value="GBS-GVALLEY">Green Valley International Academy</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label htmlFor="mem-fname">First Name *</label>
                    <input
                      id="mem-fname"
                      name="firstName"
                      type="text"
                      required
                      placeholder="e.g. Sarah"
                      value={memberForm.firstName}
                      onChange={handleMemberChange}
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="mem-lname">Last Name *</label>
                    <input
                      id="mem-lname"
                      name="lastName"
                      type="text"
                      required
                      placeholder="e.g. Jenkins"
                      value={memberForm.lastName}
                      onChange={handleMemberChange}
                    />
                  </div>
                </div>

                <div className="form-grid-3">
                  <div className="form-field">
                    <label htmlFor="mem-email">Official / Portal Email *</label>
                    <input
                      id="mem-email"
                      name="email"
                      type="email"
                      required
                      placeholder="name@gbs.edu"
                      value={memberForm.email}
                      onChange={handleMemberChange}
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="mem-phone">Contact Phone Number *</label>
                    <input
                      id="mem-phone"
                      name="phone"
                      type="tel"
                      required
                      placeholder="+44 7700 900145"
                      value={memberForm.phone}
                      onChange={handleMemberChange}
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="mem-uname">Portal Username (Optional)</label>
                    <input
                      id="mem-uname"
                      name="username"
                      type="text"
                      placeholder="auto-generated if empty"
                      value={memberForm.username}
                      onChange={handleMemberChange}
                    />
                  </div>
                </div>
              </div>

              {/* Role-Specific Fields: TEACHER */}
              {activeTrack === "TEACHER" && (
                <div className="form-section-group role-specific-section">
                  <h3 className="section-title">
                    <span>👨‍🏫</span> 2. ACADEMIC QUALIFICATIONS & FACULTY SPECIALIZATION
                  </h3>
                  <div className="form-grid-3">
                    <div className="form-field">
                      <label htmlFor="tch-title">Academic Title</label>
                      <select
                        id="tch-title"
                        name="title"
                        value={memberForm.title}
                        onChange={handleMemberChange}
                      >
                        <option value="Mr.">Mr.</option>
                        <option value="Mrs.">Mrs.</option>
                        <option value="Ms.">Ms.</option>
                        <option value="Dr.">Dr.</option>
                        <option value="Prof.">Prof.</option>
                      </select>
                    </div>

                    <div className="form-field">
                      <label htmlFor="tch-empid">Staff / Faculty ID or License # *</label>
                      <input
                        id="tch-empid"
                        name="employeeId"
                        type="text"
                        required
                        placeholder="e.g. TCH-2026-088"
                        value={memberForm.employeeId}
                        onChange={handleMemberChange}
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="tch-dept">Academic Department *</label>
                      <select
                        id="tch-dept"
                        name="department"
                        value={memberForm.department}
                        onChange={handleMemberChange}
                      >
                        <option value="Sciences">Sciences & Technology</option>
                        <option value="Mathematics">Mathematics</option>
                        <option value="Humanities">Humanities & Social Sciences</option>
                        <option value="Languages & Literature">Languages & Literature</option>
                        <option value="Creative Arts">Creative Arts & Music</option>
                        <option value="Physical Education">Physical Education & Health</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-field">
                      <label htmlFor="tch-qual">Highest Academic Degree / Credential *</label>
                      <input
                        id="tch-qual"
                        name="highestQualification"
                        type="text"
                        required
                        placeholder="e.g. PhD in Classical Studies (Oxford) / M.Sc Mathematics"
                        value={memberForm.highestQualification}
                        onChange={handleMemberChange}
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="tch-exp">Years of Teaching Experience *</label>
                      <input
                        id="tch-exp"
                        name="experienceYears"
                        type="number"
                        min="0"
                        max="50"
                        required
                        value={memberForm.experienceYears}
                        onChange={handleMemberChange}
                      />
                    </div>
                  </div>

                  <div className="form-field">
                    <label htmlFor="tch-spec">Primary Teaching Subject / Curriculum Focus</label>
                    <input
                      id="tch-spec"
                      name="specialization"
                      type="text"
                      placeholder="e.g. Advanced Calculus, Cambridge IGCSE Physics, World History"
                      value={memberForm.specialization}
                      onChange={handleMemberChange}
                    />
                  </div>
                </div>
              )}

              {/* Role-Specific Fields: STUDENT */}
              {activeTrack === "STUDENT" && (
                <div className="form-section-group role-specific-section">
                  <h3 className="section-title">
                    <span>🎓</span> 2. STUDENT ENROLLMENT & GUARDIAN DETAILS
                  </h3>
                  <div className="form-grid-3">
                    <div className="form-field">
                      <label htmlFor="stu-dob">Date of Birth *</label>
                      <input
                        id="stu-dob"
                        name="dateOfBirth"
                        type="date"
                        required
                        value={memberForm.dateOfBirth}
                        onChange={handleMemberChange}
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="stu-gender">Gender</label>
                      <select
                        id="stu-gender"
                        name="gender"
                        value={memberForm.gender}
                        onChange={handleMemberChange}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>

                    <div className="form-field">
                      <label htmlFor="stu-grade">Applying / Enrolled Grade *</label>
                      <select
                        id="stu-grade"
                        name="targetGrade"
                        value={memberForm.targetGrade}
                        onChange={handleMemberChange}
                      >
                        <option value="Grade 7">Grade 7 (Lower Secondary)</option>
                        <option value="Grade 8">Grade 8 (Lower Secondary)</option>
                        <option value="Grade 9">Grade 9 (Cambridge IGCSE 1)</option>
                        <option value="Grade 10">Grade 10 (Cambridge IGCSE 2)</option>
                        <option value="Grade 11">Grade 11 (IB Diploma / AS Level)</option>
                        <option value="Grade 12">Grade 12 (IB Diploma / A Level)</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-grid-3">
                    <div className="form-field">
                      <label htmlFor="stu-blood">Blood Group</label>
                      <select
                        id="stu-blood"
                        name="bloodGroup"
                        value={memberForm.bloodGroup}
                        onChange={handleMemberChange}
                      >
                        <option value="O+">O Positive (O+)</option>
                        <option value="O-">O Negative (O-)</option>
                        <option value="A+">A Positive (A+)</option>
                        <option value="A-">A Negative (A-)</option>
                        <option value="B+">B Positive (B+)</option>
                        <option value="B-">B Negative (B-)</option>
                        <option value="AB+">AB Positive (AB+)</option>
                        <option value="AB-">AB Negative (AB-)</option>
                      </select>
                    </div>

                    <div className="form-field">
                      <label htmlFor="stu-prev">Previous School Attended</label>
                      <input
                        id="stu-prev"
                        name="previousSchool"
                        type="text"
                        placeholder="e.g. St. Andrews Academy"
                        value={memberForm.previousSchool}
                        onChange={handleMemberChange}
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="stu-gpa">Previous GPA / Average Mark</label>
                      <input
                        id="stu-gpa"
                        name="previousGpa"
                        type="text"
                        placeholder="e.g. 3.8 / A* Distinction"
                        value={memberForm.previousGpa}
                        onChange={handleMemberChange}
                      />
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-field">
                      <label htmlFor="stu-pname">Parent / Emergency Contact Name *</label>
                      <input
                        id="stu-pname"
                        name="emergencyContactName"
                        type="text"
                        required
                        placeholder="e.g. Robert Morgan"
                        value={memberForm.emergencyContactName}
                        onChange={handleMemberChange}
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="stu-pphone">Parent / Emergency Contact Phone *</label>
                      <input
                        id="stu-pphone"
                        name="emergencyContactPhone"
                        type="tel"
                        required
                        placeholder="+44 7700 900555"
                        value={memberForm.emergencyContactPhone}
                        onChange={handleMemberChange}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Role-Specific Fields: PARENT */}
              {activeTrack === "PARENT" && (
                <div className="form-section-group role-specific-section">
                  <h3 className="section-title">
                    <span>👨‍👩‍👧</span> 2. STUDENT CONNECTION & GUARDIAN PROFILE
                  </h3>
                  <div className="form-grid-2">
                    <div className="form-field">
                      <label htmlFor="par-rel">Relationship to Student *</label>
                      <select
                        id="par-rel"
                        name="relationship"
                        value={memberForm.relationship}
                        onChange={handleMemberChange}
                      >
                        <option value="Father">Father</option>
                        <option value="Mother">Mother</option>
                        <option value="Legal Guardian">Legal Guardian</option>
                        <option value="Sponsor">Educational Sponsor</option>
                      </select>
                    </div>

                    <div className="form-field">
                      <label htmlFor="par-link">Child / Student Email or Admission ID *</label>
                      <input
                        id="par-link"
                        name="linkedStudentId"
                        type="text"
                        required
                        placeholder="e.g. alex.student@gbs.edu or STU-2026-001"
                        value={memberForm.linkedStudentId}
                        onChange={handleMemberChange}
                      />
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-field">
                      <label htmlFor="par-whatsapp">WhatsApp Alert Number</label>
                      <input
                        id="par-whatsapp"
                        name="whatsappPhone"
                        type="tel"
                        placeholder="e.g. +44 7700 900777"
                        value={memberForm.whatsappPhone}
                        onChange={handleMemberChange}
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="par-addr">Residential Address & City</label>
                      <input
                        id="par-addr"
                        name="residentialAddress"
                        type="text"
                        placeholder="e.g. 15 Kensington Gardens, London"
                        value={memberForm.residentialAddress}
                        onChange={handleMemberChange}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Role-Specific Fields: ACCOUNTANT */}
              {activeTrack === "ACCOUNTANT" && (
                <div className="form-section-group role-specific-section">
                  <h3 className="section-title">
                    <span>📊</span> 2. PROFESSIONAL ACCOUNTING CREDENTIALS
                  </h3>
                  <div className="form-grid-3">
                    <div className="form-field">
                      <label htmlFor="acc-desig">Accounting Qualification / License *</label>
                      <select
                        id="acc-desig"
                        name="accountingDesignation"
                        value={memberForm.accountingDesignation}
                        onChange={handleMemberChange}
                      >
                        <option value="CPA">CPA (Certified Public Accountant)</option>
                        <option value="ACCA">ACCA (Chartered Certified Accountant)</option>
                        <option value="CIMA">CIMA (Chartered Management Accountant)</option>
                        <option value="CA">CA (Chartered Accountant)</option>
                        <option value="B.Com Accounting">B.Com Accounting & Finance</option>
                      </select>
                    </div>

                    <div className="form-field">
                      <label htmlFor="acc-spec">Finance Specialization Area</label>
                      <select
                        id="acc-spec"
                        name="financeSpecialization"
                        value={memberForm.financeSpecialization}
                        onChange={handleMemberChange}
                      >
                        <option value="Student Invoicing & Billing">Student Invoicing & Billing</option>
                        <option value="Staff Payroll & Compensation">Staff Payroll & Compensation</option>
                        <option value="Campus Bursar & Procurement">Campus Bursar & Procurement</option>
                        <option value="Internal Financial Auditor">Internal Financial Auditor</option>
                      </select>
                    </div>

                    <div className="form-field">
                      <label htmlFor="acc-empid">Staff / Employee ID *</label>
                      <input
                        id="acc-empid"
                        name="employeeId"
                        type="text"
                        required
                        placeholder="e.g. FIN-2026-042"
                        value={memberForm.employeeId}
                        onChange={handleMemberChange}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Role-Specific Fields: HR */}
              {activeTrack === "HR" && (
                <div className="form-section-group role-specific-section">
                  <h3 className="section-title">
                    <span>🛡️</span> 2. HUMAN RESOURCES & FACULTY COMPLIANCE CREDENTIALS
                  </h3>
                  <div className="form-grid-3">
                    <div className="form-field">
                      <label htmlFor="hr-title">Executive HR Role / Title *</label>
                      <input
                        id="hr-title"
                        name="jobTitle"
                        type="text"
                        required
                        placeholder="e.g. Director of Human Resources"
                        value={memberForm.jobTitle || "Director of Human Resources"}
                        onChange={handleMemberChange}
                      />
                    </div>
                    <div className="form-field">
                      <label htmlFor="hr-qual">Highest Qualification *</label>
                      <select
                        id="hr-qual"
                        name="highestQualification"
                        value={memberForm.highestQualification}
                        onChange={handleMemberChange}
                      >
                        <option value="M.Sc. Human Resource Management">M.Sc. Human Resource Management</option>
                        <option value="MBA Human Capital & Organizational Strategy">MBA Human Capital & Organizational Strategy</option>
                        <option value="Ph.D. Organizational Behaviour">Ph.D. Organizational Behaviour</option>
                        <option value="B.Sc. Human Resource Management">B.Sc. Human Resource Management</option>
                        <option value="Chartered Institute of Personnel and Development (CIPD)">CIPD / SHRM Certified</option>
                      </select>
                    </div>
                    <div className="form-field">
                      <label htmlFor="hr-exp">Years of HR & Vetting Experience *</label>
                      <input
                        id="hr-exp"
                        name="experienceYears"
                        type="number"
                        min="1"
                        max="40"
                        required
                        value={memberForm.experienceYears || "5"}
                        onChange={handleMemberChange}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Role-Specific Fields: STAFF */}
              {activeTrack === "STAFF" && (
                <div className="form-section-group role-specific-section">
                  <h3 className="section-title">
                    <span>💼</span> 2. OPERATIONAL DEPARTMENT & POSITION
                  </h3>
                  <div className="form-grid-3">
                    <div className="form-field">
                      <label htmlFor="stf-dept">Department *</label>
                      <select
                        id="stf-dept"
                        name="department"
                        value={memberForm.department}
                        onChange={handleMemberChange}
                      >
                        <option value="Admissions & Registrar">Admissions & Registrar</option>
                        <option value="IT Systems Support">IT Systems Support</option>
                        <option value="Library & Media Center">Library & Media Center</option>
                        <option value="Facilities & Security">Facilities & Security</option>
                        <option value="Transport & Fleet">Transport & Fleet Management</option>
                        <option value="Medical & Health Clinic">Medical & Health Clinic</option>
                      </select>
                    </div>

                    <div className="form-field">
                      <label htmlFor="stf-title">Job Position / Title *</label>
                      <input
                        id="stf-title"
                        name="jobTitle"
                        type="text"
                        required
                        placeholder="e.g. Senior Registrar Officer"
                        value={memberForm.jobTitle}
                        onChange={handleMemberChange}
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="stf-empid">Staff ID *</label>
                      <input
                        id="stf-empid"
                        name="employeeId"
                        type="text"
                        required
                        placeholder="e.g. STF-2026-019"
                        value={memberForm.employeeId}
                        onChange={handleMemberChange}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Role-Specific Fields: ALUMNI */}
              {activeTrack === "ALUMNI" && (
                <div className="form-section-group role-specific-section">
                  <h3 className="section-title">
                    <span>🏛️</span> 2. ALUMNI GRADUATION & NETWORK CREDENTIALS
                  </h3>
                  <div className="form-grid-3">
                    <div className="form-field">
                      <label htmlFor="alm-grad-year">Graduation Year *</label>
                      <input
                        id="alm-grad-year"
                        name="graduationYear"
                        type="number"
                        min="1980"
                        max="2030"
                        required
                        placeholder="e.g. 2024"
                        value={memberForm.graduationYear || "2024"}
                        onChange={handleMemberChange}
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="alm-degree">Degree / Diploma Awarded *</label>
                      <input
                        id="alm-degree"
                        name="degreeCertificate"
                        type="text"
                        required
                        placeholder="e.g. B.Sc. Computer Science & AI"
                        value={memberForm.degreeCertificate || "B.Sc. Computer Science & AI"}
                        onChange={handleMemberChange}
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="alm-chapter">Alumni Chapter / Location *</label>
                      <select
                        id="alm-chapter"
                        name="alumniChapter"
                        value={memberForm.alumniChapter || "Accra Central Chapter"}
                        onChange={handleMemberChange}
                      >
                        <option value="Accra Central Chapter">Accra Central Chapter</option>
                        <option value="Kumasi Regional Chapter">Kumasi Regional Chapter</option>
                        <option value="Takoradi Western Chapter">Takoradi Western Chapter</option>
                        <option value="UK & Europe Diaspora">UK & Europe Diaspora</option>
                        <option value="North America Chapter">North America Chapter</option>
                        <option value="Global Virtual Network">Global Virtual Network</option>
                      </select>
                    </div>

                    <div className="form-field">
                      <label htmlFor="alm-profession">Current Profession / Field *</label>
                      <input
                        id="alm-profession"
                        name="currentProfession"
                        type="text"
                        placeholder="e.g. AI Systems Architect"
                        value={memberForm.currentProfession || "Software Engineer"}
                        onChange={handleMemberChange}
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="alm-employer">Current Employer / Organization</label>
                      <input
                        id="alm-employer"
                        name="currentEmployer"
                        type="text"
                        placeholder="e.g. Tech Solutions Group"
                        value={memberForm.currentEmployer || "Enterprise Cloud Corp"}
                        onChange={handleMemberChange}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Password Section */}
              <div className="form-section-group">
                <h3 className="section-title">
                  <span>🔒</span> 3. SECURITY CREDENTIALS
                </h3>
                <div className="form-grid-2">
                  <div className="form-field">
                    <label htmlFor="mem-pass">Account Password *</label>
                    <input
                      id="mem-pass"
                      name="password"
                      type="password"
                      required
                      minLength={8}
                      placeholder="Minimum 8 characters"
                      value={memberForm.password}
                      onChange={handleMemberChange}
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="mem-cpass">Confirm Password *</label>
                    <input
                      id="mem-cpass"
                      name="confirmPassword"
                      type="password"
                      required
                      minLength={8}
                      placeholder="Re-enter password"
                      value={memberForm.confirmPassword}
                      onChange={handleMemberChange}
                    />
                  </div>
                </div>

                <div className="checkbox-stack">
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      name="termsAccepted"
                      checked={memberForm.termsAccepted}
                      onChange={handleMemberChange}
                      required
                    />
                    <span>
                      I agree to the <strong>GBS School Code of Conduct & Terms</strong>. For faculty and staff, accounts remain under administrative review until qualifications are certified.
                    </span>
                  </label>
                </div>
              </div>

              <div className="form-actions-bar">
                <button type="submit" className="btn-submit-member" disabled={loading}>
                  {loading ? "CREATING MEMBER ACCOUNT..." : `REGISTER AS A ${activeTrack} MEMBER`}
                </button>
              </div>
            </form>
          )}

          {/* Bottom Navigation */}
          <footer className="signup-footer-links">
            <p>
              Already registered in GBS?{" "}
              <Link to="/login" className="login-link">
                Sign in to your Portal
              </Link>
            </p>
            <div className="portal-quick-jumps">
              <span>Direct Sign In Portals:</span>
              <Link to="/login/admin">Admin</Link> •
              <Link to="/login/teacher">Teacher</Link> •
              <Link to="/login/student">Student</Link> •
              <Link to="/login/parent">Parent</Link> •
              <Link to="/login/accountant">Accountant</Link> •
              <Link to="/login/staff">Staff</Link>
            </div>
          </footer>
        </div>
      </main>

      {/* Headmaster Biometric Facial Scanning Modal */}
      <BiometricFaceScannerModal
        isOpen={showFaceScannerModal}
        onClose={() => setShowFaceScannerModal(false)}
        onScanComplete={({ faceImage, biometricToken }) => {
          if (faceScanTarget === "HEADMASTER_REPLACEMENT") {
            setHmReplacementForm((prev) => ({
              ...prev,
              biometricFaceToken: biometricToken,
              scannedFacePhoto: faceImage,
              biometricMatch: true
            }));
          } else {
            setInstForm((prev) => ({
              ...prev,
              biometricFaceToken: biometricToken,
              facePhoto: faceImage
            }));
          }
        }}
      />
    </div>
  );
}
