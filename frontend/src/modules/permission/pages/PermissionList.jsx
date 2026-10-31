import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import permissionApi from "../api/permission.api";

import PageContainer from "../../shared/components/PageContainer";
import PageHeader from "../../shared/components/PageHeader";
import PermissionTable from "../components/PermissionTable";
import Loader from "../../shared/ui/Loader";

const PermissionList = () => {
    const navigate = useNavigate();

    const {
        data,
        isLoading
    } = useQuery({
        queryKey: ["permissions"],
        queryFn: permissionApi.getPermissions
    });

    if (isLoading) {
        return <Loader />;
    }

    const permissions =
        data?.data ||
        data ||
        [];

    return (
        <PageContainer>
            <PageHeader
                title="Permissions"
                description="Manage system permissions."
            />

            <PermissionTable
                permissions={permissions}
                onView={(item) =>
                    navigate(
                        `/permissions/${item.id}`
                    )
                }
                onEdit={(item) =>
                    navigate(
                        `/permissions/${item.id}/edit`
                    )
                }
            />
        </PageContainer>
    );
};

export default PermissionList;