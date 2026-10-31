import {
    useEffect,
    useState
} from "react";

import {
    useNavigate,
    useParams
} from "react-router-dom";

import studentApi from "../../api/student.api";

import StudentForm from "../components/StudentForm";

import PageContainer from "../../shared/components/PageContainer";
import PageHeader from "../../shared/components/PageHeader";
import Loader from "../../shared/ui/Loader";

export default function StudentEdit() {
    const { id } =
        useParams();

    const navigate =
        useNavigate();

    const [student, setStudent] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    useEffect(() => {
        loadStudent();
    }, []);

    async function loadStudent() {
        try {
            const response =
                await studentApi.getStudentById(
                    id
                );

            setStudent(
                response?.data
            );
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(
        values
    ) {
        try {
            await studentApi.updateStudent(
                id,
                values
            );

            navigate(
                "/students"
            );
        } catch (error) {
            console.error(error);
        }
    }

    if (loading) {
        return <Loader />;
    }

    return (
        <PageContainer>
            <PageHeader
                title="Edit Student"
            />

            <StudentForm
                initialValues={
                    student
                }
                onSubmit={
                    handleSubmit
                }
            />
        </PageContainer>
    );
}