import { useState } from "react";

import {
    useNavigate
} from "react-router-dom";

import parentApi
    from "../../api/parent.api";

import ParentForm
    from "../components/ParentForm";

import PageContainer
    from "../../shared/components/PageContainer";

import PageHeader
    from "../../shared/components/PageHeader";

export default function ParentCreate() {

    const navigate =
        useNavigate();

    const [
        loading,
        setLoading
    ] = useState(false);

    async function handleSubmit(
        values
    ) {

        try {

            setLoading(true);

            await parentApi.createParent(
                values
            );

            navigate(
                "/parents"
            );

        } catch (error) {

            console.error(error);

        } finally {

            setLoading(false);
        }
    }

    return (
        <PageContainer>

            <PageHeader
                title="Create Parent"
            />

            <ParentForm
                loading={loading}
                onSubmit={
                    handleSubmit
                }
            />

        </PageContainer>
    );
}