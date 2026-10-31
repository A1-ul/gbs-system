import apiClient from "../../shared/api/apiClient";

export async function getTenants(params = {}) {
    const { data } = await apiClient.get(
        "/tenants",
        { params }
    );

    return data;
}

export async function getTenant(id) {
    const { data } = await apiClient.get(
        `/tenants/${id}`
    );

    return data;
}

export async function createTenant(payload) {
    const { data } = await apiClient.post(
        "/tenants",
        payload
    );

    return data;
}

export async function updateTenant(
    id,
    payload
) {
    const { data } = await apiClient.put(
        `/tenants/${id}`,
        payload
    );

    return data;
}

export async function deleteTenant(id) {
    const { data } = await apiClient.delete(
        `/tenants/${id}`
    );

    return data;
}

export async function getTenantStats() {
    const { data } = await apiClient.get(
        "/tenants/stats"
    );

    return data;
}