import React from "react";
import {
    useNavigate,
    useParams
} from "react-router-dom";

import {
    useQuery,
    useMutation
} from "@tanstack/react-query";

import roleApi from "../../api/role.api";

import RoleForm from "../components/RoleForm";

import PageContainer from "../../shared/components/PageContainer";
import PageHeader from "../../shared/components/PageHeader";
import Loader from "../../shared/ui/Loader";

const RoleEdit = () => {
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

    const mutation =
        useMutation({
            mutationFn: (payload) =>
                roleApi.updateRole(
                    id,
                    payload
                ),

            onSuccess: () =>
                navigate(
                    "/roles"
                )
        });

    const role =
        data?.data ||
        data;

    const [values, setValues] =
        React.useState({
            name: "",
            displayName: "",
            description: ""
        });

    React.useEffect(() => {
        if (role) {
            setValues({
                name:
                    role.name || "",
                displayName:
                    role.displayName ||
                    "",
                description:
                    role.description ||
                    ""
            });
        }
    }, [role]);

    const handleSubmit = (
        event
    ) => {
        event.preventDefault();

        mutation.mutate(values);
    };

    if (isLoading) {
        return <Loader />;
    }

    return (
        <PageContainer>
            <PageHeader
                title="Edit Role"
                description="Update role information."
            />

            <RoleForm
                values={values}
                errors={{}}
                loading={
                    mutation.isPending
                }
                onChange={(
                    name,
                    value
                ) =>
                    setValues(
                        (
                            prev
                        ) => ({
                            ...prev,
                            [name]:
                                value
                        })
                    )
                }
                onSubmit={
                    handleSubmit
                }
                submitLabel="Update Role"
            />
        </PageContainer>
    );
};

export default RoleEdit;