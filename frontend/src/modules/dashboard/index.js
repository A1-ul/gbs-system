export { default as dashboardRoutes } from "./presentation/routes";

export * from "./api/dashboard.api";

export { default as DashboardHero } from "../../shared/components/dashboard/DashboardHero";
export { default as DashboardStats } from "../../shared/components/dashboard/DashboardStats";
export { default as DashboardCharts } from "../../shared/charts/DashboardCharts";

export { default as AdminDashboard } from "../portal/presentation/pages/dashboards/admin/AdminDashboard";
export { default as TeacherDashboard } from "../portal/presentation/pages/dashboards/teacher/TeacherDashboard";
export { default as StudentDashboard } from "../portal/presentation/pages/StudentDashboard";
export { default as ParentDashboard } from "../portal/presentation/pages/ParentDashboard";
export { default as StaffDashboard } from "../portal/presentation/pages/dashboards/staff/StaffDashboard";
export { default as AccountantDashboard } from "../portal/presentation/pages/dashboards/accountant/AccountantDashboard";