import { create } from "zustand";
import type { SessionUser } from "../api/auth";

type AuthState = {
  accessToken: string | null;
  user: SessionUser | null;
  hydrated: boolean;
  setSession: (accessToken: string, user: SessionUser) => void;
  clearSession: () => void;
  markHydrated: () => void;
};

const STORAGE_KEY = "blocknote-session";

function readStoredSession() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { accessToken: null, user: null };
  }

  try {
    return JSON.parse(raw) as { accessToken: string | null; user: SessionUser | null };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return { accessToken: null, user: null };
  }
}

const initial = readStoredSession();

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: initial.accessToken,
  user: initial.user,
  hydrated: false,
  setSession: (accessToken, user) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ accessToken, user }));
    set({ accessToken, user });
  },
  clearSession: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ accessToken: null, user: null });
  },
  markHydrated: () => {
    set({ hydrated: true });
  }
}));
