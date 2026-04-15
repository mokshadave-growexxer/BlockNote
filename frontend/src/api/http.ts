import axios from "axios";
import { useAuthStore } from "../store/auth-store";

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:5000/api",
  withCredentials: true
});

let refreshPromise: Promise<string | null> | null = null;

http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };
    const status = error.response?.status;

    if (originalRequest?.url?.includes("/auth/refresh") || status !== 401 || originalRequest?._retry) {
      throw error;
    }

    if (!refreshPromise) {
      refreshPromise = http
        .post("/auth/refresh")
        .then((response) => {
          const accessToken = response.data.accessToken as string;
          const user = response.data.user as { id: string; email: string };
          useAuthStore.getState().setSession(accessToken, user);
          return accessToken;
        })
        .catch(() => {
          useAuthStore.getState().clearSession();
          return null;
        })
        .finally(() => {
          refreshPromise = null;
        });
    }

    const nextToken = await refreshPromise;
    if (!nextToken) {
      throw error;
    }

    originalRequest._retry = true;
    originalRequest.headers.Authorization = `Bearer ${nextToken}`;
    return http(originalRequest);
  }
);
