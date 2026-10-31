import apiClient from "../../shared/api/apiClient";

const BASE_URL = "/permissions";

export const getPermissions = async (params = {}) => {
    const { data } = await apiClient.get(
        BASE_URL,
        { params }
    );

    return data;
};

export const getPermissionById = async (id) => {
    const { data } = await apiClient.get(
        `${BASE_URL}/${id}`
    );

    return data;
};

export const createPermission = async (
    payload
) => {
    const { data } = await apiClient.post(
        BASE_URL,
        payload
    );

    return data;
};

export const updatePermission = async (
    id,
    payload
) => {
    const { data } = await apiClient.put(
        `${BASE_URL}/${id}`,
        payload
    );

    return data;
};

export const deletePermission = async (
    id
) => {
    const { data } = await apiClient.delete(
        `${BASE_URL}/${id}`
    );

    return data;
};

export default {
    getPermissions,
    getPermissionById,
    createPermission,
    updatePermission,
    deletePermission
};