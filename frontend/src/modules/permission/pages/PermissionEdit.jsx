import React, {
    useEffect,
    useState
} from "react";

import {
    useNavigate,
    useParams
} from "react-router-dom";

import {
    useMutation,
    useQuery
} from "@tanstack/react-query";

import permissionApi from "../../api/permission.api";

import Loader from "../../shared/ui/Loader";
import PageContainer from "../../shared/components/PageContainer";
import PageHeader from "../../shared/components/PageHeader";

import PermissionForm from "../components/PermissionForm";

const PermissionEdit = () => {
    const { id } = useParams();

    const navigate =
        useNavigate();

    const [values, setValues] =
        useState({
            name: "",
            code: "",
            description: ""
        });

    const {
        data,
        isLoading
    } = useQuery({
        queryKey: [
            "permission",
            id
        ],
        queryFn: () =>
            permissionApi.getPermissionById(
                id
            )
    });

    useEffect(() => {
        const permission =
            data?.data ||
            data;

        if (permission) {
            setValues({
                name:
                    permission.name ||
                    "",
                code:
                    permission.code ||
                    "",
                description:
                    permission.description ||
                    ""
            });
        }
    }, [data]);

    const mutation =
        useMutation({
            mutationFn:
                (payload) =>
                    permissionApi.updatePermission(
                        id,
                        payload
                    ),

            onSuccess: () =>
                navigate(
                    "/permissions"
                )
        });

    if (isLoading) {
        return <Loader />;
    }

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
                title="Edit Permission"
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
                submitLabel="Update"
            />
        </PageContainer>
    );
};

export default PermissionEdit;