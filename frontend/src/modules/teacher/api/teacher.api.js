import apiClient from "../../shared/api/apiClient";

const BASE_URL = "/teachers";

export const getTeachers = async (
    params = {}
) => {
    const { data } =
        await apiClient.get(
            BASE_URL,
            { params }
        );

    return data;
};

export const getTeacherById =
    async (id) => {
        const { data } =
            await apiClient.get(
                `${BASE_URL}/${id}`
            );

        return data;
    };

export const createTeacher =
    async (payload) => {
        const { data } =
            await apiClient.post(
                BASE_URL,
                payload
            );

        return data;
    };

export const updateTeacher =
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

export const deleteTeacher =
    async (id) => {
        const { data } =
            await apiClient.delete(
                `${BASE_URL}/${id}`
            );

        return data;
    };

export const getTeacherDashboard =
    async () => {
        const { data } =
            await apiClient.get(
                `${BASE_URL}/dashboard`
            );

        return data;
    };

export const getTeacherPermissions =
    async () => {
        const { data } =
            await apiClient.get(
                `${BASE_URL}/permissions`
            );

        return data;
    };

export default {
    getTeachers,
    getTeacherById,
    createTeacher,
    updateTeacher,
    deleteTeacher,
    getTeacherDashboard,
    getTeacherPermissions
};