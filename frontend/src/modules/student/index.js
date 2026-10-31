import studentRoutes
    from "./presentation/routes";

import * as studentApi
    from "./api/student.api";

import StudentCard
    from "./presentation/components/StudentCard";

import StudentForm
    from "./presentation/components/StudentForm";

import StudentTable
    from "./presentation/components/StudentTable";

import StudentList
    from "./presentation/pages/StudentList";

import StudentCreate
    from "./presentation/pages/StudentCreate";

import StudentEdit
    from "./presentation/pages/StudentEdit";

import StudentDetails
    from "./presentation/pages/StudentDetails";

import StudentDashboard
    from "./presentation/pages/StudentDashboard";

import StudentPermissions
    from "./presentation/pages/StudentPermissions";

export {

    studentRoutes,

    studentApi,

    StudentCard,
    StudentForm,
    StudentTable,

    StudentList,
    StudentCreate,
    StudentEdit,
    StudentDetails,
    StudentDashboard,
    StudentPermissions
};

export default {
    routes:
        studentRoutes,

    api:
        studentApi
};