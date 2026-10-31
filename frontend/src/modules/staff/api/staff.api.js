import apiClient from "../../shared/api/apiClient";

const BASE_URL = "/staff";

export const getStaff = async (params = {}) => {
    const { data } = await apiClient.get(
        BASE_URL,
        { params }
    );

    return data;
};

export const getStaffById = async (id) => {
    const { data } = await apiClient.get(
        `${BASE_URL}/${id}`
    );

    return data;
};

export const createStaff = async (payload) => {
    const { data } = await apiClient.post(
        BASE_URL,
        payload
    );

    return data;
};

export const updateStaff = async (
    id,
    payload
) => {
    const { data } = await apiClient.put(
        `${BASE_URL}/${id}`,
        payload
    );

    return data;
};

export const deleteStaff = async (id) => {
    const { data } = await apiClient.delete(
        `${BASE_URL}/${id}`
    );

    return data;
};

export const getStaffPermissions =
    async () => {
        const { data } =
            await apiClient.get(
                `${BASE_URL}/permissions`
            );

        return data;
    };

export default {
    getStaff,
    getStaffById,
    createStaff,
    updateStaff,
    deleteStaff,
    getStaffPermissions
};