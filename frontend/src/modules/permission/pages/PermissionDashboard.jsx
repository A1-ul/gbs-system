import React from "react";

import {
    useQuery
} from "@tanstack/react-query";

import permissionApi from "../../api/permission.api";

import Loader from "../../shared/ui/Loader";

import PageContainer from "../../shared/components/PageContainer";
import PageHeader from "../../shared/components/PageHeader";

import StatCard from "../../shared/dashboard/StatCard";

const PermissionDashboard =
    () => {
        const {
            data,
            isLoading
        } = useQuery({
            queryKey: [
                "permissions-dashboard"
            ],
            queryFn:
                permissionApi.getPermissions
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
                    title="Permission Dashboard"
                    description="Permission management overview."
                />

                <div
                    className="
                    grid
                    grid-cols-1
                    md:grid-cols-2
                    lg:grid-cols-4
                    gap-4
                "
                >
                    <StatCard
                        title="Permissions"
                        value={
                            permissions.length
                        }
                    />
                </div>
            </PageContainer>
        );
    };

export default PermissionDashboard;