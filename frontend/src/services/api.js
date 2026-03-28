import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "https://spend-pilot-backend.onrender.com/api";
const REQUEST_TIMEOUT_MS = 30000;
const RETRYABLE_STATUS_CODES = new Set([502, 503, 504]);

const shouldRetryRequest = (error) => {
  if (!error?.config) {
    return false;
  }

  if (error.code === "ECONNABORTED") {
    return true;
  }

  if (!error.response) {
    return true;
  }

  return RETRYABLE_STATUS_CODES.has(error.response.status);
};

const API = axios.create({
  baseURL,
  timeout: REQUEST_TIMEOUT_MS,
});

export const setAuthToken = (token) => {
  if (token) {
    API.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete API.defaults.headers.common.Authorization;
  }
};

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};

    if (shouldRetryRequest(error) && !originalRequest.__retried) {
      originalRequest.__retried = true;
      return API(originalRequest);
    }

    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      setAuthToken(null);
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default API;
