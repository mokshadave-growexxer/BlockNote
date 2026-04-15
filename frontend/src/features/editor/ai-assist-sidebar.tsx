import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Loader2, Send, Sparkles, Wand2 } from "lucide-react";
import { processAI } from "../../api/ai";
import type { AIAction } from "../../store/ai-store";
import { useAIStore } from "../../store/ai-store";

const ACTION_LABELS: Record<AIAction, string> = {
  grammar: "Grammar Check",
  paraphrase: "Paraphrase",
  summary: "Summary"
};

const ACTION_HELP: Record<AIAction, string> = {
  grammar: "Refine grammar while preserving your voice.",
  paraphrase: "Rewrite the document with fresh phrasing.",
  summary: "Condense the document into a short read-only brief."
};

interface AIAssistSidebarProps {
  onApply: (text: string) => void;
}

export function AIAssistSidebar({ onApply }: AIAssistSidebarProps) {
  const { isOpen, action, inputText, result, isLoading, error, openModal, setResult, setLoading, setError } =
    useAIStore();
  const [prompt, setPrompt] = useState(inputText);
  const activeAction = action ?? "grammar";

  useEffect(() => {
    if (isOpen) setPrompt(inputText);
  }, [inputText, isOpen]);

  const canApply = activeAction === "grammar" || activeAction === "paraphrase";
  const hasPrompt = prompt.trim().length > 0;

  const runAI = useCallback(async (nextAction: AIAction = activeAction) => {
    if (!prompt.trim()) return;
    openModal(nextAction, prompt.trim());
    setLoading(true);
    setError(null);
    setResult("");
    try {
      const text = await processAI(nextAction, prompt.trim());
      setResult(text);
    } catch (err: any) {
      const data = err?.response?.data;
      setError(data?.details ?? data?.message ?? "AI request failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [activeAction, openModal, prompt, setError, setLoading, setResult]);

  const stats = useMemo(() => {
    const words = prompt.trim() ? prompt.trim().split(/\s+/).length : 0;
    return { words, characters: prompt.length };
  }, [prompt]);

  return (
    <aside className="sticky top-[89px] hidden h-[calc(100vh-89px)] w-[360px] shrink-0 border-l border-brand-200/50 bg-white/62 backdrop-blur-2xl dark:border-white/10 dark:bg-[#0c1020]/76 xl:block">
      <div className="flex h-full flex-col">
        <div className="border-b border-brand-100/80 px-7 py-6 dark:border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-brand-500" />
              <h2 className="font-serif text-2xl italic text-slate-950 dark:text-white">AI Assist</h2>
            </div>
            <span className="rounded-full bg-brand-100 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-brand-700 dark:bg-white/10 dark:text-brand-100">
              Active
            </span>
          </div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.28em] text-slate-400">Content Refinement</p>
        </div>

        <div className="flex-1 overflow-y-auto px-7 py-6">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Document text
            </span>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Use the document text or write text here..."
              className="mt-3 min-h-36 w-full resize-none rounded-lg border border-brand-200/70 bg-white/80 px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-200/60 dark:border-white/10 dark:bg-[#080b14] dark:text-slate-100 dark:focus:ring-brand-500/20"
            />
          </label>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
            <span>{stats.words} words</span>
            <span>{stats.characters} characters</span>
          </div>

          <div className="mt-6 grid gap-3">
            {(["grammar", "paraphrase", "summary"] as AIAction[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => runAI(item)}
                disabled={!hasPrompt || isLoading}
                className={`rounded-lg border px-4 py-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  activeAction === item
                    ? "border-brand-300 bg-brand-100/70 text-brand-900 dark:border-brand-300/40 dark:bg-brand-400/10 dark:text-brand-100"
                    : "border-brand-200/70 bg-white/64 text-slate-700 hover:border-brand-300 hover:bg-brand-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.07]"
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-bold">
                  <Wand2 className="h-4 w-4" />
                  {ACTION_LABELS[item]}
                </span>
                <span className="mt-2 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {ACTION_HELP[item]}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-7 rounded-lg border border-brand-200/70 bg-white/64 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Studio Output
            </p>
            <div className="mt-4 min-h-32 text-sm leading-6 text-slate-700 dark:text-slate-200">
              {isLoading ? (
                <div className="flex items-center gap-2 text-brand-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Refining with AI...
                </div>
              ) : error ? (
                <div className="flex items-start gap-2 text-rose-500">
                  <AlertCircle className="mt-1 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : result ? (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
                    <p className="whitespace-pre-wrap">{result}</p>
                  </div>
                  {canApply ? (
                    <button
                      type="button"
                      onClick={() => onApply(result)}
                      className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-300 to-brand-600 px-4 py-2 text-sm font-bold text-white shadow-glow"
                    >
                      Apply to Document
                      <Send className="h-4 w-4" />
                    </button>
                  ) : (
                    <p className="text-xs text-slate-400">Summaries are displayed here and are not applied automatically.</p>
                  )}
                </motion.div>
              ) : (
                <p className="text-slate-400">Choose an action to generate a result.</p>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-brand-100/80 p-7 dark:border-white/10">
          <button
            type="button"
            onClick={() => runAI(activeAction)}
            disabled={!hasPrompt || isLoading}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-[#080b14] text-sm font-extrabold uppercase tracking-[0.2em] text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-300 dark:text-[#080b14] dark:hover:bg-brand-200"
          >
            Send to AI
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
