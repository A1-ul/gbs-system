import {
    useEffect,
    useState
} from "react";

import studentApi from "../../api/student.api";

import PageContainer from "../../shared/components/PageContainer";
import PageHeader from "../../shared/components/PageHeader";

import StatCard from "../../shared/dashboard/StatCard";
import ChartCard from "../../shared/dashboard/ChartCard";

export default function StudentDashboard() {
    const [stats, setStats] =
        useState({});

    const [loading, setLoading] =
        useState(true);

    useEffect(() => {
        loadDashboard();
    }, []);

    async function loadDashboard() {
        try {
            const response =
                await studentApi.getStudentDashboard();

            setStats(
                response?.data ||
                {}
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
                title="Student Dashboard"
                subtitle="Student analytics overview"
            />

            <div
                className="grid gap-4"
            >
                <StatCard
                    title="Total Students"
                    value={
                        stats.totalStudents ||
                        0
                    }
                    loading={loading}
                />

                <StatCard
                    title="Active Students"
                    value={
                        stats.activeStudents ||
                        0
                    }
                    loading={loading}
                />

                <ChartCard
                    title="Students Analytics"
                />
            </div>
        </PageContainer>
    );
}