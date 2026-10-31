import React, {
    useState
} from "react";

import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";

import permissionApi from "../../api/permission.api";

import PageContainer from "../../shared/components/PageContainer";
import PageHeader from "../../shared/components/PageHeader";

import PermissionForm from "../components/PermissionForm";

const PermissionCreate = () => {
    const navigate = useNavigate();

    const [values, setValues] =
        useState({
            name: "",
            code: "",
            description: ""
        });

    const mutation = useMutation({
        mutationFn:
            permissionApi.createPermission,

        onSuccess: () => {
            navigate(
                "/permissions"
            );
        }
    });

    const handleChange = (
        field,
        value
    ) => {
        setValues((prev) => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = (
        event
    ) => {
        event.preventDefault();

        mutation.mutate(
            values
        );
    };

    return (
        <PageContainer>
            <PageHeader
                title="Create Permission"
            />

            <PermissionForm
                values={values}
                onChange={
                    handleChange
                }
                onSubmit={
                    handleSubmit
                }
                loading={
                    mutation.isPending
                }
            />
        </PageContainer>
    );
};

export default PermissionCreate;