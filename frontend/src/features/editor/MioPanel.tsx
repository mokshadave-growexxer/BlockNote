import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Send,
  Sparkles,
  Wand2,
} from "lucide-react";
import { generateMioContent, processAI } from "../../api/ai";
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

interface MioPanelProps {
  documentContext: string;
  onApply: (text: string) => void;
  onInsertMarkdown: (markdown: string) => void;
}

export function MioPanel({ documentContext, onApply, onInsertMarkdown }: MioPanelProps) {
  const { isOpen, action, inputText, result, isLoading, error, openModal, setResult, setLoading, setError } =
    useAIStore();
  const [prompt, setPrompt] = useState("");
  const [toolPrompt, setToolPrompt] = useState(inputText);
  const [mioLoading, setMioLoading] = useState(false);
  const [mioError, setMioError] = useState<string | null>(null);
  const [mioResult, setMioResult] = useState("");
  const activeAction = action ?? "grammar";

  useEffect(() => {
    if (isOpen) setToolPrompt(inputText);
  }, [inputText, isOpen]);

  const trimmedPrompt = prompt.trim();
  const trimmedToolPrompt = toolPrompt.trim();
  const contextPreview = documentContext.trim();
  const canApply = activeAction === "grammar" || activeAction === "paraphrase";

  const runMio = useCallback(async () => {
    if (!trimmedPrompt || mioLoading) return;
    setMioLoading(true);
    setMioError(null);
    setMioResult("");
    try {
      const markdown = await generateMioContent(trimmedPrompt, contextPreview || undefined);
      if (!markdown.trim()) {
        setMioError("Mio AI returned an empty response. Try a little more detail.");
        return;
      }
      setMioResult(markdown);
      onInsertMarkdown(markdown);
      setPrompt("");
    } catch (err: any) {
      const data = err?.response?.data;
      setMioError(data?.details ?? data?.message ?? "Mio AI request failed. Please try again.");
    } finally {
      setMioLoading(false);
    }
  }, [contextPreview, mioLoading, onInsertMarkdown, trimmedPrompt]);

  const runTool = useCallback(async (nextAction: AIAction = activeAction) => {
    if (!trimmedToolPrompt) return;
    openModal(nextAction, trimmedToolPrompt);
    setLoading(true);
    setError(null);
    setResult("");
    try {
      const text = await processAI(nextAction, trimmedToolPrompt);
      setResult(text);
    } catch (err: any) {
      const data = err?.response?.data;
      setError(data?.details ?? data?.message ?? "Mio AI request failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [activeAction, openModal, setError, setLoading, setResult, trimmedToolPrompt]);

  const toolStats = useMemo(() => {
    const words = trimmedToolPrompt ? trimmedToolPrompt.split(/\s+/).length : 0;
    return { words, characters: toolPrompt.length };
  }, [toolPrompt.length, trimmedToolPrompt]);

  return (
    <aside className="w-full shrink-0 border-t border-brand-200/50 bg-white/62 backdrop-blur-2xl dark:border-white/10 dark:bg-[#0c1020]/76 xl:h-full xl:w-[360px] xl:overflow-hidden xl:border-l xl:border-t-0">
      <div className="flex h-full flex-col">
        <div className="border-b border-brand-100/80 px-7 py-6 dark:border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-brand-500" />
              <h2 className="font-serif text-2xl italic text-slate-950 dark:text-white">Mio AI</h2>
            </div>
            <span className="rounded-full bg-brand-100 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-brand-700 dark:bg-white/10 dark:text-brand-100">
              Active
            </span>
          </div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.28em] text-slate-400">
            Ask Mio to write for you
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-7 py-6 pb-12">
          <section>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                Prompt
              </span>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                    event.preventDefault();
                    runMio();
                  }
                }}
                placeholder="Create a to-do list for my exam prep..."
                className="mt-3 min-h-32 w-full resize-none rounded-lg border border-brand-200/70 bg-white/80 px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-200/60 dark:border-white/10 dark:bg-[#080b14] dark:text-slate-100 dark:focus:ring-brand-500/20"
              />
            </label>

            {mioError && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{mioError}</span>
              </div>
            )}

            {mioResult && !mioError && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Inserted into your document.</span>
              </div>
            )}

            <button
              type="button"
              onClick={runMio}
              disabled={!trimmedPrompt || mioLoading}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand-300 to-brand-600 text-sm font-extrabold uppercase tracking-[0.18em] text-white shadow-glow transition hover:from-brand-400 hover:to-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mioLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {mioLoading ? "Generating..." : "Generate"}
            </button>
          </section>

          <section className="mt-7 rounded-lg border border-brand-200/70 bg-white/64 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-brand-500" />
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Document Context
              </p>
            </div>
            <p className="mt-3 max-h-28 overflow-y-auto whitespace-pre-wrap text-xs leading-5 text-slate-500 dark:text-slate-400">
              {contextPreview || "No document text yet. Mio can still draft from your prompt."}
            </p>
          </section>

          <section className="mt-7 border-t border-brand-100/80 pt-6 dark:border-white/10">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              AI Tools
            </p>

            <label className="mt-4 block">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Text to refine
              </span>
              <textarea
                value={toolPrompt}
                onChange={(event) => setToolPrompt(event.target.value)}
                placeholder="Use the document text or write text here..."
                className="mt-3 min-h-28 w-full resize-none rounded-lg border border-brand-200/70 bg-white/80 px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-200/60 dark:border-white/10 dark:bg-[#080b14] dark:text-slate-100 dark:focus:ring-brand-500/20"
              />
            </label>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
              <span>{toolStats.words} words</span>
              <span>{toolStats.characters} characters</span>
            </div>

            <div className="mt-5 grid gap-3">
              {(["grammar", "paraphrase", "summary"] as AIAction[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => runTool(item)}
                  disabled={!trimmedToolPrompt || isLoading}
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
                Tool Output
              </p>
              <div className="mt-4 min-h-28 text-sm leading-6 text-slate-700 dark:text-slate-200">
                {isLoading ? (
                  <div className="flex items-center gap-2 text-brand-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Refining with Mio AI...
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
                  <p className="text-slate-400">Choose a tool to generate a result.</p>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </aside>
  );
}
