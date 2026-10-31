import {
    useEffect,
    useState
} from "react";

import {
    useNavigate,
    useParams
} from "react-router-dom";

import teacherApi
    from "../api/teacher.api";

import TeacherForm
    from "../components/TeacherForm";

import Loader
    from "../../shared/ui/Loader";

import PageContainer
    from "../../shared/components/PageContainer";

import PageHeader
    from "../../shared/components/PageHeader";

export default function TeacherEdit() {

    const { id } =
        useParams();

    const navigate =
        useNavigate();

    const [
        teacher,
        setTeacher
    ] = useState(null);

    const [
        loading,
        setLoading
    ] = useState(true);

    useEffect(() => {
        loadTeacher();
    }, []);

    async function loadTeacher() {

        try {

            const response =
                await teacherApi.getTeacherById(
                    id
                );

            setTeacher(
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

            await teacherApi.updateTeacher(
                id,
                values
            );

            navigate(
                "/teachers"
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
                title="Edit Teacher"
            />

            <TeacherForm
                initialValues={
                    teacher
                }
                onSubmit={
                    handleSubmit
                }
            />

        </PageContainer>
    );
}