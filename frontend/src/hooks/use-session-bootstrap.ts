import { useEffect } from "react";
import type { AuthResponse } from "../api/auth";
import { refreshSession } from "../api/auth";
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
    const currentSession = useAuthStore.getState();

    if (currentSession.accessToken && currentSession.user) {
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
          const latestSession = useAuthStore.getState();
          if (!latestSession.accessToken || !latestSession.user) {
            clearSession();
          }
          return;
        }
        setSession(data.accessToken, data.user);
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
