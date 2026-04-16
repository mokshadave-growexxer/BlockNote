import {
  FileText,
  LayoutDashboard,
  LogOut,
  MoonStar,
  Search,
  SunMedium
} from "lucide-react";
import type { PropsWithChildren, ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/auth-store";
import { useThemeStore } from "../store/theme-store";
import { ToastContainer } from "./ToastContainer";

type AppShellProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  onLogout?: () => void;
  sidebarContent?: ReactNode;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}>;

export function AppShell({ children, onLogout, onSearchChange, searchValue = "", sidebarContent, subtitle, title }: AppShellProps) {
  const user = useAuthStore((state) => state.user);
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const location = useLocation();
  const isEditor = location.pathname.startsWith("/editor/");

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_18%_12%,rgba(139,92,246,0.20),transparent_32%),linear-gradient(135deg,#fbf9ff_0%,#f4efff_42%,#ffffff_100%)] text-slate-950 transition dark:bg-[radial-gradient(circle_at_18%_8%,rgba(139,92,246,0.22),transparent_34%),linear-gradient(135deg,#080b14_0%,#0c1020_48%,#050711_100%)] dark:text-white">
      <div className="flex min-h-screen">
        <aside className="hidden fixed inset-y-0 left-0 z-40 h-screen w-72 shrink-0 border-r border-brand-200/50 bg-white/54 px-5 py-6 backdrop-blur-2xl dark:border-white/10 dark:bg-[#080b14]/70 lg:flex lg:flex-col">
          <Link to="/dashboard" className="group">
            <p className="font-serif text-2xl italic tracking-wide text-slate-950 dark:text-white">BlockNote</p>
            <p className="mt-2 text-[0.68rem] font-bold uppercase tracking-[0.36em] text-slate-500 dark:text-slate-400">
              Workspace
            </p>
          </Link>

          <nav className="mt-14 space-y-2">
            <Link
              to="/dashboard"
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                !isEditor
                  ? "bg-brand-100/80 text-brand-900 shadow-sm dark:bg-white/9 dark:text-brand-100"
                  : "text-slate-500 hover:bg-brand-50 dark:text-slate-400 dark:hover:bg-white/5"
              }`}
            >
              <LayoutDashboard className="h-5 w-5" />
              Library
            </Link>
          </nav>

          {sidebarContent ? <div className="mt-3">{sidebarContent}</div> : null}

          <div className="mt-auto space-y-5">
            <div className="rounded-lg border border-brand-200/60 bg-white/50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="text-xs font-bold uppercase tracking-[0.26em] text-brand-600 dark:text-brand-300">Signed in</p>
              <p className="mt-2 truncate text-sm text-slate-600 dark:text-slate-300">{user?.email}</p>
            </div>
            <div className="flex items-center gap-3 border-t border-brand-200/60 pt-5 dark:border-white/10">
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-brand-200/70 bg-white/70 text-slate-600 transition hover:text-brand-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
              </button>
              {onLogout ? (
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-2 rounded-lg border border-brand-200/70 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:text-rose-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              ) : null}
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 min-h-0 flex-1 flex-col lg:pl-72">
          <header className="sticky top-0 z-30 border-b border-brand-200/50 bg-white/68 px-4 py-4 backdrop-blur-2xl dark:border-white/10 dark:bg-[#080b14]/74 sm:px-6 lg:px-10">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-600 dark:text-brand-300">
                  {isEditor ? "Studio" : "Library"}
                </p>
                {title ? <h1 className="mt-1 truncate font-serif text-2xl text-slate-950 dark:text-white">{title}</h1> : null}
                {subtitle ? <p className="mt-1 hidden text-sm text-slate-500 dark:text-slate-400 sm:block">{subtitle}</p> : null}
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                {!isEditor ? (
                  <label className="hidden h-11 w-72 items-center gap-2 rounded-lg border border-brand-200/70 bg-white/72 px-3 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.04] md:flex">
                    <Search className="h-4 w-4" />
                    <input
                      type="text"
                      value={searchValue}
                      onChange={(event) => onSearchChange?.(event.target.value)}
                      placeholder="Search notes in the library"
                      className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-500 dark:text-slate-200 dark:placeholder:text-slate-400"
                    />
                  </label>
                ) : null}
                <Link
                  to="/dashboard"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-brand-200/70 bg-white/72 text-slate-600 lg:hidden dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
                  aria-label="Open dashboard"
                >
                  <FileText className="h-4 w-4" />
                </Link>
                {isEditor ? (
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-brand-200/70 bg-white/72 text-slate-600 transition hover:text-brand-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
                    aria-label="Toggle theme"
                  >
                    {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
                  </button>
                ) : null}
                {onLogout && isEditor ? (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="hidden rounded-lg bg-gradient-to-r from-brand-300 to-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-glow transition hover:scale-[1.02] sm:inline-flex"
                  >
                    Logout
                  </button>
                ) : null}
              </div>
            </div>
          </header>
          <main className="flex-1 min-h-0">{children}</main>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}
