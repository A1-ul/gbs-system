import apiClient from "../../shared/api/apiClient";

const BASE_URL = "/roles";

export const getRoles = async (params = {}) => {
    const { data } = await apiClient.get(
        BASE_URL,
        { params }
    );

    return data;
};

export const getRoleById = async (id) => {
    if (!id) {
        throw new Error("Role ID is required");
    }

    const { data } = await apiClient.get(
        `${BASE_URL}/${id}`
    );

    return data;
};

export const createRole = async (payload) => {
    const { data } = await apiClient.post(
        BASE_URL,
        payload
    );

    return data;
};

export const updateRole = async (
    id,
    payload
) => {
    if (!id) {
        throw new Error("Role ID is required");
    }

    const { data } = await apiClient.put(
        `${BASE_URL}/${id}`,
        payload
    );

    return data;
};

export const deleteRole = async (id) => {
    if (!id) {
        throw new Error("Role ID is required");
    }

    const { data } = await apiClient.delete(
        `${BASE_URL}/${id}`
    );

    return data;
};

export const getRolePermissions =
    async (id) => {
        if (!id) {
            throw new Error(
                "Role ID is required"
            );
        }

        const { data } =
            await apiClient.get(
                `${BASE_URL}/${id}/permissions`
            );

        return data;
    };

export const updateRolePermissions =
    async (
        id,
        permissions
    ) => {
        if (!id) {
            throw new Error(
                "Role ID is required"
            );
        }

        const { data } =
            await apiClient.put(
                `${BASE_URL}/${id}/permissions`,
                {
                    permissions
                }
            );

        return data;
    };

const roleApi = {
    getRoles,
    getRoleById,
    createRole,
    updateRole,
    deleteRole,
    getRolePermissions,
    updateRolePermissions
};

export default roleApi;