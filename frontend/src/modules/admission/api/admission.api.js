import apiClient from "../../shared/api/apiClient";

const BASE_URL = "/admission";

export const getAdmissions = async (
    params = {}
) => {

    const { data } =
        await apiClient.get(
            BASE_URL,
            { params }
        );

    return data;
};

export const getAdmissionById =
    async (id) => {

        const { data } =
            await apiClient.get(
                `${BASE_URL}/${id}`
            );

        return data;
    };

export const createAdmission =
    async (payload) => {

        const { data } =
            await apiClient.post(
                BASE_URL,
                payload
            );

        return data;
    };

export const updateAdmission =
    async (
        id,
        payload
    ) => {

        const { data } =
            await apiClient.put(
                `${BASE_URL}/${id}`,
                payload
            );

        return data;
    };

export const deleteAdmission =
    async (id) => {

        const { data } =
            await apiClient.delete(
                `${BASE_URL}/${id}`
            );

        return data;
    };

export const approveAdmission =
    async (id) => {

        const { data } =
            await apiClient.post(
                `${BASE_URL}/${id}/approve`
            );

        return data;
    };

export const rejectAdmission =
    async (
        id,
        reason
    ) => {

        const { data } =
            await apiClient.post(
                `${BASE_URL}/${id}/reject`,
                { reason }
            );

        return data;
    };

export const getAdmissionDashboard =
    async () => {

        const { data } =
            await apiClient.get(
                `${BASE_URL}/dashboard`
            );

        return data;
    };

const admissionApi = {

    getAdmissions,

    getAdmissionById,

    createAdmission,

    updateAdmission,

    deleteAdmission,

    approveAdmission,

    rejectAdmission,

    getAdmissionDashboard
};

export default admissionApi;