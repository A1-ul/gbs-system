import apiClient from "../../shared/api/apiClient";

const BASE_URL = "/parent";

export const getParents = async (
    params = {}
) => {
    const { data } =
        await apiClient.get(
            BASE_URL,
            { params }
        );

    return data;
};

export const getParentById =
    async (id) => {
        const { data } =
            await apiClient.get(
                `${BASE_URL}/${id}`
            );

        return data;
    };

export const createParent =
    async (payload) => {
        const { data } =
            await apiClient.post(
                BASE_URL,
                payload
            );

        return data;
    };

export const updateParent =
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

export const deleteParent =
    async (id) => {
        const { data } =
            await apiClient.delete(
                `${BASE_URL}/${id}`
            );

        return data;
    };

export const getParentDashboard =
    async () => {
        const { data } =
            await apiClient.get(
                `${BASE_URL}/dashboard`
            );

        return data;
    };

export const getParentPermissions =
    async () => {
        const { data } =
            await apiClient.get(
                `${BASE_URL}/permissions`
            );

        return data;
    };

export default {
    getParents,
    getParentById,
    createParent,
    updateParent,
    deleteParent,
    getParentDashboard,
    getParentPermissions
};