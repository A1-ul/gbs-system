import apiClient from "../../../api/client/apiClient";
import { saveAuthSession } from "../../../utils/tokenStorage";

function extractAuthPayload(responseData) {
  if (!responseData) {
    return null;
  }

  if (responseData.data?.accessToken) {
    return responseData.data;
  }

  if (responseData.accessToken) {
    return responseData;
  }

  return null;
}

export const register = async (payload) => {
  const response = await apiClient.post("/auth/register", payload);
  const authData = extractAuthPayload(response.data);

  if (authData) {
    saveAuthSession(authData);
  }

  return response.data;
};

export const login = async (payload) => {
  const response = await apiClient.post("/auth/login", payload);
  const authData = extractAuthPayload(response.data);

  if (authData) {
    saveAuthSession(authData);
  }

  return response.data;
};

export const logout = async () => {
  const response = await apiClient.post("/auth/logout");
  return response.data;
};

export const refreshSession = async () => {
  const refreshToken = localStorage.getItem("gbs_refresh_token");

  const response = await apiClient.post("/auth/refresh-token", {
    refreshToken
  });

  const authData = extractAuthPayload(response.data);

  if (authData?.accessToken) {
    saveAuthSession(authData);
  }

  return response.data;
};

export const forgotPassword = async (payload) => {
  const response = await apiClient.post("/auth/forgot-password", payload);
  return response.data;
};

export const resetPassword = async (payload) => {
  const response = await apiClient.post("/auth/reset-password", payload);
  return response.data;
};

export const validateSession = async () => {
  const response = await apiClient.get("/auth/me");
  return response.data;
};

export const registerInstitution = async (payload) => {
  const response = await apiClient.post("/auth/register-institution", payload);
  return response.data;
};

export const getPublicInstitutions = async () => {
  const response = await apiClient.get("/auth/institutions");
  return response.data;
};

