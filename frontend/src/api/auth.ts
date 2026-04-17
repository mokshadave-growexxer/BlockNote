import { http } from "./http";

export type SessionUser = {
  id: string;
  email: string;
};

export type AuthResponse = {
  csrfToken: string;
  user: SessionUser;
};

export async function register(payload: { email: string; password: string }) {
  const { data } = await http.post<AuthResponse>("/auth/register", payload);
  return data;
}

export async function login(payload: { email: string; password: string }) {
  const { data } = await http.post<AuthResponse>("/auth/login", payload);
  return data;
}

export async function logout() {
  await http.post("/auth/logout");
}

export async function refreshSession() {
  const { data } = await http.post<AuthResponse>("/auth/refresh");
  return data;
}

export async function getCurrentUser() {
  const { data } = await http.get<{ user: SessionUser }>("/auth/me");
  return data.user;
}
