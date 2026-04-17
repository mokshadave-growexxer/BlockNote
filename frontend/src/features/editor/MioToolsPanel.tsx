import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Send,
  Wand2,
} from "lucide-react";
import { processAI } from "../../api/ai";
import type { AIAction } from "../../store/ai-store";

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

interface MioToolsPanelProps {
  onApply: (text: string) => void;
}

export function MioToolsPanel({ onApply }: MioToolsPanelProps) {
  const [toolPrompt, setToolPrompt] = useState("");
  const [activeAction, setActiveAction] = useState<AIAction>("grammar");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState("");

  const trimmedToolPrompt = toolPrompt.trim();
  const canApply = activeAction === "grammar" || activeAction === "paraphrase";

  const toolStats = useMemo(() => {
    const words = trimmedToolPrompt ? trimmedToolPrompt.split(/\s+/).length : 0;
    return { words, characters: toolPrompt.length };
  }, [toolPrompt.length, trimmedToolPrompt]);

  const runTool = useCallback(async (action: AIAction) => {
    if (!trimmedToolPrompt) return;
    
    setActiveAction(action);
    setIsLoading(true);
    setError(null);
    setResult("");
    
    try {
      const text = await processAI(action, trimmedToolPrompt);
      setResult(text);
    } catch (err: any) {
      const data = err?.response?.data;
      setError(data?.details ?? data?.message ?? "Mio AI request failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [trimmedToolPrompt]);

  return (
    <aside className="w-full shrink-0 order-last xl:order-none border-b border-brand-200/50 bg-white/62 backdrop-blur-2xl dark:border-white/10 dark:bg-[#0c1020]/76 xl:h-full xl:w-[360px] xl:border-r xl:border-b-0 xl:overflow-hidden">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b border-brand-100/80 px-7 py-6 dark:border-white/10">
          <div className="flex items-center gap-3">
            <Wand2 className="h-5 w-5 text-brand-500" />
            <h2 className="font-serif text-2xl italic text-slate-950 dark:text-white">Mio Tools</h2>
          </div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.28em] text-slate-400">
            Improve or transform your text
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-7 py-6 pb-12">
          {/* Text Input Section */}
          <section>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Text to refine
              </span>
              <textarea
                value={toolPrompt}
                onChange={(event) => {
                  setToolPrompt(event.target.value);
                  setResult("");
                  setError(null);
                }}
                placeholder="Paste or write text to refine with Mio..."
                className="mt-3 min-h-24 w-full resize-none rounded-lg border border-brand-200/70 bg-white/80 px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-200/60 dark:border-white/10 dark:bg-[#080b14] dark:text-slate-100 dark:focus:ring-brand-500/20"
              />
            </label>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
              <span>{toolStats.words} words</span>
              <span>{toolStats.characters} characters</span>
            </div>
          </section>

          {/* AI Tools Buttons */}
          <section className="mt-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Choose a tool
            </p>
            
            <div className="mt-4 grid gap-3">
              {(["grammar", "paraphrase", "summary"] as AIAction[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => runTool(item)}
                  disabled={!trimmedToolPrompt || isLoading}
                  className={`rounded-lg border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    activeAction === item && (isLoading || result || error)
                      ? "border-brand-300 bg-brand-100/70 text-brand-900 dark:border-brand-300/40 dark:bg-brand-400/10 dark:text-brand-100"
                      : "border-brand-200/70 bg-white/64 text-slate-700 hover:border-brand-300 hover:bg-brand-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.07]"
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-bold">
                    <Wand2 className="h-4 w-4" />
                    {ACTION_LABELS[item]}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {ACTION_HELP[item]}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Tool Output Section */}
          <section className="mt-6 rounded-lg border border-brand-200/70 bg-white/64 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Result
            </p>
            <div className="mt-4 min-h-32 text-sm leading-6 text-slate-700 dark:text-slate-200">
              {isLoading ? (
                <div className="flex items-center gap-2 text-brand-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Refining with Mio...
                </div>
              ) : error ? (
                <div className="flex items-start gap-2 text-rose-500">
                  <AlertCircle className="mt-1 h-4 w-4 shrink-0" />
                  <span className="text-xs">{error}</span>
                </div>
              ) : result ? (
                <motion.div 
                  initial={{ opacity: 0, y: 8 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="space-y-4"
                >
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
                    <p className="whitespace-pre-wrap text-xs">{result}</p>
                  </div>
                  {canApply && (
                    <button
                      type="button"
                      onClick={() => onApply(result)}
                      className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-300 to-brand-600 px-3 py-2 text-xs font-bold text-white shadow-glow hover:from-brand-400 hover:to-brand-700"
                    >
                      Apply to Document
                      <Send className="h-3 w-3" />
                    </button>
                  )}
                  {!canApply && (
                    <p className="text-xs text-slate-400">
                      ℹ️ Summaries are displayed here and cannot be applied to your document.
                    </p>
                  )}
                </motion.div>
              ) : (
                <p className="text-slate-400 text-xs">
                  Select a tool and enter text to get started.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </aside>
  );
}
