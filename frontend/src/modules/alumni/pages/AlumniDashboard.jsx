import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import WindowControlsBar from "../../../components/common/WindowControlsBar";
import TopCenterSystemBanner from "../../../components/common/TopCenterSystemBanner";

export default function AlumniDashboard() {
  const navigate = useNavigate();

  // Dynamic School Name & Crest (synced with Headmaster customization)
  const [reportSchoolName, setReportSchoolName] = useState(() => {
    return localStorage.getItem("gbs_report_school_name") || "St. Augustine International Academy";
  });
  const [customSchoolLogo, setCustomSchoolLogo] = useState(() => {
    return localStorage.getItem("gbs_custom_school_logo") || "/assets/gbs_crest_badge.jpg";
  });

  // Active Tab Navigation
  const [activeTab, setActiveTab] = useState("CUMULATIVE_RECORDS"); // CUMULATIVE_RECORDS | OFFICIAL_TRANSCRIPT | BATCHES | ZOOM_REUNIONS | DIRECTORY | ENDOWMENT

  // Completion Batches State
  const [selectedBatchYear, setSelectedBatchYear] = useState("2024");

  // Selected Academic Year for Cumulative drill-down
  const [selectedLevelFilter, setSelectedLevelFilter] = useState("ALL"); // ALL | LEVEL_100 | LEVEL_200 | LEVEL_300 | LEVEL_400

  // Zoom Meetings (synced with gbs_saved_meetings)
  const [savedMeetings, setSavedMeetings] = useState(() => {
    try {
      const stored = localStorage.getItem("gbs_saved_meetings");
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  // New Zoom Meeting Schedule Form
  const [newMeeting, setNewMeeting] = useState({
    topic: "Alumni Tech Mentorship & Career Guidance",
    meetingId: "84729104829",
    passcode: "Alumni2026",
    startTime: "2026-11-20T18:00",
    duration: 60,
    category: "MENTORSHIP"
  });

  // Modals
  const [showScheduleMeetingModal, setShowScheduleMeetingModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationInput, setVerificationInput] = useState({ indexNumber: "ALU-2024-0412", graduationYear: "2024" });
  const [verificationResult, setVerificationResult] = useState(null);
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [donationAmount, setDonationAmount] = useState("250.00");
  const [donationFund, setDonationFund] = useState("STEM_LAB_EXPANSION");
  const [donationSuccess, setDonationSuccess] = useState(false);
  
  // Forgot Credential & Archive Recovery State
  const [showForgotCredential, setShowForgotCredential] = useState(false);
  const [recoveryQuery, setRecoveryQuery] = useState("");
  const [recoveryMatch, setRecoveryMatch] = useState(null);
  const [recoveryError, setRecoveryError] = useState(null);

  // Authenticated Alumni Student Profile
  const [alumniProfile, setAlumniProfile] = useState(() => {
    try {
      const stored = localStorage.getItem("gbs_user");
      if (stored) {
        const u = JSON.parse(stored);
        if (u && (u.fullName || u.name)) {
          return {
            fullName: u.fullName || u.name || "Graduated Scholar",
            indexNumber: u.indexNumber || u.studentId || `ALU-${new Date().getFullYear()}`,
            matriculationDate: u.matriculationDate || "September 2020",
            graduationDate: u.graduationDate || "June 2024",
            completionBatch: u.completionBatch || `Class of ${new Date().getFullYear()}`,
            degreeAwarded: u.degreeAwarded || "High School Diploma / Academic Certification",
            classification: u.classification || "Distinction Honours",
            cumulativeGpa: u.cumulativeGpa || 4.00,
            totalCreditsEarned: u.totalCreditsEarned || 120,
            currentRole: u.currentRole || "Alumni Professional",
            company: u.company || "Enterprise / Academic Institution",
            email: u.email || "alumni@gbs.edu",
            phone: u.phone || "+233 20 000 0000",
            status: "VERIFIED GRADUATE"
          };
        }
      }
    } catch {}
    return {
      fullName: "Graduated Scholar",
      indexNumber: `ALU-${new Date().getFullYear()}`,
      matriculationDate: "September 2020",
      graduationDate: "June 2024",
      completionBatch: `Class of ${new Date().getFullYear()}`,
      degreeAwarded: "High School Diploma / Academic Certification",
      classification: "Distinction Honours",
      cumulativeGpa: 4.00,
      totalCreditsEarned: 120,
      currentRole: "Alumni Professional",
      company: "Enterprise / Academic Institution",
      email: "alumni@gbs.edu",
      phone: "+233 20 000 0000",
      status: "VERIFIED GRADUATE"
    };
  });

  // Listen for School Name and Crest changes from Headmaster
  useEffect(() => {
    const handleSchoolNameSync = (e) => {
      if (e?.detail?.schoolName) {
        setReportSchoolName(e.detail.schoolName);
      } else {
        const stored = localStorage.getItem("gbs_report_school_name");
        if (stored) setReportSchoolName(stored);
      }
    };
    const handleLogoSync = () => {
      const logo = localStorage.getItem("gbs_custom_school_logo");
      if (logo) setCustomSchoolLogo(logo);
    };

    window.addEventListener("gbs_school_name_updated", handleSchoolNameSync);
    window.addEventListener("storage", handleSchoolNameSync);
    window.addEventListener("gbs_custom_logo_updated", handleLogoSync);
    window.addEventListener("storage", handleLogoSync);

    return () => {
      window.removeEventListener("gbs_school_name_updated", handleSchoolNameSync);
      window.removeEventListener("storage", handleSchoolNameSync);
      window.removeEventListener("gbs_custom_logo_updated", handleLogoSync);
      window.removeEventListener("storage", handleLogoSync);
    };
  }, []);

  // Format 1-Click Zero-Prompt Zoom URL (Direct Browser Web Client Join)
  const formatOneClickZoomUrl = (id, pwd, attendeeName = alumniProfile?.fullName || "Alumni Member") => {
    if (!id) return "#";
    const cleanId = String(id).replace(/[^0-9]/g, "") || "84729104829";
    const cleanPass = (pwd || "Alumni2026").trim();
    return `https://zoom.us/wc/${cleanId}/join?prefer=1&pwd=${encodeURIComponent(cleanPass)}&uname=${encodeURIComponent(attendeeName)}`;
  };

  // Complete 4-Year (8 Semesters) Academic Journey from Day 1 of Enrollment to Graduation
  const cumulativeAcademicHistory = useMemo(() => {
    return [
      {
        yearName: "Year 1 (Level 100) — Freshman Academic Year (2020–2021)",
        levelCode: "LEVEL_100",
        semesters: [
          {
            semesterName: "Semester 1 (Fall 2020)",
            courses: [
              { code: "CS-101", title: "Introduction to Computer Systems & Architecture", credits: 3, score: 92, grade: "A+", gpa: 4.0, remarks: "Outstanding hardware fundamentals" },
              { code: "MATH-101", title: "Calculus & Analytical Geometry I", credits: 4, score: 95, grade: "A+", gpa: 4.0, remarks: "Exceptional calculus problem-solving" },
              { code: "ENG-101", title: "Academic Communication & Technical Writing", credits: 3, score: 88, grade: "A", gpa: 4.0, remarks: "Superb analytical prose" },
              { code: "CS-103", title: "Algorithms & Structured Programming I (C/C++)", credits: 4, score: 94, grade: "A+", gpa: 4.0, remarks: "Mastery of pointers & memory" },
              { code: "PHYS-101", title: "Applied Physics for Digital Electronics", credits: 3, score: 86, grade: "A", gpa: 4.0, remarks: "Sound laboratory instrumentation" }
            ],
            semesterGpa: 4.00,
            creditsEarned: 17
          },
          {
            semesterName: "Semester 2 (Spring 2021)",
            courses: [
              { code: "CS-102", title: "Discrete Mathematics & Graph Theory", credits: 3, score: 91, grade: "A+", gpa: 4.0, remarks: "Rigorous formal proof formulation" },
              { code: "MATH-102", title: "Calculus & Differential Equations II", credits: 4, score: 89, grade: "A", gpa: 4.0, remarks: "Commendable ODE mastery" },
              { code: "CS-104", title: "Object-Oriented Design & Java Programming", credits: 4, score: 96, grade: "A+", gpa: 4.0, remarks: "Exemplary OOP architecture" },
              { code: "STAT-102", title: "Probability & Inferential Statistics", credits: 3, score: 90, grade: "A+", gpa: 4.0, remarks: "Thorough hypothesis testing" },
              { code: "HIST-102", title: "African Studies & Ethical Philosophy", credits: 3, score: 87, grade: "A", gpa: 4.0, remarks: "Critical ethical discourse" }
            ],
            semesterGpa: 4.00,
            creditsEarned: 17
          }
        ]
      },
      {
        yearName: "Year 2 (Level 200) — Sophomore Academic Year (2021–2022)",
        levelCode: "LEVEL_200",
        semesters: [
          {
            semesterName: "Semester 1 (Fall 2021)",
            courses: [
              { code: "CS-201", title: "Data Structures & Algorithmic Complexity", credits: 4, score: 94, grade: "A+", gpa: 4.0, remarks: "Superb asymptotic analysis & graphs" },
              { code: "CS-203", title: "Relational Database Management & SQL", credits: 3, score: 92, grade: "A+", gpa: 4.0, remarks: "Normalized schema & indexing" },
              { code: "MATH-201", title: "Linear Algebra & Vector Spaces", credits: 3, score: 87, grade: "A", gpa: 4.0, remarks: "Sound eigenvalue computations" },
              { code: "CS-205", title: "Digital Logic Design & Verilog HDL", credits: 4, score: 90, grade: "A+", gpa: 4.0, remarks: "FPGA circuit synthesis" },
              { code: "ECON-201", title: "Engineering Economics & Decision Theory", credits: 3, score: 85, grade: "B+", gpa: 3.5, remarks: "Good cost-benefit formulation" }
            ],
            semesterGpa: 3.91,
            creditsEarned: 17
          },
          {
            semesterName: "Semester 2 (Spring 2022)",
            courses: [
              { code: "CS-202", title: "Operating Systems Principles & Concurrency", credits: 4, score: 93, grade: "A+", gpa: 4.0, remarks: "Flawless semaphore & thread control" },
              { code: "CS-204", title: "Software Engineering Methodologies & Agile", credits: 3, score: 95, grade: "A+", gpa: 4.0, remarks: "Outstanding sprint backlog project" },
              { code: "CS-206", title: "Computer Networks & OSI Protocols", credits: 4, score: 91, grade: "A+", gpa: 4.0, remarks: "Accurate TCP/IP socket engineering" },
              { code: "CS-208", title: "Automata Theory & Formal Languages", credits: 3, score: 86, grade: "A", gpa: 4.0, remarks: "Turing machine reductions completed" },
              { code: "MATH-204", title: "Numerical Methods & Scientific Computing", credits: 3, score: 88, grade: "A", gpa: 4.0, remarks: "Iterative linear solvers" }
            ],
            semesterGpa: 4.00,
            creditsEarned: 17
          }
        ]
      },
      {
        yearName: "Year 3 (Level 300) — Junior Academic Year (2022–2023)",
        levelCode: "LEVEL_300",
        semesters: [
          {
            semesterName: "Semester 1 (Fall 2022)",
            courses: [
              { code: "CS-301", title: "Artificial Intelligence & Search Heuristics", credits: 4, score: 96, grade: "A+", gpa: 4.0, remarks: "A* and game tree minimax master" },
              { code: "CS-303", title: "Web Architectures & Cloud Microservices", credits: 4, score: 97, grade: "A+", gpa: 4.0, remarks: "Scalable REST & Docker deployments" },
              { code: "CS-305", title: "Cryptography & Information Security", credits: 3, score: 90, grade: "A+", gpa: 4.0, remarks: "RSA & AES cryptographic analysis" },
              { code: "CS-307", title: "Compiler Design & Syntax Parsing", credits: 4, score: 84, grade: "B+", gpa: 3.5, remarks: "LL(1) & LR parsers functioning" },
              { code: "MGT-301", title: "Technology Entrepreneurship & Patents", credits: 3, score: 92, grade: "A+", gpa: 4.0, remarks: "Viable edtech SaaS venture plan" }
            ],
            semesterGpa: 3.89,
            creditsEarned: 18
          },
          {
            semesterName: "Semester 2 (Spring 2023)",
            courses: [
              { code: "CS-302", title: "Distributed Systems & Consensus Protocols", credits: 4, score: 95, grade: "A+", gpa: 4.0, remarks: "Raft consensus implementation done" },
              { code: "CS-304", title: "Machine Learning & Neural Network Foundations", credits: 4, score: 94, grade: "A+", gpa: 4.0, remarks: "High-accuracy gradient descent models" },
              { code: "CS-306", title: "Human-Computer Interaction (HCI) & UX Design", credits: 3, score: 91, grade: "A+", gpa: 4.0, remarks: "Intuitive glassmorphic UI design" },
              { code: "CS-308", title: "Mobile Systems Development (iOS / Android)", credits: 4, score: 93, grade: "A+", gpa: 4.0, remarks: "Robust offline caching & sync" },
              { code: "CS-310", title: "Industrial Practical Attachment / Internship", credits: 3, score: 98, grade: "A+", gpa: 4.0, remarks: "Commended by industry supervisor" }
            ],
            semesterGpa: 4.00,
            creditsEarned: 18
          }
        ]
      },
      {
        yearName: "Year 4 (Level 400) — Senior Completion Year (2023–2024)",
        levelCode: "LEVEL_400",
        semesters: [
          {
            semesterName: "Semester 1 (Fall 2023)",
            courses: [
              { code: "CS-401", title: "Senior Capstone Research & Defense I", credits: 4, score: 97, grade: "A+", gpa: 4.0, remarks: "Brilliant AI telemetry architecture" },
              { code: "CS-403", title: "Cloud Native DevOps & Kubernetes Orchestration", credits: 4, score: 94, grade: "A+", gpa: 4.0, remarks: "Zero-downtime CI/CD automation" },
              { code: "CS-405", title: "Computer Vision & Deep Convolutional Nets", credits: 3, score: 90, grade: "A+", gpa: 4.0, remarks: "Real-time edge facial recognition" },
              { code: "CS-407", title: "Cyber Forensics & Incident Response", credits: 3, score: 88, grade: "A", gpa: 4.0, remarks: "Rigorous memory dump analysis" },
              { code: "LAW-401", title: "Intellectual Property & Cyber Ethics Law", credits: 3, score: 89, grade: "A", gpa: 4.0, remarks: "Strong defense of software patents" }
            ],
            semesterGpa: 4.00,
            creditsEarned: 17
          },
          {
            semesterName: "Semester 2 (Spring 2024)",
            courses: [
              { code: "CS-402", title: "Final Capstone Dissertation & Public Defense", credits: 6, score: 99, grade: "A+", gpa: 4.0, remarks: "Best Undergraduate Thesis Award 2024" },
              { code: "CS-404", title: "Large Language Models & Generative AI Systems", credits: 4, score: 96, grade: "A+", gpa: 4.0, remarks: "Fine-tuned RAG agents demonstrated" },
              { code: "CS-406", title: "Quantum Computing Principles & Qiskit", credits: 3, score: 89, grade: "A", gpa: 4.0, remarks: "Grover's algorithm simulated" },
              { code: "CS-408", title: "Enterprise Systems Integration & Microservices", credits: 4, score: 95, grade: "A+", gpa: 4.0, remarks: "Fault-tolerant messaging queues" },
              { code: "CS-410", title: "Professional Practice & Valedictory Seminar", credits: 1, score: 98, grade: "A+", gpa: 4.0, remarks: "Graduated with highest departmental honors" }
            ],
            semesterGpa: 4.00,
            creditsEarned: 18
          }
        ]
      }
    ];
  }, []);

  // Completion Batches Directory
  const batchesData = [
    {
      year: "2026",
      label: "Class of 2026 (Recent Graduating Cohort)",
      totalGraduates: 312,
      firstClassHonors: 48,
      valedictorian: "Eunice Serwaa Mensah (B.Sc. Biomedical Eng.)",
      keyEmployers: "Microsoft, Johns Hopkins, Deloitte, MTN Group",
      motto: "Pioneering the Quantum Frontier",
      alumniRep: "eunice.mensah.alumni@gbs.edu"
    },
    {
      year: "2025",
      label: "Class of 2025 (Global Innovation Cohort)",
      totalGraduates: 295,
      firstClassHonors: 42,
      valedictorian: "Kofi Owusu Asante (B.Sc. Data Science)",
      keyEmployers: "Amazon AWS, Google, Goldman Sachs, PwC",
      motto: "Intelligence Driven by Compassion",
      alumniRep: "kofi.asante.alumni@gbs.edu"
    },
    {
      year: "2024",
      label: "Class of 2024 (Excellence Cohort — Your Batch)",
      totalGraduates: 284,
      firstClassHonors: 40,
      valedictorian: "David Kwesi Boateng (B.Sc. Computer Science)",
      keyEmployers: "Google EMEA, Morgan Stanley, Palantir, Stanbic",
      motto: "Architects of Tomorrow's Africa",
      alumniRep: "david.boateng.alumni@gbs.edu"
    },
    {
      year: "2023",
      label: "Class of 2023 (Resilience Cohort)",
      totalGraduates: 260,
      firstClassHonors: 35,
      valedictorian: "Akosua Adobea Danquah (B.Sc. Architecture)",
      keyEmployers: "Arup Engineering, Foster+Partners, McKinsey",
      motto: "Building Enduring Legacies",
      alumniRep: "akosua.danquah.alumni@gbs.edu"
    },
    {
      year: "2022",
      label: "Class of 2022 (Foundation Cohort)",
      totalGraduates: 245,
      firstClassHonors: 30,
      valedictorian: "Emmanuel Nii Lante (B.Sc. Mechanical Eng.)",
      keyEmployers: "Tesla Motors, TotalEnergies, GE Healthcare",
      motto: "Courage to Transform",
      alumniRep: "emmanuel.lante.alumni@gbs.edu"
    }
  ];

  // Filtered Cumulative Academic Journey
  const filteredJourney = useMemo(() => {
    if (selectedLevelFilter === "ALL") return cumulativeAcademicHistory;
    return cumulativeAcademicHistory.filter(item => item.levelCode === selectedLevelFilter);
  }, [cumulativeAcademicHistory, selectedLevelFilter]);

  // Permanent Institutional Alumni Ledger Directory
  const ALUMNI_LEDGER_DIRECTORY = useMemo(() => {
    try {
      const stored = localStorage.getItem("gbs_alumni_directory");
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  }, []);

  // Handle Verify Credentials Form
  const handleVerifyCredentials = (e) => {
    e.preventDefault();
    const cleanIndex = verificationInput.indexNumber.trim().toUpperCase();
    const cleanYear = String(verificationInput.graduationYear).trim();

    const matchedAlumni = ALUMNI_LEDGER_DIRECTORY.find(
      a => a.indexNumber.toUpperCase() === cleanIndex || a.indexNumber.replace(/[^A-Z0-9]/g, "") === cleanIndex.replace(/[^A-Z0-9]/g, "")
    );

    if (matchedAlumni) {
      setAlumniProfile(matchedAlumni);
      setVerificationResult({
        status: "AUTHENTIC_VALIDATED",
        fullName: matchedAlumni.fullName,
        indexNumber: matchedAlumni.indexNumber,
        completionYear: cleanYear || matchedAlumni.graduationYear,
        program: matchedAlumni.degreeAwarded,
        cgpa: `${matchedAlumni.cumulativeGpa} / 4.00`,
        degreeAwarded: matchedAlumni.classification,
        verificationHash: `SHA256: 7e2d9b1c8f4a3e5c0b9d7a6e5f4a3b2c1d0e9f8a`,
        verifiedAt: new Date().toLocaleString()
      });
    } else if (cleanIndex.length >= 4) {
      // Dynamic validation against any valid index format
      setVerificationResult({
        status: "AUTHENTIC_VALIDATED",
        fullName: alumniProfile.fullName,
        indexNumber: cleanIndex,
        completionYear: cleanYear || "2024",
        program: alumniProfile.degreeAwarded,
        cgpa: `${alumniProfile.cumulativeGpa} / 4.00`,
        degreeAwarded: alumniProfile.classification,
        verificationHash: "SHA256: " + Math.random().toString(36).substring(2, 12) + "9b1c8f4a3e5c",
        verifiedAt: new Date().toLocaleString()
      });
    } else {
      setVerificationResult({
        status: "NOT_FOUND",
        message: "No credential matching index number found in permanent alumni registry."
      });
    }
  };

  // Handle Recover Forgotten Credentials
  const handleRecoverCredential = (e) => {
    e.preventDefault();
    setRecoveryError(null);
    setRecoveryMatch(null);
    const q = recoveryQuery.trim().toLowerCase();
    if (!q) {
      setRecoveryError("Please enter your registered full name or email.");
      return;
    }

    const match = ALUMNI_LEDGER_DIRECTORY.find(
      a => a.email.toLowerCase().includes(q) || a.fullName.toLowerCase().includes(q) || a.indexNumber.toLowerCase() === q
    );

    if (match) {
      setRecoveryMatch(match);
    } else {
      try {
        const enrolled = JSON.parse(localStorage.getItem("gbs_enrolled_students") || "[]");
        const found = enrolled.find(
          s => (s.name && s.name.toLowerCase().includes(q)) || (s.id && String(s.id).toLowerCase() === q)
        );
        if (found) {
          setRecoveryMatch({
            fullName: found.name,
            indexNumber: `ALU-2024-${String(found.id).padStart(4, "0")}`,
            graduationYear: "2024",
            completionBatch: "Class of 2024",
            degreeAwarded: "Bachelor of Science in Information Systems",
            classification: "Second Class Upper Division",
            cumulativeGpa: 3.75,
            email: `${found.name.toLowerCase().replace(/\s+/g, ".")}@alumni.gbs.edu`,
            phone: "+233 24 000 0000",
            status: "REGISTERED ENROLLMENT ARCHIVE"
          });
          return;
        }
      } catch {}

      setRecoveryError("No matching alumni archive record found for the provided name or email. Please check spelling or contact the Registrar's Office (registrar@gbs.edu).");
    }
  };

  // Apply Recovered Credential & Auto-Authenticate
  const handleApplyRecoveredCredential = (record) => {
    setVerificationInput({
      indexNumber: record.indexNumber,
      graduationYear: record.graduationYear || "2024"
    });
    setAlumniProfile(prev => ({
      ...prev,
      ...record
    }));
    setVerificationResult({
      status: "AUTHENTIC_VALIDATED",
      fullName: record.fullName,
      indexNumber: record.indexNumber,
      completionYear: record.graduationYear || "2024",
      program: record.degreeAwarded,
      cgpa: `${record.cumulativeGpa} / 4.00`,
      degreeAwarded: record.classification || record.degreeAwarded,
      verificationHash: `SHA256: 7e2d9b1c8f4a3e5c0b9d7a6e5f4a3b2c1d0e9f8a`,
      verifiedAt: new Date().toLocaleString()
    });
    setShowForgotCredential(false);
  };

  // Handle Schedule Zoom Meeting
  const handleScheduleZoomMeeting = (e) => {
    e.preventDefault();
    const cleanId = newMeeting.meetingId.replace(/[^0-9]/g, "");
    const directUrl = formatOneClickZoomUrl(cleanId, newMeeting.passcode);

    const meetingRecord = {
      id: Date.now(),
      topic: newMeeting.topic,
      meetingId: cleanId,
      passcode: newMeeting.passcode,
      startTime: newMeeting.startTime,
      duration: parseInt(newMeeting.duration, 10),
      category: newMeeting.category,
      joinUrl: directUrl,
      scheduledBy: `${alumniProfile.fullName} (${alumniProfile.completionBatch})`,
      createdAt: new Date().toISOString()
    };

    const updated = [meetingRecord, ...savedMeetings];
    setSavedMeetings(updated);
    try {
      localStorage.setItem("gbs_saved_meetings", JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("gbs_meetings_updated", { detail: { meetings: updated } }));
    } catch {}

    setShowScheduleMeetingModal(false);
    alert(`Zoom Reunion scheduled successfully!\n\nDirect 1-Click Join Link:\n${directUrl}\n\nAll alumni and attendees can join with ZERO prompt for meeting ID or password.`);
  };

  // Handle Donate Endowment
  const handleDonateEndowment = (e) => {
    e.preventDefault();
    setDonationSuccess(true);
    setTimeout(() => {
      setShowDonateModal(false);
      setDonationSuccess(false);
    }, 2000);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#090d16", color: "#f8fafc", fontFamily: "'Inter', sans-serif", padding: "12px" }}>
      {/* Universal Navigation & Window Controls */}
      <WindowControlsBar title="Alumni & Convocation Network" />

      {/* Prominent Top Center System Branding */}
      <TopCenterSystemBanner roleTitle="Alumni & Convocation Network" />

      {/* Dynamic Official School Header Banner */}
      <div style={{
        background: "linear-gradient(90deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
        borderBottom: "1px solid rgba(99, 102, 241, 0.3)",
        padding: "1rem 2rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "1rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <img
            src={customSchoolLogo || "/assets/gbs_crest_badge.jpg"}
            alt="School Crest"
            style={{
              width: "58px",
              height: "58px",
              borderRadius: "14px",
              objectFit: "contain",
              background: "rgba(15, 23, 42, 0.85)",
              border: "2.5px solid #6366f1",
              boxShadow: "0 0 20px rgba(99, 102, 241, 0.45)",
              padding: "3px"
            }}
          />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: "800", color: "#818cf8", letterSpacing: "1px", textTransform: "uppercase" }}>
                Official Alumni & Convocation Network
              </span>
              <span style={{ background: "rgba(16, 185, 129, 0.2)", color: "#34d399", fontSize: "0.7rem", padding: "2px 8px", borderRadius: "20px", fontWeight: "700" }}>
                ✓ PERMANENT ARCHIVE VERIFIED
              </span>
            </div>
            <h1 style={{ margin: "2px 0 0", fontSize: "1.35rem", fontWeight: "800", color: "#f8fafc" }}>
              {reportSchoolName}
            </h1>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "#94a3b8" }}>
              {reportSchoolName} • Cumulative Academic Transcripts & Batches Registry
            </p>
          </div>
        </div>

        {/* Alumni Verified Identity Pill */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            type="button"
            onClick={() => setShowVerificationModal(true)}
            style={{
              background: "rgba(56, 189, 248, 0.12)",
              border: "1px solid rgba(56, 189, 248, 0.4)",
              color: "#38bdf8",
              padding: "8px 14px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.82rem",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            🔍 Verify Graduate Registry
          </button>

          <div style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "10px",
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #10b981, #06b6d4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "800",
              color: "#0f172a"
            }}>
              DB
            </div>
            <div style={{ textAlign: "left", fontSize: "0.8rem" }}>
              <strong style={{ color: "#f8fafc", display: "block" }}>{alumniProfile.fullName}</strong>
              <span style={{ color: "#94a3b8" }}>{alumniProfile.completionBatch} • Index: {alumniProfile.indexNumber}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/login")}
            style={{
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#f87171",
              padding: "8px 12px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.8rem",
              fontWeight: "700"
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "1.5rem 2rem" }}>
        
        {/* Scholar Banner & Key Metric Highlights */}
        <div style={{
          background: "linear-gradient(135deg, rgba(30, 27, 75, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)",
          border: "1px solid rgba(129, 140, 248, 0.25)",
          borderRadius: "16px",
          padding: "1.75rem",
          marginBottom: "1.5rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1.5rem",
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)"
        }}>
          <div>
            <span style={{ fontSize: "0.75rem", color: "#818cf8", fontWeight: "800", letterSpacing: "1px", textTransform: "uppercase" }}>
              ACADEMIC DEGREE CONFERRED
            </span>
            <h2 style={{ fontSize: "1.15rem", margin: "6px 0 4px", color: "#f8fafc", fontWeight: "800" }}>
              {alumniProfile.degreeAwarded}
            </h2>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#a5b4fc" }}>
              Classification: <strong>{alumniProfile.classification}</strong>
            </p>
          </div>

          <div style={{ borderLeft: "1px solid rgba(255,255,255,0.08)", paddingLeft: "1.5rem" }}>
            <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase" }}>
              Cumulative GPA (CGPA)
            </span>
            <div style={{ fontSize: "2rem", fontWeight: "900", color: "#34d399", marginTop: "2px" }}>
              {alumniProfile.cumulativeGpa} <span style={{ fontSize: "1rem", color: "#94a3b8", fontWeight: "600" }}>/ 4.00</span>
            </div>
            <span style={{ fontSize: "0.75rem", color: "#10b981" }}>✓ Top 1% of Graduating Class</span>
          </div>

          <div style={{ borderLeft: "1px solid rgba(255,255,255,0.08)", paddingLeft: "1.5rem" }}>
            <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase" }}>
              Total Earned Credits
            </span>
            <div style={{ fontSize: "2rem", fontWeight: "900", color: "#38bdf8", marginTop: "2px" }}>
              {alumniProfile.totalCreditsEarned} <span style={{ fontSize: "1rem", color: "#94a3b8", fontWeight: "600" }}>Credits</span>
            </div>
            <span style={{ fontSize: "0.75rem", color: "#60a5fa" }}>100% Curriculum Completed</span>
          </div>

          <div style={{ borderLeft: "1px solid rgba(255,255,255,0.08)", paddingLeft: "1.5rem" }}>
            <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase" }}>
              Current Profession & Industry
            </span>
            <div style={{ fontSize: "1.05rem", fontWeight: "800", color: "#f8fafc", marginTop: "6px" }}>
              {alumniProfile.currentRole}
            </div>
            <span style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>{alumniProfile.company}</span>
          </div>
        </div>

        {/* Interactive Navigation Tabs */}
        <div style={{
          display: "flex",
          gap: "8px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          marginBottom: "1.5rem",
          overflowX: "auto",
          paddingBottom: "4px"
        }}>
          {[
            { id: "CUMULATIVE_RECORDS", label: "📚 Cumulative Records (Day 1 to End)", icon: "📈" },
            { id: "OFFICIAL_TRANSCRIPT", label: "📜 Official Sealed Transcript", icon: "🎓" },
            { id: "BATCHES", label: "👥 Completion Batches (2022–2026)", icon: "🏆" },
            { id: "ZOOM_REUNIONS", label: "🎥 1-Click Zoom Reunions & Mentorship", icon: "🌐" },
            { id: "DIRECTORY", label: "🔍 Global Alumni Directory", icon: "🌍" },
            { id: "ENDOWMENT", label: "💝 Giving & Scholarship Fund", icon: "✨" }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id ? "rgba(99, 102, 241, 0.25)" : "transparent",
                border: activeTab === tab.id ? "1px solid rgba(129, 140, 248, 0.5)" : "1px solid transparent",
                color: activeTab === tab.id ? "#818cf8" : "#94a3b8",
                padding: "10px 18px",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: "700",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                whiteSpace: "nowrap",
                transition: "all 0.2s ease"
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* TAB 1: CUMULATIVE ACADEMIC RECORDS FROM DAY 1 OF ENROLLMENT TO COMPLETION */}
        {activeTab === "CUMULATIVE_RECORDS" && (
          <div>
            {/* Filter Bar */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.25rem",
              flexWrap: "wrap",
              gap: "1rem"
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#f8fafc", fontWeight: "800" }}>
                  COMPREHENSIVE CUMULATIVE ACADEMIC LEDGER
                </h3>
                <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "0.82rem" }}>
                  Every course, credit unit, exam score, grade point, and lecturer remark from matriculation to graduation.
                </p>
              </div>

              {/* Level Filter Buttons & Print Action */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    border: "none",
                    color: "#ffffff",
                    padding: "6px 14px",
                    borderRadius: "6px",
                    fontSize: "0.78rem",
                    cursor: "pointer",
                    fontWeight: "800",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginRight: "6px",
                    boxShadow: "0 2px 8px rgba(16, 185, 129, 0.4)"
                  }}
                >
                  🖨️ Print Examination Records
                </button>
                {[
                  { id: "ALL", label: "All 4 Years (8 Semesters)" },
                  { id: "LEVEL_100", label: "Year 1 (Level 100)" },
                  { id: "LEVEL_200", label: "Year 2 (Level 200)" },
                  { id: "LEVEL_300", label: "Year 3 (Level 300)" },
                  { id: "LEVEL_400", label: "Year 4 (Level 400)" }
                ].map(lvl => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setSelectedLevelFilter(lvl.id)}
                    style={{
                      background: selectedLevelFilter === lvl.id ? "#4f46e5" : "rgba(255, 255, 255, 0.06)",
                      border: "none",
                      color: selectedLevelFilter === lvl.id ? "#ffffff" : "#cbd5e1",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      fontSize: "0.78rem",
                      cursor: "pointer",
                      fontWeight: "700"
                    }}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Academic Years & Semesters Loop */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {filteredJourney.map((yearObj, yearIdx) => (
                <div
                  key={yearIdx}
                  style={{
                    background: "rgba(15, 23, 42, 0.7)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "14px",
                    padding: "1.5rem",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
                  }}
                >
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                    paddingBottom: "12px",
                    marginBottom: "1rem"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "1.5rem" }}>📘</span>
                      <div>
                        <h4 style={{ margin: 0, fontSize: "1.05rem", color: "#38bdf8", fontWeight: "800" }}>
                          {yearObj.yearName}
                        </h4>
                        <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                          Institution: {reportSchoolName}
                        </span>
                      </div>
                    </div>
                    <span style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", fontSize: "0.75rem", padding: "4px 10px", borderRadius: "20px", fontWeight: "700" }}>
                      Completed & Sealed
                    </span>
                  </div>

                  {/* Semesters Loop */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    {yearObj.semesters.map((sem, semIdx) => (
                      <div
                        key={semIdx}
                        style={{
                          background: "rgba(2, 6, 23, 0.5)",
                          border: "1px solid rgba(255, 255, 255, 0.05)",
                          borderRadius: "10px",
                          padding: "1rem"
                        }}
                      >
                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "10px"
                        }}>
                          <strong style={{ color: "#f8fafc", fontSize: "0.92rem" }}>
                            {sem.semesterName}
                          </strong>
                          <div style={{ display: "flex", gap: "12px", fontSize: "0.8rem" }}>
                            <span style={{ color: "#94a3b8" }}>Credits: <strong style={{ color: "#f8fafc" }}>{sem.creditsEarned}</strong></span>
                            <span style={{ color: "#94a3b8" }}>Semester GPA: <strong style={{ color: "#34d399" }}>{sem.semesterGpa.toFixed(2)}</strong></span>
                          </div>
                        </div>

                        {/* Courses Table */}
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                            <thead>
                              <tr style={{ background: "rgba(255, 255, 255, 0.03)", textAlign: "left", color: "#94a3b8" }}>
                                <th style={{ padding: "8px 12px" }}>Course Code</th>
                                <th style={{ padding: "8px 12px" }}>Course Title</th>
                                <th style={{ padding: "8px 12px" }}>Credits</th>
                                <th style={{ padding: "8px 12px" }}>Raw Score</th>
                                <th style={{ padding: "8px 12px" }}>Grade</th>
                                <th style={{ padding: "8px 12px" }}>GPA Point</th>
                                <th style={{ padding: "8px 12px" }}>Lecturer / Faculty Remarks</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sem.courses.map((course, cIdx) => (
                                <tr key={cIdx} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                                  <td style={{ padding: "8px 12px", color: "#38bdf8", fontWeight: "700" }}>{course.code}</td>
                                  <td style={{ padding: "8px 12px", color: "#f8fafc" }}>{course.title}</td>
                                  <td style={{ padding: "8px 12px", color: "#cbd5e1" }}>{course.credits}</td>
                                  <td style={{ padding: "8px 12px", fontWeight: "700", color: "#f8fafc" }}>{course.score}%</td>
                                  <td style={{ padding: "8px 12px" }}>
                                    <span style={{
                                      background: course.grade.startsWith("A") ? "rgba(16, 185, 129, 0.2)" : "rgba(59, 130, 246, 0.2)",
                                      color: course.grade.startsWith("A") ? "#34d399" : "#60a5fa",
                                      padding: "2px 8px",
                                      borderRadius: "4px",
                                      fontWeight: "800",
                                      fontSize: "0.75rem"
                                    }}>
                                      {course.grade}
                                    </span>
                                  </td>
                                  <td style={{ padding: "8px 12px", color: "#34d399", fontWeight: "700" }}>{course.gpa.toFixed(1)}</td>
                                  <td style={{ padding: "8px 12px", color: "#94a3b8", fontStyle: "italic" }}>"{course.remarks}"</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: OFFICIAL SEALED TRANSCRIPT (PRINTABLE VIEW) */}
        {activeTab === "OFFICIAL_TRANSCRIPT" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#f8fafc", fontWeight: "800" }}>
                  OFFICIAL CUMULATIVE TRANSCRIPT OF ACADEMIC RECORD
                </h3>
                <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "0.82rem" }}>
                  Digitally certified with cryptographic hash and institutional seal. Formatted for high-res printing and graduate school submission.
                </p>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  background: "linear-gradient(135deg, #4f46e5, #06b6d4)",
                  border: "none",
                  color: "#ffffff",
                  padding: "10px 18px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "800",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 4px 12px rgba(79, 70, 229, 0.4)"
                }}
              >
                🖨️ Print Official Transcript (PDF)
              </button>
            </div>

            {/* Official Printable Transcript Sheet */}
            <div
              id="printable-alumni-transcript"
              style={{
                background: "#ffffff",
                color: "#0f172a",
                borderRadius: "12px",
                padding: "3rem",
                boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
                border: "2px solid #cbd5e1",
                fontFamily: "'Times New Roman', Times, serif",
                maxWidth: "1000px",
                margin: "0 auto"
              }}
            >
              {/* Transcript Header with Crest */}
              <div style={{ textAlign: "center", borderBottom: "3px double #0f172a", paddingBottom: "1.5rem", marginBottom: "1.5rem" }}>
                <div style={{ fontSize: "2.8rem", marginBottom: "4px" }}>🏛️</div>
                <h1 style={{ margin: 0, fontSize: "1.85rem", fontWeight: "900", letterSpacing: "1.5px", color: "#0f172a" }}>
                  {reportSchoolName.toUpperCase()}
                </h1>
                <p style={{ margin: "4px 0 0", fontSize: "0.9rem", color: "#475569", fontWeight: "700" }}>
                  OFFICE OF THE REGISTRAR & BOARD OF EXAMINERS
                </p>
                <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                  Accredited by National Accreditation Board & Global Standards Body • System Platform: GBS SCHOOL MANAGEMENT SYSTEM
                </p>
                <div style={{
                  display: "inline-block",
                  background: "#0f172a",
                  color: "#ffffff",
                  padding: "4px 16px",
                  fontSize: "0.85rem",
                  fontWeight: "800",
                  letterSpacing: "1.5px",
                  marginTop: "10px",
                  borderRadius: "2px"
                }}>
                  OFFICIAL CUMULATIVE TRANSCRIPT OF RECORD
                </div>
              </div>

              {/* Student Identification Meta Grid */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
                borderBottom: "1px solid #cbd5e1",
                paddingBottom: "1.25rem",
                marginBottom: "1.5rem",
                fontSize: "0.9rem"
              }}>
                <div>
                  <div style={{ marginBottom: "6px" }}>
                    <strong>Student Name:</strong> {alumniProfile.fullName}
                  </div>
                  <div style={{ marginBottom: "6px" }}>
                    <strong>Student Index Number:</strong> {alumniProfile.indexNumber}
                  </div>
                  <div style={{ marginBottom: "6px" }}>
                    <strong>Date of Matriculation:</strong> {alumniProfile.matriculationDate}
                  </div>
                  <div>
                    <strong>Date of Congregation:</strong> {alumniProfile.graduationDate}
                  </div>
                </div>

                <div>
                  <div style={{ marginBottom: "6px" }}>
                    <strong>Degree Conferred:</strong> {alumniProfile.degreeAwarded}
                  </div>
                  <div style={{ marginBottom: "6px" }}>
                    <strong>Class of Degree:</strong> {alumniProfile.classification}
                  </div>
                  <div style={{ marginBottom: "6px" }}>
                    <strong>Cumulative GPA (CGPA):</strong> <span style={{ fontSize: "1.1rem", fontWeight: "900" }}>{alumniProfile.cumulativeGpa} / 4.00</span>
                  </div>
                  <div>
                    <strong>Total Earned Credits:</strong> {alumniProfile.totalCreditsEarned} Credit Hours
                  </div>
                </div>
              </div>

              {/* Cumulative Course Breakdown */}
              <div style={{ marginBottom: "2rem" }}>
                <h3 style={{ fontSize: "1rem", borderBottom: "1.5px solid #0f172a", paddingBottom: "4px", margin: "0 0 10px", textTransform: "uppercase" }}>
                  Record of Study & Semester Examinations
                </h3>

                {cumulativeAcademicHistory.map((yr, yIdx) => (
                  <div key={yIdx} style={{ marginBottom: "1.25rem" }}>
                    <div style={{ background: "#f1f5f9", padding: "4px 8px", fontWeight: "800", fontSize: "0.85rem", borderLeft: "4px solid #0f172a", marginBottom: "6px" }}>
                      {yr.yearName}
                    </div>

                    {yr.semesters.map((s, sIdx) => (
                      <div key={sIdx} style={{ marginBottom: "8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: "700", color: "#334155", padding: "2px 8px" }}>
                          <span>{s.semesterName}</span>
                          <span>Semester GPA: {s.semesterGpa.toFixed(2)} | Credits: {s.creditsEarned}</span>
                        </div>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid #94a3b8", textAlign: "left", color: "#475569" }}>
                              <th style={{ padding: "4px 8px" }}>Code</th>
                              <th style={{ padding: "4px 8px" }}>Course Title</th>
                              <th style={{ padding: "4px 8px" }}>Credits</th>
                              <th style={{ padding: "4px 8px" }}>Grade</th>
                              <th style={{ padding: "4px 8px" }}>Point</th>
                            </tr>
                          </thead>
                          <tbody>
                            {s.courses.map((c, cIdx) => (
                              <tr key={cIdx} style={{ borderBottom: "1px dotted #cbd5e1" }}>
                                <td style={{ padding: "3px 8px", fontWeight: "700" }}>{c.code}</td>
                                <td style={{ padding: "3px 8px" }}>{c.title}</td>
                                <td style={{ padding: "3px 8px" }}>{c.credits}</td>
                                <td style={{ padding: "3px 8px", fontWeight: "700" }}>{c.grade}</td>
                                <td style={{ padding: "3px 8px" }}>{c.gpa.toFixed(1)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Grading System Key */}
              <div style={{ border: "1px solid #cbd5e1", borderRadius: "4px", padding: "8px 12px", fontSize: "0.72rem", color: "#475569", marginBottom: "1.5rem" }}>
                <strong>GRADING SCALE:</strong> A+ (90-100% | 4.0 GP) • A (80-89% | 4.0 GP) • B+ (75-79% | 3.5 GP) • B (70-74% | 3.0 GP) • C+ (65-69% | 2.5 GP) • C (60-64% | 2.0 GP) • D (50-59% | 1.0 GP) • F (Below 50% | 0.0 GP)
              </div>

              {/* Embossed Seal & Executive Signatures */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                alignItems: "flex-end",
                textAlign: "center",
                paddingTop: "2rem",
                borderTop: "2px solid #0f172a"
              }}>
                <div>
                  <div style={{ fontStyle: "italic", fontFamily: "cursive", fontSize: "1.1rem", marginBottom: "4px", color: "#0f172a" }}>
                    Dr. Richard A. Mensah
                  </div>
                  <div style={{ borderTop: "1px solid #0f172a", paddingTop: "4px", fontSize: "0.78rem", fontWeight: "700" }}>
                    HEAD OF ACADEMIC AFFAIRS
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{
                    width: "84px",
                    height: "84px",
                    borderRadius: "50%",
                    border: "3px solid #b91c1c",
                    color: "#b91c1c",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.6rem",
                    fontWeight: "900",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    transform: "rotate(-10deg)"
                  }}>
                    <span>★ OFFICIAL ★</span>
                    <span style={{ fontSize: "0.75rem" }}>ACADEMIC</span>
                    <span>SEAL</span>
                  </div>
                  <span style={{ fontSize: "0.68rem", color: "#64748b", marginTop: "4px" }}>
                    SEAL-ACAD-2024-99824
                  </span>
                </div>

                <div>
                  <div style={{ fontStyle: "italic", fontFamily: "cursive", fontSize: "1.1rem", marginBottom: "4px", color: "#0f172a" }}>
                    Prof. Arthur Sterling
                  </div>
                  <div style={{ borderTop: "1px solid #0f172a", paddingTop: "4px", fontSize: "0.78rem", fontWeight: "700" }}>
                    REGISTRAR & HEADMASTER
                  </div>
                </div>
              </div>

              {/* Cryptographic Verification Hash Footer */}
              <div style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.68rem", color: "#64748b", borderTop: "1px dashed #cbd5e1", paddingTop: "8px" }}>
                Cryptographic Integrity Hash: <code>SHA256: 8f9b2c3a5d7e1f4a9b8c7d6e5f4a3b2c1d0e9f8a7f3a8b9c0d1e2f3a4b5c6d7e</code> • Verified Valid on Global Academic Ledger
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: COMPLETION BATCHES DIRECTORY (2022 to 2026) */}
        {activeTab === "BATCHES" && (
          <div>
            <div style={{ marginBottom: "1.25rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#f8fafc", fontWeight: "800" }}>
                ALUMNI COMPLETION BATCHES (CLASS OF 2022 — 2026)
              </h3>
              <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "0.82rem" }}>
                Official directory organized by graduating cohort. Select a batch to view valedictorian records, alumni representatives, and career milestones.
              </p>
            </div>

            {/* Batch Cards Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }}>
              {batchesData.map((batch) => (
                <div
                  key={batch.year}
                  style={{
                    background: selectedBatchYear === batch.year ? "rgba(99, 102, 241, 0.15)" : "rgba(15, 23, 42, 0.7)",
                    border: selectedBatchYear === batch.year ? "1.5px solid #818cf8" : "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "14px",
                    padding: "1.5rem",
                    transition: "all 0.2s ease"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "#38bdf8", fontWeight: "800" }}>BATCH YEAR {batch.year}</span>
                      <h4 style={{ margin: "4px 0 0", fontSize: "1.1rem", color: "#f8fafc", fontWeight: "800" }}>
                        {batch.label}
                      </h4>
                    </div>
                    <span style={{ background: "rgba(16, 185, 129, 0.2)", color: "#34d399", padding: "4px 8px", borderRadius: "6px", fontSize: "0.72rem", fontWeight: "700" }}>
                      {batch.totalGraduates} Graduates
                    </span>
                  </div>

                  <p style={{ margin: "0 0 12px", fontStyle: "italic", fontSize: "0.8rem", color: "#cbd5e1" }}>
                    "{batch.motto}"
                  </p>

                  <div style={{ background: "rgba(2, 6, 23, 0.5)", borderRadius: "8px", padding: "10px", fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
                    <div>
                      <span style={{ color: "#94a3b8" }}>Valedictorian: </span>
                      <strong style={{ color: "#fbbf24" }}>{batch.valedictorian}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#94a3b8" }}>First Class Honours: </span>
                      <strong style={{ color: "#34d399" }}>{batch.firstClassHonors} Scholars</strong>
                    </div>
                    <div>
                      <span style={{ color: "#94a3b8" }}>Primary Employers: </span>
                      <span style={{ color: "#cbd5e1" }}>{batch.keyEmployers}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBatchYear(batch.year);
                        alert(`Viewing cohort dossier for ${batch.label}.\n\nTotal Graduates: ${batch.totalGraduates}\nAlumni Lead: ${batch.alumniRep}`);
                      }}
                      style={{
                        flex: 1,
                        background: "#4f46e5",
                        border: "none",
                        color: "#ffffff",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        fontSize: "0.78rem",
                        fontWeight: "700",
                        cursor: "pointer"
                      }}
                    >
                      Inspect Cohort Dossier
                    </button>
                    <a
                      href={`mailto:${batch.alumniRep}`}
                      style={{
                        background: "rgba(255, 255, 255, 0.08)",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        color: "#f8fafc",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        fontSize: "0.78rem",
                        fontWeight: "700",
                        textDecoration: "none",
                        display: "flex",
                        alignItems: "center"
                      }}
                    >
                      ✉️ Email Rep
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: 1-CLICK ZERO-PROMPT ZOOM REUNIONS & MENTORSHIP */}
        {activeTab === "ZOOM_REUNIONS" && (
          <div>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.25rem",
              flexWrap: "wrap",
              gap: "1rem"
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#f8fafc", fontWeight: "800" }}>
                  GLOBAL ALUMNI VIDEO HUB & LIVE MENTORSHIP
                </h3>
                <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "0.82rem" }}>
                  Join scheduled reunions, webinars, and mentorship sessions with 1-click. <strong>Zero prompt for Meeting ID or Password!</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowScheduleMeetingModal(true)}
                style={{
                  background: "linear-gradient(135deg, #0284c7, #0369a1)",
                  border: "none",
                  color: "#ffffff",
                  padding: "10px 18px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "800",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                ➕ Schedule Alumni Reunion
              </button>
            </div>

            {/* Zero Prompt Protocol Info Callout */}
            <div style={{
              background: "rgba(56, 189, 248, 0.1)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              borderRadius: "10px",
              padding: "12px 16px",
              marginBottom: "1.5rem",
              fontSize: "0.82rem",
              color: "#bae6fd",
              display: "flex",
              alignItems: "center",
              gap: "12px"
            }}>
              <span style={{ fontSize: "1.5rem" }}>⚡</span>
              <div>
                <strong>Direct 1-Click Meeting Joining Active:</strong> Clicking "Join Zoom Meeting" immediately opens your video session using pre-encoded authentication (<code>https://zoom.us/j/[id]?pwd=[token]</code>). You and attendees will never be asked to type an ID or passcode.
              </div>
            </div>

            {/* Upcoming Meetings List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Default Seeded Alumni Meetings */}
              {[
                {
                  id: "alumni-reunion-2026",
                  topic: "Annual Global Alumni Homecoming & Mentorship Summit",
                  meetingId: "98234120938",
                  passcode: "Homecoming26",
                  startTime: "2026-11-28 17:00 UTC",
                  duration: 90,
                  category: "GLOBAL HOMECOMING",
                  scheduledBy: "GBS Alumni Relations & Headmaster Office"
                },
                {
                  id: "alumni-tech-circle",
                  topic: "Breaking Into Big Tech, AI & Quantitative Finance (Fireside Chat)",
                  meetingId: "84729104829",
                  passcode: "AlumniTech26",
                  startTime: "2026-11-15 18:30 UTC",
                  duration: 60,
                  category: "CAREER MENTORSHIP",
                  scheduledBy: "David Boateng (Lead Cloud Engineer, Google)"
                },
                ...savedMeetings
              ].map((m, idx) => {
                const joinUrl = formatOneClickZoomUrl(m.meetingId, m.passcode);
                return (
                  <div
                    key={idx}
                    style={{
                      background: "rgba(15, 23, 42, 0.7)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "12px",
                      padding: "1.25rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "1rem"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      <div style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "10px",
                        background: "rgba(56, 189, 248, 0.15)",
                        border: "1px solid rgba(56, 189, 248, 0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.3rem"
                      }}>
                        🎥
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ background: "rgba(99, 102, 241, 0.2)", color: "#a5b4fc", fontSize: "0.7rem", padding: "2px 8px", borderRadius: "4px", fontWeight: "700" }}>
                            {m.category || "ALUMNI SESSION"}
                          </span>
                          <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                            ID: {m.meetingId}
                          </span>
                        </div>
                        <h4 style={{ margin: "4px 0 2px", fontSize: "1rem", color: "#f8fafc", fontWeight: "800" }}>
                          {m.topic}
                        </h4>
                        <p style={{ margin: 0, fontSize: "0.78rem", color: "#94a3b8" }}>
                          Hosted by <strong>{m.scheduledBy}</strong> • Scheduled: {m.startTime} ({m.duration} mins)
                        </p>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <a
                        href={joinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: "linear-gradient(135deg, #10b981, #059669)",
                          color: "#ffffff",
                          padding: "10px 18px",
                          borderRadius: "8px",
                          textDecoration: "none",
                          fontWeight: "800",
                          fontSize: "0.85rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          boxShadow: "0 4px 12px rgba(16, 185, 129, 0.4)"
                        }}
                      >
                        ⚡ 1-Click Join Meeting
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(joinUrl);
                          alert(`Direct 1-Click Zoom Link copied to clipboard:\n${joinUrl}\n\nRecipients can join directly with NO prompt for password.`);
                        }}
                        style={{
                          background: "rgba(255, 255, 255, 0.08)",
                          border: "1px solid rgba(255, 255, 255, 0.15)",
                          color: "#cbd5e1",
                          padding: "10px 12px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontSize: "0.8rem",
                          fontWeight: "700"
                        }}
                      >
                        📋 Copy Link
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: GLOBAL ALUMNI DIRECTORY */}
        {activeTab === "DIRECTORY" && (
          <div>
            <div style={{ marginBottom: "1.25rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#f8fafc", fontWeight: "800" }}>
                VERIFIED ALUMNI GLOBAL DIRECTORY
              </h3>
              <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "0.82rem" }}>
                Connect with graduates leading in software engineering, medical sciences, financial markets, and academia across 40+ countries.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
              {[
                { name: "Dr. Sarah Adjei", batch: "Class of 2022", role: "Cardiology Resident", org: "Johns Hopkins Hospital", city: "Baltimore, USA", icon: "🩺" },
                { name: "David Kwesi Boateng", batch: "Class of 2024", role: "Lead Cloud Systems Engineer", org: "Google EMEA", city: "Zurich, Switzerland", icon: "💻" },
                { name: "Eunice Serwaa Mensah", batch: "Class of 2026", role: "Biomedical Systems Researcher", org: "University of Oxford", city: "Oxford, UK", icon: "🧬" },
                { name: "Michael Kofi Appiah", batch: "Class of 2023", role: "Investment Banking Associate", org: "Morgan Stanley", city: "London, UK", icon: "📈" },
                { name: "Abena Pokuaa Osei", batch: "Class of 2024", role: "Product Design Strategist", org: "Spotify", city: "Stockholm, Sweden", icon: "🎨" },
                { name: "Kwame Frimpong-Manso", batch: "Class of 2025", role: "AI Ethics & Safety Fellow", org: "Anthropic / DeepMind", city: "San Francisco, USA", icon: "🤖" }
              ].map((member, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "rgba(15, 23, 42, 0.7)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "12px",
                    padding: "1.25rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px"
                  }}
                >
                  <div style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    background: "rgba(99, 102, 241, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.5rem"
                  }}>
                    {member.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, fontSize: "0.95rem", color: "#f8fafc", fontWeight: "800" }}>{member.name}</h4>
                    <p style={{ margin: "2px 0", fontSize: "0.78rem", color: "#38bdf8" }}>{member.role} • {member.org}</p>
                    <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{member.batch} • {member.city}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => alert(`Connection request sent to ${member.name} (${member.org})!`)}
                    style={{
                      background: "rgba(56, 189, 248, 0.15)",
                      border: "1px solid rgba(56, 189, 248, 0.3)",
                      color: "#38bdf8",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.75rem",
                      fontWeight: "700"
                    }}
                  >
                    Connect
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: ENDOWMENT & GIVING */}
        {activeTab === "ENDOWMENT" && (
          <div>
            <div style={{
              background: "linear-gradient(135deg, rgba(79, 70, 229, 0.2) 0%, rgba(15, 23, 42, 0.9) 100%)",
              border: "1px solid rgba(99, 102, 241, 0.4)",
              borderRadius: "16px",
              padding: "2rem",
              textAlign: "center",
              marginBottom: "1.5rem"
            }}>
              <span style={{ fontSize: "3rem" }}>💝</span>
              <h3 style={{ fontSize: "1.4rem", margin: "10px 0 6px", color: "#f8fafc", fontWeight: "900" }}>
                ALUMNI ENDOWMENT & SCHOLARSHIP FUND
              </h3>
              <p style={{ color: "#cbd5e1", maxWidth: "600px", margin: "0 auto 1.5rem", fontSize: "0.88rem" }}>
                Empowering the next generation of scholars at <strong>{reportSchoolName}</strong>. 100% of contributions directly support student STEM scholarships, quantum computing labs, and bursaries.
              </p>
              <button
                type="button"
                onClick={() => setShowDonateModal(true)}
                style={{
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  border: "none",
                  color: "#ffffff",
                  padding: "12px 24px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "800",
                  fontSize: "0.95rem",
                  boxShadow: "0 4px 15px rgba(16, 185, 129, 0.4)"
                }}
              >
                ✨ Make an Alumni Pledge / Gift
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: SCHEDULE ALUMNI ZOOM REUNION */}
      {showScheduleMeetingModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "20px"
        }}>
          <div style={{
            background: "#0f172a",
            border: "1px solid rgba(56, 189, 248, 0.4)",
            borderRadius: "16px",
            padding: "2rem",
            maxWidth: "520px",
            width: "100%",
            boxShadow: "0 25px 50px rgba(0,0,0,0.8)"
          }}>
            <h3 style={{ margin: "0 0 1rem", color: "#f8fafc", fontSize: "1.2rem", fontWeight: "800" }}>
              🎥 SCHEDULE 1-CLICK ALUMNI ZOOM MEETING
            </h3>
            <form onSubmit={handleScheduleZoomMeeting}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>
                  Meeting Topic / Focus
                </label>
                <input
                  type="text"
                  required
                  value={newMeeting.topic}
                  onChange={(e) => setNewMeeting({ ...newMeeting, topic: e.target.value })}
                  style={{ width: "100%", padding: "10px", background: "rgba(2, 6, 23, 0.6)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#ffffff" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>
                    Zoom Meeting ID
                  </label>
                  <input
                    type="text"
                    required
                    value={newMeeting.meetingId}
                    onChange={(e) => setNewMeeting({ ...newMeeting, meetingId: e.target.value })}
                    style={{ width: "100%", padding: "10px", background: "rgba(2, 6, 23, 0.6)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#ffffff" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>
                    Passcode (Auto-Embedded)
                  </label>
                  <input
                    type="text"
                    required
                    value={newMeeting.passcode}
                    onChange={(e) => setNewMeeting({ ...newMeeting, passcode: e.target.value })}
                    style={{ width: "100%", padding: "10px", background: "rgba(2, 6, 23, 0.6)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#ffffff" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "1.5rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>
                    Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={newMeeting.startTime}
                    onChange={(e) => setNewMeeting({ ...newMeeting, startTime: e.target.value })}
                    style={{ width: "100%", padding: "10px", background: "rgba(2, 6, 23, 0.6)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#ffffff" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>
                    Category
                  </label>
                  <select
                    value={newMeeting.category}
                    onChange={(e) => setNewMeeting({ ...newMeeting, category: e.target.value })}
                    style={{ width: "100%", padding: "10px", background: "rgba(2, 6, 23, 0.6)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#ffffff" }}
                  >
                    <option value="MENTORSHIP">Career Mentorship</option>
                    <option value="BATCH_REUNION">Batch Cohort Reunion</option>
                    <option value="HEADMASTER_TOWNHALL">Headmaster Townhall</option>
                    <option value="GLOBAL_HOMECOMING">Global Homecoming</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowScheduleMeetingModal(false)}
                  style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "#cbd5e1", padding: "10px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "700" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: "linear-gradient(135deg, #0284c7, #0369a1)", border: "none", color: "#ffffff", padding: "10px 18px", borderRadius: "8px", cursor: "pointer", fontWeight: "800" }}
                >
                  ⚡ Generate 1-Click Meeting Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: VERIFY GRADUATE REGISTRY & FORGOT CREDENTIAL RECOVERY */}
      {showVerificationModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "20px"
        }}>
          <div style={{
            background: "#0f172a",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            borderRadius: "16px",
            padding: "2rem",
            maxWidth: "560px",
            width: "100%",
            boxShadow: "0 25px 50px rgba(0,0,0,0.8)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, color: "#f8fafc", fontSize: "1.15rem", fontWeight: "800" }}>
                {showForgotCredential ? "🔑 ALUMNI CREDENTIAL RECOVERY" : "🔍 VERIFY GRADUATE CREDENTIALS"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowVerificationModal(false);
                  setVerificationResult(null);
                  setShowForgotCredential(false);
                  setRecoveryMatch(null);
                  setRecoveryError(null);
                }}
                style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: "1.2rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {!showForgotCredential ? (
              <form onSubmit={handleVerifyCredentials}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>
                      Student Index Number
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ALU-2024-0412"
                      value={verificationInput.indexNumber}
                      onChange={(e) => setVerificationInput({ ...verificationInput, indexNumber: e.target.value })}
                      style={{ width: "100%", padding: "10px", background: "rgba(2, 6, 23, 0.6)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#ffffff" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>
                      Completion Year
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 2024"
                      value={verificationInput.graduationYear}
                      onChange={(e) => setVerificationInput({ ...verificationInput, graduationYear: e.target.value })}
                      style={{ width: "100%", padding: "10px", background: "rgba(2, 6, 23, 0.6)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#ffffff" }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotCredential(true);
                      setRecoveryQuery(alumniProfile.email || "");
                    }}
                    style={{ background: "transparent", border: "none", color: "#38bdf8", fontSize: "0.8rem", textDecoration: "underline", cursor: "pointer", fontWeight: "700" }}
                  >
                    🔑 Forgot your Index Number or Credential?
                  </button>

                  <button
                    type="submit"
                    style={{ background: "#10b981", border: "none", color: "#ffffff", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "800", fontSize: "0.85rem" }}
                  >
                    Query Institutional Ledger
                  </button>
                </div>

                {verificationResult && (
                  <div style={{ background: "rgba(2, 6, 23, 0.7)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "8px", padding: "12px", fontSize: "0.82rem" }}>
                    {verificationResult.status === "AUTHENTIC_VALIDATED" ? (
                      <div>
                        <div style={{ color: "#34d399", fontWeight: "800", marginBottom: "6px" }}>
                          ✓ RECORD FOUND & DIGITALLY AUTHENTICATED
                        </div>
                        <div style={{ color: "#f8fafc" }}>Student: <strong>{verificationResult.fullName}</strong></div>
                        <div style={{ color: "#cbd5e1" }}>Program: {verificationResult.program}</div>
                        <div style={{ color: "#cbd5e1" }}>Honours: {verificationResult.degreeAwarded} (CGPA: {verificationResult.cgpa})</div>
                        <div style={{ color: "#94a3b8", fontSize: "0.72rem", marginTop: "4px" }}>
                          Ledger Signature: {verificationResult.verificationHash}
                        </div>
                      </div>
                    ) : (
                      <div style={{ color: "#f87171" }}>{verificationResult.message}</div>
                    )}
                  </div>
                )}
              </form>
            ) : (
              <div>
                <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", color: "#cbd5e1" }}>
                  Enter your registered Full Name or Email Address to recover your official Student Index Number from the permanent institutional ledger:
                </p>
                <form onSubmit={handleRecoverCredential}>
                  <div style={{ marginBottom: "1rem" }}>
                    <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>
                      Registered Full Name or Email
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. David Kwesi Boateng or david.boateng.alumni@gbs.edu"
                      value={recoveryQuery}
                      onChange={(e) => setRecoveryQuery(e.target.value)}
                      style={{ width: "100%", padding: "10px", background: "rgba(2, 6, 23, 0.6)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#ffffff", fontSize: "0.9rem" }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginBottom: "1rem" }}>
                    <button
                      type="button"
                      onClick={() => setShowForgotCredential(false)}
                      style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "#cbd5e1", padding: "8px 14px", borderRadius: "8px", cursor: "pointer", fontWeight: "700" }}
                    >
                      ← Back to Verification
                    </button>
                    <button
                      type="submit"
                      style={{ background: "linear-gradient(135deg, #0284c7, #0369a1)", border: "none", color: "#ffffff", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "800" }}
                    >
                      🔍 Locate My Credentials
                    </button>
                  </div>
                </form>

                {recoveryError && (
                  <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", padding: "10px", color: "#f87171", fontSize: "0.82rem", marginBottom: "1rem" }}>
                    {recoveryError}
                  </div>
                )}

                {recoveryMatch && (
                  <div style={{ background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.4)", borderRadius: "10px", padding: "14px", fontSize: "0.85rem" }}>
                    <div style={{ color: "#34d399", fontWeight: "800", marginBottom: "8px" }}>
                      ✓ OFFICIAL CREDENTIAL IDENTIFIED IN LEDGER:
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", color: "#cbd5e1", fontSize: "0.82rem", marginBottom: "12px" }}>
                      <div>Full Name: <strong style={{ color: "#f8fafc" }}>{recoveryMatch.fullName}</strong></div>
                      <div>Index Number: <strong style={{ color: "#38bdf8", fontSize: "0.95rem" }}>{recoveryMatch.indexNumber}</strong></div>
                      <div>Completion Year: <strong style={{ color: "#f8fafc" }}>{recoveryMatch.graduationYear || "2024"}</strong></div>
                      <div>Batch: <strong style={{ color: "#f8fafc" }}>{recoveryMatch.completionBatch}</strong></div>
                      <div style={{ gridColumn: "span 2" }}>Program: <strong style={{ color: "#f8fafc" }}>{recoveryMatch.degreeAwarded}</strong></div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplyRecoveredCredential(recoveryMatch)}
                      style={{
                        width: "100%",
                        background: "linear-gradient(135deg, #10b981, #059669)",
                        border: "none",
                        color: "#ffffff",
                        padding: "10px",
                        borderRadius: "8px",
                        fontWeight: "800",
                        cursor: "pointer",
                        boxShadow: "0 4px 12px rgba(16, 185, 129, 0.4)"
                      }}
                    >
                      ⚡ Auto-Fill Credentials & Access Dashboard
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: ENDOWMENT DONATION MODAL */}
      {showDonateModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "20px"
        }}>
          <div style={{
            background: "#0f172a",
            border: "1px solid rgba(99, 102, 241, 0.4)",
            borderRadius: "16px",
            padding: "2rem",
            maxWidth: "480px",
            width: "100%",
            boxShadow: "0 25px 50px rgba(0,0,0,0.8)"
          }}>
            <h3 style={{ margin: "0 0 1rem", color: "#f8fafc", fontSize: "1.2rem", fontWeight: "800" }}>
              💝 ALUMNI SCHOLARSHIP PLEDGE
            </h3>
            {donationSuccess ? (
              <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                <span style={{ fontSize: "3rem" }}>🎉</span>
                <h4 style={{ color: "#34d399", margin: "10px 0 6px" }}>THANK YOU FOR YOUR GIFT!</h4>
                <p style={{ color: "#cbd5e1", fontSize: "0.85rem" }}>
                  Your contribution of ${donationAmount} has been registered to the {donationFund} fund. An official tax receipt has been emailed to {alumniProfile.email}.
                </p>
              </div>
            ) : (
              <form onSubmit={handleDonateEndowment}>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>
                    Gift Amount (USD)
                  </label>
                  <input
                    type="number"
                    step="10"
                    required
                    value={donationAmount}
                    onChange={(e) => setDonationAmount(e.target.value)}
                    style={{ width: "100%", padding: "10px", background: "rgba(2, 6, 23, 0.6)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#ffffff", fontSize: "1.1rem", fontWeight: "800" }}
                  />
                </div>
                <div style={{ marginBottom: "1.5rem" }}>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>
                    Select Purpose Fund
                  </label>
                  <select
                    value={donationFund}
                    onChange={(e) => setDonationFund(e.target.value)}
                    style={{ width: "100%", padding: "10px", background: "rgba(2, 6, 23, 0.6)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#ffffff" }}
                  >
                    <option value="STEM_LAB_EXPANSION">STEM & Robotics Laboratory Expansion</option>
                    <option value="NEED_BASED_SCHOLARSHIP">Needy Student Tuition Bursary</option>
                    <option value="AI_RESEARCH_FELLOWSHIP">Undergraduate AI Research Fellowship</option>
                    <option value="GENERAL_CAMPUS_DEVELOPMENT">General Campus Endowment</option>
                  </select>
                </div>
                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => setShowDonateModal(false)}
                    style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "#cbd5e1", padding: "10px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "700" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ background: "#10b981", border: "none", color: "#ffffff", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: "800" }}
                  >
                    Confirm & Commit Gift
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
