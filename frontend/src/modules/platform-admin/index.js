import permissionRoutes from "./presentation/routes";

import PermissionList from "./presentation/pages/PermissionList";
import PermissionCreate from "./presentation/pages/PermissionCreate";
import PermissionEdit from "./presentation/pages/PermissionEdit";
import PermissionDetails from "./presentation/pages/PermissionDetails";
import PermissionDashboard from "./presentation/pages/PermissionDashboard";

import PermissionForm from "./presentation/components/PermissionForm";
import PermissionCard from "./presentation/components/PermissionCard";
import PermissionTable from "./presentation/components/PermissionTable";

import permissionApi from "./api/platformAdmin.api";

export {
    permissionRoutes,

    PermissionList,
    PermissionCreate,
    PermissionEdit,
    PermissionDetails,
    PermissionDashboard,

    PermissionForm,
    PermissionCard,
    PermissionTable,

    permissionApi
};

export default {
    permissionRoutes,
    permissionApi
};