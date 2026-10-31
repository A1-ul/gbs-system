import {
    useState
} from "react";

import {
    useNavigate
} from "react-router-dom";

import admissionApi
    from "../api/admission.api";

import AdmissionForm
    from "../components/AdmissionForm";

import PageContainer
    from "../../shared/components/PageContainer";

import PageHeader
    from "../../shared/components/PageHeader";

export default function AdmissionCreate() {

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

            await admissionApi.createAdmission(
                values
            );

            navigate(
                "/admission"
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
                title="Create Admission"
            />

            <AdmissionForm
                loading={loading}
                onSubmit={handleSubmit}
            />

        </PageContainer>
    );
}