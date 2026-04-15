import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAIStore } from "../store/ai-store";
import { processAI } from "../api/ai";

const ACTION_LABELS = {
  grammar: "Grammar Check",
  paraphrase: "Paraphrase",
  summary: "Summarize",
};

const ACTION_DESCRIPTIONS = {
  grammar: "Corrects grammar while preserving meaning.",
  paraphrase: "Rewrites the text in a fresh way.",
  summary: "Produces a concise summary (read-only).",
};

interface AIModalProps {
  onApply?: (text: string) => void;
}

export function AIModal({ onApply }: AIModalProps) {
  const { isOpen, action, inputText, result, isLoading, error, closeModal, setResult, setLoading, setError } =
    useAIStore();

  const runAI = useCallback(async () => {
    if (!action || !inputText.trim()) return;
    setLoading(true);
    setError(null);
    setResult("");
    try {
      const text = await processAI(action, inputText);
      setResult(text);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "AI request failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [action, inputText, setLoading, setError, setResult]);

  // Auto-run when modal opens
  useEffect(() => {
    if (isOpen && action && inputText) {
      runAI();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleApply = () => {
    if (result && onApply) {
      onApply(result);
      closeModal();
    }
  };

  const canApply = action === "grammar" || action === "paraphrase";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          />
          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative w-full max-w-2xl rounded-2xl border border-brand-200 bg-white shadow-2xl dark:border-brand-800 dark:bg-[#0f0f1a]"
              initial={{ scale: 0.93, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.93, y: 20 }}
              transition={{ type: "spring", damping: 22, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-brand-100 px-6 py-4 dark:border-brand-900/50">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-900/50">
                  <Sparkles className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                    ✨ AI Assist — {action ? ACTION_LABELS[action] : ""}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {action ? ACTION_DESCRIPTIONS[action] : ""}
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="space-y-4 p-6">
                {/* Original text */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                    Original Text
                  </label>
                  <div className="max-h-32 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
                    {inputText || <span className="text-slate-400 italic">No text selected</span>}
                  </div>
                </div>

                {/* Result */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                    AI Result
                  </label>
                  <div className="min-h-[100px] max-h-48 overflow-y-auto rounded-xl border border-brand-200 bg-brand-50/30 px-3 py-2.5 text-sm dark:border-brand-800 dark:bg-brand-950/20">
                    {isLoading && (
                      <div className="flex items-center gap-2 text-brand-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Processing with AI…</span>
                      </div>
                    )}
                    {error && !isLoading && (
                      <div className="flex items-start gap-2 text-rose-500">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}
                    {result && !isLoading && (
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{result}</p>
                      </div>
                    )}
                    {!isLoading && !error && !result && (
                      <span className="text-slate-400 italic text-xs">Results will appear here…</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-brand-100 px-6 py-4 dark:border-brand-900/50">
                <button
                  onClick={runAI}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 rounded-lg border border-brand-300 px-3 py-1.5 text-sm text-brand-600 hover:bg-brand-50 disabled:opacity-50 dark:border-brand-700 dark:text-brand-400 dark:hover:bg-brand-900/30"
                >
                  {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Retry
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={closeModal}
                    className="rounded-lg px-4 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {canApply ? "Discard" : "Close"}
                  </button>
                  {canApply && (
                    <button
                      onClick={handleApply}
                      disabled={!result || isLoading}
                      className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-1.5 text-sm text-white hover:bg-brand-600 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Apply
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
