import { create } from "zustand";
import type { SessionUser } from "../api/auth";

type AuthState = {
  user: SessionUser | null;
  hydrated: boolean;
  setSession: (user: SessionUser) => void;
  clearSession: () => void;
  markHydrated: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  hydrated: false,
  setSession: (user) => {
    set({ user });
  },
  clearSession: () => {
    set({ user: null });
  },
  markHydrated: () => {
    set({ hydrated: true });
  }
}));
