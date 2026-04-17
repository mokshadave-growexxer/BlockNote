import { useEffect } from "react";
import type { AuthResponse } from "../api/auth";
import { refreshSession } from "../api/auth";
import { setCSRFToken } from "../api/http";
import { useAuthStore } from "../store/auth-store";

let bootstrapRefreshPromise: Promise<AuthResponse | null> | null = null;

function getBootstrapRefreshPromise() {
  if (!bootstrapRefreshPromise) {
    bootstrapRefreshPromise = refreshSession()
      .catch(() => null)
      .finally(() => {
        bootstrapRefreshPromise = null;
      });
  }

  return bootstrapRefreshPromise;
}

export function useSessionBootstrap() {
  const markHydrated = useAuthStore((state) => state.markHydrated);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    let active = true;
    const currentUser = useAuthStore.getState().user;

    if (currentUser) {
      markHydrated();
      return () => {
        active = false;
      };
    }

    getBootstrapRefreshPromise()
      .then((data) => {
        if (!active) {
          return;
        }
        if (!data) {
          const latestUser = useAuthStore.getState().user;
          if (!latestUser) {
            clearSession();
          }
          return;
        }
        setCSRFToken(data.csrfToken);
        setSession(data.user);
      })
      .finally(() => {
        if (active) {
          markHydrated();
        }
      });

    return () => {
      active = false;
    };
  }, [clearSession, markHydrated, setSession]);
}
