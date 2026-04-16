import { createBrowserRouter, Navigate, Outlet, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { login, logout, register } from "../api/auth";
import { AppShell } from "../components/app-shell";
import { useSessionBootstrap } from "../hooks/use-session-bootstrap";
import { AuthForm } from "../features/auth/auth-form";
import { DocumentDashboard } from "../features/documents/document-dashboard";
import { useAuthStore } from "../store/auth-store";
import { useAIStore } from "../store/ai-store";
import { DocumentEditor } from "../features/editor/document-editor";
import { SharePage } from "../features/share/share-page";
import { useState } from "react";
import { FilePenLine } from "lucide-react";
import { AIToolbar } from "../features/editor/ai-toolbar";

function AuthLayout() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const [mode, setMode] = useState<"login" | "register">("login");
  useSessionBootstrap();
  if (!hydrated) return <ScreenMessage message="Restoring your session..." />;
  if (user) return <Navigate to="/dashboard" replace />;
  return (
    <div className="grid min-h-screen bg-[#fbf9ff] text-slate-950 dark:bg-[#080b14] dark:text-white lg:grid-cols-[1.12fr_0.88fr]">
      <section className="relative hidden min-h-screen overflow-hidden lg:block">
        <img
          src="https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1600&q=80"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,11,20,0.88),rgba(8,11,20,0.48)),radial-gradient(circle_at_36%_42%,rgba(167,139,250,0.24),transparent_30%)]" />
        <div className="relative flex min-h-screen flex-col justify-center px-16">
          <div className="w-fit rounded-lg border border-white/10 bg-white/5 px-5 py-2 text-xs font-bold uppercase tracking-[0.42em] text-brand-100 backdrop-blur">
            The Digital Atelier
          </div>
          <h1 className="mt-10 max-w-3xl font-serif text-7xl italic leading-[0.98] tracking-tight text-white">
            Honoring the act of creation.
          </h1>
          <p className="mt-8 max-w-2xl text-xl leading-9 text-slate-200">
            A workspace for notes, documents, templates, and AI-assisted refinement.
          </p>
          <div className="mt-24 grid max-w-xl grid-cols-2 gap-12 text-brand-100">
            <div>
              <p className="font-serif text-3xl italic">01</p>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.28em] text-slate-300">Editorial Logic</p>
            </div>
            <div>
              <p className="font-serif text-3xl italic">02</p>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.28em] text-slate-300">Intentional Space</p>
            </div>
          </div>
        </div>
        </section>

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10 sm:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(139,92,246,0.24),transparent_28%),linear-gradient(135deg,#ffffff_0%,#f1ebff_50%,#ffffff_100%)] dark:bg-[radial-gradient(circle_at_84%_12%,rgba(139,92,246,0.22),transparent_28%),linear-gradient(135deg,#111827_0%,#0b1020_50%,#080b14_100%)]" />
        <div className="relative w-full max-w-lg">
          <div className="mb-12 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-brand-200 to-brand-600 text-white shadow-glow">
                <FilePenLine className="h-5 w-5" />
              </span>
              <span className="font-serif text-2xl italic">BlockNote</span>
            </div>
            <button
              type="button"
              onClick={() => setMode((current) => current === "login" ? "register" : "login")}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white/70 dark:text-slate-200 dark:hover:bg-white/5"
            >
              {mode === "login" ? "Register" : "Sign in"}
            </button>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <AuthForm
                mode={mode}
                onToggleMode={() => setMode((current) => current === "login" ? "register" : "login")}
                onSubmit={async (payload) => {
                  const data = mode === "login" ? await login(payload) : await register(payload);
                  // Registration and login share the same session shape, so we can sign in immediately.
                  setSession(data.accessToken, data.user);
                  navigate("/dashboard");
                }}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}

function ProtectedLayout() {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const clearSession = useAuthStore((s) => s.clearSession);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  useSessionBootstrap();
  if (!hydrated) return <ScreenMessage message="Restoring your session..." />;
  if (!user) return <Navigate to="/" replace />;
  return (
    <AppShell
      title="Dashboard"
      subtitle="Create, rename, and manage your documents."
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      onLogout={async () => { await logout(); clearSession(); navigate("/"); }}
    >
      <Outlet context={{ searchQuery }} />
    </AppShell>
  );
}

export function useDashboardShellContext() {
  return useOutletContext<{ searchQuery: string }>();
}

function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const clearSession = useAuthStore((s) => s.clearSession);
  const openAIModal = useAIStore((s) => s.openModal);
  const navigate = useNavigate();
  const [documentContext, setDocumentContext] = useState("");
  useSessionBootstrap();
  if (!hydrated) return <ScreenMessage message="Restoring your session..." />;
  if (!user) return <Navigate to="/" replace />;
  return (
    <AppShell
      title=""
      subtitle=""
      sidebarContent={
        <AIToolbar
          documentText={documentContext}
          onOpenAI={(action, text) => openAIModal(action, text)}
        />
      }
      onLogout={async () => { await logout(); clearSession(); navigate("/"); }}
    >
      <DocumentEditor documentId={id!} onDocumentContextChange={setDocumentContext} />
    </AppShell>
  );
}

function ScreenMessage({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-slate-700 dark:bg-ink dark:text-slate-200">
      <p className="rounded-2xl border border-brand-100 px-6 py-4 shadow-panel dark:border-brand-900">{message}</p>
    </div>
  );
}

export const router = createBrowserRouter([
  { path: "/", element: <AuthLayout /> },
  { path: "/dashboard", element: <ProtectedLayout />, children: [{ index: true, element: <DocumentDashboard /> }] },
  { path: "/editor/:id", element: <EditorPage /> },
  { path: "/share/:token", element: <SharePage /> },
]);
