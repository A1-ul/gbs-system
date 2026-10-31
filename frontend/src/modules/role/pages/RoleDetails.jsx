import React from "react";
import {
    useParams,
    useNavigate
} from "react-router-dom";

import { useQuery } from "@tanstack/react-query";

import roleApi from "../../api/role.api";

import PageContainer from "../../shared/components/PageContainer";
import PageHeader from "../../shared/components/PageHeader";
import Loader from "../../shared/ui/Loader";
import Badge from "../../shared/ui/Badge";
import Button from "../../shared/ui/Button";

const RoleDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const {
        data,
        isLoading
    } = useQuery({
        queryKey: [
            "role",
            id
        ],
        queryFn: () =>
            roleApi.getRoleById(id)
    });

    if (isLoading) {
        return <Loader />;
    }

    const role =
        data?.data ||
        data ||
        {};

    return (
        <PageContainer>
            <PageHeader
                title="Role Details"
                description="Detailed role information."
            />

            <div
                className="
                bg-white
                border
                rounded-xl
                p-6
                space-y-4
            "
            >
                <h2 className="text-xl font-bold">
                    {role.name}
                </h2>

                <Badge>
                    {
                        role.permissionsCount
                    } Permissions
                </Badge>

                <p>
                    {
                        role.description
                    }
                </p>

                <Button
                    onClick={() =>
                        navigate(
                            `/roles/${id}/edit`
                        )
                    }
                >
                    Edit Role
                </Button>
            </div>
        </PageContainer>
    );
};

export default RoleDetails;