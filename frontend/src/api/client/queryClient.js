import {
    QueryClient
}
from "@tanstack/react-query";

const queryClient =
    new QueryClient({
        defaultOptions: {
            queries: {
                retry: 2,
                staleTime: 60000,
                refetchOnWindowFocus: false,
                refetchOnReconnect: true
            },

            mutations: {
                retry: 1
            }
        }
    });

export default queryClient;