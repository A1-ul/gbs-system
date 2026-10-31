import {
    useEffect,
    useState
} from "react";

import admissionApi
    from "../api/admission.api";

import AdmissionTable
    from "../components/AdmissionTable";

import PageContainer
    from "../../shared/components/PageContainer";

import PageHeader
    from "../../shared/components/PageHeader";

import Loader
    from "../../shared/ui/Loader";

export default function AdmissionApproval() {

    const [
        admissions,
        setAdmissions
    ] = useState([]);

    const [
        loading,
        setLoading
    ] = useState(true);

    useEffect(() => {
        loadPendingAdmissions();
    }, []);

    async function loadPendingAdmissions() {

        try {

            setLoading(true);

            const response =
                await admissionApi.getAdmissions({
                    status: "PENDING"
                });

            setAdmissions(
                response?.data || []
            );

        } catch (error) {

            console.error(error);

        } finally {

            setLoading(false);
        }
    }

    async function handleApprove(
        admission
    ) {

        try {

            await admissionApi.approveAdmission(
                admission.id
            );

            await loadPendingAdmissions();

        } catch (error) {

            console.error(error);
        }
    }

    async function handleReject(
        admission
    ) {

        try {

            await admissionApi.rejectAdmission(
                admission.id,
                "Rejected By Admin"
            );

            await loadPendingAdmissions();

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
                title="Admission Approval"
                subtitle="Approve Or Reject Applications"
            />

            <AdmissionTable
                data={admissions}
                loading={loading}
                onApprove={handleApprove}
                onReject={handleReject}
            />

        </PageContainer>
    );
}