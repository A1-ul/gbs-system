import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import roleApi from "../../api/role.api";

import RoleTable from "../components/RoleTable";

import PageContainer from "../../shared/components/PageContainer";
import PageHeader from "../../shared/components/PageHeader";
import SearchBar from "../../shared/components/SearchBar";
import ConfirmDialog from "../../shared/components/ConfirmDialog";

const RoleList = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [search, setSearch] =
        React.useState("");

    const [selectedRole, setSelectedRole] =
        React.useState(null);

    const [showDeleteDialog, setShowDeleteDialog] =
        React.useState(false);

    const {
        data,
        isLoading
    } = useQuery({
        queryKey: [
            "roles",
            search
        ],
        queryFn: () =>
            roleApi.getRoles({
                search
            })
    });

    const deleteMutation =
        useMutation({
            mutationFn:
                roleApi.deleteRole,

            onSuccess: () => {
                queryClient.invalidateQueries({
                    queryKey: ["roles"]
                });

                setShowDeleteDialog(false);
            }
        });

    const roles =
        data?.data ||
        data ||
        [];

    return (
        <PageContainer>
            <PageHeader
                title="Roles"
                description="Manage system roles and permissions."
                actionLabel="Create Role"
                onAction={() =>
                    navigate("/roles/create")
                }
            />

            <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search roles..."
            />

            <RoleTable
                roles={roles}
                loading={isLoading}
                onView={(role) =>
                    navigate(
                        `/roles/${role._id}`
                    )
                }
                onEdit={(role) =>
                    navigate(
                        `/roles/${role._id}/edit`
                    )
                }
                onDelete={(role) => {
                    setSelectedRole(role);
                    setShowDeleteDialog(true);
                }}
            />

            <ConfirmDialog
                open={showDeleteDialog}
                title="Delete Role"
                description="This action cannot be undone."
                confirmLabel="Delete"
                onConfirm={() =>
                    deleteMutation.mutate(
                        selectedRole?._id
                    )
                }
                onCancel={() =>
                    setShowDeleteDialog(false)
                }
                loading={
                    deleteMutation.isPending
                }
            />
        </PageContainer>
    );
};

export default RoleList;