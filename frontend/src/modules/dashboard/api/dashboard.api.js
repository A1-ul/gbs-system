import apiClient from "../../shared/api/apiClient";

export async function getDashboardOverview() {
    const { data } = await apiClient.get(
        "/analytics/dashboard"
    );

    return data;
}

export async function getDashboardStats() {
    const { data } = await apiClient.get(
        "/analytics/stats"
    );

    return data;
}

export async function getDashboardCharts() {
    const { data } = await apiClient.get(
        "/analytics/charts"
    );

    return data;
}

export async function getRecentActivities() {
    const { data } = await apiClient.get(
        "/analytics/activity"
    );

    return data;
}