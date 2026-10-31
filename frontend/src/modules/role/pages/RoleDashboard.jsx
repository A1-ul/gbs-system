import React from "react";
import { useQuery } from "@tanstack/react-query";

import roleApi from "../../api/role.api";

import PageContainer from "../../shared/components/PageContainer";
import PageHeader from "../../shared/components/PageHeader";

import StatCard from "../../shared/dashboard/StatCard";
import ActivityFeed from "../../shared/dashboard/ActivityFeed";
import QuickActions from "../../shared/dashboard/QuickActions";

import Loader from "../../shared/ui/Loader";

const RoleDashboard = () => {
    const {
        data,
        isLoading
    } = useQuery({
        queryKey: [
            "role-dashboard"
        ],
        queryFn: () =>
            roleApi.getRoles()
    });

    if (isLoading) {
        return <Loader />;
    }

    const roles =
        data?.data ||
        data ||
        [];

    return (
        <PageContainer>
            <PageHeader
                title="Role Dashboard"
                description="Role management overview."
            />

            <div
                className="
                grid
                grid-cols-1
                md:grid-cols-3
                gap-4
                mb-6
            "
            >
                <StatCard
                    title="Total Roles"
                    value={
                        roles.length
                    }
                />

                <StatCard
                    title="Active Roles"
                    value={
                        roles.length
                    }
                />

                <StatCard
                    title="Permissions"
                    value={
                        roles.reduce(
                            (
                                total,
                                role
                            ) =>
                                total +
                                (
                                    role.permissionsCount ||
                                    0
                                ),
                            0
                        )
                    }
                />
            </div>

            <QuickActions
                actions={[
                    {
                        label:
                            "Create Role",
                        path:
                            "/roles/create"
                    },
                    {
                        label:
                            "Manage Permissions",
                        path:
                            "/roles/permissions"
                    }
                ]}
            />

            <ActivityFeed
                activities={roles.map(
                    (
                        role
                    ) => ({
                        id:
                            role._id,
                        title:
                            role.name
                    })
                )}
            />
        </PageContainer>
    );
};

export default RoleDashboard;