import React from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";

import roleApi from "../../api/role.api";
import RoleForm from "../components/RoleForm";

import PageContainer from "../../shared/components/PageContainer";
import PageHeader from "../../shared/components/PageHeader";

const RoleCreate = () => {
    const navigate = useNavigate();

    const [values, setValues] =
        React.useState({
            name: "",
            displayName: "",
            description: ""
        });

    const mutation = useMutation({
        mutationFn:
            roleApi.createRole,

        onSuccess: () => {
            navigate("/roles");
        }
    });

    const handleChange = (
        name,
        value
    ) => {
        setValues((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (
        event
    ) => {
        event.preventDefault();

        mutation.mutate(values);
    };

    return (
        <PageContainer>
            <PageHeader
                title="Create Role"
                description="Add a new system role."
            />

            <RoleForm
                values={values}
                errors={{}}
                loading={
                    mutation.isPending
                }
                onChange={
                    handleChange
                }
                onSubmit={
                    handleSubmit
                }
                submitLabel="Create Role"
            />
        </PageContainer>
    );
};

export default RoleCreate;