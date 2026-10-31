import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import MainLoginPage from "../modules/auth/pages/MainLoginPage";
import SignUpPage from "../modules/auth/pages/SignUpPage";
import AdminLogin from "../modules/auth/pages/AdminLogin";
import TeacherLogin from "../modules/auth/pages/TeacherLogin";
import StudentLogin from "../modules/auth/pages/StudentLogin";
import ParentLogin from "../modules/auth/pages/ParentLogin";
import AccountantLogin from "../modules/auth/pages/AccountantLogin";
import StaffLogin from "../modules/auth/pages/StaffLogin";
import RoleDashboardView from "../modules/portal/pages/RoleDashboardView";
import AdminDashboard from "../modules/portal/pages/dashboards/admin/AdminDashboard";
import TeacherDashboard from "../modules/portal/pages/dashboards/teacher/TeacherDashboard";
import StudentDashboard from "../modules/portal/pages/dashboards/student/StudentDashboard";
import ParentDashboard from "../modules/portal/pages/dashboards/parent/ParentDashboard";
import AccountantDashboard from "../modules/portal/pages/dashboards/accountant/AccountantDashboard";
import StaffDashboard from "../modules/portal/pages/dashboards/staff/StaffDashboard";
import AlumniDashboard from "../modules/alumni/pages/AlumniDashboard";
import HRDashboard from "../modules/portal/pages/dashboards/hr/HRDashboard";

import DeveloperLogin from "../modules/developer-platform/pages/DeveloperLogin";
import DeveloperDashboard from "../modules/developer-platform/pages/DeveloperDashboard";
import DeveloperAIDiagnostics from "../modules/developer-platform/pages/DeveloperAIDiagnostics";

import VoiceAuthModal from "../modules/security/components/VoiceAuthModal";
import LiveTrackingDashboard from "../modules/live-tracking/pages/LiveTrackingDashboard";
import ExamScannerDashboard from "../modules/exam-scanner/pages/ExamScannerDashboard";
import DataMigrationDashboard from "../modules/migration/pages/DataMigrationDashboard";

