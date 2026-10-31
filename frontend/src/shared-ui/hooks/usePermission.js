import {
    usePermissionStore
}
from "../../store";

export default function usePermission() {

    const permissions =
        usePermissionStore(
            (state) =>
                state.permissions
        );

    const hasPermission =
        (permission) =>
            permissions.includes(
                permission
            );

    return {

        permissions,

        hasPermission
    };
}