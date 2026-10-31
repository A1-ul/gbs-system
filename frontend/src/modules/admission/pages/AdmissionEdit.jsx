import {
    useEffect,
    useState
} from "react";

import {
    useParams,
    useNavigate
} from "react-router-dom";

import admissionApi
    from "../api/admission.api";

import AdmissionForm
    from "../components/AdmissionForm";

import Loader
    from "../../shared/ui/Loader";

import PageContainer
    from "../../shared/components/PageContainer";

import PageHeader
    from "../../shared/components/PageHeader";

export default function AdmissionEdit() {

    const { id } =
        useParams();

    const navigate =
        useNavigate();

    const [
        admission,
        setAdmission
    ] = useState(null);

    const [
        loading,
        setLoading
    ] = useState(true);

    useEffect(() => {
        loadAdmission();
    }, [id]);

    async function loadAdmission() {

        try {

            const response =
                await admissionApi.getAdmissionById(
                    id
                );

            setAdmission(
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

            await admissionApi.updateAdmission(
                id,
                values
            );

            navigate(
                "/admission"
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
                title="Edit Admission"
            />

            <AdmissionForm
                initialValues={
                    admission
                }
                onSubmit={
                    handleSubmit
                }
            />

        </PageContainer>
    );
}