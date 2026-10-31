"use strict";

import {
    configureStore
} from "@reduxjs/toolkit";

import authReducer
    from "../../modules/auth/state/authSlice";

/*
==================================================
GBS ENTERPRISE REDUX STORE
PRODUCTION READY
CRASH RESISTANT
==================================================
*/

export const store =
    configureStore({

        reducer: {

            auth:
                authReducer
        },

        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware({

                serializableCheck: false,

                immutableCheck:
                    process.env.NODE_ENV !==
                    "production"
            }),

        devTools:
            process.env.NODE_ENV !==
            "production"
    });

/*
==================================================
TYPES
==================================================
*/

export const dispatch =
    store.dispatch;

export const getState =
    store.getState;

export default store;