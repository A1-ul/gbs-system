import { useState } from "react";
import { useNavigate } from "react-router-dom";

import studentApi from "../../api/student.api";

import StudentForm from "../components/StudentForm";

import PageContainer from "../../shared/components/PageContainer";
import PageHeader from "../../shared/components/PageHeader";

export default function StudentCreate() {
    const navigate =
        useNavigate();

    const [loading, setLoading] =
        useState(false);

    async function handleSubmit(
        values
    ) {
        try {
            setLoading(true);

            await studentApi.createStudent(
                values
            );

            navigate(
                "/students"
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
                title="Create Student"
            />

            <StudentForm
                onSubmit={
                    handleSubmit
                }
                loading={loading}
            />
        </PageContainer>
    );
}