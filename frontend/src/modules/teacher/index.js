import teacherRoutes from "./presentation/routes";

import TeacherList from "./presentation/pages/TeacherList";
import TeacherCreate from "./presentation/pages/TeacherCreate";
import TeacherEdit from "./presentation/pages/TeacherEdit";
import TeacherDetails from "./presentation/pages/TeacherDetails";
import TeacherDashboard from "./presentation/pages/TeacherDashboard";
import TeacherPermissions from "./permissions/TeacherPermissions";

import TeacherCard from "./presentation/components/TeacherCard";
import TeacherForm from "./presentation/components/TeacherForm";
import TeacherTable from "./presentation/components/TeacherTable";

import teacherApi from "./api/teacher.api";

export {
    teacherRoutes,

    TeacherList,
    TeacherCreate,
    TeacherEdit,
    TeacherDetails,
    TeacherDashboard,
    TeacherPermissions,

    TeacherCard,
    TeacherForm,
    TeacherTable,

    teacherApi
};

export default {
    teacherRoutes,
    teacherApi
};