import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, Loader2, AlertCircle, CheckCircle2, Wand2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { AIAction } from "../../store/ai-store";
import { processAI } from "../../api/ai";

interface MioSidebarProps {
  documentText: string;
  onApply: (text: string) => void;
}

const AI_TOOLS: { action: AIAction; label: string; icon: React.ReactNode }[] = [
  {
    action: "grammar",
    label: "Grammar Check",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  {
    action: "paraphrase",
    label: "Paraphrase",
    icon: <Wand2 className="h-3.5 w-3.5" />,
  },
  {
    action: "summary",
    label: "Summary",
    icon: <Sparkles className="h-3.5 w-3.5" />,
  },
];

export function MioSidebar({ documentText, onApply }: MioSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<AIAction | null>(null);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const canApply = activeAction === "grammar" || activeAction === "paraphrase";

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const runTool = useCallback(async (tool: AIAction) => {
    const textToProcess = inputText.trim() || documentText.trim();
    if (!textToProcess) {
      setError("Please add text to refine or use document text.");
      return;
    }

    setActiveAction(tool);
    setIsLoading(true);
    setError(null);
    setResult("");

    try {
      const text = await processAI(tool, textToProcess);
      setResult(text);
    } catch (err: any) {
      const data = err?.response?.data;
      setError(data?.details ?? data?.message ?? "Mio AI request failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [inputText, documentText]);

  return (
    <div ref={ref} className="relative w-full">
      {/* Header Button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border px-4 py-3 text-sm font-semibold transition ${
          isOpen
            ? "border-brand-400 bg-brand-500 text-white shadow-md"
            : "border-brand-300 bg-white text-brand-600 hover:bg-brand-50 dark:border-brand-700 dark:bg-[#0f0f1a] dark:text-brand-400 dark:hover:bg-brand-900/30"
        }`}
      >
        <span className="flex items-center gap-2">
          <Wand2 className="h-4 w-4" />
          Mio Tools
        </span>
        <span className={`text-xs transition-transform ${isOpen ? "rotate-180" : ""}`}>▼</span>
      </button>

      {/* Dropdown Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 rounded-lg border border-brand-200 bg-white shadow-xl dark:border-brand-800 dark:bg-[#0f0f1a]"
          >
            <div className="p-4 space-y-4">
              {/* Text Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                  Text to refine
                </label>
                <textarea
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    setResult("");
                    setError(null);
                  }}
                  placeholder={
                    documentText
                      ? "Leave empty to use document text..."
                      : "Enter text to refine..."
                  }
                  className="w-full text-xs border border-brand-200/70 rounded-lg bg-white px-3 py-2 leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-200/50 dark:border-white/10 dark:bg-[#080b14] dark:text-slate-100 dark:focus:ring-brand-500/20 resize-none min-h-20"
                />
              </div>

              {/* Tool Buttons */}
              <div className="space-y-2">
                {AI_TOOLS.map(({ action, label, icon }) => (
                  <button
                    key={action}
                    onClick={() => runTool(action)}
                    disabled={isLoading}
                    className={`flex items-center gap-2 w-full rounded-lg px-3 py-2 text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${
                      activeAction === action && (isLoading || result || error)
                        ? "border-brand-300 bg-brand-100 text-brand-900 dark:border-brand-300/40 dark:bg-brand-400/10 dark:text-brand-100"
                        : "border border-brand-200/70 bg-white/64 text-slate-700 hover:bg-brand-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.07]"
                    }`}
                  >
                    <span>{icon}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2 dark:border-rose-500/30 dark:bg-rose-500/10"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-600 dark:text-rose-200 mt-0.5" />
                  <span className="text-xs text-rose-600 dark:text-rose-200">{error}</span>
                </motion.div>
              )}

              {/* Loading State */}
              {isLoading && (
                <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 text-xs">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Refining with Mio...
                </div>
              )}

              {/* Result */}
              {result && !isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                >
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-200 mt-0.5" />
                    <p className="text-xs leading-4 text-slate-700 dark:text-slate-200 whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {result}
                    </p>
                  </div>

                  {canApply && (
                    <button
                      onClick={() => {
                        onApply(result);
                        setInputText("");
                        setResult("");
                        setActiveAction(null);
                      }}
                      className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:from-emerald-600 hover:to-emerald-700 transition"
                    >
                      Apply to Document
                    </button>
                  )}
                  {!canApply && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      ℹ️ Summaries are displayed and cannot be applied directly.
                    </p>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
