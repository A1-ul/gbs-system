import {
    useEffect,
    useState
} from "react";

import {
    useParams
} from "react-router-dom";

import admissionApi
    from "../api/admission.api";

import AdmissionCard
    from "../components/AdmissionCard";

import Loader
    from "../../shared/ui/Loader";

import PageContainer
    from "../../shared/components/PageContainer";

import PageHeader
    from "../../shared/components/PageHeader";

export default function AdmissionDetails() {

    const { id } =
        useParams();

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

    if (loading) {
        return <Loader />;
    }

    return (
        <PageContainer>

            <PageHeader
                title="Admission Details"
            />

            <AdmissionCard
                admission={admission}
            />

        </PageContainer>
    );
}