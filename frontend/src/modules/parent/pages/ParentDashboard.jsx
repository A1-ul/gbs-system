import {
    useEffect,
    useState
} from "react";

import parentApi
    from "../../api/parent.api";

import PageContainer
    from "../../shared/components/PageContainer";

import PageHeader
    from "../../shared/components/PageHeader";

import StatCard
    from "../../shared/dashboard/StatCard";

import ChartCard
    from "../../shared/dashboard/ChartCard";

export default function ParentDashboard() {

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
                await parentApi.getParentDashboard();

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
                title="Parent Dashboard"
                subtitle="Parent Analytics"
            />

            <div className="grid gap-4">

                <StatCard
                    title="Total Parents"
                    value={
                        stats.totalParents ||
                        0
                    }
                    loading={loading}
                />

                <StatCard
                    title="Active Parents"
                    value={
                        stats.activeParents ||
                        0
                    }
                    loading={loading}
                />

                <ChartCard
                    title="Parent Overview"
                />

            </div>

        </PageContainer>
    );
}