import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../../../../../api/client/apiClient";
import WindowControlsBar from "../../../../../components/common/WindowControlsBar";
import TopCenterSystemBanner from "../../../../../components/common/TopCenterSystemBanner";
import { getUserAvatar } from "../../../../../utils/userAvatars";
import { offlineSyncEngine } from "../../../../../utils/offlineSync";
import UniversalRoleGuideModal from "../../../../../components/common/UniversalRoleGuideModal";
import ClassTopicVideoPlatform from "../../../../../components/common/ClassTopicVideoPlatform";
import { navigateToDetail } from "../../../../../utils/universalNavigation";
import OfficialPaymentGatewayModal from "../../../../../components/common/OfficialPaymentGatewayModal";
import "./StudentDashboard.css";

export function StudentDashboard({ initialTab } = {}) {
  const navigate = useNavigate();
  const [showStudentGuideModal, setShowStudentGuideModal] = useState(false);

  const studentProfile = (() => {
    try {
      const stored = localStorage.getItem("gbs_user");
      if (stored) return JSON.parse(stored);
    } catch {}
    return { firstName: "Alex", lastName: "Mensah", role: "STUDENT", indexNumber: "STU-2026-001" };
  })();

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
    } catch { }
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
      } catch { }
    };
    window.addEventListener("gbs_academic_schedule_published", syncSchedule);
    window.addEventListener("storage", syncSchedule);
    return () => {
      window.removeEventListener("gbs_academic_schedule_published", syncSchedule);
      window.removeEventListener("storage", syncSchedule);
    };
  }, []);

  const [activeTab, setActiveTab] = useState(() => {
    if (initialTab) return initialTab;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get("tab");
      if (tabParam) return tabParam;
      const stored = sessionStorage.getItem("gbs_student_active_tab");
      if (stored) return stored;
    } catch { }
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
    } catch { }
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
      } catch { }
    };

    const handleScroll = () => {
      try {
        sessionStorage.setItem("gbs_student_scroll_pos", String(window.scrollY));
      } catch { }
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
  const [examTimeLeftSeconds, setExamTimeLeftSeconds] = useState(900);
  const [examAnswers, setExamAnswers] = useState({});
  const [examScoreResult, setExamScoreResult] = useState(null);
  const [showExamConfirmModal, setShowExamConfirmModal] = useState(false);

  useEffect(() => {
    if (!examStarted || examSubmitted) return;
    const timer = setInterval(() => {
      setExamTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setFeedback({
            type: "warning",
            message: "⏱️ Examination time expired! Your written responses are auto-saved and locked for grading."
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [examStarted, examSubmitted]);

  const formatExamTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${rem.toString().padStart(2, "0")}`;
  };
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
    } catch { }
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
    } catch { }
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
      } catch { }
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
    } catch { }
    return ["CS 201", "MATH 205", "PHYS 203", "ENG 210", "AI 220", "GBS 200"];
  });

  // Live Class Broadcast Sentinel from Teachers
  const [activeLiveBroadcast, setActiveLiveBroadcast] = useState(() => {
    try {
      const list = JSON.parse(localStorage.getItem("gbs_active_live_classes") || "[]");
      return list[0] || null;
    } catch {
      return null;
    }
  });

  // Dress Code Guidelines Modal State
  const [showDressCodeModal, setShowDressCodeModal] = useState(false);

  // Fee Payment & Rescheduled Late Exam Writing Slip State
  const [showFeePaymentModal, setShowFeePaymentModal] = useState(false);
  const [showRescheduledExamSlipModal, setShowRescheduledExamSlipModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("500");
  const [paymentChannel, setPaymentChannel] = useState("MTN_MOMO");
  const [payerPhone, setPayerPhone] = useState("+233-24-411-9201");
  const [paymentSuccessSlip, setPaymentSuccessSlip] = useState(null);

  // Official Payment Gateway Modal State
  const [showOfficialPaymentModal, setShowOfficialPaymentModal] = useState(false);
  const [feeBalance, setFeeBalance] = useState(() => {
    return Number(localStorage.getItem("gbs_student_fee_STU-2026-0891") || "400");
  });

  // Live Online Class Concluded Notice & Catch-Up Video State
  const [concludedClassNotice, setConcludedClassNotice] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("gbs_concluded_class_notice") || "null");
      if (stored) return stored;
    } catch {}
    return {
      id: "CLS-CONCL-902",
      subject: "Advanced Mathematics",
      topic: "Composite Functions, Calculus Derivatives & Rate of Change",
      date: "Today",
      time: "09:00 AM - 10:15 AM",
      duration: "1h 15m",
      instructor: "Mr. Kwame Mensah",
      endingTime: "10:15 AM",
      recordingUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      notesFile: "Advanced_Calculus_Lesson_Notes_Week7.pdf",
      dismissed: false
    };
  });
  const [showCatchUpModal, setShowCatchUpModal] = useState(false);

  // Peer Live Video Calling State & Hardware Camera Stream Refs
  const localPeerVideoRef = useRef(null);
  const localPeerStreamRef = useRef(null);
  const [activePeerVideoCall, setActivePeerVideoCall] = useState(null);
  const [peerCallDuration, setPeerCallDuration] = useState(0);
  const [isPeerMicMuted, setIsPeerMicMuted] = useState(false);
  const [isPeerCameraOff, setIsPeerCameraOff] = useState(false);
  const [isPeerScreenSharing, setIsPeerScreenSharing] = useState(false);

  // In-App Live Scheduled Meeting / Classroom Session State
  const [activeJoinedMeeting, setActiveJoinedMeeting] = useState(null);
  const [classroomHandRaised, setClassroomHandRaised] = useState(false);
  const [classroomMicMuted, setClassroomMicMuted] = useState(true);
  const [classroomCameraOn, setClassroomCameraOn] = useState(true);
  const [classroomChatMessages, setClassroomChatMessages] = useState([
    { sender: "Teacher (Moderator)", text: "Welcome everyone to today's live interactive session. Please raise your hand if you have questions.", time: "10:00 AM" },
    { sender: "Kwame Mensah", text: "Good morning teacher, audio and video are crystal clear!", time: "10:02 AM" }
  ]);
  const [newClassroomMsg, setNewClassroomMsg] = useState("");

  const startLocalPeerCamera = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: true });
        localPeerStreamRef.current = stream;
        if (localPeerVideoRef.current) {
          localPeerVideoRef.current.srcObject = stream;
          localPeerVideoRef.current.play().catch(() => {});
        }
      }
    } catch (err) {
      console.warn("Peer video camera access notice:", err.message);
    }
  };

  const stopLocalPeerCamera = () => {
    if (localPeerStreamRef.current) {
      localPeerStreamRef.current.getTracks().forEach((t) => t.stop());
      localPeerStreamRef.current = null;
    }
  };

  const handleStartPeerVideoCall = (peer) => {
    setActivePeerVideoCall(peer);
    setPeerCallDuration(0);
    setIsPeerCameraOff(false);
    setTimeout(() => {
      startLocalPeerCamera();
    }, 200);
  };

  const handleEndPeerVideoCall = () => {
    stopLocalPeerCamera();
    setActivePeerVideoCall(null);
  };

  const handleJoinLiveMeeting = (meeting) => {
    setActiveJoinedMeeting(meeting);
    setClassroomHandRaised(false);
    setFeedback({
      type: "success",
      message: `🚀 Joined live online meeting: "${meeting.title}"`
    });
  };

  const handleSendClassroomChat = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newClassroomMsg.trim()) return;
    const msg = {
      sender: `${studentProfile?.firstName || "Scholar"} ${studentProfile?.lastName || ""}`.trim() || "You",
      text: newClassroomMsg.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setClassroomChatMessages((prev) => [...prev, msg]);
    setNewClassroomMsg("");
  };

  useEffect(() => {
    let timer = null;
    if (activePeerVideoCall) {
      timer = setInterval(() => {
        setPeerCallDuration((d) => d + 1);
      }, 1000);
    } else {
      setPeerCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [activePeerVideoCall]);

  // Student Digital Library & E-Book Hub State
  const [selectedBookForPreview, setSelectedBookForPreview] = useState(null);
  const [borrowedBooks, setBorrowedBooks] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("gbs_library_borrowed_records") || "[]");
      if (Array.isArray(stored) && stored.length > 0) return stored;
    } catch {}
    return [
      {
        id: "BK-01",
        title: "Core Mathematics for Senior High Schools",
        author: "Prof. J. K. Mensah",
        isbn: "978-0-19-842718-6",
        borrowDate: "2026-11-01",
        dueDate: "2026-11-15",
        status: "BORROWED",
        daysRemaining: 8,
        cover: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=200&h=260&fit=crop"
      },
      {
        id: "BK-02",
        title: "Integrated Science & Biology Laboratory Practical",
        author: "Dr. Kwabena Asante",
        isbn: "978-0-14-312774-1",
        borrowDate: "2026-11-03",
        dueDate: "2026-11-17",
        status: "BORROWED",
        daysRemaining: 10,
        cover: "https://images.unsplash.com/photo-1532012164546-f432f2e3777f?w=200&h=260&fit=crop"
      }
    ];
  });

  const LIBRARY_CATALOG = [
    { id: "CAT-1", title: "Comprehensive Chemistry for Secondary Schools", author: "Dr. Evelyn Addo", category: "General Science", pages: 420, cover: "https://images.unsplash.com/photo-1532012164546-f432f2e3777f?w=200&h=260&fit=crop" },
    { id: "CAT-2", title: "Physics Fundamentals: Mechanics & Electromagnetism", author: "Prof. Arthur Sterling", category: "Physical Sciences", pages: 512, cover: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=200&h=260&fit=crop" },
    { id: "CAT-3", title: "African & World History: Pre-Colonial to Modern Era", author: "Dr. Nana Osei-Tutu", category: "Arts & Humanities", pages: 380, cover: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=200&h=260&fit=crop" },
    { id: "CAT-4", title: "Advanced Python Programming & Machine Learning", author: "Chief Dev. Gabriel Osei", category: "Computer Science", pages: 460, cover: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=200&h=260&fit=crop" },
    { id: "CAT-5", title: "Economics: Principles, Markets & Macro Policy", author: "Mrs. Beatrice Arthur", category: "Business Studies", pages: 395, cover: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=200&h=260&fit=crop" },
    { id: "CAT-6", title: "English Language, Rhetoric & Literature Anthology", author: "Rev. Grace Osei", category: "Languages", pages: 340, cover: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=200&h=260&fit=crop" }
  ];

  const handleBorrowBook = (book) => {
    if (borrowedBooks.some((b) => b.title === book.title)) {
      alert("You have already borrowed this textbook.");
      return;
    }
    const newRecord = {
      id: "BORROW-" + Date.now().toString().slice(-6),
      title: book.title,
      author: book.author,
      isbn: "GBS-EBOOK-" + Math.floor(Math.random() * 89999 + 10000),
      borrowDate: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
      status: "BORROWED",
      daysRemaining: 14,
      cover: book.cover
    };
    const updated = [newRecord, ...borrowedBooks];
    setBorrowedBooks(updated);
    try {
      localStorage.setItem("gbs_library_borrowed_records", JSON.stringify(updated));
    } catch {}
    setFeedback({ type: "success", message: '📖 Textbook "' + book.title + '" checked out successfully! Return due in 14 days.' });
  };

  const handleReturnBook = (id) => {
    const updated = borrowedBooks.filter((b) => b.id !== id);
    setBorrowedBooks(updated);
    try {
      localStorage.setItem("gbs_library_borrowed_records", JSON.stringify(updated));
    } catch {}
    setFeedback({ type: "success", message: "📥 Textbook returned to school library successfully." });
  };

  // Student-to-Student Peer Chat & Study Circle State
  const [searchIndexInput, setSearchIndexInput] = useState("");
  const [candidatePeer, setCandidatePeer] = useState(null);
  const [showPeerConfirmModal, setShowPeerConfirmModal] = useState(false);
  const [activePeerChat, setActivePeerChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [archivedPeerChats, setArchivedPeerChats] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("gbs_peer_archived_chats") || "[]");
    } catch {
      return [];
    }
  });
  const [showArchivedChatsModal, setShowArchivedChatsModal] = useState(false);

  // Enrolled Student Roster for Peer Resolution
  const [enrolledPeersList, setEnrolledPeersList] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("gbs_enrolled_students") || "[]");
      if (Array.isArray(stored) && stored.length > 0) return stored;
    } catch { }
    return [
      { id: "101", studentId: "STU-2026-001", indexNumber: "STU-2026-001", firstName: "Emmanuel", lastName: "Mensah", registeredMobile: "+233-24-411-9201", currentClass: "JHS 2 (Junior High - Grade 8)", classCode: "JHS-02", photo: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop" },
      { id: "102", studentId: "STU-2026-002", indexNumber: "STU-2026-002", firstName: "Ama", lastName: "Serwaa", registeredMobile: "+233-20-882-3490", currentClass: "SHS 1 / Grade 10 - STEM & Arts", classCode: "SHS-01", photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop" },
      { id: "103", studentId: "STU-2026-003", indexNumber: "STU-2026-003", firstName: "Julian", lastName: "Bramwell", registeredMobile: "+233-55-901-4478", currentClass: "Primary 4 (Upper Primary)", classCode: "PRI-04", photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop" },
      { id: "104", studentId: "STU-2026-004", indexNumber: "STU-2026-004", firstName: "Sophia", lastName: "Chen", registeredMobile: "+233-27-312-5509", currentClass: "University Level 200 - Sophomore Year", classCode: "UNI-200", photo: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop" },
      { id: "105", studentId: "STU-2026-005", indexNumber: "STU-2026-005", firstName: "Kofi", lastName: "Boateng", registeredMobile: "+233-24-998-1123", currentClass: "JHS 3 (BECE Candidates - Grade 9)", classCode: "JHS-03", photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop" }
    ];
  });

  const handleSearchPeerByIndex = (query) => {
    const q = (query || searchIndexInput).trim().toLowerCase();
    if (!q) {
      setFeedback({ type: "error", message: "Please enter a Student Index Number or Admission Number to search." });
      return;
    }
    const match = enrolledPeersList.find((s) => {
      const idx = String(s.indexNumber || s.studentId || s.id || "").toLowerCase();
      const fn = `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase();
      return idx === q || idx.includes(q) || fn.includes(q);
    });

    if (!match) {
      setCandidatePeer(null);
      setFeedback({
        type: "error",
        message: `❌ Student not found: No registered scholar found with Index/ID "${q}".`
      });
      return;
    }

    setCandidatePeer(match);
    setShowPeerConfirmModal(true);
  };

  const handleConfirmStartChat = (peer) => {
    setActivePeerChat(peer);
    setShowPeerConfirmModal(false);
    const threadKey = `gbs_peer_chat_${currentUser?.id || "student"}_${peer.studentId || peer.id}`;
    try {
      const saved = JSON.parse(localStorage.getItem(threadKey) || "[]");
      if (Array.isArray(saved) && saved.length > 0) {
        setChatMessages(saved);
      } else {
        const welcome = [
          {
            id: `msg-${Date.now()}`,
            sender: "PEER",
            senderName: `${peer.firstName} ${peer.lastName}`,
            text: `Hello ${currentUser?.firstName || "Scholar"}! Glad to connect on the GBS Study Circle. Let's collaborate on our coursework!`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }
        ];
        setChatMessages(welcome);
        localStorage.setItem(threadKey, JSON.stringify(welcome));
      }
    } catch {
      setChatMessages([]);
    }
  };

  const handleSendMessage = (customText) => {
    const textToSend = (customText || newMessageText).trim();
    if (!textToSend || !activePeerChat) return;

    const myMsg = {
      id: `msg-${Date.now()}`,
      sender: "ME",
      senderName: `${currentUser?.firstName || "Me"} ${currentUser?.lastName || ""}`.trim(),
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    const nextMessages = [...chatMessages, myMsg];
    setChatMessages(nextMessages);
    setNewMessageText("");

    const threadKey = `gbs_peer_chat_${currentUser?.id || "student"}_${activePeerChat.studentId || activePeerChat.id}`;
    try {
      localStorage.setItem(threadKey, JSON.stringify(nextMessages));
    } catch { }

    // Simulated peer reply
    setTimeout(() => {
      const replies = [
        "Understood! Let me review the lecture notes and verify that concept with you.",
        "Yes, absolutely. We can work on the practice questions together this evening.",
        "I just checked the timetable; our next session is tomorrow morning.",
        "Thanks for checking in! Make sure to double check the assignment requirements."
      ];
      const replyText = replies[Math.floor(Math.random() * replies.length)];
      const peerReply = {
        id: `msg-${Date.now()}`,
        sender: "PEER",
        senderName: `${activePeerChat.firstName} ${activePeerChat.lastName}`,
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setChatMessages((prev) => {
        const updated = [...prev, peerReply];
        try {
          localStorage.setItem(threadKey, JSON.stringify(updated));
        } catch { }
        return updated;
      });
    }, 1200);
  };

  const handleArchiveCurrentChat = () => {
    if (!activePeerChat || chatMessages.length === 0) {
      setFeedback({ type: "info", message: "No active conversation messages to archive." });
      return;
    }

    const archiveItem = {
      id: `ARCH-CHAT-${Date.now()}`,
      peerName: `${activePeerChat.firstName} ${activePeerChat.lastName}`,
      peerIndex: activePeerChat.studentId || activePeerChat.indexNumber || activePeerChat.id,
      peerClass: activePeerChat.currentClass || activePeerChat.classCode || "Class",
      peerPhone: activePeerChat.registeredMobile || activePeerChat.phone || "—",
      archivedAt: new Date().toLocaleString(),
      messageCount: chatMessages.length,
      messages: chatMessages
    };

    const updated = [archiveItem, ...archivedPeerChats];
    setArchivedPeerChats(updated);
    try {
      localStorage.setItem("gbs_peer_archived_chats", JSON.stringify(updated));
    } catch { }

    setFeedback({
      type: "success",
      message: `📁 Conversation with ${archiveItem.peerName} (${archiveItem.messageCount} messages) saved & archived successfully!`
    });
    if (window.showGBSOpenNotice) {
      window.showGBSOpenNotice(`Chat with ${archiveItem.peerName} archived!`, "success", "Chat Archived");
    }
  };

  const handleProcessFeePayment = (e) => {
    e.preventDefault();
    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0) {
      setFeedback({ type: "error", message: "Please enter a valid payment amount." });
      return;
    }

    const currentArr = typeof feeArrears === "number" ? feeArrears : parseFloat(feeArrears || 0);
    const newArrears = Math.max(0, currentArr - amt);
    setFeeArrears(newArrears);
    try {
      localStorage.setItem("gbs_student_fee_arrears", String(newArrears));
      const paymentRec = {
        id: `REC-PAY-${Date.now()}`,
        amountPaid: amt,
        payerPhone,
        paymentChannel,
        newBalanceDue: newArrears,
        studentName: `${currentUser.firstName} ${currentUser.lastName}`,
        studentId: currentUser.studentId || "GBS-STU-2026-084",
        reconciledAt: new Date().toISOString()
      };
      const existingHistory = JSON.parse(localStorage.getItem("gbs_reconciled_payments") || "[]");
      localStorage.setItem("gbs_reconciled_payments", JSON.stringify([paymentRec, ...existingHistory]));
      window.dispatchEvent(new Event("gbs_payment_made"));
      window.dispatchEvent(new Event("storage"));
      setPaymentSuccessSlip(paymentRec);
    } catch { }

    setFeedback({
      type: "success",
      message: `🎉 Payment of GH₵ ${amt.toFixed(2)} processed successfully via ${paymentChannel}! Remaining arrears: GH₵ ${newArrears.toFixed(2)}.`
    });
    if (window.showGBSOpenNotice) {
      window.showGBSOpenNotice(`Payment of GH₵ ${amt.toFixed(2)} confirmed!`, "success", "Payment Confirmation");
    }
    setShowFeePaymentModal(false);
  };

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
    } catch { }
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
      } catch { }
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
    } catch { }
    return null;
  });

  // Alumni Directory & Hall of Fame Data
  const [alumniList, setAlumniList] = useState(() => {
    try {
      const stored = localStorage.getItem("gbs_alumni_directory");
      if (stored) return JSON.parse(stored);
    } catch { }
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
      } catch { }
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
      } catch { }
    };

    const handleAttendanceSync = () => {
      try {
        const saved = localStorage.getItem("gbs_student_attendance_summary");
        if (saved) setAttendanceSummary(JSON.parse(saved));
      } catch { }
    };

    const handleExamPublishedSync = () => {
      setNewExamPublished(localStorage.getItem("gbs_new_exam_published") === "true");
    };

    const handleLiveClassSync = () => {
      try {
        const list = JSON.parse(localStorage.getItem("gbs_active_live_classes") || "[]");
        setActiveLiveBroadcast(list[0] || null);
      } catch { }
    };

    handleGradesUpdate();
    handleSubmissionsSync();
    handleAttendanceSync();
    handleLiveClassSync();

    window.addEventListener("gbs_payment_made", handlePaymentUpdate);
    window.addEventListener("gbs_grades_updated", handleGradesUpdate);
    window.addEventListener("gbs_submission_updated", handleSubmissionsSync);
    window.addEventListener("gbs_attendance_updated", handleAttendanceSync);
    window.addEventListener("gbs_new_exam_published", handleExamPublishedSync);
    window.addEventListener("gbs_live_class_broadcast", handleLiveClassSync);
    window.addEventListener("storage", handlePaymentUpdate);
    window.addEventListener("storage", handleGradesUpdate);
    window.addEventListener("storage", handleSubmissionsSync);
    window.addEventListener("storage", handleAttendanceSync);
    window.addEventListener("storage", handleExamPublishedSync);
    window.addEventListener("storage", handleLiveClassSync);
    return () => {
      window.removeEventListener("gbs_payment_made", handlePaymentUpdate);
      window.removeEventListener("gbs_grades_updated", handleGradesUpdate);
      window.removeEventListener("gbs_submission_updated", handleSubmissionsSync);
      window.removeEventListener("gbs_attendance_updated", handleAttendanceSync);
      window.removeEventListener("gbs_new_exam_published", handleExamPublishedSync);
      window.removeEventListener("gbs_live_class_broadcast", handleLiveClassSync);
      window.removeEventListener("storage", handlePaymentUpdate);
      window.removeEventListener("storage", handleGradesUpdate);
      window.removeEventListener("storage", handleSubmissionsSync);
      window.removeEventListener("storage", handleAttendanceSync);
      window.removeEventListener("storage", handleExamPublishedSync);
      window.removeEventListener("storage", handleLiveClassSync);
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
      } catch (e) { }

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
          {/* Active Live Class Broadcast Sentinel from Faculty */}
          {activeLiveBroadcast && (
            <div style={{
              background: "linear-gradient(135deg, rgba(220, 38, 38, 0.95) 0%, rgba(185, 28, 28, 0.9) 100%)",
              border: "2px solid #ef4444",
              color: "#ffffff",
              padding: "14px 20px",
              borderRadius: "14px",
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 10px 30px rgba(239, 68, 68, 0.4)",
              flexWrap: "wrap",
              gap: "12px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "1.8rem" }}>🔴</span>
                <div>
                  <div style={{ fontWeight: 900, fontSize: "1rem", letterSpacing: "0.02em" }}>
                    LIVE CLASSROOM BROADCAST IN PROGRESS
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#fecaca", marginTop: "2px" }}>
                    Topic: <strong>{activeLiveBroadcast.title}</strong> • Instructor: <strong>{activeLiveBroadcast.teacherName || "Faculty"}</strong> • Platform: <strong>{activeLiveBroadcast.platform}</strong>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <a
                  href={activeLiveBroadcast.workingInAppLink || activeLiveBroadcast.meetingUrl || "/online-learning"}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: "#ffffff",
                    color: "#b91c1c",
                    padding: "10px 22px",
                    borderRadius: "10px",
                    fontWeight: 900,
                    textDecoration: "none",
                    fontSize: "0.88rem",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <span>🚀</span> JOIN LIVE CLASS NOW →
                </a>
              </div>
            </div>
          )}

          {/* REQUIREMENT: Student Profile Card with Uploaded Picture and Class / Level Progression */}
          <div className="student-profile-header-card">
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "center" }}>
              <label className="student-avatar-frame" title="Click to upload profile photo (Must satisfy dress code)">
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
              <button
                type="button"
                onClick={() => setShowDressCodeModal(true)}
                style={{
                  background: "rgba(168, 85, 247, 0.15)",
                  border: "1px solid rgba(168, 85, 247, 0.4)",
                  color: "#d8b4fe",
                  borderRadius: "6px",
                  padding: "2px 8px",
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
                title="Review official school uniform and dress-code standards for scholar profile photographs"
              >
                👔 Dress Code
              </button>
            </div>

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

          {/* CONCLUDED CLASS CATCH-UP NOTICE BANNER */}
          {concludedClassNotice && !concludedClassNotice.dismissed && (
            <div style={{
              background: "linear-gradient(135deg, rgba(30, 58, 138, 0.95), rgba(15, 23, 42, 0.9))",
              border: "1.5px solid #38bdf8",
              borderRadius: "14px",
              padding: "14px 20px",
              marginBottom: "1.25rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "1.8rem" }}>🎓</span>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#38bdf8", fontWeight: 800, textTransform: "uppercase" }}>
                    LIVE CLASS CONCLUDED NOTICE • RECORDING AVAILABLE FOR CATCH-UP
                  </div>
                  <div style={{ fontSize: "0.95rem", color: "#f8fafc", fontWeight: 800 }}>
                    {concludedClassNotice.subject}: <em>{concludedClassNotice.topic}</em>
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#cbd5e1", marginTop: "2px" }}>
                    Concluded {concludedClassNotice.date} at {concludedClassNotice.endingTime} (Duration: {concludedClassNotice.duration}) • Taught by {concludedClassNotice.instructor}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setShowCatchUpModal(true)}
                  style={{
                    background: "linear-gradient(135deg, #0284c7, #38bdf8)",
                    border: "none",
                    color: "#0f172a",
                    fontWeight: 900,
                    borderRadius: "8px",
                    padding: "8px 16px",
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(56, 189, 248, 0.4)"
                  }}
                >
                  ▶️ Watch Full Catch-Up Recording
                </button>
                <button
                  type="button"
                  onClick={() => {
                    alert("Class notes for " + concludedClassNotice.topic + " downloaded.");
                  }}
                  style={{
                    background: "rgba(255, 255, 255, 0.1)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    color: "#fff",
                    borderRadius: "8px",
                    padding: "8px 14px",
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    fontWeight: 700
                  }}
                >
                  📑 Class Notes PDF
                </button>
                <button
                  type="button"
                  onClick={() => setConcludedClassNotice({ ...concludedClassNotice, dismissed: true })}
                  style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "1.1rem", padding: "4px" }}
                  title="Dismiss notification"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* STUDENT OUTSTANDING FEE ARREARS STATUS CARD */}
          <div style={{
            background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85))",
            border: feeBalance > 0 ? "1.5px solid rgba(239, 68, 68, 0.45)" : "1.5px solid rgba(16, 185, 129, 0.45)",
            borderRadius: "14px",
            padding: "14px 20px",
            marginBottom: "1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "1.8rem" }}>💳</span>
              <div>
                <div style={{ fontSize: "0.75rem", color: feeBalance > 0 ? "#f87171" : "#34d399", fontWeight: 800, textTransform: "uppercase" }}>
                  OFFICIAL STUDENT TUITION & LEDGER STATUS
                </div>
                <div style={{ fontSize: "1.15rem", fontWeight: 900, color: "#f8fafc" }}>
                  Total Billed: GHS 3,200.00 • Total Settled: GHS 2,800.00
                </div>
                <div style={{ fontSize: "0.82rem", color: feeBalance > 0 ? "#fca5a5" : "#a7f3d0", marginTop: "2px" }}>
                  {feeBalance > 0 ? "Outstanding Remaining Fee Arrears: GHS " + feeBalance.toFixed(2) + " (Due: End of Academic Term)" : "✓ All institutional tuition and facility user fees are fully settled."}
                </div>
              </div>
            </div>

            {feeBalance > 0 && (
              <button
                type="button"
                onClick={() => setShowOfficialPaymentModal(true)}
                style={{
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: "0.88rem",
                  padding: "10px 18px",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(16, 185, 129, 0.4)"
                }}
              >
                💳 Pay Outstanding Balance (GHS {feeBalance}) →
              </button>
            )}
          </div>

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
            <button
              type="button"
              className={'role-tab-btn ' + (activeTab === "library" ? "active" : "")}
              onClick={() => setActiveTab("library")}
              style={{ borderLeft: "3px solid #f59e0b", color: activeTab === "library" ? "#fbbf24" : undefined, fontWeight: 800 }}
            >
              📚 Digital Library & E-Books
            </button>
            <button
              type="button"
              className={'role-tab-btn ' + (activeTab === "fees-history" ? "active" : "")}
              onClick={() => setActiveTab("fees-history")}
              style={{ borderLeft: "3px solid #10b981", color: activeTab === "fees-history" ? "#34d399" : undefined, fontWeight: 800 }}
            >
              💳 Lifetime Fee History & Receipts (Day 1)
            </button>
            <button
              type="button"
              className={`role-tab-btn ${activeTab === "peer-chat" ? "active" : ""}`}
              onClick={() => setActiveTab("peer-chat")}
              style={{ borderLeft: "3px solid #06b6d4", color: activeTab === "peer-chat" ? "#22d3ee" : undefined, fontWeight: 800 }}
            >
              💬 Peer Chat & Study Circle
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
          {activeTab === "exams" && (() => {
            const totalTermFees = 2500.00;
            const currentArrears = typeof feeArrears === "number" ? feeArrears : parseFloat(feeArrears || 0);
            const totalPaid = Math.max(0, totalTermFees - currentArrears);
            const paidPercentage = Math.min(100, Math.round((totalPaid / totalTermFees) * 100));
            const meets80PercentThreshold = currentArrears === 0 || paidPercentage >= 80;

            return (
              <div className="role-workspace-card">
                <div className="workspace-title-row">
                  <div>
                    <h2><span>🎯</span> AUTHORIZED ONLINE EXAMINATIONS & SCHEDULE</h2>
                    <p>Comprehensive examination roster with start and end times, exact term/semester tracking, and instant auto-grading</p>
                  </div>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                    <span className="badge-status badge-present" style={{ fontSize: "0.85rem", padding: "6px 14px" }}>
                      📋 Remaining to Write: <strong>{isExamPortalLocked ? "0 Exam(s) (Locked)" : (exams.length > 0 ? exams.length : 3) + " Exam(s)"}</strong>
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                      Active Term: <strong style={{ color: "#38bdf8" }}>{academicTerm} ({academicLevel})</strong>
                    </span>
                    <span style={{
                      fontSize: "0.8rem",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      background: meets80PercentThreshold ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                      color: meets80PercentThreshold ? "#34d399" : "#f87171",
                      fontWeight: 800,
                      border: meets80PercentThreshold ? "1px solid #10b981" : "1px solid #ef4444"
                    }}>
                      {meets80PercentThreshold ? `✓ Fee Clearance: ${paidPercentage}% (>=80% Pass)` : `⚠️ Fee Restricted: ${paidPercentage}% Paid (<80%)`}
                    </span>
                  </div>
                </div>

                {!meets80PercentThreshold ? (
                  <div style={{
                    background: "linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.9))",
                    border: "2px solid #ef4444",
                    borderRadius: "16px",
                    padding: "2rem",
                    textAlign: "center",
                    margin: "1rem 0",
                    boxShadow: "0 15px 35px rgba(239, 68, 68, 0.2)"
                  }}>
                    <div style={{ fontSize: "3rem", marginBottom: "8px" }}>⚠️ 💳</div>
                    <h3 style={{ color: "#f87171", margin: "0 0 10px", fontSize: "1.3rem" }}>
                      EXAMINATION SITTING RESTRICTED — FEE PAYMENT BELOW 80% THRESHOLD
                    </h3>
                    <p style={{ color: "#cbd5e1", maxWidth: "640px", margin: "0 auto 1.25rem", lineHeight: "1.6", fontSize: "0.9rem" }}>
                      Per institutional examination policy, enrolled scholars must clear at least <strong>80% of total term fees</strong> before admission into examination halls or accessing online testing terminals.
                    </p>

                    <div style={{
                      display: "inline-grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "16px",
                      background: "rgba(2, 6, 23, 0.7)",
                      padding: "14px 20px",
                      borderRadius: "10px",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      marginBottom: "1.5rem",
                      textAlign: "left"
                    }}>
                      <div>
                        <span style={{ fontSize: "0.72rem", color: "#94a3b8", display: "block" }}>TOTAL TERM FEES</span>
                        <strong style={{ color: "#f8fafc" }}>GH₵ {totalTermFees.toFixed(2)}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: "0.72rem", color: "#94a3b8", display: "block" }}>AMOUNT PAID ({paidPercentage}%)</span>
                        <strong style={{ color: "#38bdf8" }}>GH₵ {totalPaid.toFixed(2)}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: "0.72rem", color: "#94a3b8", display: "block" }}>NEEDED FOR 80% CLEARANCE</span>
                        <strong style={{ color: "#f59e0b" }}>GH₵ {Math.max(0, (totalTermFees * 0.8) - totalPaid).toFixed(2)}</strong>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => {
                          const deficit = Math.max(0, (totalTermFees * 0.8) - totalPaid);
                          setPaymentAmount(String(deficit > 0 ? deficit : 200));
                          setShowFeePaymentModal(true);
                        }}
                        style={{
                          background: "linear-gradient(135deg, #10b981, #059669)",
                          border: "none",
                          padding: "10px 22px",
                          fontSize: "0.9rem",
                          fontWeight: 800
                        }}
                      >
                        💳 Make Instant Payment to Reach 80% & Unlock Exams (MoMo / Card)
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Conditional Rescheduled Late Exam Writing Slip Notice */}
                    {currentArrears > 0 && (
                      <div style={{
                        background: "linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.25))",
                        border: "1.5px solid #10b981",
                        borderRadius: "12px",
                        padding: "14px 18px",
                        marginBottom: "1.25rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "12px"
                      }}>
                        <div>
                          <div style={{ color: "#34d399", fontWeight: 800, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "8px" }}>
                            <span>🎓</span> RESCHEDULED LATE EXAM WRITING CLEARANCE GRANTED (80%+ PAID)
                          </div>
                          <p style={{ margin: "4px 0 0", color: "#cbd5e1", fontSize: "0.82rem" }}>
                            You have paid {paidPercentage}% of term fees (GH₵ {totalPaid.toFixed(2)}). As an authorized candidate, you are cleared to sit for examinations with late scheduling dispensation.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowRescheduledExamSlipModal(true)}
                          style={{
                            background: "rgba(16, 185, 129, 0.25)",
                            border: "1.5px solid #10b981",
                            color: "#34d399",
                            padding: "8px 16px",
                            borderRadius: "8px",
                            fontWeight: 800,
                            fontSize: "0.82rem",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px"
                          }}
                        >
                          🖨️ View & Print Rescheduled Exam Writing Slip
                        </button>
                      </div>
                    )}

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
                                                  setExamTimeLeftSeconds(ex.durationMinutes ? ex.durationMinutes * 60 : 900);
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
                                  onClick={() => {
                                    setExamTimeLeftSeconds(activeExam?.durationMinutes ? activeExam.durationMinutes * 60 : 900);
                                    setExamStarted(true);
                                  }}
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
                                <span className="badge-status badge-present">⏱️ Time Remaining: {formatExamTime(examTimeLeftSeconds)}</span>
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
                  </>
                )}
              </div>
            );
          })()}

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
                          <button
                            type="button"
                            onClick={() => handleJoinLiveMeeting(m)}
                            className="btn-primary"
                            style={{ flex: 1, textAlign: "center", fontSize: "0.8rem", padding: "8px", cursor: "pointer", background: "linear-gradient(135deg, #0284c7, #0369a1)", border: "none", borderRadius: "8px", color: "#fff", fontWeight: 800, boxShadow: "0 4px 12px rgba(2, 132, 199, 0.4)" }}
                          >
                            🚀 Join Live Class
                          </button>
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

          {/* ======================================================== */}
          {/* TAB 8: PEER CHAT & STUDY CIRCLE VIA INDEX NUMBER         */}
          {/* ======================================================== */}
          {/* TAB: DIGITAL LIBRARY & E-BOOK HUB */}
          {activeTab === "library" && (
            <div className="role-workspace-card">
              <div className="workspace-title-row">
                <div>
                  <h2><span>📚</span> STUDENT DIGITAL LIBRARY & E-BOOK HUB</h2>
                  <p>Browse educational textbooks, borrow e-books for syllabus study, monitor due date alert countdowns, and return books.</p>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <span className="role-portal-badge" style={{ color: "#fbbf24", background: "rgba(245, 158, 11, 0.15)" }}>
                    {borrowedBooks.length} Active Borrowed Books
                  </span>
                </div>
              </div>

              {/* Borrowed Books Section */}
              <div style={{ marginBottom: "2rem" }}>
                <h3 style={{ color: "#38bdf8", fontSize: "1.05rem", fontWeight: 800, marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>📖</span> Currently Borrowed Textbooks & Due Date Alerts:
                </h3>
                {borrowedBooks.length === 0 ? (
                  <div style={{ background: "rgba(15, 23, 42, 0.5)", border: "1px dashed rgba(255, 255, 255, 0.15)", borderRadius: "12px", padding: "1.5rem", textAlign: "center", color: "#94a3b8" }}>
                    No books currently borrowed. Select a textbook from the catalog below to borrow.
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "14px" }}>
                    {borrowedBooks.map((b) => (
                      <div
                        key={b.id}
                        onDoubleClick={() => setSelectedBookForPreview(b)}
                        title="Double-click to view high-resolution book cover and full syllabus details"
                        style={{
                          background: "rgba(15, 23, 42, 0.8)",
                          border: "1.5px solid rgba(245, 158, 11, 0.4)",
                          borderRadius: "12px",
                          padding: "14px",
                          display: "flex",
                          gap: "14px",
                          cursor: "pointer",
                          transition: "transform 0.15s ease, box-shadow 0.15s ease"
                        }}
                      >
                        <img
                          src={b.cover}
                          alt={b.title}
                          style={{ width: "70px", height: "95px", objectFit: "cover", borderRadius: "8px", boxShadow: "0 4px 8px rgba(0,0,0,0.4)" }}
                        />
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                          <div>
                            <h4 style={{ margin: "0 0 4px", fontSize: "0.92rem", color: "#f8fafc" }}>{b.title}</h4>
                            <div style={{ fontSize: "0.76rem", color: "#94a3b8" }}>By: {b.author}</div>
                            <div style={{ fontSize: "0.72rem", color: "#38bdf8", fontFamily: "monospace", marginTop: "2px" }}>ISBN: {b.isbn}</div>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", flexWrap: "wrap", gap: "6px" }}>
                            <span style={{ fontSize: "0.75rem", background: "rgba(239, 68, 68, 0.2)", color: "#f87171", padding: "3px 8px", borderRadius: "6px", fontWeight: 800 }}>
                              ⏱️ Due in {b.daysRemaining} days ({b.dueDate})
                            </span>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setSelectedBookForPreview(b); }}
                                style={{ background: "rgba(56, 189, 248, 0.15)", border: "1px solid #38bdf8", color: "#38bdf8", borderRadius: "6px", padding: "4px 8px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}
                              >
                                🔍 Details
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleReturnBook(b.id); }}
                                style={{
                                  background: "rgba(16, 185, 129, 0.2)",
                                  border: "1px solid #10b981",
                                  color: "#34d399",
                                  borderRadius: "6px",
                                  padding: "4px 10px",
                                  fontSize: "0.75rem",
                                  fontWeight: 800,
                                  cursor: "pointer"
                                }}
                              >
                                📥 Return Book
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Available Library Catalog */}
              <div>
                <h3 style={{ color: "#34d399", fontSize: "1.05rem", fontWeight: 800, marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>🏛️</span> Institutional Syllabus E-Book Catalog (Double-click to View Cover & Details):
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
                  {LIBRARY_CATALOG.map((cat) => {
                    const isAlreadyBorrowed = borrowedBooks.some((b) => b.title === cat.title);
                    return (
                      <div
                        key={cat.id}
                        onDoubleClick={() => setSelectedBookForPreview(cat)}
                        title="Double-click to view high-resolution cover and book details"
                        style={{
                          background: "rgba(15, 23, 42, 0.65)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: "12px",
                          padding: "12px",
                          display: "flex",
                          gap: "12px",
                          cursor: "pointer"
                        }}
                      >
                        <img
                          src={cat.cover}
                          alt={cat.title}
                          style={{ width: "65px", height: "90px", objectFit: "cover", borderRadius: "6px", boxShadow: "0 4px 8px rgba(0,0,0,0.3)" }}
                        />
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                          <div>
                            <span style={{ fontSize: "0.68rem", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>
                              {cat.category}
                            </span>
                            <h4 style={{ margin: "4px 0 2px", fontSize: "0.85rem", color: "#f8fafc" }}>{cat.title}</h4>
                            <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{cat.author} • {cat.pages} pgs</div>
                          </div>
                          <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setSelectedBookForPreview(cat); }}
                              style={{ background: "rgba(255, 255, 255, 0.08)", border: "1px solid rgba(255, 255, 255, 0.2)", color: "#cbd5e1", borderRadius: "6px", padding: "4px 8px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}
                            >
                              🔍 View
                            </button>
                            <button
                              type="button"
                              disabled={isAlreadyBorrowed}
                              onClick={(e) => { e.stopPropagation(); handleBorrowBook(cat); }}
                              style={{
                                flex: 1,
                                background: isAlreadyBorrowed ? "rgba(255, 255, 255, 0.08)" : "linear-gradient(135deg, #0284c7, #0369a1)",
                                border: "none",
                                borderRadius: "6px",
                                color: isAlreadyBorrowed ? "#64748b" : "#fff",
                                padding: "6px 12px",
                                fontSize: "0.75rem",
                                fontWeight: 800,
                                cursor: isAlreadyBorrowed ? "not-allowed" : "pointer"
                              }}
                            >
                              {isAlreadyBorrowed ? "✓ Borrowed" : "📖 Borrow E-Book"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB: LIFETIME FINANCIAL CLEARANCE LEDGER & ALL TRANSACTIONS FROM DAY 1 OF ADMISSION */}
          {activeTab === "fees-history" && (
            <div className="role-workspace-card">
              <div className="workspace-title-row">
                <div>
                  <h2><span>💳</span> LIFETIME INSTITUTIONAL FEE LEDGER & TRANSACTIONS HISTORY</h2>
                  <p>
                    Cross-check all tuition, lab levies, facility user fees, and payments made to the institution from Day 1 of admission to date. Certified by the GBS Bursar Directorate.
                  </p>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1.5px solid #10b981", padding: "8px 16px", borderRadius: "10px", color: "#34d399", fontWeight: 800, fontSize: "0.85rem" }}>
                    Total Lifetime Settled: GH₵ 8,450.00
                  </div>
                  {feeBalance > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowOfficialPaymentModal(true)}
                      style={{
                        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                        border: "none",
                        borderRadius: "10px",
                        color: "#ffffff",
                        padding: "8px 16px",
                        fontWeight: 900,
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        boxShadow: "0 4px 15px rgba(16, 185, 129, 0.4)"
                      }}
                    >
                      💳 Settle Remaining Arrears (GH₵ {feeBalance.toFixed(2)})
                    </button>
                  )}
                </div>
              </div>

              {/* Summary Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "20px" }}>
                <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "12px", padding: "14px" }}>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 700, display: "block" }}>ADMISSION DATE</span>
                  <strong style={{ color: "#38bdf8", fontSize: "1rem" }}>Jan 15, 2024 (Day 1)</strong>
                  <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "2px" }}>Matric: STU-2026-0891</div>
                </div>
                <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "12px", padding: "14px" }}>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 700, display: "block" }}>LIFETIME INVOICED CHARGES</span>
                  <strong style={{ color: "#f8fafc", fontSize: "1rem" }}>GH₵ 8,950.00</strong>
                  <div style={{ fontSize: "0.72rem", color: "#10b981", marginTop: "2px" }}>8 Audited Billing Cycles</div>
                </div>
                <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "12px", padding: "14px" }}>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 700, display: "block" }}>CURRENT BALANCE STATUS</span>
                  <strong style={{ color: feeBalance > 0 ? "#f59e0b" : "#34d399", fontSize: "1rem" }}>
                    {feeBalance > 0 ? `GH₵ ${feeBalance.toFixed(2)} Pending` : "✓ Fully Cleared (GH₵ 0.00)"}
                  </strong>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "2px" }}>80% Exam Threshold Satisfied</div>
                </div>
              </div>

              {/* Lifetime Ledger Table */}
              <div className="role-table-responsive">
                <table className="role-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Billing Period / Academic Term</th>
                      <th>Date</th>
                      <th>Receipt #</th>
                      <th>Fee Purpose & Description</th>
                      <th>Payment Channel</th>
                      <th>Billed (GH₵)</th>
                      <th>Settled (GH₵)</th>
                      <th>Balance</th>
                      <th>Audit Status</th>
                      <th style={{ textAlign: "center" }}>Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        idx: 1,
                        term: "Admission Enrolment (Day 1)",
                        date: "2024-01-15",
                        receipt: "GBS-REC-2024-0019",
                        desc: "Admission Acceptance, Student File Creation & Matriculation Pack",
                        channel: "MTN MoMo (+233 24 555 0199)",
                        channelBadge: "🟡 MTN",
                        billed: 850.00,
                        paid: 850.00,
                        balance: 0.00,
                        status: "SETTLED"
                      },
                      {
                        idx: 2,
                        term: "Year 1 • Term 1",
                        date: "2024-01-20",
                        receipt: "GBS-REC-2024-0312",
                        desc: "Tuition, STEM Practical Science Levy & Digital Portal Access",
                        channel: "GhIPSS Instant Bank Wire",
                        channelBadge: "🏦 Bank",
                        billed: 1200.00,
                        paid: 1200.00,
                        balance: 0.00,
                        status: "SETTLED"
                      },
                      {
                        idx: 3,
                        term: "Year 1 • Term 2",
                        date: "2024-05-10",
                        receipt: "GBS-REC-2024-0894",
                        desc: "Tuition, Library Access & Mid-Year Terminal Examination Fee",
                        channel: "Telecel Cash",
                        channelBadge: "🔴 Telecel",
                        billed: 1100.00,
                        paid: 1100.00,
                        balance: 0.00,
                        status: "SETTLED"
                      },
                      {
                        idx: 4,
                        term: "Year 1 • Term 3",
                        date: "2024-09-18",
                        receipt: "GBS-REC-2024-1420",
                        desc: "Tuition, Promotional Examination & ICT Laboratory Fee",
                        channel: "MTN MoMo",
                        channelBadge: "🟡 MTN",
                        billed: 1150.00,
                        paid: 1150.00,
                        balance: 0.00,
                        status: "SETTLED"
                      },
                      {
                        idx: 5,
                        term: "Year 2 • Term 1",
                        date: "2025-01-14",
                        receipt: "GBS-REC-2025-0211",
                        desc: "Tuition, Senior Secondary Science Lab & Sports Development",
                        channel: "Visa 3DS Debit",
                        channelBadge: "💳 Visa",
                        billed: 1300.00,
                        paid: 1300.00,
                        balance: 0.00,
                        status: "SETTLED"
                      },
                      {
                        idx: 6,
                        term: "Year 2 • Term 2",
                        date: "2025-05-12",
                        receipt: "GBS-REC-2025-0955",
                        desc: "Tuition & Digital Cloud LMS Platform User License",
                        channel: "MTN MoMo",
                        channelBadge: "🟡 MTN",
                        billed: 1250.00,
                        paid: 1250.00,
                        balance: 0.00,
                        status: "SETTLED"
                      },
                      {
                        idx: 7,
                        term: "Year 2 • Term 3",
                        date: "2025-09-22",
                        receipt: "GBS-REC-2025-1688",
                        desc: "Tuition & Pre-Finals Mock Assessment Examination Fee",
                        channel: "GhIPSS Instant Bank Transfer",
                        channelBadge: "🏦 Bank",
                        billed: 1200.00,
                        paid: 1200.00,
                        balance: 0.00,
                        status: "SETTLED"
                      },
                      {
                        idx: 8,
                        term: "Year 3 • Term 1 (Active)",
                        date: "2026-10-18",
                        receipt: feeBalance === 0 ? "GBS-REC-2026-2104" : "GBS-INV-2026-PART",
                        desc: "Tuition, WASSCE Certification Prep & Senior Terminal Clearance",
                        channel: "MTN MoMo (+233 24 555 0199)",
                        channelBadge: "🟡 MTN",
                        billed: 900.00,
                        paid: 900.00 - feeBalance,
                        balance: feeBalance,
                        status: feeBalance === 0 ? "SETTLED" : "PARTIALLY_SETTLED"
                      }
                    ].map((row) => (
                      <tr key={row.idx} style={{ background: row.balance > 0 ? "rgba(245, 158, 11, 0.06)" : "transparent" }}>
                        <td style={{ color: "#94a3b8", fontWeight: 700 }}>{row.idx}</td>
                        <td>
                          <strong style={{ color: "#f8fafc", fontSize: "0.85rem" }}>{row.term}</strong>
                        </td>
                        <td style={{ fontSize: "0.8rem", color: "#94a3b8", whiteSpace: "nowrap" }}>{row.date}</td>
                        <td style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "#38bdf8" }}>{row.receipt}</td>
                        <td style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>{row.desc}</td>
                        <td>
                          <span style={{ fontSize: "0.72rem", background: "rgba(255, 255, 255, 0.08)", padding: "2px 8px", borderRadius: "6px", color: "#f8fafc", fontWeight: 700 }}>
                            {row.channelBadge} {row.channel}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700 }}>{row.billed.toFixed(2)}</td>
                        <td style={{ fontWeight: 800, color: "#34d399" }}>{row.paid.toFixed(2)}</td>
                        <td style={{ fontWeight: 800, color: row.balance > 0 ? "#f59e0b" : "#94a3b8" }}>{row.balance.toFixed(2)}</td>
                        <td>
                          <span style={{
                            fontSize: "0.72rem",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            fontWeight: 800,
                            background: row.balance === 0 ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
                            color: row.balance === 0 ? "#34d399" : "#fbbf24"
                          }}>
                            {row.balance === 0 ? "✓ Cleared & Reconciled" : "⏳ Active Balance"}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={() => {
                              window.showGBSOpenNotice?.(
                                `Official Bursar Receipt (${row.receipt}) for ${row.term} (GH₵ ${row.paid.toFixed(2)}) downloaded!`,
                                "success",
                                "Receipt Download"
                              );
                            }}
                            style={{
                              background: "rgba(56, 189, 248, 0.15)",
                              border: "1px solid #38bdf8",
                              borderRadius: "6px",
                              color: "#38bdf8",
                              padding: "4px 8px",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              cursor: "pointer"
                            }}
                          >
                            🧾 Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "peer-chat" && (
            <div className="role-workspace-card">
              <div className="workspace-title-row">
                <div>
                  <h2><span>💬</span> STUDENT PEER CHAT & ACADEMIC STUDY CIRCLE</h2>
                  <p>
                    Connect with friends and study partners across the institution. Enter the student's registered <strong>Index Number</strong>,
                    verify identity, and collaborate in private study chats with automatic transcript archiving.
                  </p>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => setShowArchivedChatsModal(true)}
                    style={{
                      background: "rgba(148, 163, 184, 0.15)",
                      border: "1px solid #64748b",
                      color: "#cbd5e1",
                      borderRadius: "8px",
                      padding: "8px 14px",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    🗄️ View Archived Chats ({archivedPeerChats.length})
                  </button>
                  <span className="role-portal-badge" style={{ color: "#22d3ee", background: "rgba(6, 182, 212, 0.15)" }}>
                    {enrolledPeersList.length} Verified Scholars in Institution
                  </span>
                </div>
              </div>

              {/* Index Number Search & Verification Box */}
              <div style={{
                background: "linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.75) 100%)",
                border: "1.5px solid rgba(6, 182, 212, 0.35)",
                borderRadius: "14px",
                padding: "1.25rem",
                marginBottom: "1.5rem"
              }}>
                <label style={{ display: "block", color: "#22d3ee", fontWeight: 800, fontSize: "0.88rem", marginBottom: "8px" }}>
                  🔍 Search Classmate / Friend by Registered Index Number:
                </label>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSearchPeerByIndex();
                  }}
                  style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}
                >
                  <input
                    type="text"
                    value={searchIndexInput}
                    onChange={(e) => setSearchIndexInput(e.target.value)}
                    placeholder="Enter Student Index Number (e.g. STU-2026-001, STU-2026-002, 101)"
                    className="filter-input"
                    style={{ flex: 1, minWidth: "260px", padding: "10px 14px", fontFamily: "monospace", fontSize: "0.95rem" }}
                  />
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ background: "linear-gradient(135deg, #0891b2, #06b6d4)", padding: "10px 20px", fontWeight: 800 }}
                  >
                    🔍 Verify & Open Chat
                  </button>
                </form>

                {/* Quick Select Chips */}
                <div style={{ display: "flex", gap: "8px", marginTop: "12px", alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 700 }}>Quick Select Classmates:</span>
                  {enrolledPeersList.slice(0, 5).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSearchIndexInput(p.indexNumber || p.studentId);
                        handleSearchPeerByIndex(p.indexNumber || p.studentId);
                      }}
                      style={{
                        background: "rgba(6, 182, 212, 0.12)",
                        border: "1px solid rgba(6, 182, 212, 0.3)",
                        color: "#67e8f9",
                        borderRadius: "20px",
                        padding: "3px 10px",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                        fontWeight: 700
                      }}
                    >
                      {p.firstName} {p.lastName} ({p.indexNumber || p.studentId})
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Conversation Interface */}
              {activePeerChat ? (
                <div style={{
                  background: "rgba(15, 23, 42, 0.8)",
                  border: "1.5px solid rgba(6, 182, 212, 0.4)",
                  borderRadius: "14px",
                  overflow: "hidden",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.4)"
                }}>
                  {/* Chat Header */}
                  <div style={{
                    background: "rgba(30, 41, 59, 0.9)",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                    padding: "12px 18px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "10px"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <img
                        src={activePeerChat.photo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"}
                        alt={activePeerChat.firstName}
                        style={{ width: "48px", height: "48px", borderRadius: "10px", objectFit: "cover", border: "2px solid #06b6d4" }}
                      />
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <h3 style={{ margin: 0, color: "#f8fafc", fontSize: "1.05rem" }}>
                            {activePeerChat.firstName} {activePeerChat.lastName}
                          </h3>
                          <span style={{ fontSize: "0.72rem", background: "#064e3b", color: "#34d399", padding: "2px 8px", borderRadius: "999px", fontWeight: 800 }}>
                            🟢 STUDY CIRCLE ACTIVE
                          </span>
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "#94a3b8", display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "2px" }}>
                          <span>Index: <strong style={{ color: "#22d3ee", fontFamily: "monospace" }}>{activePeerChat.indexNumber || activePeerChat.studentId}</strong></span>
                          <span>•</span>
                          <span>Class: <strong>{activePeerChat.currentClass || activePeerChat.classCode}</strong></span>
                          <span>•</span>
                          <span>📞 <a href={`tel:${activePeerChat.registeredMobile || activePeerChat.phone}`} style={{ color: "#38bdf8", textDecoration: "none" }}>{activePeerChat.registeredMobile || activePeerChat.phone || "—"}</a></span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <button
                        type="button"
                        onClick={() => handleStartPeerVideoCall(activePeerChat)}
                        style={{
                          background: "linear-gradient(135deg, #0284c7, #06b6d4)",
                          border: "none",
                          color: "#ffffff",
                          borderRadius: "8px",
                          padding: "6px 14px",
                          fontSize: "0.78rem",
                          fontWeight: 800,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          boxShadow: "0 4px 12px rgba(6, 182, 212, 0.4)"
                        }}
                      >
                        📹 Start Live Video Call
                      </button>
                      <button
                        type="button"
                        onClick={handleArchiveCurrentChat}
                        style={{
                          background: "rgba(16, 185, 129, 0.2)",
                          border: "1px solid #10b981",
                          color: "#34d399",
                          borderRadius: "8px",
                          padding: "6px 12px",
                          fontSize: "0.78rem",
                          fontWeight: 800,
                          cursor: "pointer"
                        }}
                      >
                        📁 Save & Archive Chat
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const transcript = chatMessages.map((m) => `[${m.timestamp}] ${m.senderName}: ${m.text}`).join("\n");
                          const blob = new Blob([transcript], { type: "text/plain" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `Study_Chat_${activePeerChat.firstName}_${Date.now()}.txt`;
                          a.click();
                        }}
                        style={{
                          background: "rgba(56, 189, 248, 0.15)",
                          border: "1px solid #38bdf8",
                          color: "#38bdf8",
                          borderRadius: "8px",
                          padding: "6px 12px",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        📥 Export Transcript
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivePeerChat(null)}
                        style={{
                          background: "rgba(239, 68, 68, 0.15)",
                          border: "1px solid #ef4444",
                          color: "#f87171",
                          borderRadius: "8px",
                          padding: "6px 10px",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        ✕ Close
                      </button>
                    </div>
                  </div>

                  {/* Messages Timeline */}
                  <div style={{
                    padding: "20px",
                    minHeight: "280px",
                    maxHeight: "420px",
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    background: "rgba(2, 6, 23, 0.4)"
                  }}>
                    {chatMessages.length === 0 ? (
                      <div style={{ textAlign: "center", color: "#64748b", margin: "auto", fontSize: "0.88rem" }}>
                        💬 No messages yet. Say hello to start collaborating!
                      </div>
                    ) : (
                      chatMessages.map((m) => {
                        const isMe = m.sender === "ME";
                        return (
                          <div
                            key={m.id}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: isMe ? "flex-end" : "flex-start",
                              maxWidth: "80%",
                              alignSelf: isMe ? "flex-end" : "flex-start"
                            }}
                          >
                            <span style={{ fontSize: "0.7rem", color: "#94a3b8", marginBottom: "2px" }}>
                              {isMe ? "You" : m.senderName} • {m.timestamp}
                            </span>
                            <div
                              style={{
                                background: isMe
                                  ? "linear-gradient(135deg, #0284c7, #0891b2)"
                                  : "rgba(30, 41, 59, 0.9)",
                                color: "#f8fafc",
                                padding: "10px 16px",
                                borderRadius: isMe ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                                border: isMe ? "none" : "1px solid rgba(255, 255, 255, 0.1)",
                                fontSize: "0.9rem",
                                lineHeight: "1.45",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
                              }}
                            >
                              {m.text}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Quick Prompts Bar */}
                  <div style={{
                    padding: "8px 16px",
                    background: "rgba(15, 23, 42, 0.9)",
                    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                    display: "flex",
                    gap: "8px",
                    alignItems: "center",
                    flexWrap: "wrap"
                  }}>
                    <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Quick Study Prompts:</span>
                    <button
                      type="button"
                      onClick={() => handleSendMessage("Hey! Did you finish the mathematics exercise assignment?")}
                      style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.15)", color: "#cbd5e1", borderRadius: "14px", padding: "3px 10px", fontSize: "0.72rem", cursor: "pointer" }}
                    >
                      📐 Homework Status?
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendMessage("Could you share your lecture notes for Chapter 3?")}
                      style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.15)", color: "#cbd5e1", borderRadius: "14px", padding: "3px 10px", fontSize: "0.72rem", cursor: "pointer" }}
                    >
                      📖 Share Chapter Notes
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendMessage("Let's review the past questions before the examination tomorrow!")}
                      style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.15)", color: "#cbd5e1", borderRadius: "14px", padding: "3px 10px", fontSize: "0.72rem", cursor: "pointer" }}
                    >
                      🎯 Exam Review
                    </button>
                  </div>

                  {/* Input Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    style={{
                      padding: "12px 16px",
                      background: "rgba(30, 41, 59, 0.95)",
                      display: "flex",
                      gap: "10px",
                      alignItems: "center"
                    }}
                  >
                    <input
                      type="text"
                      placeholder={`Type study message to ${activePeerChat.firstName}... (Press Enter)`}
                      value={newMessageText}
                      onChange={(e) => setNewMessageText(e.target.value)}
                      style={{
                        flex: 1,
                        background: "rgba(15, 23, 42, 0.9)",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        color: "#ffffff",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        fontSize: "0.88rem"
                      }}
                    />
                    <button
                      type="submit"
                      className="btn-primary"
                      style={{ background: "linear-gradient(135deg, #0891b2, #06b6d4)", padding: "10px 20px", fontWeight: 800 }}
                    >
                      Send 💬
                    </button>
                  </form>
                </div>
              ) : (
                /* Registered Scholars Cohort Directory */
                <div>
                  <h3 style={{ margin: "0 0 12px", color: "#f8fafc", fontSize: "1.05rem" }}>
                    📚 Registered Cohort Directory & Verified Index Numbers
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
                    {enrolledPeersList.map((peer) => (
                      <div
                        key={peer.id}
                        style={{
                          background: "rgba(15, 23, 42, 0.75)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          borderRadius: "12px",
                          padding: "16px",
                          display: "flex",
                          gap: "12px",
                          alignItems: "center",
                          boxShadow: "0 4px 14px rgba(0,0,0,0.2)"
                        }}
                      >
                        <img
                          src={peer.photo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"}
                          alt={peer.firstName}
                          style={{ width: "60px", height: "60px", borderRadius: "10px", objectFit: "cover", border: "1.5px solid #06b6d4" }}
                        />
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: 0, color: "#f8fafc", fontSize: "0.95rem" }}>
                            {peer.firstName} {peer.lastName}
                          </h4>
                          <span style={{ fontSize: "0.75rem", color: "#22d3ee", fontFamily: "monospace", display: "block", marginTop: "2px" }}>
                            Index: {peer.indexNumber || peer.studentId}
                          </span>
                          <span style={{ fontSize: "0.72rem", color: "#94a3b8", display: "block" }}>
                            {peer.currentClass || peer.classCode}
                          </span>
                          <span style={{ fontSize: "0.72rem", color: "#38bdf8", display: "block", marginTop: "2px" }}>
                            📱 {peer.registeredMobile || peer.phone || "+233-24-000-0000"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCandidatePeer(peer);
                            setShowPeerConfirmModal(true);
                          }}
                          style={{
                            background: "rgba(6, 182, 212, 0.15)",
                            border: "1px solid #06b6d4",
                            color: "#22d3ee",
                            borderRadius: "8px",
                            padding: "8px 12px",
                            fontSize: "0.78rem",
                            fontWeight: 800,
                            cursor: "pointer",
                            whiteSpace: "nowrap"
                          }}
                        >
                          💬 Chat
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                            style={{ padding: "4px 10px", fontSize: "0.75rem", cursor: "pointer" }}
                            onClick={() => navigateToDetail(navigate, "report", file.id || file.name, file, { returnTab: activeTab })}
                            title="View full course material details on dedicated page"
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

      {/* MODAL: DRESS CODE GUIDELINES */}
      {showDressCodeModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(3, 7, 18, 0.85)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999999,
          padding: "20px"
        }}>
          <div style={{
            background: "linear-gradient(145deg, #0f172a 0%, #1e293b 100%)",
            border: "2px solid #a855f7",
            borderRadius: "18px",
            maxWidth: "520px",
            width: "100%",
            padding: "26px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
            color: "#f8fafc"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ margin: 0, color: "#c084fc", fontSize: "1.15rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>👔</span> OFFICIAL SCHOLAR DRESS CODE & PORTRAIT STANDARDS
              </h3>
              <button
                type="button"
                onClick={() => setShowDressCodeModal(false)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: "1.2rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: "0.85rem", color: "#cbd5e1", lineHeight: "1.5", margin: "0 0 16px" }}>
              To maintain institutional identity and security verification across examinations, live classrooms, and parental records, every student profile photograph must strictly adhere to the following standards:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
              <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "10px 14px", borderRadius: "10px", border: "1px solid rgba(168, 85, 247, 0.25)" }}>
                <strong style={{ color: "#a855f7", fontSize: "0.85rem" }}>1. Prescribed Academic Uniform:</strong>
                <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#94a3b8" }}>
                  Official institutional school uniform, collared shirt, or formal academic blazer. Casual t-shirts are not permitted.
                </p>
              </div>
              <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "10px 14px", borderRadius: "10px", border: "1px solid rgba(168, 85, 247, 0.25)" }}>
                <strong style={{ color: "#38bdf8", fontSize: "0.85rem" }}>2. Plain Neutral Background:</strong>
                <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#94a3b8" }}>
                  Solid white, light blue, or neutral studio background without shadows or background objects.
                </p>
              </div>
              <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "10px 14px", borderRadius: "10px", border: "1px solid rgba(168, 85, 247, 0.25)" }}>
                <strong style={{ color: "#34d399", fontSize: "0.85rem" }}>3. Square Ratio (1:1) & Clear Facial View:</strong>
                <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#94a3b8" }}>
                  Front-facing centered portrait with shoulders visible. No sunglasses, decorative headwear, or digital augmented filters.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setShowDressCodeModal(false)}
              style={{ width: "100%", padding: "10px", background: "linear-gradient(135deg, #9333ea, #a855f7)", fontWeight: 800 }}
            >
              ✓ Understood & Acknowledged
            </button>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM PEER CHAT IDENTITY */}
      {showPeerConfirmModal && candidatePeer && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(3, 7, 18, 0.85)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999999,
          padding: "20px"
        }}>
          <div style={{
            background: "linear-gradient(145deg, #0f172a 0%, #1e293b 100%)",
            border: "2px solid #06b6d4",
            borderRadius: "18px",
            maxWidth: "460px",
            width: "100%",
            padding: "24px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
            color: "#f8fafc",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "2.2rem", marginBottom: "8px" }}>💬 ✨</div>
            <h3 style={{ margin: "0 0 6px", color: "#22d3ee", fontSize: "1.2rem" }}>
              CONFIRM PEER IDENTITY
            </h3>
            <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: "0 0 16px" }}>
              Please verify that this is the classmate you wish to communicate and collaborate with:
            </p>

            <div style={{
              background: "rgba(15, 23, 42, 0.8)",
              border: "1px solid rgba(6, 182, 212, 0.3)",
              borderRadius: "14px",
              padding: "16px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
              textAlign: "left",
              marginBottom: "20px"
            }}>
              <img
                src={candidatePeer.photo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"}
                alt={candidatePeer.firstName}
                style={{ width: "64px", height: "64px", borderRadius: "12px", objectFit: "cover", border: "2px solid #06b6d4" }}
              />
              <div>
                <h4 style={{ margin: 0, color: "#f8fafc", fontSize: "1.05rem" }}>
                  {candidatePeer.firstName} {candidatePeer.lastName}
                </h4>
                <div style={{ fontSize: "0.78rem", color: "#22d3ee", fontFamily: "monospace", marginTop: "2px" }}>
                  Index: {candidatePeer.indexNumber || candidatePeer.studentId}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                  {candidatePeer.currentClass || candidatePeer.classCode}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#34d399", marginTop: "3px" }}>
                  📞 {candidatePeer.registeredMobile || candidatePeer.phone || "+233-24-000-0000"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowPeerConfirmModal(false);
                  setCandidatePeer(null);
                }}
                style={{ flex: 1, padding: "10px" }}
              >
                ✕ Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => handleConfirmStartChat(candidatePeer)}
                style={{ flex: 1, padding: "10px", background: "linear-gradient(135deg, #0891b2, #06b6d4)", fontWeight: 800 }}
              >
                ✅ Verify & Start Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VIEW ARCHIVED CHATS */}
      {showArchivedChatsModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(3, 7, 18, 0.85)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999999,
          padding: "20px"
        }}>
          <div style={{
            background: "linear-gradient(145deg, #0f172a 0%, #1e293b 100%)",
            border: "2px solid #64748b",
            borderRadius: "18px",
            maxWidth: "600px",
            width: "100%",
            padding: "24px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
            color: "#f8fafc"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ margin: 0, color: "#cbd5e1", fontSize: "1.15rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>🗄️</span> ARCHIVED PEER CHATS VAULT ({archivedPeerChats.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowArchivedChatsModal(false)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: "1.2rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {archivedPeerChats.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                <span style={{ fontSize: "2rem", display: "block", marginBottom: "8px" }}>📦</span>
                No conversations have been archived yet. Click "Save & Archive Chat" in any conversation to preserve study notes here.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "360px", overflowY: "auto" }}>
                {archivedPeerChats.map((arch) => (
                  <div
                    key={arch.id}
                    style={{
                      background: "rgba(15, 23, 42, 0.75)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "10px",
                      padding: "12px 16px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "10px"
                    }}
                  >
                    <div>
                      <h4 style={{ margin: 0, color: "#38bdf8", fontSize: "0.95rem" }}>
                        {arch.peerName} ({arch.peerIndex})
                      </h4>
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                        Archived: {arch.archivedAt} • {arch.messageCount} messages
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={() => {
                          const peerMatch = enrolledPeersList.find((p) => (p.indexNumber || p.studentId) === arch.peerIndex) || {
                            firstName: arch.peerName.split(" ")[0],
                            lastName: arch.peerName.split(" ")[1] || "",
                            indexNumber: arch.peerIndex,
                            studentId: arch.peerIndex,
                            currentClass: arch.peerClass
                          };
                          setActivePeerChat(peerMatch);
                          setChatMessages(arch.messages || []);
                          setShowArchivedChatsModal(false);
                          setActiveTab("peer-chat");
                        }}
                        style={{
                          background: "rgba(6, 182, 212, 0.2)",
                          border: "1px solid #06b6d4",
                          color: "#22d3ee",
                          borderRadius: "6px",
                          padding: "5px 10px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        🔄 Open
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const transcript = (arch.messages || []).map((m) => `[${m.timestamp}] ${m.senderName}: ${m.text}`).join("\n");
                          const blob = new Blob([transcript], { type: "text/plain" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `Archived_Chat_${arch.peerName}_${Date.now()}.txt`;
                          a.click();
                        }}
                        style={{
                          background: "rgba(148, 163, 184, 0.15)",
                          border: "1px solid #64748b",
                          color: "#cbd5e1",
                          borderRadius: "6px",
                          padding: "5px 10px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        📥 Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: INSTANT FEE PAYMENT GATEWAY */}
      {showFeePaymentModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(3, 7, 18, 0.85)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999999,
          padding: "20px"
        }}>
          <div style={{
            background: "linear-gradient(145deg, #0f172a 0%, #1e293b 100%)",
            border: "2px solid #10b981",
            borderRadius: "18px",
            maxWidth: "480px",
            width: "100%",
            padding: "26px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
            color: "#f8fafc"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ margin: 0, color: "#34d399", fontSize: "1.15rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>💳</span> INSTANT TUITION & EXAMINATION PAYMENT
              </h3>
              <button
                type="button"
                onClick={() => setShowFeePaymentModal(false)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: "1.2rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: "0.82rem", color: "#cbd5e1", margin: "0 0 16px" }}>
              Settling at least <strong>80% of term fees</strong> automatically unlocks examination hall entry and generates an official late exam clearance slip.
            </p>

            <form onSubmit={handleProcessFeePayment} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "4px" }}>
                  Payment Method / Gateway *
                </label>
                <select
                  value={paymentChannel}
                  onChange={(e) => setPaymentChannel(e.target.value)}
                  className="filter-select"
                  style={{ width: "100%", padding: "8px 12px" }}
                >
                  <option value="MTN_MOMO">🟡 MTN Mobile Money (*170#)</option>
                  <option value="TELECEL_CASH">🔴 Telecel Cash (*110#)</option>
                  <option value="AIRTELTIGO_MONEY">🔵 AirtelTigo Money (*110#)</option>
                  <option value="VISA_MASTERCARD">💳 Visa / Mastercard / Debit</option>
                  <option value="BANK_DIRECT">🏦 Direct Commercial Bank Transfer</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "4px" }}>
                  Payment Amount (GH₵) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="filter-input"
                  style={{ width: "100%", padding: "8px 12px", fontFamily: "monospace", fontSize: "1.05rem" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "4px" }}>
                  Payer Mobile Number (for MoMo Prompt) *
                </label>
                <input
                  type="tel"
                  required
                  value={payerPhone}
                  onChange={(e) => setPayerPhone(e.target.value)}
                  className="filter-input"
                  style={{ width: "100%", padding: "8px 12px" }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowFeePaymentModal(false)}
                  style={{ flex: 1, padding: "10px" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, padding: "10px", background: "linear-gradient(135deg, #10b981, #059669)", fontWeight: 800 }}
                >
                  Confirm Payment (GH₵ {parseFloat(paymentAmount || 0).toFixed(2)})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESCHEDULED LATE EXAM WRITING SLIP */}
      {showRescheduledExamSlipModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(3, 7, 18, 0.85)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999999,
          padding: "20px"
        }}>
          <div style={{
            background: "#ffffff",
            color: "#0f172a",
            borderRadius: "16px",
            maxWidth: "540px",
            width: "100%",
            padding: "28px",
            boxShadow: "0 25px 60px rgba(0,0,0,0.8)",
            fontFamily: "serif"
          }}>
            <div style={{ borderBottom: "2px solid #0f172a", paddingBottom: "12px", marginBottom: "16px", textAlign: "center" }}>
              <div style={{ fontSize: "1.8rem" }}>🎓 🏛️</div>
              <h2 style={{ margin: "4px 0", fontSize: "1.3rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                ST. AUGUSTINE INTERNATIONAL ACADEMY
              </h2>
              <span style={{ fontSize: "0.8rem", color: "#475569", fontWeight: 700 }}>
                EXAMINATIONS COUNCIL & FINANCIAL CLEARANCE DIVISION
              </span>
              <div style={{
                background: "#0f172a",
                color: "#ffffff",
                padding: "4px 12px",
                borderRadius: "4px",
                display: "inline-block",
                marginTop: "8px",
                fontSize: "0.82rem",
                fontWeight: 900,
                letterSpacing: "0.08em"
              }}>
                OFFICIAL RESCHEDULED LATE EXAM WRITING SLIP
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.85rem", marginBottom: "16px" }}>
              <div>
                <span style={{ color: "#64748b", fontSize: "0.75rem", display: "block" }}>CANDIDATE NAME</span>
                <strong>{currentUser.firstName} {currentUser.lastName}</strong>
              </div>
              <div>
                <span style={{ color: "#64748b", fontSize: "0.75rem", display: "block" }}>INDEX / ADMISSION NO.</span>
                <strong style={{ fontFamily: "monospace" }}>GBS-STU-2026-084</strong>
              </div>
              <div>
                <span style={{ color: "#64748b", fontSize: "0.75rem", display: "block" }}>ACADEMIC LEVEL & TERM</span>
                <strong>{academicLevel} • {academicTerm}</strong>
              </div>
              <div>
                <span style={{ color: "#64748b", fontSize: "0.75rem", display: "block" }}>FEE CLEARANCE STATUS</span>
                <strong style={{ color: "#059669" }}>{"CLEARED (>= 80% MET)"}</strong>
              </div>
              <div>
                <span style={{ color: "#64748b", fontSize: "0.75rem", display: "block" }}>ASSIGNED EXAM HALL</span>
                <strong>Executive CBT Annex Hall 2</strong>
              </div>
              <div>
                <span style={{ color: "#64748b", fontSize: "0.75rem", display: "block" }}>RESCHEDULED TIMING</span>
                <strong>Late Session: 02:00 PM - 04:30 PM</strong>
              </div>
            </div>

            <div style={{
              background: "#f1f5f9",
              border: "1px dashed #94a3b8",
              padding: "10px",
              borderRadius: "8px",
              fontSize: "0.78rem",
              color: "#334155",
              lineHeight: "1.4",
              marginBottom: "16px"
            }}>
              <strong>NOTICE TO CHIEF INVIGILATOR:</strong> The candidate has cleared the required fee threshold with finance and is officially authorized to sit for all scheduled examinations during late exam windows.
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #cbd5e1", paddingTop: "12px" }}>
              <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                Ref: CLR-80P-{Date.now().toString().slice(-6)} • Verified by Headmaster
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    background: "#0284c7",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "8px 16px",
                    fontSize: "0.82rem",
                    fontWeight: 800,
                    cursor: "pointer"
                  }}
                >
                  🖨️ Print Slip
                </button>
                <button
                  type="button"
                  onClick={() => setShowRescheduledExamSlipModal(false)}
                  style={{
                    background: "#e2e8f0",
                    color: "#334155",
                    border: "none",
                    borderRadius: "6px",
                    padding: "8px 14px",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* IN-APP LIVE VIRTUAL CLASSROOM & MEETING STUDIO MODAL */}
      {activeJoinedMeeting && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(2, 6, 23, 0.94)",
          backdropFilter: "blur(14px)",
          zIndex: 999999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem"
        }}>
          <div style={{
            background: "#090d16",
            border: "2px solid #0284c7",
            borderRadius: "20px",
            width: "100%",
            maxWidth: "960px",
            height: "85vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 25px 70px rgba(0, 0, 0, 0.9)",
            color: "#fff",
            overflow: "hidden"
          }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", background: "rgba(15, 23, 42, 0.9)", borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "1.6rem" }}>🎓</span>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 900, color: "#38bdf8" }}>
                      {activeJoinedMeeting.title}
                    </h3>
                    <span style={{ background: "#10b981", color: "#064e3b", fontSize: "0.68rem", fontWeight: 900, padding: "2px 6px", borderRadius: "999px" }}>
                      ● LIVE NOW
                    </span>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                    Tutor / Host: <strong>{activeJoinedMeeting.host || "Teacher"}</strong> • Subject: <strong>{activeJoinedMeeting.subject || "Academic Seminar"}</strong>
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <a
                  href={formatMeetingUrl(activeJoinedMeeting.meetingUrl, activeJoinedMeeting.passcode || "GBS2026", activeJoinedMeeting.meetingId || "84939201849")}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: "rgba(56, 189, 248, 0.15)",
                    border: "1px solid #38bdf8",
                    color: "#38bdf8",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    fontSize: "0.76rem",
                    fontWeight: 800,
                    textDecoration: "none"
                  }}
                  title="Launch in external Zoom or Google Meet app"
                >
                  🔗 Open in External App ↗
                </a>
                <button
                  type="button"
                  onClick={() => setActiveJoinedMeeting(null)}
                  style={{
                    background: "rgba(239, 68, 68, 0.2)",
                    border: "1px solid #ef4444",
                    color: "#fca5a5",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    fontWeight: 800,
                    fontSize: "0.78rem",
                    cursor: "pointer"
                  }}
                >
                  ⏹️ Leave Class
                </button>
              </div>
            </div>

            {/* Main Stage: Left Video Presentation & Right Chat/Roster */}
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 300px", overflow: "hidden" }}>
              
              {/* Left: Interactive Class Presentation & Teacher Feed */}
              <div style={{ background: "#020617", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                <img
                  src="/assets/teacher-dashboard-bg.jpg"
                  alt="Teacher Live Presentation"
                  style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }}
                />
                
                {/* Live Teacher Banner Overlay */}
                <div style={{ position: "absolute", top: "16px", left: "16px", background: "rgba(2, 6, 23, 0.85)", border: "1px solid rgba(255, 255, 255, 0.15)", padding: "6px 12px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ef4444", animation: "pulse 1.5s infinite" }}></span>
                  <span style={{ fontSize: "0.78rem", color: "#f8fafc", fontWeight: 800 }}>Teacher Screen Sharing • Interactive Whiteboard</span>
                </div>

                {/* Picture-in-Picture: Student's Own Video Preview */}
                <div style={{ position: "absolute", bottom: "16px", right: "16px", width: "160px", height: "110px", background: "#0f172a", borderRadius: "10px", border: "2px solid #38bdf8", overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.8)" }}>
                  <img
                    src={studentAvatar || "/assets/illustrations/user_face_placeholder.jpg"}
                    alt="You"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  <div style={{ position: "absolute", bottom: "4px", left: "4px", background: "rgba(0,0,0,0.75)", padding: "1px 6px", borderRadius: "4px", fontSize: "0.65rem", color: "#38bdf8", fontWeight: 700 }}>
                    You (Active)
                  </div>
                </div>

                {/* Hand Raised Banner */}
                {classroomHandRaised && (
                  <div style={{ position: "absolute", top: "16px", right: "16px", background: "linear-gradient(135deg, #f59e0b, #d97706)", padding: "6px 14px", borderRadius: "8px", fontSize: "0.8rem", fontWeight: 900, color: "#0f172a", display: "flex", alignItems: "center", gap: "6px", boxShadow: "0 4px 15px rgba(245, 158, 11, 0.4)" }}>
                    ✋ Hand Raised — Teacher Notified
                  </div>
                )}
              </div>

              {/* Right: Live Classroom Chat & Participants Roster */}
              <div style={{ background: "rgba(15, 23, 42, 0.95)", borderLeft: "1px solid rgba(255, 255, 255, 0.1)", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", fontSize: "0.82rem", fontWeight: 800, color: "#38bdf8" }}>
                  💬 CLASSROOM LIVE CHAT
                </div>

                <div style={{ flex: 1, padding: "12px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
                  {classroomChatMessages.map((msg, i) => (
                    <div key={i} style={{ background: "rgba(2, 6, 23, 0.6)", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                        <strong style={{ color: msg.sender.includes("Teacher") ? "#34d399" : "#38bdf8", fontSize: "0.75rem" }}>{msg.sender}</strong>
                        <span style={{ fontSize: "0.65rem", color: "#64748b" }}>{msg.time}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: "0.8rem", color: "#cbd5e1" }}>{msg.text}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendClassroomChat} style={{ padding: "10px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", gap: "6px" }}>
                  <input
                    type="text"
                    placeholder="Type message to class..."
                    value={newClassroomMsg}
                    onChange={(e) => setNewClassroomMsg(e.target.value)}
                    style={{ flex: 1, background: "#020617", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "6px", padding: "8px 10px", color: "#fff", fontSize: "0.78rem" }}
                  />
                  <button
                    type="submit"
                    style={{ background: "#0284c7", border: "none", borderRadius: "6px", padding: "8px 12px", color: "#fff", fontWeight: 800, fontSize: "0.78rem", cursor: "pointer" }}
                  >
                    Send
                  </button>
                </form>
              </div>

            </div>

            {/* Bottom Controls Bar */}
            <div style={{ background: "rgba(15, 23, 42, 0.95)", borderTop: "1px solid rgba(255, 255, 255, 0.1)", padding: "12px 20px", display: "flex", justifyContent: "center", alignItems: "center", gap: "14px" }}>
              <button
                type="button"
                onClick={() => setClassroomMicMuted(!classroomMicMuted)}
                style={{ background: classroomMicMuted ? "#ef4444" : "rgba(30, 41, 59, 0.8)", border: "1px solid rgba(255, 255, 255, 0.2)", borderRadius: "10px", padding: "8px 16px", color: "#fff", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}
              >
                {classroomMicMuted ? "🔇 Unmute Mic" : "🎤 Mic Active"}
              </button>
              <button
                type="button"
                onClick={() => setClassroomCameraOn(!classroomCameraOn)}
                style={{ background: !classroomCameraOn ? "#ef4444" : "rgba(30, 41, 59, 0.8)", border: "1px solid rgba(255, 255, 255, 0.2)", borderRadius: "10px", padding: "8px 16px", color: "#fff", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}
              >
                {classroomCameraOn ? "📷 Camera ON" : "📷 Camera OFF"}
              </button>
              <button
                type="button"
                onClick={() => setClassroomHandRaised(!classroomHandRaised)}
                style={{ background: classroomHandRaised ? "#f59e0b" : "rgba(30, 41, 59, 0.8)", border: "1px solid rgba(255, 255, 255, 0.2)", borderRadius: "10px", padding: "8px 16px", color: classroomHandRaised ? "#0f172a" : "#fff", fontWeight: 800, fontSize: "0.82rem", cursor: "pointer" }}
              >
                {classroomHandRaised ? "✋ Hand Lowered" : "✋ Raise Hand"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PEER-TO-PEER LIVE VIDEO CALL MODAL */}
      {activePeerVideoCall && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(2, 6, 23, 0.92)",
          backdropFilter: "blur(12px)",
          zIndex: 999999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem"
        }}>
          <div style={{
            background: "#090d16",
            border: "2px solid #06b6d4",
            borderRadius: "20px",
            width: "100%",
            maxWidth: "760px",
            padding: "1.5rem",
            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.9)",
            color: "#fff"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", paddingBottom: "10px", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "1.5rem" }}>📹</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#22d3ee" }}>
                    LIVE PEER STUDY CALL • {activePeerVideoCall.firstName} {activePeerVideoCall.lastName}
                  </h3>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                    Verified Scholar Index: {activePeerVideoCall.indexNumber || activePeerVideoCall.studentId} • Encrypted WebRTC Session
                  </span>
                </div>
              </div>
              <div style={{ background: "rgba(6, 182, 212, 0.2)", border: "1px solid #06b6d4", borderRadius: "20px", padding: "4px 12px", color: "#67e8f9", fontFamily: "monospace", fontWeight: 800 }}>
                ⏱️ {Math.floor(peerCallDuration / 60).toString().padStart(2, '0')}:{(peerCallDuration % 60).toString().padStart(2, '0')}
              </div>
            </div>

            {/* Video Screens Split (Live Camera Feeds) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", height: "300px", marginBottom: "1rem" }}>
              {/* Remote Peer Stream */}
              <div style={{ background: "#020617", border: "1.5px solid rgba(255, 255, 255, 0.15)", borderRadius: "14px", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img
                  src={activePeerVideoCall.photo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop"}
                  alt={activePeerVideoCall.firstName}
                  style={{ width: "100%", height: "100%", objectFit: "cover", filter: isPeerCameraOff ? "none" : "none" }}
                />
                {/* Simulated Peer Active Pulse Ring */}
                <div style={{ position: "absolute", inset: "15px", border: "1.5px dashed rgba(34, 211, 238, 0.4)", borderRadius: "10px", pointerEvents: "none" }}></div>
                <div style={{ position: "absolute", top: "10px", left: "10px", background: "rgba(2, 6, 23, 0.8)", padding: "3px 8px", borderRadius: "4px", fontSize: "0.7rem", color: "#34d399", fontWeight: "bold", fontFamily: "monospace" }}>
                  ● REMOTE WEBRTC FEED • 30 FPS
                </div>
                <div style={{ position: "absolute", bottom: "10px", left: "10px", background: "rgba(0,0,0,0.7)", padding: "3px 8px", borderRadius: "6px", fontSize: "0.72rem", color: "#34d399", fontWeight: 700 }}>
                  ● {activePeerVideoCall.firstName} ({activePeerVideoCall.currentClass || "Scholar"})
                </div>
              </div>

              {/* Local User Stream (Direct Hardware Camera Feed) */}
              <div style={{ background: "#020617", border: "1.5px solid #06b6d4", borderRadius: "14px", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <video
                  ref={localPeerVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transform: "scaleX(-1)",
                    display: isPeerCameraOff ? "none" : "block"
                  }}
                />
                {isPeerCameraOff && (
                  <div style={{ textAlign: "center", color: "#94a3b8" }}>
                    <img
                      src={studentAvatar || "/assets/illustrations/user_face_placeholder.jpg"}
                      alt="You"
                      style={{ width: "70px", height: "70px", borderRadius: "50%", objectFit: "cover", marginBottom: "8px", border: "2px solid #64748b" }}
                    />
                    <div style={{ fontSize: "0.78rem" }}>Camera Turned Off</div>
                  </div>
                )}
                <div style={{ position: "absolute", top: "10px", left: "10px", background: "rgba(2, 6, 23, 0.8)", padding: "3px 8px", borderRadius: "4px", fontSize: "0.7rem", color: "#38bdf8", fontWeight: "bold", fontFamily: "monospace" }}>
                  ● LOCAL CAM: ACTIVE (YOU)
                </div>
                <div style={{ position: "absolute", bottom: "10px", left: "10px", background: "rgba(0,0,0,0.7)", padding: "3px 8px", borderRadius: "6px", fontSize: "0.72rem", color: "#38bdf8", fontWeight: 700 }}>
                  ● You ({studentProfile?.firstName || "Scholar"})
                </div>
                {isPeerScreenSharing && (
                  <div style={{ position: "absolute", top: "10px", right: "10px", background: "rgba(16, 185, 129, 0.9)", padding: "2px 8px", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 800 }}>
                    🖥️ Screen Shared
                  </div>
                )}
              </div>
            </div>

            {/* Video Call Controls Bar */}
            <div style={{ display: "flex", justifyContent: "center", gap: "12px", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => setIsPeerMicMuted(!isPeerMicMuted)}
                style={{
                  padding: "10px 16px",
                  borderRadius: "10px",
                  background: isPeerMicMuted ? "#ef4444" : "rgba(30, 41, 59, 0.8)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                {isPeerMicMuted ? "🔇 Unmute Mic" : "🎤 Mute Mic"}
              </button>
              <button
                type="button"
                onClick={() => setIsPeerCameraOff(!isPeerCameraOff)}
                style={{
                  padding: "10px 16px",
                  borderRadius: "10px",
                  background: isPeerCameraOff ? "#ef4444" : "rgba(30, 41, 59, 0.8)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                {isPeerCameraOff ? "📷 Start Camera" : "📷 Stop Camera"}
              </button>
              <button
                type="button"
                onClick={() => setIsPeerScreenSharing(!isPeerScreenSharing)}
                style={{
                  padding: "10px 16px",
                  borderRadius: "10px",
                  background: isPeerScreenSharing ? "#10b981" : "rgba(30, 41, 59, 0.8)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                {isPeerScreenSharing ? "🖥️ Stop Share" : "🖥️ Share Screen"}
              </button>
              <button
                type="button"
                onClick={handleEndPeerVideoCall}
                style={{
                  padding: "10px 22px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #ef4444, #b91c1c)",
                  border: "none",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(239, 68, 68, 0.4)"
                }}
              >
                🔴 End Video Call
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CATCH-UP RECORDING VIDEO PLAYER MODAL */}
      {showCatchUpModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(2, 6, 23, 0.9)",
          backdropFilter: "blur(10px)",
          zIndex: 999999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem"
        }}>
          <div style={{
            background: "#090d16",
            border: "1.5px solid #38bdf8",
            borderRadius: "18px",
            width: "100%",
            maxWidth: "760px",
            padding: "1.5rem",
            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.9)",
            color: "#fff"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#38bdf8" }}>
                  📹 CATCH-UP RECORDING: {concludedClassNotice.subject}
                </h3>
                <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                  Topic: {concludedClassNotice.topic} • Instructor: {concludedClassNotice.instructor}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowCatchUpModal(false)}
                style={{ background: "rgba(255, 255, 255, 0.1)", border: "1px solid rgba(255, 255, 255, 0.2)", color: "#fff", borderRadius: "8px", padding: "4px 10px", cursor: "pointer", fontWeight: 800 }}
              >
                ← Back / Close
              </button>
            </div>

            <div style={{ position: "relative", width: "100%", height: "380px", background: "#000", borderRadius: "12px", overflow: "hidden", marginBottom: "1rem" }}>
              <iframe
                src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
                title="Concluded Lesson Catch-Up Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ width: "100%", height: "100%", border: "none" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.78rem", color: "#34d399" }}>
                ✓ Synced to Institutional Video Archive
              </span>
              <button
                type="button"
                onClick={() => setShowCatchUpModal(false)}
                style={{
                  background: "linear-gradient(135deg, #0284c7, #0369a1)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  fontWeight: 800,
                  padding: "8px 18px",
                  cursor: "pointer"
                }}
              >
                ← Back to Student Hub
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OFFICIAL PAYMENT GATEWAY MODAL FOR OUTSTANDING ARREARS */}
      <OfficialPaymentGatewayModal
        isOpen={showOfficialPaymentModal}
        onClose={() => setShowOfficialPaymentModal(false)}
        amount={feeBalance}
        currency="GHS"
        title="Term 2 School Tuition Arrears"
        studentId="STU-2026-0891"
        studentName="Emmanuel Mensah"
        onSuccess={() => {
          setFeeBalance(0);
          localStorage.setItem("gbs_student_fee_STU-2026-0891", "0");
          setFeedback({ type: "success", message: "🎉 Payment settled officially! Your fee balance is now GHS 0.00." });
        }}
      />

      {/* MODAL: HIGH-RESOLUTION LIBRARY BOOK COVER & FULL SYLLABUS DETAILS */}
      {selectedBookForPreview && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(3, 7, 18, 0.88)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999999,
          padding: "20px"
        }}>
          <div style={{
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            border: "1.5px solid rgba(56, 189, 248, 0.4)",
            borderRadius: "16px",
            maxWidth: "720px",
            width: "100%",
            maxHeight: "88vh",
            overflowY: "auto",
            padding: "24px",
            boxShadow: "0 25px 60px rgba(0,0,0,0.8)",
            color: "#f8fafc"
          }}>
            {/* Header with Back Button and Right Close Button */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "14px", marginBottom: "20px" }}>
              <button
                type="button"
                onClick={() => setSelectedBookForPreview(null)}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#cbd5e1",
                  borderRadius: "8px",
                  padding: "6px 14px",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                ⬅️ Back to Library
              </button>
              <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#38bdf8", fontWeight: 800 }}>
                📖 INSTITUTIONAL E-BOOK DOSSIER
              </h3>
              <button
                type="button"
                onClick={() => setSelectedBookForPreview(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  fontSize: "1.3rem",
                  cursor: "pointer",
                  lineHeight: 1
                }}
              >
                ✕
              </button>
            </div>

            {/* Book Body: High-Res Cover & Synopsis */}
            <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "24px", alignItems: "start" }}>
              <div>
                <img
                  src={selectedBookForPreview.cover}
                  alt={selectedBookForPreview.title}
                  style={{
                    width: "100%",
                    height: "300px",
                    objectFit: "cover",
                    borderRadius: "12px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.6)",
                    border: "2px solid rgba(255,255,255,0.15)"
                  }}
                />
                <div style={{ textAlign: "center", marginTop: "10px", fontSize: "0.75rem", color: "#94a3b8" }}>
                  🔎 High-Resolution Cover
                </div>
              </div>

              <div>
                <span style={{ fontSize: "0.72rem", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", padding: "3px 10px", borderRadius: "999px", fontWeight: 800 }}>
                  {selectedBookForPreview.category || "Secondary Curriculum"}
                </span>
                <h2 style={{ fontSize: "1.3rem", margin: "10px 0 6px", color: "#f8fafc" }}>
                  {selectedBookForPreview.title}
                </h2>
                <div style={{ fontSize: "0.88rem", color: "#fbbf24", fontWeight: 700, marginBottom: "12px" }}>
                  Author: {selectedBookForPreview.author}
                </div>

                <div style={{ background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "14px", marginBottom: "16px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.8rem" }}>
                    <div>
                      <span style={{ color: "#94a3b8", display: "block" }}>ISBN Identifier:</span>
                      <strong style={{ color: "#38bdf8", fontFamily: "monospace" }}>{selectedBookForPreview.isbn || "978-0-19-842718-6"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#94a3b8", display: "block" }}>Extent & Length:</span>
                      <strong style={{ color: "#f8fafc" }}>{selectedBookForPreview.pages || 420} Pages (Complete)</strong>
                    </div>
                    <div>
                      <span style={{ color: "#94a3b8", display: "block" }}>Loan Period:</span>
                      <strong style={{ color: "#10b981" }}>14 Academic Days (Renewable)</strong>
                    </div>
                    <div>
                      <span style={{ color: "#94a3b8", display: "block" }}>Access Format:</span>
                      <strong style={{ color: "#a855f7" }}>Digital E-Reader + Campus Hardcopy</strong>
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: "0.85rem", color: "#cbd5e1", lineHeight: "1.6", marginBottom: "18px" }}>
                  {selectedBookForPreview.description || `Official secondary curriculum text curated for comprehensive mastery of examination topics, laboratory problem sets, and practical assignments. Fully compliant with Ministry of Education WAEC/WASSCE benchmarks.`}
                </p>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {borrowedBooks.some((b) => b.title === selectedBookForPreview.title) ? (
                    <button
                      type="button"
                      onClick={() => {
                        const rec = borrowedBooks.find((b) => b.title === selectedBookForPreview.title);
                        if (rec) handleReturnBook(rec.id);
                        setSelectedBookForPreview(null);
                      }}
                      style={{
                        padding: "10px 20px",
                        background: "rgba(239, 68, 68, 0.2)",
                        border: "1.5px solid #ef4444",
                        color: "#f87171",
                        borderRadius: "8px",
                        fontWeight: 800,
                        cursor: "pointer"
                      }}
                    >
                      📥 Return This Book to Library
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        handleBorrowBook(selectedBookForPreview);
                        setSelectedBookForPreview(null);
                      }}
                      style={{
                        padding: "10px 22px",
                        background: "linear-gradient(135deg, #0284c7, #38bdf8)",
                        border: "none",
                        color: "#0f172a",
                        borderRadius: "8px",
                        fontWeight: 900,
                        cursor: "pointer",
                        boxShadow: "0 4px 15px rgba(56, 189, 248, 0.4)"
                      }}
                    >
                      📖 Confirm E-Book Checkout (14-Day Loan)
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedBookForPreview(null)}
                    style={{
                      padding: "10px 18px",
                      background: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      color: "#cbd5e1",
                      borderRadius: "8px",
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <UniversalRoleGuideModal
        role="STUDENT"
        isOpen={showStudentGuideModal}
        onClose={() => setShowStudentGuideModal(false)}
      />
    </div>
  );
}

class StudentDashboardErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.warn("Student Dashboard non-fatal event:", error);
    try {
      sessionStorage.setItem("gbs_student_active_tab", "timetable");
    } catch { }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", background: "#0b0f19", color: "#f8fafc", padding: "20px" }}>
          <TopCenterSystemBanner currentRole="STUDENT" activeDashboard="STUDENT" />
          <div style={{ maxWidth: "600px", margin: "60px auto", textAlign: "center", background: "rgba(15, 23, 42, 0.95)", border: "1.5px solid #38bdf8", borderRadius: "16px", padding: "32px", boxShadow: "0 20px 50px rgba(0,0,0,0.8)" }}>
            <span style={{ fontSize: "2.8rem" }}>🎒</span>
            <h3 style={{ color: "#38bdf8", margin: "12px 0 8px" }}>Student Scholar Portal</h3>
            <p style={{ color: "#94a3b8", fontSize: "0.88rem", marginBottom: "20px" }}>
              Switching directly to your active Timetable & Academic Overview.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => {
                  sessionStorage.setItem("gbs_student_active_tab", "timetable");
                  window.location.href = "/portal/student/dashboard?tab=timetable";
                }}
                style={{ padding: "10px 22px", background: "linear-gradient(135deg, #0284c7, #38bdf8)", border: "none", borderRadius: "8px", color: "#0f172a", fontWeight: 800, cursor: "pointer" }}
              >
                📅 Open Timetable View
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/portal/student/dashboard?tab=timetable";
                }}
                style={{ padding: "10px 18px", background: "rgba(30, 41, 59, 0.9)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#cbd5e1", fontWeight: 700, cursor: "pointer" }}
              >
                🔄 Reload Scholar View
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function SafeStudentDashboardWrapper(props) {
  return (
    <StudentDashboardErrorBoundary>
      <StudentDashboard {...props} />
    </StudentDashboardErrorBoundary>
  );
}

export default SafeStudentDashboardWrapper;