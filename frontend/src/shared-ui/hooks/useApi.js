import { useCallback } from "react";

import { apiClient } from "../api";

export default function useApi() {

    const get = useCallback(
        async (
            url,
            config = {}
        ) => {

            const response =
                await apiClient.get(
                    url,
                    config
                );

            return response.data;
        },
        []
    );

    const post = useCallback(
        async (
            url,
            payload = {},
            config = {}
        ) => {

            const response =
                await apiClient.post(
                    url,
                    payload,
                    config
                );

            return response.data;
        },
        []
    );

    const put = useCallback(
        async (
            url,
            payload = {},
            config = {}
        ) => {

            const response =
                await apiClient.put(
                    url,
                    payload,
                    config
                );

            return response.data;
        },
        []
    );

    const patch = useCallback(
        async (
            url,
            payload = {},
            config = {}
        ) => {

            const response =
                await apiClient.patch(
                    url,
                    payload,
                    config
                );

            return response.data;
        },
        []
    );

    const remove = useCallback(
        async (
            url,
            config = {}
        ) => {

            const response =
                await apiClient.delete(
                    url,
                    config
                );

            return response.data;
        },
        []
    );

    return {
        get,
        post,
        put,
        patch,
        remove
    };
}