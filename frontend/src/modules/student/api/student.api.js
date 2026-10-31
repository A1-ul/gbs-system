import apiClient from "../../shared/api/apiClient";

const BASE_URL = "/students";

export const getStudents = async (
    params = {}
) => {
    const { data } =
        await apiClient.get(
            BASE_URL,
            { params }
        );

    return data;
};

export const getStudentById =
    async (id) => {
        const { data } =
            await apiClient.get(
                `${BASE_URL}/${id}`
            );

        return data;
    };

export const createStudent =
    async (payload) => {
        const { data } =
            await apiClient.post(
                BASE_URL,
                payload
            );

        return data;
    };

export const updateStudent =
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

export const deleteStudent =
    async (id) => {
        const { data } =
            await apiClient.delete(
                `${BASE_URL}/${id}`
            );

        return data;
    };

export const getStudentDashboard =
    async () => {
        const { data } =
            await apiClient.get(
                `${BASE_URL}/dashboard`
            );

        return data;
    };

export const getStudentPermissions =
    async () => {
        const { data } =
            await apiClient.get(
                `${BASE_URL}/permissions`
            );

        return data;
    };

export default {
    getStudents,
    getStudentById,
    createStudent,
    updateStudent,
    deleteStudent,
    getStudentDashboard,
    getStudentPermissions
};