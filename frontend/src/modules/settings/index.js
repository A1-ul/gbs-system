import routes from "./presentation/routes";

import StaffDashboard
from "./presentation/pages/StaffDashboard";

import StaffList
from "./presentation/pages/StaffList";

import StaffCreate
from "./presentation/pages/StaffCreate";

import StaffEdit
from "./presentation/pages/StaffEdit";

import StaffDetails
from "./presentation/pages/StaffDetails";

import StaffPermissions
from "./permissions/StaffPermissions";

import StaffForm
from "./presentation/components/StaffForm";

import StaffCard
from "./presentation/components/StaffCard";

import StaffTable
from "./presentation/components/StaffTable";

import staffApi
from "./api/staff.api";

export {
    routes,

    StaffDashboard,
    StaffList,
    StaffCreate,
    StaffEdit,
    StaffDetails,
    StaffPermissions,

    StaffForm,
    StaffCard,
    StaffTable,

    staffApi
};

export default {
    routes,
    staffApi
};