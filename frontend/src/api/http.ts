import axios from "axios";
import { useAuthStore } from "../store/auth-store";

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:5000/api",
  withCredentials: true
});

let refreshPromise: Promise<void> | null = null;
let csrfToken: string | null = null;

/**
 * Store CSRF token received from auth endpoints
 * Token is automatically sent in X-CSRF-Token header for all state-changing requests
 */
export function setCSRFToken(token: string) {
  csrfToken = token;
}

export function getCSRFToken() {
  return csrfToken;
}

// Add CSRF token to request headers for state-changing operations
http.interceptors.request.use((config) => {
  if (csrfToken && ["POST", "PUT", "DELETE", "PATCH"].includes(config.method?.toUpperCase() || "")) {
    config.headers["x-csrf-token"] = csrfToken;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };
    const status = error.response?.status;

    // Don't retry refresh endpoint or if already retried
    if (originalRequest?.url?.includes("/auth/refresh") || status !== 401 || originalRequest?._retry) {
      throw error;
    }

    // Handle token refresh
    if (!refreshPromise) {
      refreshPromise = http
        .post("/auth/refresh")
        .then((response) => {
          const { user, csrfToken: newCsrfToken } = response.data as {
            user: { id: string; email: string };
            csrfToken: string;
          };
          setCSRFToken(newCsrfToken);
          useAuthStore.getState().setSession(user);
        })
        .catch(() => {
          useAuthStore.getState().clearSession();
        })
        .finally(() => {
          refreshPromise = null;
        });
    }

    try {
      await refreshPromise;
      originalRequest._retry = true;
      return http(originalRequest);
    } catch {
      throw error;
    }
  }
);
