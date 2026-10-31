import apiClient from "../../shared/api/apiClient";

const BASE_URL = "/academic";

export const getAcademics =
    async (params = {}) => {

        const { data } =
            await apiClient.get(
                BASE_URL,
                { params }
            );

        return data;
    };

export const getAcademicById =
    async (id) => {

        const { data } =
            await apiClient.get(
                `${BASE_URL}/${id}`
            );

        return data;
    };

export const createAcademic =
    async (payload) => {

        const { data } =
            await apiClient.post(
                BASE_URL,
                payload
            );

        return data;
    };

export const updateAcademic =
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

export const deleteAcademic =
    async (id) => {

        const { data } =
            await apiClient.delete(
                `${BASE_URL}/${id}`
            );

        return data;
    };

export const getAcademicDashboard =
    async () => {

        const { data } =
            await apiClient.get(
                `${BASE_URL}/dashboard`
            );

        return data;
    };

export const getAcademicCalendar =
    async () => {

        const { data } =
            await apiClient.get(
                `${BASE_URL}/calendar`
            );

        return data;
    };

const academicApi = {

    getAcademics,

    getAcademicById,

    createAcademic,

    updateAcademic,

    deleteAcademic,

    getAcademicDashboard,

    getAcademicCalendar
};

export default academicApi;