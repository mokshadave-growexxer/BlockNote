import axios from "axios";
import { useState } from "react";
import { ArrowRight, AtSign, LoaderCircle, LockKeyhole } from "lucide-react";
import { Button } from "../../components/button";

type AuthFormProps = {
  mode: "login" | "register";
  onSubmit: (payload: { email: string; password: string }) => Promise<void>;
  onToggleMode: () => void;
};

export function AuthForm({ mode, onSubmit, onToggleMode }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const heading = mode === "login" ? "Welcome Back" : "Create Your Workspace";
  const helperText =
    mode === "login"
      ? "Resume your documents, pinned notes, templates, and AI-assisted edits."
      : "Start a private BlockNote library with secure access and refresh-token sessions.";

  return (
    <form
      className="atelier-surface rounded-[2rem] p-8 sm:p-10"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setIsSubmitting(true);
        try {
          await onSubmit({ email, password });
        } catch (submitError) {
          const message = axios.isAxiosError(submitError)
            ? submitError.response?.data?.message ?? "Request failed. Please check your details and try again."
            : submitError instanceof Error
              ? submitError.message
              : "Something went wrong. Please try again.";
          setError(message);
        } finally {
          setIsSubmitting(false);
        }
      }}
    >
      <p className="text-xs font-bold uppercase tracking-[0.32em] text-brand-600 dark:text-brand-300">
        {mode === "login" ? "Workspace Identity" : "New Atelier"}
      </p>
      <h1 className="mt-5 font-serif text-5xl leading-tight text-slate-950 dark:text-white">{heading}</h1>
      <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
        {helperText}
      </p>

      <div className="mt-10 space-y-6">
        <label className="block space-y-3">
          <span className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Email</span>
          <span className="relative block">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="email@blocknote.app"
              className="h-16 w-full rounded-lg border border-brand-200/70 bg-white/74 px-5 pr-12 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-200/60 dark:border-white/10 dark:bg-[#070b16] dark:text-white dark:placeholder:text-slate-600 dark:focus:ring-brand-500/20"
              required
            />
            <AtSign className="absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          </span>
        </label>
        <label className="block space-y-3">
          <span className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            Access Code
            {mode === "login" ? <span className="normal-case tracking-normal text-[0.68rem] text-brand-500">JWT secured</span> : null}
          </span>
          <span className="relative block">
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimum 8 characters, 1 number"
              className="h-16 w-full rounded-lg border border-brand-200/70 bg-white/74 px-5 pr-12 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-200/60 dark:border-white/10 dark:bg-[#070b16] dark:text-white dark:placeholder:text-slate-600 dark:focus:ring-brand-500/20"
              required
            />
            <LockKeyhole className="absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          </span>
        </label>
      </div>

      {error ? (
        <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      <Button type="submit" className="mt-9 h-16 w-full rounded-lg bg-gradient-to-r from-brand-300 to-brand-600 text-sm font-extrabold uppercase tracking-[0.26em] text-white shadow-glow hover:from-brand-200 hover:to-brand-500" disabled={isSubmitting}>
        {isSubmitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
        {mode === "login" ? "Enter Library" : "Create Library"}
        {!isSubmitting ? <ArrowRight className="ml-3 h-5 w-5" /> : null}
      </Button>

      <p className="mt-7 text-center text-sm text-slate-500 dark:text-slate-400">
        {mode === "login" ? "Don’t have an account?" : "Already have an account?"}{" "}
        <button
          type="button"
          onClick={onToggleMode}
          className="font-medium text-brand-600 transition hover:text-brand-700 dark:text-brand-300 dark:hover:text-brand-200"
        >
          {mode === "login" ? "Register" : "Sign In"}
        </button>
      </p>
    </form>
  );
}
