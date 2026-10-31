import {
    useEffect,
    useState
} from "react";

import {
    useParams
} from "react-router-dom";

import teacherApi
    from "../api/teacher.api";

import TeacherCard
    from "../components/TeacherCard";

import Loader
    from "../../shared/ui/Loader";

import PageContainer
    from "../../shared/components/PageContainer";

import PageHeader
    from "../../shared/components/PageHeader";

export default function TeacherDetails() {

    const { id } =
        useParams();

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

    if (loading) {
        return <Loader />;
    }

    return (
        <PageContainer>

            <PageHeader
                title="Teacher Details"
            />

            <TeacherCard
                teacher={teacher}
            />

        </PageContainer>
    );
}