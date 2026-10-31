import { createSlice }
from "@reduxjs/toolkit";

import {


getAccessToken,

getUser,

clearAuthStorage


}
from "../../../utils/tokenStorage";

 /*

# INITIAL STATE

*/

const initialState = {


isAuthenticated:
    Boolean(
        getAccessToken()
    ),

accessToken:
    getAccessToken(),

user:
    getUser(),

loading: false,

error: null


};

 /*

# SLICE

*/

const authSlice =
createSlice({


    name: "auth",

    initialState,

    reducers: {

        loginStart(state) {

            state.loading = true;

            state.error = null;
        },

        loginSuccess(
            state,
            action
        ) {

            state.loading = false;

            state.error = null;

            state.isAuthenticated = true;

            state.accessToken =
                action.payload
                    ?.accessToken ||
                null;

            state.user =
                action.payload
                    ?.user ||
                null;
        },

        loginFailure(
            state,
            action
        ) {

            state.loading = false;

            state.error =
                action.payload ||
                "Authentication failed";
        },

        setCredentials(
            state,
            action
        ) {

            state.isAuthenticated =
                true;

            state.accessToken =
                action.payload
                    ?.accessToken ||
                null;

            state.user =
                action.payload
                    ?.user ||
                null;
        },

        updateUser(
            state,
            action
        ) {

            state.user =
                action.payload;
        },

        clearAuthError(
            state
        ) {

            state.error = null;
        },

        logout(
            state
        ) {

            clearAuthStorage();

            state.isAuthenticated =
                false;

            state.accessToken =
                null;

            state.user =
                null;

            state.loading =
                false;

            state.error =
                null;
        }
    }
});


/*

# ACTIONS

*/

export const {


loginStart,

loginSuccess,

loginFailure,

setCredentials,

updateUser,

clearAuthError,

logout

} = authSlice.actions;

 /*

# SELECTORS

*/

export const selectAuth =
(state) =>
state.auth;

export const selectUser =
(state) =>
state.auth.user;

export const selectToken =
(state) =>
state.auth.accessToken;

export const selectIsAuthenticated =
(state) =>
state.auth.isAuthenticated;

export const selectAuthLoading =
(state) =>
state.auth.loading;

export const selectAuthError =
(state) =>
state.auth.error;

/*

# EXPORT

*/

export default authSlice.reducer;
