import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Send,
  Sparkles,
} from "lucide-react";
import { generateMioContent } from "../../api/ai";

interface MioPanelProps {
  documentContext: string;
  onInsertMarkdown: (markdown: string) => void;
}

export function MioPanel({ documentContext, onInsertMarkdown }: MioPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [mioLoading, setMioLoading] = useState(false);
  const [mioError, setMioError] = useState<string | null>(null);
  const [mioResult, setMioResult] = useState("");

  const trimmedPrompt = prompt.trim();
  const contextPreview = documentContext.trim();

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

  return (
    <aside className="w-full shrink-0 border-t border-brand-200/50 bg-white/62 backdrop-blur-2xl dark:border-white/10 dark:bg-[#0c1020]/76 xl:h-full xl:w-[360px] xl:overflow-hidden xl:border-l xl:border-t-0">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b border-brand-100/80 px-7 py-6 dark:border-white/10">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-brand-500" />
            <h2 className="font-serif text-2xl italic text-slate-950 dark:text-white">Mio AI</h2>
          </div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.28em] text-slate-400">
            Ask Mio to write for you
          </p>
        </div>

        {/* Content Generation Section */}
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
              <motion.div 
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{mioError}</span>
              </motion.div>
            )}

            {mioResult && !mioError && (
              <motion.div 
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Content generated and inserted into your document.</span>
              </motion.div>
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

          {/* Document Context Section */}
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

          {/* Tip Section */}
          <section className="mt-6 rounded-lg border border-brand-200/50 bg-brand-50/40 p-4 dark:border-brand-400/20 dark:bg-brand-400/10">
            <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">
              💡 <strong>Tip:</strong> Use <strong>Mio Tools</strong> (left panel) to refine existing text with grammar check, paraphrase, and summary.
            </p>
          </section>
        </div>
      </div>
    </aside>
  );
}