import LoanApplicationForm from "../modules/loans/pages/LoanApplicationForm";
import LoanDashboard from "../modules/loans/pages/LoanDashboard";
import HRSalaryGroupingDashboard from "../modules/hr/pages/HRSalaryGroupingDashboard";
import TenantManagementPage from "../modules/tenant/pages/TenantManagementPage";
import AcademicManagementPage from "../modules/academic/pages/AcademicManagementPage";
import TimetableDashboard from "../modules/timetable/pages/TimetableDashboard";
import AttendanceDashboard from "../modules/attendance/pages/AttendanceDashboard";
import AssignmentDashboard from "../modules/assignment/pages/AssignmentDashboard";
import OnlineLearningDashboard from "../modules/meeting/pages/OnlineLearningDashboard";
import ParentPortalDashboard from "../modules/parent/pages/ParentPortalDashboard";
import EmergencyLocatorPage from "../modules/emergency/pages/EmergencyLocatorPage";
import AdmissionWorkflowDashboard from "../modules/admission/pages/AdmissionWorkflowDashboard";
import WorkflowDashboard from "../modules/workflow/pages/WorkflowDashboard";
import ReportingDashboardPage from "../modules/reporting/pages/ReportingDashboardPage";
import AIDiagnosticsDashboard from "../modules/learning/pages/AIDiagnosticsDashboard";
import FinanceDashboardPage from "../modules/finance/pages/FinanceDashboardPage";
import CommunicationDashboardPage from "../modules/communication/pages/CommunicationDashboardPage";
import LibraryManagementPage from "../modules/library/pages/LibraryManagementPage";
import TransportManagementPage from "../modules/transport/pages/TransportManagementPage";
import InventoryManagementPage from "../modules/inventory/pages/InventoryManagementPage";
import HRStaffManagementPage from "../modules/hr/pages/HRStaffManagementPage";
import FacilityManagementPage from "../modules/facility/pages/FacilityManagementPage";
import DigitalTwinCampusPage from "../modules/campus/pages/DigitalTwinCampusPage";
import CCTVSecurityHubPage from "../modules/cctv/pages/CCTVSecurityHubPage";
import ShardingDrManagementPage from "../modules/infrastructure/pages/ShardingDrManagementPage";
import VideoPresentationEngine from "../modules/presentation/pages/VideoPresentationEngine";
import GBSCompanyWebsite from "../modules/website/pages/GBSCompanyWebsite";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Standalone Master GBS System Entry: Main Login & Role Portal Gateway */}
        <Route path="/" element={<MainLoginPage />} />
        <Route path="/website" element={<GBSCompanyWebsite />} />
        <Route path="/company" element={<GBSCompanyWebsite />} />
        <Route path="/home" element={<GBSCompanyWebsite />} />

        {/* Executive Video Presentation & Client Demo Showcase Engine */}
        <Route path="/presentation-engine" element={<VideoPresentationEngine />} />
        <Route path="/demo-hub" element={<VideoPresentationEngine />} />
        <Route path="/presentation" element={<VideoPresentationEngine />} />

        {/* Main Portal & Role Authentication */}
        <Route path="/login" element={<MainLoginPage />} />
        <Route path="/portal-selection" element={<Navigate to="/login" replace />} />
        <Route path="/portals" element={<Navigate to="/login" replace />} />
        {/* Master Blueprint Section 5: Enterprise Registration & Sign Up Forms */}
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/register" element={<Navigate to="/signup" replace />} />
        <Route path="/signup/institution" element={<SignUpPage defaultRole="INSTITUTION" />} />
        <Route path="/signup/tenant" element={<SignUpPage defaultRole="INSTITUTION" />} />
        <Route path="/signup/teacher" element={<SignUpPage defaultRole="TEACHER" />} />
        <Route path="/signup/student" element={<SignUpPage defaultRole="STUDENT" />} />
        <Route path="/signup/parent" element={<SignUpPage defaultRole="PARENT" />} />
        <Route path="/signup/accountant" element={<SignUpPage defaultRole="ACCOUNTANT" />} />
        <Route path="/signup/hr" element={<SignUpPage defaultRole="HR" />} />
        <Route path="/signup/alumni" element={<SignUpPage defaultRole="ALUMNI" />} />
        <Route path="/signup/staff" element={<SignUpPage defaultRole="STAFF" />} />

        {/* Blueprint Section 2: Dedicated Role-Based Login Pages */}
        <Route path="/login/admin" element={<AdminLogin />} />
        <Route path="/login/teacher" element={<TeacherLogin />} />
        <Route path="/login/student" element={<StudentLogin />} />
        <Route path="/login/parent" element={<ParentLogin />} />
        <Route path="/login/accountant" element={<AccountantLogin />} />
        <Route path="/login/staff" element={<StaffLogin />} />
        <Route path="/login/hr" element={<StaffLogin defaultRole="HR" />} />
        <Route path="/login/alumni" element={<StaffLogin defaultRole="ALUMNI" />} />

        {/* Master Blueprint Section 3: Dedicated Role-Based Interactive Workspaces */}
        <Route path="/portal/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/portal/super_admin/dashboard" element={<Navigate to="/portal/admin/dashboard" replace />} />
        <Route path="/portal/teacher/dashboard" element={<TeacherDashboard />} />
        <Route path="/portal/student/dashboard" element={<StudentDashboard />} />
        <Route path="/portal/parent/dashboard" element={<ParentDashboard />} />
        <Route path="/portal/accountant/dashboard" element={<AccountantDashboard />} />
        <Route path="/portal/staff/dashboard" element={<StaffDashboard />} />
        <Route path="/portal/hr/dashboard" element={<HRDashboard />} />
        <Route path="/portal/alumni/dashboard" element={<AlumniDashboard />} />
        <Route path="/portal/:role/dashboard" element={<RoleDashboardView />} />

        {/* Hidden Enterprise Developer Control Center */}
        <Route path="/developer-control-center" element={<Navigate to="/developer-control-center/login" replace />} />
        <Route path="/developer" element={<Navigate to="/developer-control-center/login" replace />} />
        <Route path="/developer/login" element={<DeveloperLogin />} />
        <Route path="/developer/dashboard" element={<DeveloperDashboard />} />
        <Route path="/developer-control-center/login" element={<DeveloperLogin />} />
        <Route path="/developer-control-center/dashboard" element={<DeveloperDashboard />} />
        <Route path="/developer-control-center/ai-diagnostics" element={<DeveloperAIDiagnostics />} />
        <Route path="/developer-control-center/sharding" element={<ShardingDrManagementPage />} />
        <Route path="/developer-control-center/dr-failover" element={<ShardingDrManagementPage />} />

        {/* Specialized Enterprise Subsystem Pages */}
        <Route path="/security/voice-verify" element={<VoiceAuthModal />} />
        <Route path="/location/live-tracking" element={<LiveTrackingDashboard />} />
        <Route path="/ai/exam-scanner" element={<ExamScannerDashboard />} />
        <Route path="/migration/data-import" element={<DataMigrationDashboard />} />

        {/* Loan Management Subsystem Routes */}
        <Route path="/loans/apply" element={<LoanApplicationForm />} />
        <Route path="/loans/dashboard" element={<LoanDashboard />} />

        {/* HR Employee Salary Grouping Subsystem Routes */}
        <Route path="/hr/salary-grouping" element={<HRSalaryGroupingDashboard />} />

        {/* Enterprise Multi-Tenant Architecture & Provisioning */}
        <Route path="/admin/tenants" element={<TenantManagementPage />} />
        <Route path="/tenants" element={<TenantManagementPage />} />

        {/* Phase 2: Academic Domain Core (Classes & Subjects) */}
        <Route path="/academic" element={<AcademicManagementPage />} />
        <Route path="/academic/classes" element={<AcademicManagementPage />} />
        <Route path="/academic/subjects" element={<AcademicManagementPage />} />

        {/* Phase 2: Timetable Scheduling & Conflict Detection Engine */}
        <Route path="/timetable" element={<TimetableDashboard />} />
        <Route path="/timetable/schedule" element={<TimetableDashboard />} />

        {/* Phase 2: Attendance Tracking & Student Assignments Engine */}
        <Route path="/attendance" element={<AttendanceDashboard />} />
        <Route path="/attendance/tracking" element={<AttendanceDashboard />} />
        <Route path="/attendance/mark" element={<AttendanceDashboard />} />
        <Route path="/assignments" element={<AssignmentDashboard />} />
        <Route path="/assignments/manage" element={<AssignmentDashboard />} />
        <Route path="/assignments/submissions" element={<AssignmentDashboard />} />

        {/* Phase 2: Online Learning, Virtual Meetings & Parent Portal Subsystem */}
        <Route path="/online-learning" element={<OnlineLearningDashboard />} />
        <Route path="/meetings" element={<OnlineLearningDashboard />} />
        <Route path="/parent-portal" element={<ParentPortalDashboard />} />
        <Route path="/parents" element={<ParentPortalDashboard />} />
        <Route path="/emergency-locator" element={<EmergencyLocatorPage />} />
        <Route path="/admin/emergency-locator" element={<EmergencyLocatorPage />} />
        
        {/* Phase 3: Admission Workflow Engine (Master Blueprint Box 6) */}
        <Route path="/admissions" element={<AdmissionWorkflowDashboard />} />
        <Route path="/admin/admissions" element={<AdmissionWorkflowDashboard />} />
        <Route path="/admissions/pipeline" element={<AdmissionWorkflowDashboard />} />

        {/* Phase 3: Workflow & Automation Engine / Notification Services (Master Blueprint Box 7 & 12) */}
        <Route path="/workflows" element={<WorkflowDashboard />} />
        <Route path="/workflow" element={<WorkflowDashboard />} />
        <Route path="/admin/workflows" element={<WorkflowDashboard />} />
        <Route path="/notifications" element={<WorkflowDashboard />} />

        {/* Phase 3: Report & Document Generation Engine (Master Blueprint Box 11) */}
        <Route path="/reports" element={<ReportingDashboardPage />} />
        <Route path="/reporting" element={<ReportingDashboardPage />} />
        <Route path="/admin/reports" element={<ReportingDashboardPage />} />
        <Route path="/documents" element={<ReportingDashboardPage />} />

        {/* Phase 3: AI Recommendations & Learning Diagnostics Engine (Master Blueprint Box 9 & 10) */}
        <Route path="/ai" element={<AIDiagnosticsDashboard />} />
        <Route path="/ai-diagnostics" element={<AIDiagnosticsDashboard />} />
        <Route path="/ai-recommendations" element={<AIDiagnosticsDashboard />} />
        <Route path="/developer-assistant" element={<AIDiagnosticsDashboard />} />
        <Route path="/admin/ai" element={<AIDiagnosticsDashboard />} />

        {/* Phase 4: Enterprise Finance & Fee Management Engine (Master Blueprint Box 14 & 15) */}
        <Route path="/finance" element={<FinanceDashboardPage />} />
        <Route path="/finance/dashboard" element={<FinanceDashboardPage />} />
        <Route path="/fees" element={<FinanceDashboardPage />} />
        <Route path="/accounting" element={<FinanceDashboardPage />} />
        <Route path="/admin/finance" element={<FinanceDashboardPage />} />

        {/* Phase 4: Communication, Messaging & Live Real-Time Chat Engine (Master Blueprint Box 13) */}
        <Route path="/communication" element={<CommunicationDashboardPage />} />
        <Route path="/chat" element={<CommunicationDashboardPage />} />
        <Route path="/messages" element={<CommunicationDashboardPage />} />
        <Route path="/announcements" element={<CommunicationDashboardPage />} />
        <Route path="/admin/communication" element={<CommunicationDashboardPage />} />

        {/* Enterprise Recommended Modules: Library, Transport, Inventory & HR */}
        <Route path="/library" element={<LibraryManagementPage />} />
        <Route path="/library/catalog" element={<LibraryManagementPage />} />
        <Route path="/admin/library" element={<LibraryManagementPage />} />

        <Route path="/transport" element={<TransportManagementPage />} />
        <Route path="/transport/fleet" element={<TransportManagementPage />} />
        <Route path="/admin/transport" element={<TransportManagementPage />} />

        <Route path="/inventory" element={<InventoryManagementPage />} />
        <Route path="/inventory/stock" element={<InventoryManagementPage />} />
        <Route path="/procurement" element={<InventoryManagementPage />} />
        <Route path="/admin/inventory" element={<InventoryManagementPage />} />

        <Route path="/hr" element={<HRStaffManagementPage />} />
        <Route path="/hr/staff" element={<HRStaffManagementPage />} />
        <Route path="/hr/management" element={<HRStaffManagementPage />} />
        <Route path="/admin/hr" element={<HRStaffManagementPage />} />

        <Route path="/exam-scanner" element={<ExamScannerDashboard />} />
        <Route path="/admin/exam-scanner" element={<ExamScannerDashboard />} />

        {/* Procedure 3: Facility, Digital Twin, CCTV & Migration Hubs */}
        <Route path="/facility" element={<FacilityManagementPage />} />
        <Route path="/admin/facility" element={<FacilityManagementPage />} />
        <Route path="/maintenance" element={<FacilityManagementPage />} />

        <Route path="/digital-twin" element={<DigitalTwinCampusPage />} />
        <Route path="/campus/digital-twin" element={<DigitalTwinCampusPage />} />
        <Route path="/admin/digital-twin" element={<DigitalTwinCampusPage />} />

        <Route path="/cctv" element={<CCTVSecurityHubPage />} />
        <Route path="/admin/cctv" element={<CCTVSecurityHubPage />} />
        <Route path="/security/cctv" element={<CCTVSecurityHubPage />} />

        <Route path="/migration" element={<DataMigrationDashboard />} />
        <Route path="/admin/migration" element={<DataMigrationDashboard />} />

        {/* Procedure 5: Multi-DB Architecture, Sharding Registry & Disaster Recovery */}
        <Route path="/infrastructure" element={<ShardingDrManagementPage />} />
        <Route path="/infrastructure/sharding" element={<ShardingDrManagementPage />} />
        <Route path="/infrastructure/dr-failover" element={<ShardingDrManagementPage />} />
        <Route path="/admin/infrastructure" element={<ShardingDrManagementPage />} />
        <Route path="/admin/sharding" element={<ShardingDrManagementPage />} />
        <Route path="/admin/dr-failover" element={<ShardingDrManagementPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}