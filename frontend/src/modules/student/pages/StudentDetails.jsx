import {
    useEffect,
    useState
} from "react";

import {
    useParams
} from "react-router-dom";

import studentApi from "../../api/student.api";

import StudentCard from "../components/StudentCard";

import PageContainer from "../../shared/components/PageContainer";
import PageHeader from "../../shared/components/PageHeader";
import Loader from "../../shared/ui/Loader";

export default function StudentDetails() {
    const { id } =
        useParams();

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

    if (loading) {
        return <Loader />;
    }

    return (
        <PageContainer>
            <PageHeader
                title="Student Details"
            />

            <StudentCard
                student={student}
            />
        </PageContainer>
    );
}