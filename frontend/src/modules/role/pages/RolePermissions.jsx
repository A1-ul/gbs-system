import React from "react";
import { useQuery } from "@tanstack/react-query";

import roleApi from "../api/role.api";

import PageContainer from "../../shared/components/PageContainer";
import PageHeader from "../../shared/components/PageHeader";
import Loader from "../../shared/ui/Loader";
import EmptyState from "../../shared/components/EmptyState";

const RolePermissions = () => {
    const {
        data,
        isLoading,
        error
    } = useQuery({
        queryKey: ["role-permissions"],
        queryFn: roleApi.getPermissions
    });

    if (isLoading) {
        return <Loader />;
    }

    if (error) {
        return (
            <EmptyState
                title="Unable to load permissions"
                description="Please try again later."
            />
        );
    }

    const permissions =
        data?.data ||
        data ||
        [];

    return (
        <PageContainer>
            <PageHeader
                title="Role Permissions"
                description="System permission registry."
            />

            <div
                className="
                bg-white
                rounded-xl
                border
                p-6
                "
            >
                <div
                    className="
                    grid
                    grid-cols-1
                    md:grid-cols-2
                    lg:grid-cols-3
                    gap-4
                "
                >
                    {permissions.map(
                        (permission) => (
                            <div
                                key={
                                    permission.id ||
                                    permission.name
                                }
                                className="
                                border
                                rounded-lg
                                p-4
                            "
                            >
                                <h3 className="font-semibold">
                                    {
                                        permission.name
                                    }
                                </h3>

                                <p className="text-sm text-gray-500">
                                    {
                                        permission.description
                                    }
                                </p>
                            </div>
                        )
                    )}
                </div>
            </div>
        </PageContainer>
    );
};

export default RolePermissions;