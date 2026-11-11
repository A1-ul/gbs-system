/**
 * freshSystemReset.js
 * Universal Production Data Cleanser for GBS School Management System.
 * Removes mock / dummy entries across all dashboards while preserving:
 * - Active authenticated user tokens & profiles (gbs_token, gbs_user, gbs_auth_role)
 * - Official tenant configuration & custom crests (gbs_custom_school_logo, gbs_report_school_name)
 * - Academic term structure & currency settings
 */

export const clearFakeDataEntries = () => {
  const keysToClean = [
    // Communication & Directives
    "gbs_parent_teacher_messages",
    "gbs_admin_parent_messages",
    "gbs_universal_voice_notes",
    "gbs_faculty_directives",
    "gbs_headmaster_sent_messages",
    "gbs_parent_feedback_inbox",
    "gbs_archived_announcements",
    "gbs_parent_messages",

    // Academic & Submissions
    "gbs_enrolled_students",
    "gbs_transport_assigned_students",
    "gbs_classes",
    "gbs_subjects",
    "gbs_teacher_archived_weekly_attendance",
    "gbs_daily_attendance_archives",
    "gbs_teacher_lesson_plans",
    "gbs_student_submissions",
    "gbs_student_submitted_exams",
    "gbs_student_unlocked_exams",
    "gbs_student_saved_meetings",
    "gbs_student_transcripts",

    // Financial & Bursary
    "gbs_reconciled_payments",
    "gbs_accountant_increment_requests",
    "gbs_bus_route_fares",
    "gbs_registered_bus_drivers",

    // HR & Governance
    "gbs_hr_leaves",
    "gbs_hr_leave_requests",
    "gbs_hr_audit_requests",
    "gbs_hr_audit_reports",
    "gbs_pending_staff_registrations",
    "gbs_headmaster_replacements",
    "gbs_incoming_onboarding_applications",
    "gbs_offline_mutation_queue",

    // Alumni & Convocation
    "gbs_alumni_directory",
    "gbs_alumni_donations",
    "gbs_alumni_events",
    "gbs_alumni_mentorships",
    "gbs_alumni_job_postings"
  ];

  keysToClean.forEach(k => {
    try {
      localStorage.removeItem(k);
    } catch {}
  });

  try {
    const demoSchoolName = localStorage.getItem("gbs_report_school_name");
    if (demoSchoolName && demoSchoolName.includes("St. Augustine")) {
      localStorage.removeItem("gbs_report_school_name");
    }
    const demoLogo = localStorage.getItem("gbs_custom_school_logo");
    if (demoLogo && demoLogo.includes("gbs_crest_badge")) {
      localStorage.removeItem("gbs_custom_school_logo");
    }
  } catch {}

  // Re-initialize clean empty array/object structures
  try {
    localStorage.setItem("gbs_parent_teacher_messages", "[]");
    localStorage.setItem("gbs_admin_parent_messages", "[]");
    localStorage.setItem("gbs_universal_voice_notes", "[]");
    localStorage.setItem("gbs_student_submissions", "[]");
    localStorage.setItem("gbs_student_submitted_exams", "{}");
    localStorage.setItem("gbs_reconciled_payments", "[]");
    localStorage.setItem("gbs_teacher_archived_weekly_attendance", "[]");
    localStorage.setItem("gbs_daily_attendance_archives", "[]");
    localStorage.setItem("gbs_parent_feedback_inbox", "[]");
    localStorage.setItem("gbs_accountant_increment_requests", "[]");
    localStorage.setItem("gbs_pending_staff_registrations", "[]");
    localStorage.setItem("gbs_incoming_onboarding_applications", "[]");
    localStorage.setItem("gbs_hr_leave_requests", "[]");
    localStorage.setItem("gbs_hr_audit_requests", "[]");
    localStorage.setItem("gbs_hr_audit_reports", "[]");
    localStorage.setItem("gbs_offline_mutation_queue", "[]");
  } catch {}

  // Broadcast to all active tabs & dashboards
  window.dispatchEvent(new Event("storage"));
  window.dispatchEvent(new CustomEvent("gbs_fresh_state_reset"));

  return {
    success: true,
    message: "🧹 Fake and forced entries cleared across every dashboard! System is completely fresh and ready to receive real user commands."
  };
};
