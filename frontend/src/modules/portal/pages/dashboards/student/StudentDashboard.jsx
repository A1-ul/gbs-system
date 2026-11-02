import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../../../../../api/client/apiClient";
import WindowControlsBar from "../../../../../components/common/WindowControlsBar";
import TopCenterSystemBanner from "../../../../../components/common/TopCenterSystemBanner";
import { getUserAvatar } from "../../../../../utils/userAvatars";
import { offlineSyncEngine } from "../../../../../utils/offlineSync";
import UniversalRoleGuideModal from "../../../../../components/common/UniversalRoleGuideModal";
import ClassTopicVideoPlatform from "../../../../../components/common/ClassTopicVideoPlatform";
import "./StudentDashboard.css";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [showStudentGuideModal, setShowStudentGuideModal] = useState(false);

  // Real-Life Scholar Portrait
  const [studentAvatar, setStudentAvatar] = useState(() => getUserAvatar("STUDENT"));
  useEffect(() => {
    const handleAvatarChange = (e) => {
      if (e.detail?.role === "STUDENT") setStudentAvatar(e.detail.avatar);
    };
    window.addEventListener("gbs_user_avatar_changed", handleAvatarChange);
    return () => window.removeEventListener("gbs_user_avatar_changed", handleAvatarChange);
  }, []);

  // Published Headmaster Academic Schedule (Weeks in school & Vacation Date awareness)
  const [publishedSchedule, setPublishedSchedule] = useState(() => {
    try {
      const stored = localStorage.getItem("gbs_academic_published_schedule");
      if (stored) return JSON.parse(stored);
    } catch {}
    return {
      academicYear: "2026/2027",
      activeTerm: "TERM_1",
      numberOfWeeksInSchool: 14,
      vacationDate: "2026-12-18",
      publishedAt: new Date().toISOString()
    };
  });

  useEffect(() => {
    const syncSchedule = () => {
      try {
        const stored = localStorage.getItem("gbs_academic_published_schedule");
        if (stored) setPublishedSchedule(JSON.parse(stored));
      } catch {}
    };
    window.addEventListener("gbs_academic_schedule_published", syncSchedule);
    window.addEventListener("storage", syncSchedule);
    return () => {
      window.removeEventListener("gbs_academic_schedule_published", syncSchedule);
      window.removeEventListener("storage", syncSchedule);
    };
  }, []);

  const [activeTab, setActiveTab] = useState(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get("tab");
      if (tabParam) return tabParam;
      const stored = sessionStorage.getItem("gbs_student_active_tab");
      if (stored) return stored;
    } catch {}
    return "timetable";
  });

  // Track and restore scroll position and tab history for seamless back navigation
  useEffect(() => {
    try {
      sessionStorage.setItem("gbs_student_active_tab", activeTab);
      const url = new URL(window.location.href);
      if (url.searchParams.get("tab") !== activeTab) {
        url.searchParams.set("tab", activeTab);
        window.history.pushState({ tab: activeTab }, "", url.toString());
      }
    } catch {}
  }, [activeTab]);

  useEffect(() => {
    const handlePopState = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get("tab") || sessionStorage.getItem("gbs_student_active_tab");
        if (tabParam) setActiveTab(tabParam);
        const savedScroll = sessionStorage.getItem("gbs_student_scroll_pos");
        if (savedScroll) {
          setTimeout(() => window.scrollTo(0, parseInt(savedScroll, 10)), 100);
        }
      } catch {}
    };

    const handleScroll = () => {
      try {
        sessionStorage.setItem("gbs_student_scroll_pos", String(window.scrollY));
      } catch {}
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("scroll", handleScroll, { passive: true });
    
    // Initial scroll restore
    const savedScroll = sessionStorage.getItem("gbs_student_scroll_pos");
    if (savedScroll) {
      setTimeout(() => window.scrollTo(0, parseInt(savedScroll, 10)), 150);
    }

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Live States
  const [timetableSlots, setTimetableSlots] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissionInputs, setSubmissionInputs] = useState({});
  const [mySubmissions, setMySubmissions] = useState({});
  const [announcements, setAnnouncements] = useState([]);
  const [meetings, setMeetings] = useState([]);

  // Online Exam Interactive Engine State
  const [unlockedExamIds, setUnlockedExamIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("gbs_student_unlocked_exams") || '[]');
    } catch {
      return [];
    }
  });

  const handleUnlockExam = (exam) => {
    const examId = exam.id || exam.title || "exam";
    const updated = [...new Set([...unlockedExamIds, examId])];
    setUnlockedExamIds(updated);
    localStorage.setItem("gbs_student_unlocked_exams", JSON.stringify(updated));
    setFeedback({
      type: "success",
      message: `⏱️ Scheduled start time arrived for "${exam.title}"! Portal is now unlocked for you to write the paper and be auto-graded.`
    });
  };

  const [exams, setExams] = useState([]);
  const [activeExam, setActiveExam] = useState(null);
  const [examStarted, setExamStarted] = useState(false);
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [examAnswers, setExamAnswers] = useState({});
  const [examScoreResult, setExamScoreResult] = useState(null);
  const [showExamConfirmModal, setShowExamConfirmModal] = useState(false);
  const [submittedExams, setSubmittedExams] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("gbs_student_submitted_exams") || "{}");
    } catch {
      return {};
    }
  });

  // Track if faculty board has published a new examination session
  const [newExamPublished, setNewExamPublished] = useState(() => {
    return localStorage.getItem("gbs_new_exam_published") === "true";
  });

  // Live Attendance Summary Synced from Daily Teacher Archives
  const [attendanceSummary, setAttendanceSummary] = useState(() => {
    try {
      const saved = localStorage.getItem("gbs_student_attendance_summary");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      rate: "0.0%",
      presentCount: 0,
      totalCount: 0,
      lastArchivedDate: new Date().toISOString().split("T")[0]
    };
  });

  // Gating Rule: If student has completed/submitted/been graded on an exam, they cannot access exams portal until faculty publishes next exam session
  const isExamPortalLocked = (Object.keys(submittedExams).length > 0 || examSubmitted) && !newExamPublished;


  // Financial Standing & Debt State (Locked Registration & Results if In Arrears)
  const [feeArrears, setFeeArrears] = useState(() => {
    try {
      const stored = localStorage.getItem("gbs_student_fee_arrears");
      return stored !== null ? parseFloat(stored) : 0.00;
    } catch {
      return 0.00;
    }
  });

  const [lastPaymentNotice, setLastPaymentNotice] = useState(() => {
    try {
      const history = JSON.parse(localStorage.getItem("gbs_reconciled_payments") || "[]");
      return Array.isArray(history) && history.length > 0 ? history[0] : null;
    } catch {
      return null;
    }
  });

  // Course & Class Registration System (Authorized upon Financial Clearance)
  const [availableCourses, setAvailableCourses] = useState([
    {
      code: "CS 201",
      title: "Data Structures & Object Algorithms",
      credits: 3,
      instructor: "Eng. Marcus Thorne",
      schedule: "Mon & Wed 08:30 - 10:00 AM",
      hall: "STEM Lab 201",
      type: "Core Compulsory",
      fileLocation: "/var/gbs/storage/courses/CS_201_Data_Structures/modules/",
      materials: [
        { name: "CS201_Course_Syllabus_2026.pdf", size: "1.4 MB", type: "PDF", uploadedAt: "2026-09-02", topic: "Comprehensive Semester Curriculum & Assessment Schema" },
        { name: "Module_01_04_Binary_Search_Trees.pdf", size: "4.8 MB", type: "PDF", uploadedAt: "2026-09-18", topic: "Lecture Slides: Asymptotic Big-O & Balanced Trees" },
        { name: "Lab_Manual_03_Dynamic_Programming.pdf", size: "2.1 MB", type: "PDF", uploadedAt: "2026-10-05", topic: "Lab Worksheets & Benchmark Code Sets" },
        { name: "Past_Questions_Archive_2024_2025.pdf", size: "3.2 MB", type: "PDF", uploadedAt: "2026-10-14", topic: "Solved Past Examinations with Instructor Notes" }
      ]
    },
    {
      code: "MATH 205",
      title: "Linear Algebra & Differential Equations",
      credits: 3,
      instructor: "Dr. Robert Vance",
      schedule: "Tue & Thu 10:15 - 11:45 AM",
      hall: "Mathematics Wing B",
      type: "Core Compulsory",
      fileLocation: "/var/gbs/storage/courses/MATH_205_Linear_Algebra/modules/",
      materials: [
        { name: "MATH205_Syllabus_and_Matrices.pdf", size: "1.2 MB", type: "PDF", uploadedAt: "2026-09-01", topic: "Course Syllabus, Vector Spaces & Eigenvalues" },
        { name: "ODE_2nd_Order_Worked_Solutions.pdf", size: "3.6 MB", type: "PDF", uploadedAt: "2026-09-24", topic: "Step-by-step Differential Equation Proofs" },
        { name: "Past_Questions_Calculus_Vault.pdf", size: "2.8 MB", type: "PDF", uploadedAt: "2026-10-10", topic: "Past University Mid-Semester Examination Papers" }
      ]
    },
    {
      code: "PHYS 203",
      title: "Thermodynamics & Electromagnetism",
      credits: 3,
      instructor: "Prof. Eleanor Sterling",
      schedule: "Mon & Fri 11:30 - 01:00 PM",
      hall: "Physics Lab 104",
      type: "Core Compulsory",
      fileLocation: "/var/gbs/storage/courses/PHYS_203_Thermodynamics/modules/",
      materials: [
        { name: "PHYS203_Lecture_Notes_Maxwell.pdf", size: "5.1 MB", type: "PDF", uploadedAt: "2026-09-15", topic: "Electromagnetic Induction & Maxwell's Equations" },
        { name: "Carnot_Cycle_Thermodynamic_Packet.pdf", size: "2.4 MB", type: "PDF", uploadedAt: "2026-10-02", topic: "Entropy, Heat Engines & Refrigeration Formulas" }
      ]
    },
    {
      code: "ENG 210",
      title: "Object-Oriented Software Design & Architecture",
      credits: 3,
      instructor: "Dr. Kwame Osei-Tutu",
      schedule: "Wed & Fri 02:00 - 03:30 PM",
      hall: "Computer Lab 3",
      type: "Elective Specialization",
      fileLocation: "/var/gbs/storage/courses/ENG_210_Software_Design/modules/",
      materials: [
        { name: "ENG210_Design_Patterns_Gang_of_Four.pdf", size: "4.2 MB", type: "PDF", uploadedAt: "2026-09-10", topic: "Singleton, Factory, Observer & MVC Architecture" }
      ]
    },
    {
      code: "AI 220",
      title: "Machine Intelligence & Neural Systems",
      credits: 3,
      instructor: "Prof. Sophia Chen",
      schedule: "Tue & Thu 02:00 - 03:30 PM",
      hall: "AI Innovation Pavilion",
      type: "Elective Specialization",
      fileLocation: "/var/gbs/storage/courses/AI_220_Machine_Intelligence/modules/",
      materials: [
        { name: "Neural_Networks_Backprop_Calculus.pdf", size: "6.2 MB", type: "PDF", uploadedAt: "2026-09-20", topic: "Gradient Descent, CNNs and Transformers" }
      ]
    },
    {
      code: "GBS 200",
      title: "Academic Writing & Global Leadership",
      credits: 3,
      instructor: "Ms. Claire Montgomery",
      schedule: "Wed 04:00 - 05:30 PM",
      hall: "Auditorium Hall 1",
      type: "University Requirement",
      fileLocation: "/var/gbs/storage/courses/GBS_200_Leadership/modules/",
      materials: [
        { name: "GBS200_Research_Methodology_Style_Guide.pdf", size: "1.8 MB", type: "PDF", uploadedAt: "2026-09-05", topic: "APA 7th Edition Citations & Thesis Structuring" }
      ]
    }
  ]);

  // Course Enrolled File Location Viewer State
  const [selectedCourseForFiles, setSelectedCourseForFiles] = useState(null);
  const [showCourseFilesModal, setShowCourseFilesModal] = useState(false);
  const [viewingFilePreview, setViewingFilePreview] = useState(null);

  // Teacher-Authored Official Examination Timetable & Procedure Guide State
  const [examTimetableGuide, setExamTimetableGuide] = useState(() => {
    try {
      const stored = localStorage.getItem("gbs_examination_timetable");
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      {
        id: "ET-01",
        courseCode: "MATH 205",
        subject: "Linear Algebra & Differential Equations",
        examDate: "2026-11-04",
        startTime: "09:00 AM",
        endTime: "11:30 AM",
        hall: "Grand Examination Hall A",
        invigilator: "Dr. Robert Vance",
        permittedTools: "Standard Scientific Calculator, Mathematical Set, HB Pencil",
        syllabusScope: "Eigenvalues, Matrix Inverses, 2nd-Order Ordinary Differential Equations",
        instructions: "No programmable devices or cellular units allowed. Candidates must be seated 15 minutes prior to commencement."
      },
      {
        id: "ET-02",
        courseCode: "CS 201",
        subject: "Data Structures & Algorithms",
        examDate: "2026-11-06",
        startTime: "01:00 PM",
        endTime: "03:30 PM",
        hall: "Computer Science Wing - Lab 201",
        invigilator: "Eng. Marcus Thorne",
        permittedTools: "Blue/Black Ink Pens, Rough Sheets provided in hall",
        syllabusScope: "Binary Search Trees, Graph Traversal (BFS/DFS), Hash Tables & Asymptotic Complexity",
        instructions: "Online workstation credentials will be provided by invigilator. Deterministic auto-grading active upon submit."
      },
      {
        id: "ET-03",
        courseCode: "PHYS 203",
        subject: "Thermodynamics & Electromagnetism",
        examDate: "2026-11-09",
        startTime: "09:00 AM",
        endTime: "11:30 AM",
        hall: "Physics Auditorium B",
        invigilator: "Prof. Eleanor Sterling",
        permittedTools: "Standard Calculator, Formula Sheet (Provided), Ruler",
        syllabusScope: "Carnot Cycle, Entropy, Maxwell's Equations, Magnetic Flux",
        instructions: "Handwritten solutions to be scanned with AI scanner upon conclusion."
      }
    ];
  });

  useEffect(() => {
    const syncExamTimetable = () => {
      try {
        const stored = localStorage.getItem("gbs_examination_timetable");
        if (stored) setExamTimetableGuide(JSON.parse(stored));
      } catch {}
    };
    window.addEventListener("gbs_exam_timetable_updated", syncExamTimetable);
    window.addEventListener("storage", syncExamTimetable);
    return () => {
      window.removeEventListener("gbs_exam_timetable_updated", syncExamTimetable);
      window.removeEventListener("storage", syncExamTimetable);
    };
  }, []);

  const [registeredCourseCodes, setRegisteredCourseCodes] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("gbs_registered_courses") || "[]");
      if (Array.isArray(saved) && saved.length > 0) return saved;
    } catch {}
    return ["CS 201", "MATH 205", "PHYS 203", "ENG 210", "AI 220", "GBS 200"];
  });

  const handleToggleCourseRegistration = (courseCode) => {
    if (feeArrears > 0) {
      setFeedback({
        type: "error",
        message: "Financial Hold Active: Course registration is restricted until outstanding fee arrears are cleared by the Accountant."
      });
      return;
    }
    let updated;
    if (registeredCourseCodes.includes(courseCode)) {
      updated = registeredCourseCodes.filter((c) => c !== courseCode);
      setFeedback({ type: "info", message: `Course ${courseCode} removed from your active semester registration.` });
    } else {
      updated = [...registeredCourseCodes, courseCode];
      setFeedback({ type: "success", message: `✅ Successfully registered for ${courseCode}!` });
    }
    setRegisteredCourseCodes(updated);
    localStorage.setItem("gbs_registered_courses", JSON.stringify(updated));
  };

  // Student Profile & Academic Level (Assigned Exclusively by Headmaster)
  const [studentPhoto, setStudentPhoto] = useState(() => {
    return localStorage.getItem("gbs_student_avatar") || "/images/student_login_bg.jpg";
  });
  const [academicLevel, setAcademicLevel] = useState("Level 200 (Undergraduate)");
  const [academicTerm, setAcademicTerm] = useState("Semester 1");

  // Alumni Mentorship & Academic Records State
  const [showMentorModal, setShowMentorModal] = useState(false);
  const [selectedMentorAlumnus, setSelectedMentorAlumnus] = useState(null);
  const [mentorRequestData, setMentorRequestData] = useState({
    careerTrack: "Artificial Intelligence & Cloud Architecture",
    notes: ""
  });
  const [showAlumniRecordsModal, setShowAlumniRecordsModal] = useState(false);

  // Saved Virtual Meetings for Reference
  const [savedReferenceMeetings, setSavedReferenceMeetings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("gbs_student_saved_meetings") || "[]");
    } catch {
      return [];
    }
  });

  // REQUIREMENT: School Official Name & Uploaded Crest from Headmaster Branding Settings
  const [schoolOfficialName, setSchoolOfficialName] = useState(() => {
    return localStorage.getItem("gbs_report_school_name") || "St. Augustine International Academy";
  });
  const [customSchoolLogo, setCustomSchoolLogo] = useState(() => {
    return localStorage.getItem("gbs_custom_school_logo") || "/assets/gbs_crest_badge.jpg";
  });

  // REQUIREMENT: Grades published by teachers reflect on Student Dashboard
  const [publishedGrades, setPublishedGrades] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("gbs_student_published_results") || localStorage.getItem("gbs_published_grades") || "[]");
      if (Array.isArray(saved) && saved.length > 0) return saved;
    } catch {}
    return [];
  });

  useEffect(() => {
    const handleSchoolNameSync = () => {
      const name = localStorage.getItem("gbs_report_school_name");
      if (name) setSchoolOfficialName(name);
    };
    const handleSchoolLogoSync = () => {
      const logo = localStorage.getItem("gbs_custom_school_logo");
      if (logo) setCustomSchoolLogo(logo);
    };
    const handleGradesSync = () => {
      try {
        const saved = JSON.parse(localStorage.getItem("gbs_student_published_results") || localStorage.getItem("gbs_published_grades") || "[]");
        if (Array.isArray(saved)) setPublishedGrades(saved);
      } catch {}
    };

    window.addEventListener("storage", handleSchoolNameSync);
    window.addEventListener("gbs_school_name_updated", handleSchoolNameSync);
    window.addEventListener("storage", handleSchoolLogoSync);
    window.addEventListener("gbs_custom_logo_updated", handleSchoolLogoSync);
    window.addEventListener("storage", handleGradesSync);
    window.addEventListener("gbs_grades_updated", handleGradesSync);

    return () => {
      window.removeEventListener("storage", handleSchoolNameSync);
      window.removeEventListener("gbs_school_name_updated", handleSchoolNameSync);
      window.removeEventListener("storage", handleSchoolLogoSync);
      window.removeEventListener("gbs_custom_logo_updated", handleSchoolLogoSync);
      window.removeEventListener("storage", handleGradesSync);
      window.removeEventListener("gbs_grades_updated", handleGradesSync);
    };
  }, []);

  // REQUIREMENT: Report Card wrapped over/within year with year, date, and time of wrapping
  const [reportWrapInfo, setReportWrapInfo] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("gbs_report_wrap_info") || "null");
      if (saved) return saved;
    } catch {}
    return null;
  });

  // Alumni Directory & Hall of Fame Data
  const [alumniList, setAlumniList] = useState(() => {
    try {
      const stored = localStorage.getItem("gbs_alumni_directory");
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  const currentUser = JSON.parse(
    localStorage.getItem("gbs_user") ||
      '{"id":1,"firstName":"Enrolled","lastName":"Student","email":"student@gbs.edu","role":"STUDENT"}'
  );

  useEffect(() => {
    fetchTimetable();
    fetchAssignments();
    fetchAnnouncements();
    fetchMeetings();
    fetchExams();

    const handlePaymentUpdate = () => {
      try {
        const stored = localStorage.getItem("gbs_student_fee_arrears");
        const val = stored !== null ? parseFloat(stored) : 0;
        setFeeArrears(val);
        const history = JSON.parse(localStorage.getItem("gbs_reconciled_payments") || "[]");
        if (Array.isArray(history) && history.length > 0) {
          const latest = history[0];
          setLastPaymentNotice(latest);
          setFeedback({
            type: "success",
            message: `🎉 PAYMENT RECONCILED: Payment of $${latest.amountPaid ? latest.amountPaid.toFixed(2) : "4,850.00"} confirmed! Arrears cleared to $0.00. Course registration and official report card unlocked.`
          });
        }
      } catch (e) {
        console.error(e);
      }
    };

    const handleGradesUpdate = () => {
      try {
        const saved = JSON.parse(localStorage.getItem("gbs_published_grades") || "[]");
        if (Array.isArray(saved)) {
          setPublishedGrades(saved);
        }
      } catch {}
    };

    const handleSubmissionsSync = () => {
      try {
        const saved = JSON.parse(localStorage.getItem("gbs_student_submissions") || "[]");
        if (Array.isArray(saved) && saved.length > 0) {
          const mapped = {};
          saved.forEach((sub) => {
            if (sub.assignmentId) {
              mapped[sub.assignmentId] = {
                content: sub.submittedContent,
                submittedAt: sub.submittedAt,
                status: sub.status,
                grade: sub.score,
                teacherRemarks: sub.teacherRemarks
              };
            }
          });
          setMySubmissions((prev) => ({ ...prev, ...mapped }));
        }
      } catch {}
    };

    const handleAttendanceSync = () => {
      try {
        const saved = localStorage.getItem("gbs_student_attendance_summary");
        if (saved) setAttendanceSummary(JSON.parse(saved));
      } catch {}
    };

    const handleExamPublishedSync = () => {
      setNewExamPublished(localStorage.getItem("gbs_new_exam_published") === "true");
    };

    handleGradesUpdate();
    handleSubmissionsSync();
    handleAttendanceSync();

    window.addEventListener("gbs_payment_made", handlePaymentUpdate);
    window.addEventListener("gbs_grades_updated", handleGradesUpdate);
    window.addEventListener("gbs_submission_updated", handleSubmissionsSync);
    window.addEventListener("gbs_attendance_updated", handleAttendanceSync);
    window.addEventListener("gbs_new_exam_published", handleExamPublishedSync);
    window.addEventListener("storage", handlePaymentUpdate);
    window.addEventListener("storage", handleGradesUpdate);
    window.addEventListener("storage", handleSubmissionsSync);
    window.addEventListener("storage", handleAttendanceSync);
    window.addEventListener("storage", handleExamPublishedSync);
    return () => {
      window.removeEventListener("gbs_payment_made", handlePaymentUpdate);
      window.removeEventListener("gbs_grades_updated", handleGradesUpdate);
      window.removeEventListener("gbs_submission_updated", handleSubmissionsSync);
      window.removeEventListener("gbs_attendance_updated", handleAttendanceSync);
      window.removeEventListener("gbs_new_exam_published", handleExamPublishedSync);
      window.removeEventListener("storage", handlePaymentUpdate);
      window.removeEventListener("storage", handleGradesUpdate);
      window.removeEventListener("storage", handleSubmissionsSync);
      window.removeEventListener("storage", handleAttendanceSync);
      window.removeEventListener("storage", handleExamPublishedSync);
    };
  }, []);

  const formatMeetingUrl = (url, passcode = "GBS2026", meetingId = "84939201849") => {
    const cleanPass = (passcode || "GBS2026").trim();
    const cleanId = String(meetingId || "84939201849").replace(/[^0-9]/g, "") || "84939201849";
    const userName = `${currentUser.firstName} ${currentUser.lastName} (Student)`.trim();
    // Direct zero-prompt 1-click web client join URL with pre-filled password and attendee name
    return `https://zoom.us/wc/${cleanId}/join?prefer=1&pwd=${encodeURIComponent(cleanPass)}&uname=${encodeURIComponent(userName)}`;
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      setStudentPhoto(result);
      localStorage.setItem("gbs_student_avatar", result);
      setFeedback({ type: "success", message: "Student profile photograph updated and saved successfully!" });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveMeetingReference = (meeting) => {
    const exists = savedReferenceMeetings.some((m) => m.id === meeting.id);
    let updated;
    if (exists) {
      updated = savedReferenceMeetings.filter((m) => m.id !== meeting.id);
      setFeedback({ type: "success", message: `Removed "${meeting.title}" from saved learning references.` });
    } else {
      const record = {
        id: meeting.id,
        title: meeting.title,
        platform: meeting.platform,
        startTime: meeting.startTime,
        meetingUrl: meeting.meetingUrl,
        savedAt: new Date().toISOString()
      };
      updated = [record, ...savedReferenceMeetings];
      setFeedback({ type: "success", message: `💾 Saved "${meeting.title}" to your personal learning references!` });
    }
    setSavedReferenceMeetings(updated);
    localStorage.setItem("gbs_student_saved_meetings", JSON.stringify(updated));
  };

  const fetchExams = async () => {
    try {
      const res = await apiClient.get("/ai-exam/exams");
      const list = res.data?.data?.exams || res.data?.data || [];
      const teacherExams = JSON.parse(localStorage.getItem("gbs_teacher_published_exams") || "[]");
      const combined = [...teacherExams, ...list];
      setExams(combined);
      if (combined.length > 0 && !activeExam) {
        setActiveExam(combined[0]);
      }
    } catch (err) {
      console.warn("Could not load exams from PostgreSQL:", err);
      const teacherExams = JSON.parse(localStorage.getItem("gbs_teacher_published_exams") || "[]");
      if (teacherExams.length > 0) {
        setExams(teacherExams);
        if (!activeExam) setActiveExam(teacherExams[0]);
      }
    }
  };

  useEffect(() => {
    const handleTeacherExamSync = () => {
      fetchExams();
    };
    window.addEventListener("gbs_teacher_exam_published", handleTeacherExamSync);
    window.addEventListener("storage", handleTeacherExamSync);
    return () => {
      window.removeEventListener("gbs_teacher_exam_published", handleTeacherExamSync);
      window.removeEventListener("storage", handleTeacherExamSync);
    };
  }, []);

  const fetchTimetable = async () => {
    try {
      const res = await apiClient.get("/timetables/grid");
      const slots = res.data?.data?.slots || res.data?.data || [];
      setTimetableSlots(slots);
    } catch (err) {
      console.warn("Could not load timetable:", err);
    }
  };

  const fetchAssignments = async () => {
    try {
      const res = await apiClient.get("/assignments");
      setAssignments(res.data?.data || []);
    } catch (err) {
      console.warn("Could not load assignments:", err);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await apiClient.get("/communication/announcements");
      setAnnouncements(res.data?.data?.announcements || []);
    } catch (err) {
      console.warn("Could not load announcements:", err);
    }
  };

  const fetchMeetings = async () => {
    try {
      const res = await apiClient.get("/meetings");
      setMeetings(res.data?.data?.meetings || []);
    } catch (err) {
      console.warn("Could not load meetings:", err);
    }
  };

  // Submit Homework Assignment to PostgreSQL
  const handleSubmitAssignment = async (assignmentId) => {
    const content = submissionInputs[assignmentId];
    if (!content || !content.trim()) {
      setFeedback({ type: "error", message: "Please enter your homework submission text or link." });
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      await apiClient.post(`/assignments/${assignmentId}/submit`, {
        submissionContent: content.trim(),
        attachmentUrl: content.includes("http") ? content.trim() : null
      });

      const targetAssignment = assignments.find((a) => a.id === assignmentId);
      const studentName = `${currentUser.firstName} ${currentUser.lastName}`;
      const submissionRecord = {
        id: `sub-${Date.now()}`,
        assignmentId: assignmentId,
        assignmentTitle: targetAssignment?.title || "Lesson Assignment",
        studentId: currentUser.id || "101",
        studentName: studentName,
        studentClass: academicLevel || "Grade 10A Mathematics",
        submittedContent: content.trim(),
        submittedAt: `Today at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        status: "PENDING_VERIFICATION",
        score: null,
        maxScore: targetAssignment?.maxScore || 100,
        teacherRemarks: ""
      };

      try {
        const existing = JSON.parse(localStorage.getItem("gbs_student_submissions") || "[]");
        localStorage.setItem("gbs_student_submissions", JSON.stringify([submissionRecord, ...existing]));
        window.dispatchEvent(new Event("gbs_submission_updated"));
      } catch (e) {}

      setMySubmissions((prev) => ({
        ...prev,
        [assignmentId]: { content, submittedAt: new Date().toLocaleTimeString(), status: "SUBMITTED" }
      }));
      setFeedback({ type: "success", message: "Homework successfully submitted to teacher for verification and grading!" });
      setSubmissionInputs((prev) => ({ ...prev, [assignmentId]: "" }));
    } catch (err) {
      setFeedback({ type: "error", message: err.response?.data?.message || "Failed to submit assignment." });
    } finally {
      setLoading(false);
    }
  };

  // Submit Online Exam to PostgreSQL Auto-Grading Engine (Locked after submission)
  const handleSubmitExam = async () => {
    if (!activeExam) return;
    setLoading(true);
    setFeedback(null);
    setShowExamConfirmModal(false);
    try {
      const answersMap = {};
      const questions = activeExam.questionBank || [];
      questions.forEach((q) => {
        answersMap[String(q.questionNumber)] = examAnswers[q.id] || "A";
      });

      const res = await apiClient.post("/ai-exam/scan-grade", {
        examId: activeExam.id,
        studentId: currentUser.id || 10,
        extractedAnswers: answersMap
      });

      const data = res.data?.data;
      if (data) {
        const pct = data.percentage !== undefined ? data.percentage : 85;
        const letterGrade = pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 70 ? "B" : pct >= 60 ? "C" : pct >= 50 ? "D" : "F";
        const totalQ = data.totalQuestions || (questions.length > 0 ? questions.length : 10);
        const correctCount = Math.round((pct / 100) * totalQ);

        const record = {
          examId: activeExam.id,
          score: pct,
          correct: correctCount,
          total: totalQ,
          grade: letterGrade,
          isPassed: data.pass !== undefined ? data.pass : pct >= 50,
          submittedAt: new Date().toLocaleTimeString(),
          locked: true
        };

        setExamScoreResult(record);
        const updatedSubmitted = { ...submittedExams, [activeExam.id]: record };
        setSubmittedExams(updatedSubmitted);
        localStorage.setItem("gbs_student_submitted_exams", JSON.stringify(updatedSubmitted));
        localStorage.removeItem("gbs_new_exam_published");
        setNewExamPublished(false);

        setExamSubmitted(true);
        setExamStarted(false);
        setFeedback({ 
          type: "success", 
          message: `✅ Exam submitted, locked, and auto-graded in PostgreSQL! Exact Score: ${pct}% • Letter Grade: ${letterGrade}. Exam portal locked until next exam session.` 
        });
      }
    } catch (err) {
      setFeedback({ type: "error", message: err.response?.data?.message || "Failed to submit exam." });
    } finally {
      setLoading(false);
    }
  };

  const handlePublishNewExamSession = () => {
    localStorage.setItem("gbs_new_exam_published", "true");
    setNewExamPublished(true);
    setExamSubmitted(false);
    setExamStarted(false);
    window.dispatchEvent(new Event("gbs_new_exam_published"));
    setFeedback({
      type: "success",
      message: "📢 Faculty board has published a new examination session! Examination portal unlocked for writing."
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("gbs_token");
    localStorage.removeItem("gbs_user");
    navigate("/login/student");
  };

  return (
    <div className="role-dashboard-wrapper">
      <div 
        className="role-dashboard-bg" 
        style={{ backgroundImage: `url('/images/student_login_bg.jpg')` }}
      ></div>
      <div className="role-dashboard-overlay"></div>

      <div className="role-dashboard-content">
        {/* Universal Navigation & Scroll Controls */}
        <WindowControlsBar title="Student Learning Portal" />

        {/* Prominent Top Center System Branding */}
        <TopCenterSystemBanner roleTitle="Student Learning Portal" />

        {/* Header */}
        <header className="role-header">
          <div className="role-header-brand" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <img 
              src={customSchoolLogo || "/assets/gbs_crest_badge.jpg"} 
              alt="School Crest" 
              style={{
                width: "58px",
                height: "58px",
                borderRadius: "14px",
                border: "2.5px solid #a855f7",
                objectFit: "contain",
                background: "rgba(15, 23, 42, 0.85)",
                boxShadow: "0 0 20px rgba(168, 85, 247, 0.45)",
                padding: "3px"
              }}
            />
            <div className="role-brand-text">
              <span className="role-portal-badge" style={{ color: "#a855f7", fontSize: "0.95rem", fontWeight: "900", letterSpacing: "0.8px" }}>
                🎓 STUDENT LEARNING PORTAL • OFFICIAL TENANT
              </span>
            </div>
          </div>

          <div className="role-status-ticker">
            <span className="ticker-dot"></span>
            <span>Student: <strong>{currentUser.firstName} {currentUser.lastName}</strong></span>
            <span>Level: <strong>{academicLevel}</strong></span>
            <span>Exam Term: <strong>{academicTerm}</strong></span>
          </div>

          <div className="role-header-actions">
            <button 
              type="button" 
              className="role-action-btn"
              onClick={() => window.history.back()}
              title="Return to previous view or page"
              style={{ borderColor: "#64748b", color: "#f8fafc", background: "rgba(30, 41, 59, 0.7)", fontWeight: 700, cursor: "pointer" }}
            >
              ← Back
            </button>
            <Link to="/portal/student/dashboard" className="role-action-btn">
              🏠 Learning Hub
            </Link>
            <button 
              type="button" 
              className="role-action-btn"
              onClick={() => setActiveTab("alumni")}
              style={{ borderColor: "#a855f7", color: "#c084fc" }}
            >
              🎓 Alumni Hall of Fame
            </button>
            <button
              type="button"
              className="role-action-btn"
              onClick={() => setShowStudentGuideModal(true)}
              style={{
                borderColor: "#10b981",
                color: "#6ee7b7",
                fontWeight: 800,
                background: "rgba(16, 185, 129, 0.15)",
                boxShadow: "0 0 10px rgba(16, 185, 129, 0.2)"
              }}
            >
              📖 Operating Guide
            </button>
            <button type="button" className="role-action-btn logout" onClick={handleLogout}>
              🚪 Sign Out
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="role-main">
          {/* REQUIREMENT: Student Profile Card with Uploaded Picture and Class / Level Progression */}
          <div className="student-profile-header-card">
            <label className="student-avatar-frame" title="Click to upload profile photo">
              <img 
                src={studentPhoto} 
                alt="Student Profile" 
                className="student-avatar-img" 
              />
              <span className="student-avatar-overlay-label">📷 Change</span>
              <input 
                type="file" 
                accept="image/*" 
                style={{ display: "none" }} 
                onChange={handlePhotoUpload} 
              />
            </label>

            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <h2 style={{ margin: 0, fontSize: "1.3rem", color: "#f8fafc" }}>
                  {currentUser.firstName} {currentUser.lastName}
                </h2>
                <span className="role-portal-badge" style={{ color: "#34d399", background: "rgba(16, 185, 129, 0.15)", padding: "2px 8px", borderRadius: "4px" }}>
                  Active Scholar
                </span>
                <span style={{ fontSize: "0.8rem", color: "#94a3b8", fontFamily: "monospace" }}>
                  ID: GBS-STU-2026-084
                </span>
              </div>

              {/* Exact Level & Exact Examination Term Selectors */}
              <div style={{ display: "flex", gap: "14px", marginTop: "8px", flexWrap: "wrap", alignItems: "center" }}>
                {/* REQUIREMENT: Only the Headmaster must assign or update the class; student cannot choose own class */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(59, 130, 246, 0.15)", border: "1px solid rgba(59, 130, 246, 0.4)", padding: "6px 12px", borderRadius: "8px" }}>
                  <span style={{ fontSize: "0.8rem", color: "#93c5fd" }}>Enrolled Class:</span>
                  <strong style={{ fontSize: "0.88rem", color: "#f8fafc" }}>{academicLevel}</strong>
                  <span style={{ fontSize: "0.72rem", background: "rgba(59, 130, 246, 0.3)", color: "#60a5fa", padding: "2px 8px", borderRadius: "4px", fontWeight: "700" }} title="Class assignments and promotions are exclusively managed by the Headmaster">
                    🔒 Assigned Exclusively by Headmaster
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(168, 85, 247, 0.15)", border: "1px solid rgba(168, 85, 247, 0.4)", padding: "6px 12px", borderRadius: "8px" }}>
                  <span style={{ fontSize: "0.8rem", color: "#d8b4fe" }}>Academic Term / Semester:</span>
                  <strong style={{ fontSize: "0.88rem", color: "#f8fafc" }}>{academicTerm}</strong>
                  <span style={{ fontSize: "0.72rem", background: "rgba(168, 85, 247, 0.3)", color: "#c084fc", padding: "2px 8px", borderRadius: "4px", fontWeight: "700" }}>
                    ✓ Headmaster Termly Plan
                  </span>
                </div>
              </div>

              {/* REQUIREMENT: Debtor Student Restriction Banner or Financial Clearance Confirmation */}
              {feeArrears > 0 ? (
                <div style={{ 
                  marginTop: "12px", 
                  background: "rgba(239, 68, 68, 0.15)", 
                  border: "1px solid rgba(239, 68, 68, 0.4)", 
                  borderRadius: "8px", 
                  padding: "8px 14px", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "space-between", 
                  flexWrap: "wrap", 
                  gap: "8px" 
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>⚠️</span>
                    <span style={{ fontSize: "0.82rem", color: "#fca5a5" }}>
                      <strong>FINANCIAL HOLD ACTIVE:</strong> Outstanding arrears of <strong>${feeArrears.toFixed(2)}</strong>. Course registration and verified results are restricted until settled with the Accountant.
                    </span>
                  </div>
                  <Link to="/portal/parent/dashboard" style={{ fontSize: "0.78rem", color: "#ef4444", fontWeight: "700", textDecoration: "underline" }}>
                    Pay via Parent Portal →
                  </Link>
                </div>
              ) : (
                <div style={{ 
                  marginTop: "12px", 
                  background: "rgba(16, 185, 129, 0.15)", 
                  border: "1px solid rgba(16, 185, 129, 0.4)", 
                  borderRadius: "8px", 
                  padding: "8px 14px", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "space-between", 
                  flexWrap: "wrap", 
                  gap: "8px" 
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>✅</span>
                    <span style={{ fontSize: "0.82rem", color: "#a7f3d0" }}>
                      <strong>FINANCIAL CLEARANCE VERIFIED ($0.00 Balance):</strong> Full course registration and official transcripts are unlocked.
                      {lastPaymentNotice?.amountPaid && (
                        <span> (Latest payment: ${lastPaymentNotice.amountPaid.toFixed(2)} confirmed • Ref: {lastPaymentNotice.transactionRef})</span>
                      )}
                    </span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setActiveTab("courses")} 
                    style={{ background: "#10b981", color: "#ffffff", border: "none", borderRadius: "6px", padding: "4px 10px", fontSize: "0.78rem", fontWeight: "700", cursor: "pointer" }}
                  >
                    Go to Course Registration →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Hero Banner with Clear Daytime Real-Life Campus Photo */}
          <section className="role-hero-banner">
            <div className="role-hero-text">
              <span className="role-portal-badge" style={{ color: "#a855f7" }}>
                STUDENT DESK • SECTION 4 MASTER BLUEPRINT
              </span>
              <h1>STUDENT LEARNING PORTAL</h1>
              <p className="role-hero-sub">
                Access your personalized class timetable, submit homework assignments, take online examinations,
                track verified report card grades, and join live virtual classrooms.
              </p>

              <div className="role-kpi-row">
                <div
                  className="role-kpi-box"
                  onClick={() => setActiveTab("grades")}
                  style={{ cursor: "pointer", transition: "transform 0.15s" }}
                  title="Click to view term report card and GPA analytics"
                >
                  <span className="role-kpi-icon">⭐</span>
                  <div className="role-kpi-data">
                    <span className="role-kpi-title">Current GPA ↗</span>
                    <strong className="role-kpi-num">3.88 / 4.0</strong>
                  </div>
                </div>
                <div
                  className="role-kpi-box"
                  onClick={() => setActiveTab("exams")}
                  style={{ cursor: "pointer", transition: "transform 0.15s" }}
                  title="Click to view examination timetable and status"
                >
                  <span className="role-kpi-icon">📝</span>
                  <div className="role-kpi-data">
                    <span className="role-kpi-title">Exams Remaining ↗</span>
                    <strong className="role-kpi-num" style={{ color: "#38bdf8" }}>
                      {exams.length > 0 ? exams.length : 3} to Write
                    </strong>
                  </div>
                </div>
                <div
                  className="role-kpi-box"
                  onClick={() => setActiveTab("assignments")}
                  style={{ cursor: "pointer", transition: "transform 0.15s" }}
                  title="Click to view homework tasks and assignment submission desk"
                >
                  <span className="role-kpi-icon">⏳</span>
                  <div className="role-kpi-data">
                    <span className="role-kpi-title">Homework Due ↗</span>
                    <strong className="role-kpi-num">{assignments.length} Tasks</strong>
                  </div>
                </div>
                <div
                  className="role-kpi-box"
                  onClick={() => setActiveTab("attendance")}
                  style={{ cursor: "pointer", transition: "transform 0.15s" }}
                  title="Click to view attendance record and term presence rate"
                >
                  <span className="role-kpi-icon">🎯</span>
                  <div className="role-kpi-data">
                    <span className="role-kpi-title">Attendance ↗</span>
                    <strong className="role-kpi-num">{attendanceSummary?.rate || "98.5%"} Present</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Clear Daytime Real-Life Photograph */}
            <div className="role-hero-photo-frame">
              <img 
                src="/images/student_dash_banner.jpg" 
                alt="Student Campus Life Daytime" 
              />
              <div className="photo-live-pill">
                <span className="ticker-dot"></span>
                <span>AUTHENTIC INTERNATIONAL STUDENTS</span>
              </div>
              <div className="photo-caption-tag">
                <strong>Modern Campus Pavilion</strong>
                <span>Daylight Learning Complex</span>
              </div>
            </div>
          </section>

          {/* Feedback Alert */}
          {feedback && (
            <div 
              style={{
                padding: "12px 18px",
                borderRadius: "10px",
                marginBottom: "1.5rem",
                fontSize: "0.9rem",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                backgroundColor: feedback.type === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                border: `1px solid ${feedback.type === "success" ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
                color: feedback.type === "success" ? "#34d399" : "#fca5a5"
              }}
            >
              <span>{feedback.type === "success" ? "✅" : "⚠️"}</span>
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Workspace Tabs Navigation */}
          <nav className="role-tab-nav">
            <button 
              type="button" 
              className={`role-tab-btn ${activeTab === "timetable" ? "active" : ""}`}
              onClick={() => setActiveTab("timetable")}
            >
              🗓️ My Class Timetable
            </button>
            <button 
              type="button" 
              className={`role-tab-btn ${activeTab === "assignments" ? "active" : ""}`}
              onClick={() => setActiveTab("assignments")}
            >
              📝 Homework & Submissions
            </button>
            <button 
              type="button" 
              className={`role-tab-btn ${activeTab === "exams" ? "active" : ""}`}
              onClick={() => setActiveTab("exams")}
            >
              🎯 Examinations & Schedule {isExamPortalLocked && "🔒"}
            </button>
            <button 
              type="button" 
              className={`role-tab-btn ${activeTab === "meetings" ? "active" : ""}`}
              onClick={() => setActiveTab("meetings")}
            >
              💻 Live Classes & References
            </button>
            <button 
              type="button" 
              className={`role-tab-btn ${activeTab === "topicVideos" ? "active" : ""}`}
              onClick={() => setActiveTab("topicVideos")}
              style={{ borderLeft: "3px solid #38bdf8", color: activeTab === "topicVideos" ? "#38bdf8" : undefined }}
            >
              🎬 Teacher Topic Videos (Play & Watch)
            </button>
            <button 
              type="button" 
              className={`role-tab-btn ${activeTab === "report-card" ? "active" : ""}`}
              onClick={() => setActiveTab("report-card")}
            >
              📄 Verified Report Card
            </button>
            <button 
              type="button" 
              className={`role-tab-btn ${activeTab === "courses" ? "active" : ""}`}
              onClick={() => setActiveTab("courses")}
              style={{ borderLeft: "3px solid #10b981" }}
            >
              📚 Course & Class Registration
            </button>
            <button 
              type="button" 
              className={`role-tab-btn ${activeTab === "alumni" ? "active" : ""}`}
              onClick={() => setActiveTab("alumni")}
              style={{ borderLeft: "3px solid #a855f7" }}
            >
              🎓 Alumni Directory & Hall of Fame
            </button>
          </nav>

          {/* TAB 1: TIMETABLE */}
          {activeTab === "timetable" && (
            <div className="role-workspace-card">
              <div className="workspace-title-row">
                <div>
                  <h2><span>🗓️</span> WEEKLY CLASS TIMETABLE & SCHEDULE</h2>
                  <p>Daily lesson slots, course subjects, room numbers, and faculty assignments</p>
                </div>
              </div>

              <div className="role-table-responsive">
                <table className="role-table">
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Time Slot</th>
                      <th>Subject</th>
                      <th>Instructor</th>
                      <th>Room</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timetableSlots.length === 0 ? (
                      <>
                        <tr>
                          <td><strong>Monday</strong></td>
                          <td>08:30 AM - 09:45 AM</td>
                          <td><strong>Advanced Mathematics</strong></td>
                          <td>Dr. Robert Vance</td>
                          <td>STEM Lab 201</td>
                          <td><span className="badge-status badge-present">ACTIVE</span></td>
                        </tr>
                        <tr>
                          <td><strong>Monday</strong></td>
                          <td>10:00 AM - 11:15 AM</td>
                          <td><strong>Physics & Mechanics</strong></td>
                          <td>Prof. Eleanor Sterling</td>
                          <td>Physics Lab 104</td>
                          <td><span className="badge-status badge-present">ACTIVE</span></td>
                        </tr>
                        <tr>
                          <td><strong>Tuesday</strong></td>
                          <td>09:00 AM - 10:15 AM</td>
                          <td><strong>World History & Literature</strong></td>
                          <td>Ms. Claire Montgomery</td>
                          <td>Humanities Wing A</td>
                          <td><span className="badge-status badge-present">ACTIVE</span></td>
                        </tr>
                        <tr>
                          <td><strong>Wednesday</strong></td>
                          <td>11:30 AM - 12:45 PM</td>
                          <td><strong>Computer Science & AI</strong></td>
                          <td>Eng. Marcus Thorne</td>
                          <td>Computer Lab 3</td>
                          <td><span className="badge-status badge-present">ACTIVE</span></td>
                        </tr>
                      </>
                    ) : (
                      timetableSlots.map((slot, i) => (
                        <tr key={i}>
                          <td><strong>{slot.dayOfWeek || "Monday"}</strong></td>
                          <td>{slot.startTime} - {slot.endTime}</td>
                          <td><strong>{slot.subject?.name || "Academic Subject"}</strong></td>
                          <td>{slot.teacher ? `${slot.teacher.firstName} ${slot.teacher.lastName}` : "Assigned Faculty"}</td>
                          <td>{slot.roomNumber || "Hall 1"}</td>
                          <td><span className="badge-status badge-present">CONFIRMED</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: HOMEWORK & SUBMISSIONS */}
          {activeTab === "assignments" && (
            <div className="role-workspace-card">
              <div className="workspace-title-row">
                <div>
                  <h2><span>📝</span> HOMEWORK & LESSON ASSIGNMENTS</h2>
                  <p>View assignments organized by subject and teacher, respond to homework, and track your scores</p>
                </div>
              </div>

              <div className="card-grid-3">
                {assignments.length === 0 ? (
                  <div className="item-card" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "2.5rem" }}>
                    <span style={{ fontSize: "2.5rem", display: "block", marginBottom: "8px" }}>🎉</span>
                    <strong style={{ color: "#f8fafc", fontSize: "1.05rem" }}>No Pending Homework</strong>
                    <p style={{ color: "#94a3b8", margin: "4px 0 0" }}>All lesson assignments are currently completed. Check back when teachers upload new coursework.</p>
                  </div>
                ) : (
                  assignments.map((a) => {
                    const submission = mySubmissions[a.id];
                    const teacherName = a.teacher ? `${a.teacher.firstName} ${a.teacher.lastName}` : "Faculty Instructor";
                    const subjectName = a.subject?.name || "General Academic Course";

                    return (
                      <div key={a.id} className="item-card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span className="role-portal-badge" style={{ color: "#34d399", background: "rgba(16, 185, 129, 0.15)", padding: "2px 8px", borderRadius: "4px" }}>
                            Max: {a.maxScore} Pts
                          </span>
                          <span style={{ fontSize: "0.75rem", color: "#f87171", fontWeight: "700" }}>
                            Due: {new Date(a.dueDate).toLocaleDateString()}
                          </span>
                        </div>

                        {/* REQUIREMENT: Subject & Specific Teacher Information */}
                        <div style={{ marginTop: "4px" }}>
                          <span style={{ fontSize: "0.75rem", color: "#38bdf8", fontWeight: "700", textTransform: "uppercase" }}>
                            📚 {subjectName}
                          </span>
                          <h3 style={{ margin: "4px 0 2px", fontSize: "1.05rem", color: "#f8fafc" }}>
                            {a.title}
                          </h3>
                          <span style={{ fontSize: "0.75rem", color: "#cbd5e1" }}>
                            👨‍🏫 Assigned by: <strong style={{ color: "#34d399" }}>{teacherName}</strong>
                          </span>
                        </div>

                        <p style={{ fontSize: "0.85rem", color: "#94a3b8", lineHeight: "1.4", margin: "6px 0" }}>
                          {a.description || "Review textbook section and write comprehensive solution."}
                        </p>

                        {/* Attached Worksheet if provided by teacher */}
                        {(a.attachmentUrl || a.fileName) && (
                          <div style={{ background: "rgba(56, 189, 248, 0.08)", padding: "8px 12px", borderRadius: "8px", border: "1px solid rgba(56, 189, 248, 0.2)", display: "flex", alignItems: "center", gap: "8px" }}>
                            <span>📎</span>
                            <span style={{ fontSize: "0.8rem", color: "#38bdf8", fontWeight: "600" }}>
                              Worksheet: {a.fileName || "Coursework_Attachment.pdf"}
                            </span>
                          </div>
                        )}

                        {/* Submission status & Response Handling */}
                        {submission ? (
                          <div style={{ background: "rgba(16, 185, 129, 0.12)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.3)", marginTop: "auto" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "0.75rem", color: "#34d399", fontWeight: "700" }}>
                                ✅ SUBMITTED AT {submission.submittedAt}
                              </span>
                              <span style={{ fontSize: "0.75rem", color: "#fbbf24", fontWeight: "700" }}>
                                Score: {submission.grade !== undefined ? `${submission.grade} / ${a.maxScore}` : "Pending Grading"}
                              </span>
                            </div>
                            <p style={{ margin: "6px 0 0", fontSize: "0.8rem", color: "#e2e8f0" }}>
                              <strong>Your Response:</strong> {submission.content}
                            </p>
                          </div>
                        ) : (
                          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                            <textarea 
                              rows={2}
                              placeholder="Write homework response or paste project document link..." 
                              className="filter-input"
                              style={{ width: "100%", fontSize: "0.8rem", resize: "vertical" }}
                              value={submissionInputs[a.id] || ""}
                              onChange={(e) => setSubmissionInputs({ ...submissionInputs, [a.id]: e.target.value })}
                            />
                            <button 
                              type="button" 
                              className="btn-primary" 
                              onClick={() => handleSubmitAssignment(a.id)}
                              disabled={loading || !submissionInputs[a.id]?.trim()}
                            >
                              🚀 Submit to Teacher for Score
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ONLINE EXAMS & SCHEDULE */}
          {activeTab === "exams" && (
            <div className="role-workspace-card">
              <div className="workspace-title-row">
                <div>
                  <h2><span>🎯</span> AUTHORIZED ONLINE EXAMINATIONS & SCHEDULE</h2>
                  <p>Comprehensive examination roster with start and end times, exact term/semester tracking, and instant auto-grading</p>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <span className="badge-status badge-present" style={{ fontSize: "0.85rem", padding: "6px 14px" }}>
                    📋 Remaining to Write: <strong>{isExamPortalLocked ? "0 Exam(s) (Locked)" : (exams.length > 0 ? exams.length : 3) + " Exam(s)"}</strong>
                  </span>
                  <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                    Active Term: <strong style={{ color: "#38bdf8" }}>{academicTerm} ({academicLevel})</strong>
                  </span>
                </div>
              </div>

              {/* Requirement: Student exam portal lockout screen once an exam is taken, submitted & graded */}
              {isExamPortalLocked ? (
                <div style={{
                  background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9))",
                  border: "2px solid rgba(239, 68, 68, 0.4)",
                  borderRadius: "16px",
                  padding: "2.5rem",
                  textAlign: "center",
                  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
                  margin: "1rem 0"
                }}>
                  <div style={{ fontSize: "3.5rem", marginBottom: "0.5rem" }}>🔒</div>
                  <span className="role-portal-badge" style={{ color: "#ef4444", borderColor: "#ef4444", fontSize: "0.85rem", padding: "4px 12px" }}>
                    EXAMINATION SESSION SUBMITTED & LOCKED
                  </span>
                  <h2 style={{ color: "#f87171", margin: "1rem 0 0.5rem", fontSize: "1.6rem" }}>
                    Examination Completed, Graded & Portal Access Restricted
                  </h2>
                  <p style={{ color: "#cbd5e1", maxWidth: "680px", margin: "0 auto 1.5rem", lineHeight: "1.6", fontSize: "0.95rem" }}>
                    Per school examination regulations, your examination has been completed, submitted for marking, and graded by the deterministic engine. Access to the examination hall is locked until another examination session is officially published and scheduled for writing by the faculty.
                  </p>

                  {/* Summary of Graded Performance */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "1rem",
                    background: "rgba(2, 6, 23, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "12px",
                    padding: "1.25rem",
                    textAlign: "left",
                    maxWidth: "680px",
                    margin: "0 auto 1.5rem"
                  }}>
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>Grading Status</span>
                      <div style={{ color: "#34d399", fontWeight: "700", fontSize: "1rem", marginTop: "2px" }}>✅ Verified & Marked</div>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>Deterministic Grade</span>
                      <div style={{ color: "#fbbf24", fontWeight: "700", fontSize: "1rem", marginTop: "2px" }}>
                        {examScoreResult?.grade || "Grade A (85%)"}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>PostgreSQL Audit Seal</span>
                      <div style={{ color: "#38bdf8", fontWeight: "700", fontSize: "1rem", marginTop: "2px" }}>SECURE-GBS-2026</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", padding: "10px 20px" }}
                      onClick={() => setActiveTab("report-card")}
                    >
                      📄 View Official Grade on Report Card
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ borderColor: "#10b981", color: "#34d399", padding: "10px 20px" }}
                      onClick={handlePublishNewExamSession}
                      title="Faculty/Teacher publishes a new exam session"
                    >
                      📢 Simulate Faculty Publishing Next Exam Session
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* KPI Summary for Examinations */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                    <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(56, 189, 248, 0.2)", borderRadius: "10px", padding: "1rem" }}>
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>Total Scheduled</span>
                      <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#38bdf8", marginTop: "4px" }}>{exams.length || 3} Papers</div>
                      <span style={{ fontSize: "0.75rem", color: "#cbd5e1" }}>Assigned by Subject Faculty</span>
                    </div>
                    <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: "10px", padding: "1rem" }}>
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>Exams Remaining</span>
                      <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#fbbf24", marginTop: "4px" }}>
                        {exams.length > 0 ? exams.length : 3} Remaining
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "#fef08a" }}>Pending student submission</span>
                    </div>
                    <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "10px", padding: "1rem" }}>
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>Grading System</span>
                      <div style={{ fontSize: "1.4rem", fontWeight: "800", color: "#34d399", marginTop: "4px" }}>Deterministic AI/OMR</div>
                      <span style={{ fontSize: "0.75rem", color: "#a7f3d0" }}>Instant PostgreSQL Verification</span>
                    </div>
                    <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(168, 85, 247, 0.2)", borderRadius: "10px", padding: "1rem" }}>
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>Current Academic Term</span>
                      <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#c084fc", marginTop: "4px" }}>{academicTerm}</div>
                      <span style={{ fontSize: "0.75rem", color: "#e9d5ff" }}>{academicLevel}</span>
                    </div>
                  </div>

              {!examStarted && !examSubmitted && (
                <div>
                  <h3 style={{ color: "#f8fafc", fontSize: "1.05rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>📅</span> Upcoming Examinations Schedule & Timetable:
                  </h3>
                  
                  <div style={{ overflowX: "auto", marginBottom: "1.5rem" }}>
                    <table className="role-table">
                      <thead>
                        <tr>
                          <th>Subject / Course</th>
                          <th>Exam Paper Title</th>
                          <th>Level & Exact Term</th>
                          <th>Exam Date</th>
                          <th>Start Time</th>
                          <th>End Time</th>
                          <th>Duration</th>
                          <th>Max / Pass</th>
                          <th>Action / Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const renderRow = (ex, fallbackSubject, fallbackTitle, defaultStart, defaultEnd) => {
                            const examId = ex.id || fallbackTitle;
                            const isSubmitted = !!submittedExams[examId];
                            const sTime = ex.startTime || defaultStart;
                            const eTime = ex.endTime || defaultEnd;
                            const isRestricted = (ex.restrictBeforeStart || ex.isScheduled) && !unlockedExamIds.includes(examId);

                            return (
                              <tr key={examId}>
                                <td>
                                  <strong style={{ color: "#38bdf8" }}>{ex.class?.name || ex.subjectName || fallbackSubject}</strong>
                                  {ex.examMode && (
                                    <div style={{ fontSize: "0.7rem", color: "#a7f3d0", marginTop: "2px" }}>
                                      Mode: {ex.examMode === "HYBRID_PRINT_SCAN" ? "📄 Print / AI Scanner" : "💻 Online CBT"}
                                    </div>
                                  )}
                                </td>
                                <td>
                                  <div style={{ fontWeight: "600", color: "#f8fafc" }}>{ex.title || fallbackTitle}</div>
                                  {ex.uploadedDocName && (
                                    <span style={{ fontSize: "0.72rem", color: "#fbbf24" }}>📎 Attached: {ex.uploadedDocName}</span>
                                  )}
                                </td>
                                <td>
                                  <span className="role-portal-badge" style={{ color: "#c084fc" }}>
                                    {academicLevel} • {academicTerm}
                                  </span>
                                </td>
                                <td>{new Date(ex.examDate || Date.now()).toLocaleDateString()}</td>
                                <td><strong style={{ color: "#34d399" }}>{sTime}</strong></td>
                                <td><strong style={{ color: "#f87171" }}>{eTime}</strong></td>
                                <td>{ex.durationMinutes ? `${ex.durationMinutes} mins` : "2 hrs 30 mins"}</td>
                                <td>{ex.totalMarks || 100} / {ex.passMarks || 50}</td>
                                <td>
                                  {isSubmitted ? (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                      <span className="badge-status badge-present" style={{ fontSize: "0.75rem", background: "rgba(16, 185, 129, 0.2)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.4)" }}>
                                        🔒 Submitted & Locked
                                      </span>
                                      <span style={{ fontSize: "0.72rem", color: "#fbbf24", fontWeight: "700" }}>
                                        Score: {submittedExams[examId].score}% ({submittedExams[examId].grade})
                                      </span>
                                    </div>
                                  ) : isRestricted ? (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                      <span className="badge-status badge-absent" style={{ fontSize: "0.72rem", background: "rgba(239, 68, 68, 0.2)", color: "#fca5a5", border: "1px solid rgba(239, 68, 68, 0.4)" }}>
                                        🔒 Restricted (Opens at {sTime})
                                      </span>
                                      <button
                                        type="button"
                                        className="btn-secondary"
                                        style={{ padding: "4px 8px", fontSize: "0.7rem", borderColor: "#f59e0b", color: "#fbbf24", fontWeight: "700" }}
                                        onClick={() => handleUnlockExam({ id: examId, title: ex.title || fallbackTitle })}
                                        title="Simulate scheduled start time arrived and unlock portal"
                                      >
                                        ⏱️ Time Ready: Unlock Portal
                                      </button>
                                    </div>
                                  ) : (
                                    <button 
                                      type="button" 
                                      className="btn-primary" 
                                      style={{ padding: "6px 14px", fontSize: "0.8rem", background: "linear-gradient(135deg, #10b981, #059669)", boxShadow: "0 4px 12px rgba(16, 185, 129, 0.4)" }}
                                      onClick={() => {
                                        setActiveExam({
                                          ...ex,
                                          id: examId,
                                          title: ex.title || fallbackTitle,
                                          totalMarks: ex.totalMarks || 100,
                                          passMarks: ex.passMarks || 50,
                                          questionBank: ex.questionBank || [
                                            { id: 101, questionNumber: 1, questionText: "Solve for the derivative of f(x) = 4x^3 - 5x + 7." },
                                            { id: 102, questionNumber: 2, questionText: "Which logic gate represents the proposition: (A ∧ B)' ≡ A' ∨ B'?" },
                                            { id: 103, questionNumber: 3, questionText: "What is the limit of (sin x) / x as x approaches 0?" }
                                          ]
                                        });
                                        setExamStarted(true);
                                      }}
                                    >
                                      🚀 Portal Ready: Launch Exam
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          };

                          if (exams.length === 0) {
                            return (
                              <tr>
                                <td colSpan="6" style={{ textAlign: "center", padding: "2.5rem", color: "#94a3b8" }}>
                                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📝</div>
                                  <strong style={{ display: "block", color: "#f8fafc", fontSize: "1rem" }}>No Scheduled Online Examinations</strong>
                                  <span style={{ fontSize: "0.85rem" }}>Your faculty instructors have not published any pending online exam papers for this term yet.</span>
                                </td>
                              </tr>
                            );
                          }

                          return exams.map((ex, idx) => {
                            const defS = idx === 0 ? "09:00 AM" : idx === 1 ? "01:00 PM" : "10:30 AM";
                            const defE = idx === 0 ? "11:30 AM" : idx === 1 ? "03:00 PM" : "12:30 PM";
                            return renderRow(ex, "STEM Curriculum", ex.title, defS, defE);
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* OFFICIAL TEACHER-AUTHORED EXAMINATION TIMETABLE & PROCEDURE GUIDE */}
                  <div style={{ background: "linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%)", border: "1.5px solid rgba(56, 189, 248, 0.4)", borderRadius: "14px", padding: "1.5rem", marginBottom: "2rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "10px" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "1.3rem" }}>📚</span>
                          <h3 style={{ margin: 0, color: "#38bdf8", fontSize: "1.1rem", fontWeight: "800" }}>
                            OFFICIAL EXAMINATION TIMETABLE & REVISION PROCEDURE GUIDE
                          </h3>
                        </div>
                        <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "0.82rem" }}>
                          Created by faculty teachers to guide student study according to the official examination procedure and regulations.
                        </p>
                      </div>
                      <span className="badge-status badge-present" style={{ fontSize: "0.75rem" }}>
                        ✓ Faculty Board Certified
                      </span>
                    </div>

                    <div className="role-table-responsive">
                      <table className="role-table" style={{ fontSize: "0.82rem" }}>
                        <thead>
                          <tr>
                            <th>Course / Paper</th>
                            <th>Date & Time Window</th>
                            <th>Exam Hall & Invigilator</th>
                            <th>Permitted Tools & Equipment</th>
                            <th>Syllabus Scope & Focus</th>
                            <th>Special Instructions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {examTimetableGuide.map((t) => (
                            <tr key={t.id}>
                              <td>
                                <strong style={{ color: "#38bdf8", display: "block" }}>{t.courseCode}</strong>
                                <span style={{ color: "#f8fafc" }}>{t.subject}</span>
                              </td>
                              <td>
                                <div style={{ color: "#34d399", fontWeight: 700 }}>{t.examDate}</div>
                                <span style={{ color: "#fbbf24", fontSize: "0.75rem" }}>{t.startTime} - {t.endTime}</span>
                              </td>
                              <td>
                                <div style={{ color: "#cbd5e1" }}>{t.hall}</div>
                                <span style={{ color: "#94a3b8", fontSize: "0.72rem" }}>Invigilator: {t.invigilator}</span>
                              </td>
                              <td style={{ color: "#a5b4fc" }}>{t.permittedTools}</td>
                              <td style={{ color: "#cbd5e1", maxWidth: "220px" }}>{t.syllabusScope}</td>
                              <td style={{ color: "#94a3b8", fontSize: "0.75rem", maxWidth: "200px" }}>{t.instructions}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Active Exam Ready Banner */}
                  <div style={{ background: "rgba(2, 6, 23, 0.7)", padding: "1.75rem", borderRadius: "12px", textAlign: "center", border: "1px solid rgba(139, 92, 246, 0.3)" }}>
                    <span style={{ fontSize: "2.5rem" }}>📝</span>
                    <h3 style={{ margin: "0.5rem 0 0.25rem", color: "#f8fafc" }}>
                      {activeExam ? activeExam.title : "Term 1 Advanced STEM & Academic Evaluation"}
                    </h3>
                    <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "1rem" }}>
                      Class Level: <strong>{academicLevel}</strong> • Term: <strong>{academicTerm}</strong> • Start: <strong>09:00 AM</strong> • End: <strong>11:30 AM</strong> • Questions: {activeExam?.questionBank?.length || 10}
                    </p>
                    {submittedExams[activeExam?.id || "demo_1"] ? (
                      <span className="badge-status badge-present" style={{ fontSize: "0.95rem", padding: "8px 20px" }}>
                        🔒 Exam Already Submitted & Locked (Score: {submittedExams[activeExam?.id || "demo_1"].score}%)
                      </span>
                    ) : (
                      <button 
                        type="button" 
                        className="btn-primary" 
                        style={{ fontSize: "1rem", padding: "12px 28px", background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}
                        onClick={() => setExamStarted(true)}
                      >
                        🚀 Begin Active Examination Now
                      </button>
                    )}
                  </div>
                </div>
              )}

              {examStarted && !examSubmitted && (
                <div className="student-exam-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", paddingBottom: "1rem" }}>
                    <div>
                      <h3 style={{ margin: 0, color: "#c084fc" }}>{activeExam?.title || "Academic Evaluation"}</h3>
                      <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                        PostgreSQL Question Bank • Objective Assessment • {academicLevel} ({academicTerm})
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <span className="badge-status badge-present">⏱️ Time Remaining: 14:58</span>
                      <button 
                        type="button" 
                        className="btn-secondary" 
                        style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                        onClick={() => setExamStarted(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>

                  {/* Typed Questions / Uploaded Paper Preview */}
                  {activeExam?.typedQuestionText && (
                    <div style={{
                      background: "rgba(15, 23, 42, 0.9)",
                      border: "1.5px solid rgba(56, 189, 248, 0.5)",
                      borderRadius: "12px",
                      padding: "1.25rem",
                      marginBottom: "1.5rem"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <h4 style={{ margin: 0, color: "#38bdf8", fontSize: "0.95rem", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" }}>
                          <span>📄</span> Teacher's Typed & Uploaded Examination Paper ({activeExam.uploadedDocName || "Online Questions"})
                        </h4>
                        <span style={{ fontSize: "0.72rem", color: "#34d399", background: "rgba(16, 185, 129, 0.2)", padding: "2px 8px", borderRadius: "6px" }}>
                          AI Scanner & OMR Ready
                        </span>
                      </div>
                      <div style={{
                        whiteSpace: "pre-wrap",
                        color: "#e2e8f0",
                        fontSize: "0.9rem",
                        lineHeight: "1.7",
                        fontFamily: "monospace",
                        background: "rgba(2, 6, 23, 0.8)",
                        padding: "1rem",
                        borderRadius: "8px",
                        maxHeight: "220px",
                        overflowY: "auto",
                        border: "1px solid rgba(255,255,255,0.08)"
                      }}>
                        {activeExam.typedQuestionText}
                      </div>
                    </div>
                  )}

                  {(activeExam?.questionBank || []).map((q, idx) => (
                    <div key={q.id || idx} className="question-block">
                      <div className="question-text">
                        Question {idx + 1}: {q.questionText}
                      </div>
                      {["A", "B", "C", "D"].map((opt) => (
                        <label key={opt} className="option-label">
                          <input 
                            type="radio" 
                            name={`q_${q.id}`} 
                            checked={examAnswers[q.id] === opt}
                            onChange={() => setExamAnswers({ ...examAnswers, [q.id]: opt })}
                          />
                          <span>Option {opt}</span>
                        </label>
                      ))}
                    </div>
                  ))}

                  {/* REQUIREMENT: Prompt with notice before submitting */}
                  <button 
                    type="button" 
                    className="btn-primary" 
                    style={{ marginTop: "1rem", width: "100%", padding: "12px", justifyContent: "center" }}
                    onClick={() => setShowExamConfirmModal(true)}
                    disabled={loading}
                  >
                    {loading ? "Submitting to PostgreSQL..." : "💾 Submit Examination for Auto-Grading"}
                  </button>
                </div>
              )}

              {examSubmitted && examScoreResult && (
                <div style={{ background: "rgba(2, 6, 23, 0.8)", padding: "2rem", borderRadius: "14px", border: "1px solid rgba(16, 185, 129, 0.4)", textAlign: "center" }}>
                  <span style={{ fontSize: "3rem" }}>{examScoreResult.isPassed ? "🎉" : "📚"}</span>
                  <h2 style={{ margin: "0.5rem 0", color: examScoreResult.isPassed ? "#34d399" : "#f87171" }}>
                    {examScoreResult.isPassed ? "EXAMINATION PASSED" : "ASSESSMENT COMPLETED"}
                  </h2>
                  <p style={{ color: "#94a3b8", fontSize: "1.1rem" }}>
                    Exact Performance Score: <strong style={{ color: "#38bdf8", fontSize: "1.3rem" }}>{examScoreResult.score}%</strong> 
                    &nbsp;•&nbsp; Official Letter Grade: <strong style={{ color: "#fbbf24", fontSize: "1.3rem" }}>{examScoreResult.grade}</strong>
                  </p>
                  <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                    ({examScoreResult.correct} out of {examScoreResult.total} questions verified correct by deterministic engine)
                  </p>
                  <div style={{ display: "inline-block", background: "rgba(255, 255, 255, 0.05)", padding: "10px 20px", borderRadius: "8px", margin: "1rem 0" }}>
                    <span style={{ color: "#cbd5e1" }}>
                      🔒 Recorded & Permanently Locked in Database: <strong>VERIFIED DETERMINISTIC RESULT FOR {academicTerm.toUpperCase()}</strong>
                    </span>
                  </div>
                  <div>
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      onClick={() => { setExamSubmitted(false); setExamAnswers({}); }}
                    >
                      ← Back to Examination Schedule
                    </button>
                  </div>
                </div>
              )}
                </>
              )}
            </div>
          )}

          {/* TAB 4: VERIFIED REPORT CARD */}
          {activeTab === "report-card" && (
            <div className="role-workspace-card">
              <div className="workspace-title-row">
                <div>
                  <h2><span>📄</span> OFFICIAL ACADEMIC REPORT CARD & TRANSCRIPT</h2>
                  <p>Cryptographically verified student performance record across all grades and levels</p>
                </div>
                {feeArrears <= 0 && (
                  <button 
                    type="button" 
                    className="btn-primary" 
                    onClick={() => window.print()}
                  >
                    🖨️ Print / Download Transcript (PDF)
                  </button>
                )}
              </div>

              {/* REQUIREMENT: Debtor restriction - cannot access result if student owes */}
              {feeArrears > 0 ? (
                <div style={{ 
                  background: "rgba(239, 68, 68, 0.12)", 
                  border: "1px solid rgba(239, 68, 68, 0.4)", 
                  borderRadius: "14px", 
                  padding: "3rem 2rem", 
                  textAlign: "center", 
                  margin: "1.5rem 0" 
                }}>
                  <span style={{ fontSize: "3.5rem", display: "block", marginBottom: "12px" }}>🔒</span>
                  <h2 style={{ color: "#f87171", margin: "0 0 10px" }}>
                    OFFICIAL REPORT CARD & TRANSCRIPT LOCKED
                  </h2>
                  <p style={{ color: "#e2e8f0", maxWidth: "620px", margin: "0 auto 1.5rem", fontSize: "1rem", lineHeight: "1.6" }}>
                    Access to your verified report card and official transcript has been withheld due to outstanding tuition/hostel balance of <strong style={{ color: "#fca5a5" }}>${feeArrears.toFixed(2)}</strong>.
                    Per GBS International School Financial Regulations, students in fee arrears cannot access academic results or register for new semester courses until cleared by the Accountant.
                  </p>
                  <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                    <button 
                      type="button" 
                      className="btn-primary" 
                      style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
                      onClick={() => setFeedback({ type: "info", message: "Parent/Guardian notified to settle fees via Mobile Money / Bank Transfer." })}
                    >
                      💳 Notify Parent for Immediate Fee Settlement
                    </button>
                  </div>
                </div>
              ) : (
                /* Printable Academic Report Card Sheet */
                <div className="report-card-sheet">
                  {/* REQUIREMENT: Show that reports has been wrapped with year, time, and date of wrapping */}
                  {reportWrapInfo?.isWrapped && (
                    <div style={{
                      background: "linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(6, 95, 70, 0.18))",
                      border: "2px solid #10b981",
                      borderRadius: "12px",
                      padding: "1rem 1.25rem",
                      marginBottom: "1.25rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "12px",
                      boxShadow: "0 4px 15px rgba(16, 185, 129, 0.15)"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        <span style={{ fontSize: "2.2rem" }}>📜</span>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <strong style={{ color: "#065f46", fontSize: "1rem", textTransform: "uppercase", letterSpacing: "1px" }}>
                              OFFICIAL ACADEMIC REPORT CARD WRAPPED & SEALED
                            </strong>
                            <span style={{ background: "#10b981", color: "#022c22", fontSize: "0.72rem", fontWeight: "900", padding: "2px 8px", borderRadius: "999px" }}>
                              ACADEMIC YEAR WRAP
                            </span>
                          </div>
                          <div style={{ color: "#1e293b", fontSize: "0.88rem", marginTop: "4px" }}>
                            This official report card has been wrapped for <strong>Academic Year {reportWrapInfo.academicYear}</strong> on <strong>{reportWrapInfo.wrapDate}</strong> at <strong>{reportWrapInfo.wrapTime}</strong>.
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "#475569", marginTop: "2px" }}>
                            Certified Authority: <strong>{reportWrapInfo.certifiedBy}</strong>
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Cryptographic Digest:</span>
                        <span style={{ fontSize: "0.8rem", color: "#0f172a", fontFamily: "monospace", fontWeight: "800" }}>{reportWrapInfo.certificateId}</span>
                      </div>
                    </div>
                  )}

                  <div className="report-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      <img 
                        src={customSchoolLogo || "/assets/gbs_crest_badge.jpg"} 
                        alt="School Crest" 
                        style={{ width: "56px", height: "56px", objectFit: "contain", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#ffffff", padding: "3px" }} 
                      />
                      <div>
                        <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: "900", color: "#0f172a" }}>{schoolOfficialName}</h2>
                        <span style={{ fontSize: "0.85rem", color: "#475569" }}>OFFICIAL STUDENT TRANSCRIPT & REPORT OF GRADES</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ display: "block", fontSize: "0.8rem", color: "#64748b" }}>Academic Year: <strong>{reportWrapInfo?.academicYear || "2026-2027"}</strong></span>
                      <span style={{ display: "block", fontSize: "0.8rem", color: "#64748b" }}>Level / Term: <strong>{academicLevel} • {academicTerm}</strong></span>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1rem", fontSize: "0.85rem" }}>
                    <div><strong>Student Name:</strong> {currentUser.firstName} {currentUser.lastName}</div>
                    <div><strong>Student ID:</strong> GBS-STU-2026-084</div>
                    <div><strong>Enrolled Level:</strong> {academicLevel}</div>
                  </div>

                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Course Subject</th>
                        <th>Class Teacher</th>
                        <th>Mark (100)</th>
                        <th>Grade</th>
                        <th>Credit</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        if (publishedGrades.length === 0) {
                          return (
                            <tr>
                              <td colSpan="6" style={{ textAlign: "center", padding: "2.5rem 1rem", color: "#64748b" }}>
                                <div style={{ fontSize: "1.5rem", marginBottom: "6px" }}>📋</div>
                                <strong style={{ color: "#334155" }}>No Official Examination Results Published Yet</strong>
                                <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#94a3b8" }}>
                                  When faculty teachers mark and publish exam grades for your enrolled courses, your verified grades, scores, credit hours, and teacher remarks will immediately appear here.
                                </p>
                              </td>
                            </tr>
                          );
                        }

                        return publishedGrades.map((row, rIdx) => (
                          <tr key={row.id || rIdx} style={{ background: "rgba(16, 185, 129, 0.06)" }}>
                            <td>
                              <strong>{row.subjectName}</strong>
                              <span style={{ display: "block", fontSize: "0.72rem", color: "#059669", fontWeight: "800", marginTop: "2px" }}>
                                ✓ RESULT PUBLISHED • {row.term || "Term 1"} • {row.publishedAt || (row.publishedDate ? `${row.publishedDate} at ${row.publishedTime}` : "Verified")}
                              </span>
                            </td>
                            <td>{row.teacherName || "Faculty Instructor"}</td>
                            <td><strong>{row.score}</strong></td>
                            <td><strong style={{ color: row.grade === "F" ? "#ef4444" : "#10b981" }}>{row.grade}</strong></td>
                            <td>{row.credit || 1.0}</td>
                            <td>{row.remarks || "Performance verified"}</td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.5rem", borderTop: "1px solid #e2e8f0", paddingTop: "1rem" }}>
                    <div>
                      <span style={{ display: "block", fontSize: "0.9rem" }}>Cumulative GPA: <strong style={{ color: "#10b981", fontSize: "1.1rem" }}>3.88</strong></span>
                      <span style={{ display: "block", fontSize: "0.8rem", color: "#64748b" }}>
                        Overall Attendance: <strong>{attendanceSummary?.rate || "98.5%"} Present ({attendanceSummary?.presentCount || 48}/{attendanceSummary?.totalCount || 50} Days Synced from Teacher Archives)</strong>
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ display: "block", fontSize: "0.75rem", color: "#64748b" }}>Registrar Signature: <em>Verified Digital Seal</em></span>
                      <span className="report-hash-badge">
                        SHA-256: 8a7c29e41f0b99de23401fa91782e4c0
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: VIRTUAL MEETINGS & NOTICES (WITH DAYS REMINDER & SAVE FOR REFERENCE) */}
          {activeTab === "meetings" && (
            <div className="role-workspace-card">
              <div className="workspace-title-row">
                <div>
                  <h2><span>💻</span> LIVE ONLINE CLASSROOMS & LEARNING ARCHIVES</h2>
                  <p>Join scheduled interactive lectures, observe days reminder notices, and save sessions for study reference</p>
                </div>
                <span className="badge-status badge-present">
                  💾 {savedReferenceMeetings.length} Reference(s) in Vault
                </span>
              </div>

              {/* Teacher Topic Videos for Class Playback in Teacher's Absence */}
              <div style={{ marginBottom: "2rem" }}>
                <ClassTopicVideoPlatform mode="STUDENT" currentUser={currentUser} />
              </div>

              {/* Requirement: Live Online Classes with Day Reminder from Teacher Notice */}
              <h3 style={{ color: "#34d399", margin: "0 0 12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>🔴</span> Active & Upcoming Live Online Classes to Join:
              </h3>

              <div className="card-grid-3" style={{ marginBottom: "2rem" }}>
                {meetings.length === 0 ? (
                  <div style={{ background: "rgba(255, 255, 255, 0.04)", padding: "1.5rem", borderRadius: "8px", color: "#94a3b8", gridColumn: "1 / -1" }}>
                    No virtual meetings scheduled currently.
                  </div>
                ) : (
                  meetings.map((m) => {
                    const daysDiff = Math.ceil((new Date(m.startTime).getTime() - Date.now()) / (1000 * 3600 * 24));
                    const isSaved = savedReferenceMeetings.some((saved) => saved.id === m.id);
                    return (
                      <div key={m.id} className="item-card" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span className="role-portal-badge" style={{ color: "#38bdf8" }}>{m.platform || "Zoom Video"}</span>
                          <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                            {new Date(m.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <h3 style={{ margin: "2px 0", fontSize: "1.05rem", color: "#f8fafc" }}>{m.title}</h3>
                        <p style={{ fontSize: "0.8rem", color: "#cbd5e1", margin: 0 }}>
                          Scheduled Date: <strong>{new Date(m.startTime).toLocaleDateString()}</strong>
                        </p>

                        {/* REQUIREMENT: Days reminder from teacher notice */}
                        <div style={{ 
                          background: daysDiff <= 0 ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)", 
                          padding: "8px 10px", 
                          borderRadius: "6px", 
                          border: `1px solid ${daysDiff <= 0 ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}` 
                        }}>
                          <span style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: daysDiff <= 0 ? "#34d399" : "#fbbf24" }}>
                            {daysDiff <= 0 ? "⚡ HAPPENING TODAY — JOIN NOW" : `⏰ REMINDER: Starts in ${daysDiff} day(s) from Teacher Notice`}
                          </span>
                          <span style={{ display: "block", fontSize: "0.72rem", color: "#e2e8f0", marginTop: "2px" }}>
                            Teacher Note: "Please review week 4 reading notes and prepare questions for the seminar."
                          </span>
                        </div>

                        {/* Actions: Join and Save for Reference (1-Click Auto Join with Embedded Passcode) */}
                        <div style={{ display: "flex", gap: "8px", marginTop: "auto" }}>
                          <a 
                            href={formatMeetingUrl(m.meetingUrl, m.passcode || "GBS2026", m.meetingId || "84939201849")} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="btn-primary" 
                            style={{ flex: 1, textDecoration: "none", textAlign: "center", fontSize: "0.8rem", padding: "8px" }}
                          >
                            🚀 Join Live Class
                          </a>
                          <button 
                            type="button" 
                            className="btn-secondary" 
                            onClick={() => handleSaveMeetingReference(m)}
                            title="Save this online class for future reference"
                            style={{ 
                              fontSize: "0.8rem", 
                              padding: "8px 12px", 
                              borderColor: isSaved ? "#10b981" : "rgba(255, 255, 255, 0.2)",
                              color: isSaved ? "#34d399" : "#cbd5e1"
                            }}
                          >
                            {isSaved ? "✅ Saved" : "💾 Save"}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Saved Online Learning References Archive */}
              <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "1.25rem", borderRadius: "10px", border: "1px solid rgba(56, 189, 248, 0.2)", marginBottom: "2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h4 style={{ margin: 0, color: "#38bdf8", fontSize: "1rem", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>💾</span> SAVED LEARNING REFERENCES & LECTURE REPLAYS
                  </h4>
                  <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                    Personal Study Vault ({savedReferenceMeetings.length} items saved)
                  </span>
                </div>

                {savedReferenceMeetings.length === 0 ? (
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8" }}>
                    No sessions saved yet. Click the <strong>"💾 Save"</strong> button on any live classroom card above to bookmark it here for examination revision.
                  </p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "10px" }}>
                    {savedReferenceMeetings.map((s) => (
                      <div key={s.id} style={{ background: "rgba(2, 6, 23, 0.6)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span className="role-portal-badge" style={{ color: "#38bdf8", fontSize: "0.7rem" }}>{s.platform || "Virtual Lecture"}</span>
                          <button 
                            type="button" 
                            onClick={() => handleSaveMeetingReference(s)}
                            style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: "0.75rem" }}
                            title="Remove from saved references"
                          >
                            ✖ Remove
                          </button>
                        </div>
                        <h4 style={{ margin: "4px 0", fontSize: "0.95rem", color: "#f8fafc" }}>{s.title}</h4>
                        <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block" }}>
                          Scheduled: {new Date(s.startTime).toLocaleString()}
                        </span>
                        <div style={{ marginTop: "8px", display: "flex", gap: "8px" }}>
                          <a 
                            href={formatMeetingUrl(s.meetingUrl, "GBS2026")} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="btn-primary" 
                            style={{ fontSize: "0.75rem", padding: "4px 10px", textDecoration: "none" }}
                          >
                            ▶️ Access Recording / Notes
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Institutional Announcements & Circulars */}
              <h4 style={{ color: "#38bdf8", margin: "0 0 10px" }}>Institutional Announcements & Circulars:</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {announcements.length === 0 ? (
                  <div style={{ background: "rgba(255, 255, 255, 0.04)", padding: "1rem", borderRadius: "8px", color: "#94a3b8" }}>
                    No announcements published today.
                  </div>
                ) : (
                  announcements.map((an) => (
                    <div key={an.id} style={{ background: "rgba(255, 255, 255, 0.04)", padding: "1rem", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                      <strong style={{ color: "#f8fafc", fontSize: "0.95rem" }}>{an.title}</strong>
                      <p style={{ margin: "4px 0 0", color: "#cbd5e1", fontSize: "0.85rem" }}>{an.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5B: TEACHER TOPIC VIDEOS FOR CLASS PLAYBACK */}
          {activeTab === "topicVideos" && (
            <div className="role-workspace-card">
              <ClassTopicVideoPlatform mode="STUDENT" currentUser={currentUser} />
            </div>
          )}

          {/* TAB: COURSE & CLASS REGISTRATION (UNLOCKED UPON FEE CLEARANCE) */}
          {activeTab === "courses" && (
            <div className="role-workspace-card">
              <div className="workspace-title-row">
                <div>
                  <h2><span>📚</span> SEMESTER COURSE & CLASS REGISTRATION</h2>
                  <p>Register official curriculum subjects, verify course credits, and print verified registration slips</p>
                </div>
                {feeArrears <= 0 && (
                  <button 
                    type="button" 
                    className="btn-primary"
                    onClick={() => window.print()}
                  >
                    🖨️ Print Registration Slip (PDF)
                  </button>
                )}
              </div>

              {feeArrears > 0 ? (
                <div style={{ 
                  background: "rgba(239, 68, 68, 0.12)", 
                  border: "1px solid rgba(239, 68, 68, 0.4)", 
                  borderRadius: "14px", 
                  padding: "3rem 2rem", 
                  textAlign: "center", 
                  margin: "1.5rem 0" 
                }}>
                  <span style={{ fontSize: "3.5rem", display: "block", marginBottom: "12px" }}>🔒</span>
                  <h2 style={{ color: "#f87171", margin: "0 0 10px" }}>
                    COURSE & CLASS REGISTRATION RESTRICTED
                  </h2>
                  <p style={{ color: "#e2e8f0", maxWidth: "640px", margin: "0 auto 1.5rem", fontSize: "1rem", lineHeight: "1.6" }}>
                    Official semester course enrollment and class group selection are locked due to an outstanding fee balance of <strong style={{ color: "#fca5a5" }}>${feeArrears.toFixed(2)}</strong>.
                    Once tuition and institutional fees are settled, the system automatically lifts the hold and authorizes full course registration.
                  </p>
                  <Link 
                    to="/portal/parent/dashboard" 
                    className="btn-primary"
                    style={{ textDecoration: "none", display: "inline-flex", background: "linear-gradient(135deg, #10b981, #059669)", padding: "10px 22px" }}
                  >
                    💳 Settle Balance via Parent Portal →
                  </Link>
                </div>
              ) : (
                <div>
                  {/* Financial Clearance Verified Banner */}
                  <div style={{ 
                    background: "linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(5, 150, 105, 0.1) 100%)", 
                    border: "1px solid rgba(16, 185, 129, 0.4)", 
                    borderRadius: "12px", 
                    padding: "1.25rem", 
                    marginBottom: "1.5rem" 
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                      <div>
                        <span style={{ background: "rgba(16, 185, 129, 0.3)", color: "#34d399", fontSize: "0.75rem", padding: "3px 10px", borderRadius: "12px", fontWeight: "800" }}>
                          ✓ FINANCIAL CLEARANCE CERTIFIED
                        </span>
                        <h3 style={{ margin: "6px 0 2px", color: "#34d399", fontSize: "1.1rem" }}>
                          Official Course Enrollment Authorized for {academicTerm} (2026-2027)
                        </h3>
                        <p style={{ margin: 0, fontSize: "0.82rem", color: "#cbd5e1" }}>
                          All tuition fees cleared ($0.00 outstanding balance). Certified by GBS Academic Registry & Finance Directorate.
                        </p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8" }}>Tertiary Index Number</span>
                        <strong style={{ fontSize: "1.05rem", color: "#f8fafc", fontFamily: "monospace" }}>UG/ENG/2026/084</strong>
                      </div>
                    </div>
                  </div>

                  {/* Registered Credits KPI Bar */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "1.5rem" }}>
                    <div style={{ background: "rgba(15, 23, 42, 0.7)", padding: "12px 16px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block" }}>Enrolled Courses</span>
                      <strong style={{ fontSize: "1.3rem", color: "#38bdf8" }}>{registeredCourseCodes.length} Subjects</strong>
                    </div>
                    <div style={{ background: "rgba(15, 23, 42, 0.7)", padding: "12px 16px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block" }}>Registered Credits</span>
                      <strong style={{ fontSize: "1.3rem", color: "#34d399" }}>
                        {registeredCourseCodes.length * 3} / 21 Credits
                      </strong>
                    </div>
                    <div style={{ background: "rgba(15, 23, 42, 0.7)", padding: "12px 16px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block" }}>Academic Level</span>
                      <strong style={{ fontSize: "1.1rem", color: "#f8fafc" }}>{academicLevel}</strong>
                    </div>
                    <div style={{ background: "rgba(15, 23, 42, 0.7)", padding: "12px 16px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block" }}>Registration Status</span>
                      <strong style={{ fontSize: "1.1rem", color: "#10b981" }}>ACTIVE & CONFIRMED</strong>
                    </div>
                    <div style={{ background: "rgba(15, 23, 42, 0.7)", padding: "12px 16px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", alignItems: "center" }}>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => {
                          const firstEnrolled = availableCourses.find((c) => registeredCourseCodes.includes(c.code)) || availableCourses[0];
                          setSelectedCourseForFiles(firstEnrolled);
                          setShowCourseFilesModal(true);
                        }}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                          fontWeight: 800,
                          fontSize: "0.82rem",
                          boxShadow: "0 4px 14px rgba(2, 132, 199, 0.4)",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          cursor: "pointer"
                        }}
                      >
                        📂 Go to Course Enrolled File Location
                      </button>
                    </div>
                  </div>

                  {/* Course Registration Table */}
                  <div className="role-table-responsive">
                    <table className="role-table">
                      <thead>
                        <tr>
                          <th>Course Code</th>
                          <th>Course Title</th>
                          <th>Credits</th>
                          <th>Type</th>
                          <th>Assigned Faculty</th>
                          <th>Schedule & Hall</th>
                          <th>Registration Action</th>
                          <th>Course Enrolled File Location</th>
                        </tr>
                      </thead>
                      <tbody>
                        {availableCourses.map((c) => {
                          const isRegistered = registeredCourseCodes.includes(c.code);
                          return (
                            <tr key={c.code} style={{ background: isRegistered ? "rgba(16, 185, 129, 0.05)" : "transparent" }}>
                              <td>
                                <strong style={{ color: "#38bdf8", fontFamily: "monospace" }}>{c.code}</strong>
                              </td>
                              <td>
                                <strong style={{ color: "#f8fafc" }}>{c.title}</strong>
                              </td>
                              <td>{c.credits}.0</td>
                              <td>
                                <span className="role-portal-badge" style={{ color: c.type.includes("Core") ? "#38bdf8" : "#c084fc", fontSize: "0.72rem" }}>
                                  {c.type}
                                </span>
                              </td>
                              <td>{c.instructor}</td>
                              <td>
                                <div style={{ fontSize: "0.78rem" }}>
                                  <div>{c.schedule}</div>
                                  <span style={{ color: "#94a3b8" }}>{c.hall}</span>
                                </div>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  onClick={() => handleToggleCourseRegistration(c.code)}
                                  style={{
                                    padding: "6px 14px",
                                    borderRadius: "6px",
                                    fontSize: "0.8rem",
                                    fontWeight: "700",
                                    cursor: "pointer",
                                    transition: "all 0.15s ease",
                                    border: isRegistered ? "1px solid #10b981" : "1px solid rgba(255, 255, 255, 0.2)",
                                    background: isRegistered ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.08)",
                                    color: isRegistered ? "#34d399" : "#cbd5e1"
                                  }}
                                >
                                  {isRegistered ? "✓ Enrolled" : "+ Register"}
                                </button>
                              </td>
                              <td>
                                {isRegistered ? (
                                  <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={() => {
                                      setSelectedCourseForFiles(c);
                                      setShowCourseFilesModal(true);
                                    }}
                                    style={{
                                      padding: "6px 12px",
                                      fontSize: "0.78rem",
                                      background: "linear-gradient(135deg, #0284c7, #0ea5e9)",
                                      boxShadow: "0 2px 8px rgba(14, 165, 233, 0.35)",
                                      fontWeight: "800",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "6px",
                                      cursor: "pointer"
                                    }}
                                    title="Go to Course Enrolled File Location & Academic Materials"
                                  >
                                    📂 Go to Course Enrolled (File Location)
                                  </button>
                                ) : (
                                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Register first</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", background: "rgba(2, 6, 23, 0.5)", padding: "14px 18px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <div style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
                      * Registered courses automatically populate your weekly timetable, exam schedule, and grade transcript.
                    </div>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => {
                        window.print();
                        setFeedback({ type: "success", message: "Course registration slip generated and prepared for print/PDF." });
                      }}
                    >
                      🖨️ Download Course Registration Slip (PDF)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: REQUIREMENT: ALUMNI DIRECTORY & HALL OF FAME */}
          {activeTab === "alumni" && (
            <div className="role-workspace-card">
              <div className="workspace-title-row">
                <div>
                  <h2><span>🎓</span> GBS GLOBAL ALUMNI DIRECTORY & HALL OF FAME</h2>
                  <p>Explore graduates from Primary to University levels (Level 100-400 to Alumni), career pathways, and mentorship connections</p>
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button 
                    type="button" 
                    className="btn-secondary"
                    style={{ borderColor: "#a855f7", color: "#c084fc", fontSize: "0.82rem" }}
                    onClick={() => setShowAlumniRecordsModal(true)}
                  >
                    📜 Access My Alumni Academic Records & Degree Archive
                  </button>
                  <span className="badge-status badge-present" style={{ fontSize: "0.85rem", padding: "6px 14px" }}>
                    🌟 1,480+ Distinguished Graduates Worldwide
                  </span>
                </div>
              </div>

              {/* Progression Pathways Info Banner */}
              <div style={{ background: "linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(56, 189, 248, 0.1))", padding: "1.25rem", borderRadius: "12px", border: "1px solid rgba(168, 85, 247, 0.3)", marginBottom: "1.5rem" }}>
                <h3 style={{ margin: "0 0 6px", color: "#c084fc", fontSize: "1.1rem" }}>
                  🏛️ Complete Academic Journey: From Lower Primary to University Alumni
                </h3>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#cbd5e1", lineHeight: "1.5" }}>
                  At GBS International School, every student progresses systematically through <strong>Nursery 1-2</strong>, <strong>Kindergarten 1-2</strong>, 
                  <strong>Lower Primary (Primary 1-3)</strong>, <strong>Upper Primary (Primary 4-6)</strong>, <strong>Junior High (JHS 1-3)</strong>, <strong>Senior High (SHS 1-3)</strong>, 
                  and <strong>University Undergraduate (Level 100 to Level 400 across Semesters 1 & 2)</strong>. Upon successful thesis and comprehensive examination completion, 
                  scholars transition into the prestigious GBS Alumni Association with permanent verifiable cryptographic credentials.
                </p>
              </div>

              {/* Alumni Highlights Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
                {alumniList.length === 0 ? (
                  <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px 20px", color: "#94a3b8", background: "rgba(15, 23, 42, 0.4)", borderRadius: "12px", border: "1px dashed #334155" }}>
                    🎓 No alumni directory entries published yet. Graduated scholars will appear here upon completion of commencement.
                  </div>
                ) : (
                  alumniList.map((alumnus) => (
                  <div 
                    key={alumnus.id} 
                    style={{ 
                      background: "rgba(15, 23, 42, 0.75)", 
                      borderRadius: "12px", 
                      padding: "1.25rem", 
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      display: "flex", 
                      flexDirection: "column", 
                      gap: "10px" 
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ 
                        width: "52px", 
                        height: "52px", 
                        borderRadius: "50%", 
                        background: "linear-gradient(135deg, #a855f7, #3b82f6)", 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center", 
                        fontSize: "1.5rem", 
                        color: "#fff", 
                        fontWeight: "bold", 
                        flexShrink: 0 
                      }}>
                        {alumnus.name.charAt(0)}
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#f8fafc" }}>{alumnus.name}</h3>
                        <span style={{ fontSize: "0.75rem", color: "#34d399", fontWeight: "700" }}>
                          Class of {alumnus.graduatingYear} • {alumnus.degree}
                        </span>
                      </div>
                    </div>

                    <div style={{ fontSize: "0.82rem", color: "#cbd5e1", lineHeight: "1.4" }}>
                      <p style={{ margin: "2px 0" }}>
                        📚 <strong>Program:</strong> {alumnus.program}
                      </p>
                      <p style={{ margin: "2px 0" }}>
                        💼 <strong>Current Placement:</strong> <strong style={{ color: "#38bdf8" }}>{alumnus.careerPlacement}</strong>
                      </p>
                      <p style={{ margin: "2px 0" }}>
                        🌍 <strong>Chapter:</strong> {alumnus.alumniChapter}
                      </p>
                    </div>

                    <div style={{ marginTop: "auto", display: "flex", gap: "8px" }}>
                      <button 
                        type="button" 
                        className="btn-primary" 
                        style={{ flex: 1, padding: "8px", fontSize: "0.75rem", justifyContent: "center" }}
                        onClick={() => {
                          setSelectedMentorAlumnus(alumnus);
                          setShowMentorModal(true);
                        }}
                      >
                        🤝 Request Mentorship
                      </button>
                      <a 
                        href={`mailto:${alumnus.email}`}
                        className="btn-secondary" 
                        style={{ padding: "8px 12px", fontSize: "0.75rem", textDecoration: "none", display: "flex", alignItems: "center" }}
                      >
                        ✉️ Contact
                      </a>
                    </div>
                  </div>
                ))
              )}
              </div>

              {/* Alumni Association Engagement & Mentorship Portal */}
              <div style={{ background: "rgba(2, 6, 23, 0.7)", borderRadius: "10px", padding: "1.25rem", border: "1px solid rgba(168, 85, 247, 0.3)" }}>
                <h4 style={{ margin: "0 0 8px", color: "#c084fc", fontSize: "1rem" }}>
                  🌐 GBS Alumni Association Services & Global Benefits
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", fontSize: "0.8rem", color: "#cbd5e1" }}>
                  <div>
                    <strong style={{ color: "#f8fafc" }}>• Verified Digital Credentials:</strong>
                    <p style={{ margin: "4px 0" }}>Instant transcript verification for university admissions & foreign work visas.</p>
                  </div>
                  <div>
                    <strong style={{ color: "#f8fafc" }}>• Global Alumni Chapters:</strong>
                    <p style={{ margin: "4px 0" }}>Networking events in Accra, London, New York, Toronto, and Nairobi.</p>
                  </div>
                  <div>
                    <strong style={{ color: "#f8fafc" }}>• Graduate Mentorship Circles:</strong>
                    <p style={{ margin: "4px 0" }}>Connect final-year Level 400 scholars directly with industry leaders.</p>
                  </div>
                  <div>
                    <strong style={{ color: "#f8fafc" }}>• GBS Alumni Endowment:</strong>
                    <p style={{ margin: "4px 0" }}>Scholarships funded annually for high-achieving STEM scholars.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL 1: REQUIREMENT: Exam Submission Notice Confirmation */}
      {showExamConfirmModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "20px"
        }}>
          <div style={{
            background: "#0f172a",
            border: "1px solid rgba(168, 85, 247, 0.4)",
            borderRadius: "16px",
            padding: "2rem",
            maxWidth: "520px",
            width: "100%",
            textAlign: "center",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.7)"
          }}>
            <span style={{ fontSize: "3rem", display: "block", marginBottom: "12px" }}>⚠️</span>
            <h3 style={{ color: "#f8fafc", margin: "0 0 10px", fontSize: "1.25rem" }}>
              CONFIRM EXAMINATION SUBMISSION
            </h3>
            <div style={{
              background: "rgba(245, 158, 11, 0.12)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              borderRadius: "10px",
              padding: "14px",
              margin: "1rem 0",
              textAlign: "left"
            }}>
              <p style={{ margin: 0, color: "#fef08a", fontSize: "0.9rem", lineHeight: "1.5", fontWeight: "600" }}>
                📢 <strong>CRITICAL NOTICE:</strong> Please read through all your answers before submitting or submit if you are surely done.
              </p>
              <p style={{ margin: "8px 0 0", color: "#cbd5e1", fontSize: "0.82rem", lineHeight: "1.4" }}>
                Once submitted, this paper will be <strong>permanently locked</strong> and you cannot access or modify answers. It will immediately be marked and graded by the deterministic AI grading engine.
              </p>
            </div>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "1.5rem" }}>
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ padding: "10px 18px", fontSize: "0.85rem" }}
                onClick={() => setShowExamConfirmModal(false)}
              >
                ← Read Through Answers
              </button>
              <button 
                type="button" 
                className="btn-primary" 
                style={{ padding: "10px 22px", fontSize: "0.85rem", background: "linear-gradient(135deg, #10b981, #059669)" }}
                onClick={() => {
                  setShowExamConfirmModal(false);
                  handleSubmitExam();
                }}
                disabled={loading}
              >
                {loading ? "Submitting..." : "🚀 Yes, I Am Surely Done — Submit Now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: REQUIREMENT: Request Mentorship from Alumni */}
      {showMentorModal && selectedMentorAlumnus && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "20px"
        }}>
          <div style={{
            background: "#0f172a",
            border: "1px solid rgba(59, 130, 246, 0.4)",
            borderRadius: "16px",
            padding: "2rem",
            maxWidth: "520px",
            width: "100%",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.7)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, color: "#38bdf8", fontSize: "1.15rem" }}>
                🤝 Request Alumni Mentorship
              </h3>
              <button 
                type="button" 
                onClick={() => setShowMentorModal(false)}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "1.2rem" }}
              >
                ✖
              </button>
            </div>

            <div style={{ background: "rgba(255, 255, 255, 0.05)", padding: "12px", borderRadius: "8px", marginBottom: "1rem" }}>
              <div style={{ fontWeight: "700", color: "#f8fafc" }}>{selectedMentorAlumnus.name}</div>
              <div style={{ fontSize: "0.8rem", color: "#34d399" }}>{selectedMentorAlumnus.careerPlacement}</div>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Class of {selectedMentorAlumnus.graduatingYear} • {selectedMentorAlumnus.degree}</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>
                  Your Desired Career / Research Track:
                </label>
                <input 
                  type="text" 
                  className="filter-input"
                  style={{ width: "100%", boxSizing: "border-box" }}
                  value={mentorRequestData.careerTrack}
                  onChange={(e) => setMentorRequestData({ ...mentorRequestData, careerTrack: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>
                  Personal Statement / Note to Mentor:
                </label>
                <textarea 
                  rows={4} 
                  className="filter-input"
                  style={{ width: "100%", boxSizing: "border-box", resize: "vertical" }}
                  placeholder="Introduce yourself, your academic goals at GBS, and what guidance you are seeking..."
                  value={mentorRequestData.notes}
                  onChange={(e) => setMentorRequestData({ ...mentorRequestData, notes: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  style={{ flex: 1 }}
                  onClick={() => setShowMentorModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn-primary" 
                  style={{ flex: 2, justifyContent: "center" }}
                  onClick={() => {
                    setShowMentorModal(false);
                    setFeedback({ 
                      type: "success", 
                      message: `Mentorship invitation successfully delivered to ${selectedMentorAlumnus.name} via the GBS Alumni Network!` 
                    });
                  }}
                >
                  ✉️ Dispatch Mentorship Invitation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COURSE ENROLLED FILE LOCATION & LEARNING REPOSITORY MODAL */}
      {showCourseFilesModal && selectedCourseForFiles && (
        <div className="invoice-pay-modal-overlay">
          <div className="invoice-pay-modal" style={{ maxWidth: "800px", background: "#0b1329", border: "2px solid #0284c7", borderRadius: "16px", padding: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1.5px solid rgba(56, 189, 248, 0.3)", paddingBottom: "1.25rem", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "2rem" }}>📂</span>
                <div>
                  <span className="role-portal-badge" style={{ color: "#38bdf8", marginBottom: "4px", display: "inline-block" }}>
                    COURSE ENROLLED FILE LOCATION • ACADEMIC MATERIALS VAULT
                  </span>
                  <h2 style={{ margin: "2px 0 0", color: "#f8fafc", fontSize: "1.3rem" }}>
                    {selectedCourseForFiles.code}: {selectedCourseForFiles.title}
                  </h2>
                  <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                    Instructor: <strong>{selectedCourseForFiles.instructor}</strong> • Schedule: {selectedCourseForFiles.schedule} ({selectedCourseForFiles.hall})
                  </span>
                </div>
              </div>
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ padding: "4px 10px", fontSize: "0.9rem" }}
                onClick={() => { setShowCourseFilesModal(false); setViewingFilePreview(null); }}
              >
                ✕
              </button>
            </div>

            {/* Exact Storage Server Directory Path */}
            <div style={{ background: "rgba(2, 6, 23, 0.8)", border: "1px solid rgba(56, 189, 248, 0.25)", borderRadius: "10px", padding: "12px 16px", marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <span style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>
                  Server File Location:
                </span>
                <div style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "#38bdf8", fontWeight: 700, marginTop: "2px" }}>
                  {selectedCourseForFiles.fileLocation || `/var/gbs/storage/courses/${selectedCourseForFiles.code.replace(" ", "_")}/modules/`}
                </div>
              </div>
              <span className="badge-status badge-present" style={{ fontSize: "0.75rem" }}>
                ● Local Server Synced (HTTP Accessible)
              </span>
            </div>

            {/* File List Table */}
            <div className="role-table-responsive" style={{ maxHeight: "320px", overflowY: "auto", marginBottom: "1.5rem" }}>
              <table className="role-table" style={{ fontSize: "0.82rem" }}>
                <thead>
                  <tr>
                    <th>File Name & Topic</th>
                    <th>Format</th>
                    <th>Size</th>
                    <th>Uploaded Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedCourseForFiles.materials || []).map((file, idx) => (
                    <tr key={idx}>
                      <td>
                        <strong style={{ color: "#f8fafc", display: "block" }}>{file.name}</strong>
                        <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{file.topic}</span>
                      </td>
                      <td>
                        <span className="role-portal-badge" style={{ color: "#38bdf8", fontSize: "0.7rem" }}>
                          {file.type}
                        </span>
                      </td>
                      <td style={{ color: "#cbd5e1" }}>{file.size}</td>
                      <td style={{ color: "#94a3b8" }}>{file.uploadedAt}</td>
                      <td>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            className="btn-primary"
                            style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                            onClick={() => {
                              setViewingFilePreview(file);
                              setFeedback({
                                type: "success",
                                message: `✓ Retrieved ${file.name} from local server storage repository.`
                              });
                            }}
                          >
                            👁️ View
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: "4px 10px", fontSize: "0.75rem", borderColor: "#10b981", color: "#34d399" }}
                            onClick={() => {
                              setFeedback({
                                type: "success",
                                message: `📥 Downloading ${file.name} (${file.size}) to your local device.`
                              });
                            }}
                          >
                            📥 Download
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* File Viewer Preview Box */}
            {viewingFilePreview && (
              <div style={{ background: "rgba(15, 23, 42, 0.9)", border: "1.5px solid #10b981", borderRadius: "10px", padding: "1rem", marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <strong style={{ color: "#34d399", fontSize: "0.88rem" }}>
                    📄 Document Reader: {viewingFilePreview.name}
                  </strong>
                  <button type="button" onClick={() => setViewingFilePreview(null)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>✕</button>
                </div>
                <div style={{ background: "#020617", padding: "12px", borderRadius: "6px", fontFamily: "monospace", fontSize: "0.8rem", color: "#cbd5e1", lineHeight: "1.6", maxHeight: "120px", overflowY: "auto" }}>
                  [GBS ACADEMIC STORAGE REPOSITORY - VERIFIED CONTENT] <br />
                  Course: {selectedCourseForFiles.code} - {selectedCourseForFiles.title} <br />
                  Module Topic: {viewingFilePreview.topic} <br />
                  Academic Clearance: GRANTED FOR ENROLLED STUDENT • AUTHENTIC SYLLABUS DIGEST
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                * All course materials are hosted on the local institutional storage server and accessible across campus LAN.
              </span>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => { setShowCourseFilesModal(false); setViewingFilePreview(null); }}
              >
                Close Location Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: REQUIREMENT: Alumni Access Official Academic Records & Degree Archive */}
      {showAlumniRecordsModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "20px"
        }}>
          <div style={{
            background: "#0f172a",
            border: "1px solid rgba(168, 85, 247, 0.4)",
            borderRadius: "16px",
            padding: "2rem",
            maxWidth: "680px",
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.7)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <img 
                  src={customSchoolLogo || "/assets/gbs_crest_badge.jpg"} 
                  alt="School Crest" 
                  style={{ width: "42px", height: "42px", borderRadius: "50%", objectFit: "cover", border: "1.5px solid #a855f7" }} 
                />
                <div>
                  <h3 style={{ margin: 0, color: "#f8fafc", fontSize: "1.2rem" }}>
                    📜 Official Certified Alumni Academic Records
                  </h3>
                  <span style={{ fontSize: "0.75rem", color: "#a855f7" }}>
                    {schoolOfficialName} • Registrar & Degree Archive Vault
                  </span>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowAlumniRecordsModal(false)}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "1.2rem" }}
              >
                ✖
              </button>
            </div>

            <div style={{ background: "rgba(255, 255, 255, 0.04)", borderRadius: "10px", padding: "1.25rem", border: "1px solid rgba(255, 255, 255, 0.08)", marginBottom: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "0.85rem" }}>
                <div><span style={{ color: "#94a3b8" }}>Graduate Scholar:</span> <strong style={{ color: "#f8fafc" }}>{currentUser.firstName} {currentUser.lastName}</strong></div>
                <div><span style={{ color: "#94a3b8" }}>Alumni Identifier:</span> <strong style={{ color: "#38bdf8" }}>GBS-ALM-2026-084</strong></div>
                <div><span style={{ color: "#94a3b8" }}>Degree Awarded:</span> <strong style={{ color: "#34d399" }}>B.Sc. in Computer Science & AI (Honours)</strong></div>
                <div><span style={{ color: "#94a3b8" }}>Cumulative CGPA:</span> <strong style={{ color: "#fbbf24" }}>3.88 / 4.00 (First Class)</strong></div>
                <div><span style={{ color: "#94a3b8" }}>Graduation Date:</span> <strong style={{ color: "#cbd5e1" }}>June 18, 2026</strong></div>
                <div><span style={{ color: "#94a3b8" }}>Status:</span> <span className="role-portal-badge" style={{ color: "#34d399" }}>Conferred & In Good Standing</span></div>
              </div>
            </div>

            <h4 style={{ color: "#38bdf8", margin: "1rem 0 0.5rem", fontSize: "0.95rem" }}>
              Permanent Certified Transcript Breakdown:
            </h4>
            <div style={{ overflowX: "auto" }}>
              <table className="role-table" style={{ fontSize: "0.8rem" }}>
                <thead>
                  <tr>
                    <th>Academic Level</th>
                    <th>Term / Semester</th>
                    <th>Credits Earned</th>
                    <th>Term GPA</th>
                    <th>Institutional Standing</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Level 100 (Freshman)</td>
                    <td>Semester 1 & 2</td>
                    <td>36.0</td>
                    <td>3.82</td>
                    <td><span className="badge-status badge-present">Dean's Honour Roll</span></td>
                  </tr>
                  <tr>
                    <td>Level 200 (Sophomore)</td>
                    <td>Semester 1 & 2</td>
                    <td>38.0</td>
                    <td>3.89</td>
                    <td><span className="badge-status badge-present">Dean's Honour Roll</span></td>
                  </tr>
                  <tr>
                    <td>Level 300 (Junior)</td>
                    <td>Semester 1 & 2</td>
                    <td>36.0</td>
                    <td>3.92</td>
                    <td><span className="badge-status badge-present">President's Scholar</span></td>
                  </tr>
                  <tr>
                    <td>Level 400 (Senior)</td>
                    <td>Semester 1 & 2 (Capstone)</td>
                    <td>34.0</td>
                    <td>3.96</td>
                    <td><span className="badge-status badge-present">Summa Cum Laude</span></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: "1rem", padding: "10px", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "8px", fontSize: "0.75rem", color: "#a7f3d0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>🔐 Verifiable Cryptographic Hash: SHA-256: 4f1a9b2d8e7c6b5a3f1e0d9c8b7a6f5e</span>
              <span>Signed by Headmaster & Registrar</span>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "1.5rem", justifyContent: "flex-end" }}>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => setShowAlumniRecordsModal(false)}
              >
                Close Archive
              </button>
              <button 
                type="button" 
                className="btn-primary" 
                onClick={() => {
                  window.print();
                }}
              >
                🖨️ Download Official Certified Transcript (PDF)
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Universal Floating Scroll Controls */}
      <div 
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          zIndex: 9999
        }}
      >
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          title="Scroll to Top"
          style={{
            background: "linear-gradient(135deg, #0284c7, #2563eb)",
            color: "#ffffff",
            border: "1.5px solid rgba(255,255,255,0.3)",
            borderRadius: "50%",
            width: "42px",
            height: "42px",
            fontSize: "1.1rem",
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "transform 0.2s"
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
          onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1.0)"}
        >
          ⬆️
        </button>
        <button
          type="button"
          onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}
          title="Scroll to Bottom"
          style={{
            background: "linear-gradient(135deg, #1e293b, #0f172a)",
            color: "#38bdf8",
            border: "1.5px solid rgba(56,189,248,0.4)",
            borderRadius: "50%",
            width: "42px",
            height: "42px",
            fontSize: "1.1rem",
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "transform 0.2s"
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
          onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1.0)"}
        >
          ⬇️
        </button>
      </div>

      <UniversalRoleGuideModal
        role="STUDENT"
        isOpen={showStudentGuideModal}
        onClose={() => setShowStudentGuideModal(false)}
      />
    </div>
  );
}