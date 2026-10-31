import {
    useEffect,
    useState
} from "react";

import admissionApi
    from "../api/admission.api";

import PageContainer
    from "../../shared/components/PageContainer";

import PageHeader
    from "../../shared/components/PageHeader";

import StatCard
    from "../../shared/dashboard/StatCard";

export default function AdmissionDashboard() {

    const [
        stats,
        setStats
    ] = useState({});

    const [
        loading,
        setLoading
    ] = useState(true);

    useEffect(() => {
        loadDashboard();
    }, []);

    async function loadDashboard() {

        try {

            const response =
                await admissionApi.getAdmissionDashboard();

            setStats(
                response?.data || {}
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
                title="Admission Dashboard"
                subtitle="Admission Analytics"
            />

            <div className="grid gap-4">

                <StatCard
                    title="Total Admissions"
                    value={
                        stats.totalAdmissions || 0
                    }
                    loading={loading}
                />

                <StatCard
                    title="Approved"
                    value={
                        stats.approvedAdmissions || 0
                    }
                    loading={loading}
                />

                <StatCard
                    title="Pending"
                    value={
                        stats.pendingAdmissions || 0
                    }
                    loading={loading}
                />

                <StatCard
                    title="Rejected"
                    value={
                        stats.rejectedAdmissions || 0
                    }
                    loading={loading}
                />

            </div>

        </PageContainer>
    );
}