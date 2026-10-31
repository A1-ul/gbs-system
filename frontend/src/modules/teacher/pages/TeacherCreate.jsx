import { useState } from "react";

import {
    useNavigate
} from "react-router-dom";

import teacherApi
    from "../api/teacher.api";

import TeacherForm
    from "../components/TeacherForm";

import PageContainer
    from "../../shared/components/PageContainer";

import PageHeader
    from "../../shared/components/PageHeader";

export default function TeacherCreate() {

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

            await teacherApi.createTeacher(
                values
            );

            navigate(
                "/teachers"
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
                title="Create Teacher"
            />

            <TeacherForm
                loading={loading}
                onSubmit={
                    handleSubmit
                }
            />

        </PageContainer>
    );
}