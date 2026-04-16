import { useState, useRef, useEffect } from "react";
import { Sparkles, CheckCircle2, AlignLeft, GitBranch, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { AIAction } from "../../store/ai-store";

interface AIToolbarProps {
  documentText: string;
  onOpenAI: (action: AIAction, text: string) => void;
}

const AI_ACTIONS: { action: AIAction; label: string; icon: React.ReactNode; description: string }[] = [
  {
    action: "grammar",
    label: "Grammar Check",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    description: "Fix grammar & spelling",
  },
  {
    action: "paraphrase",
    label: "Paraphrase",
    icon: <GitBranch className="h-3.5 w-3.5" />,
    description: "Rewrite in different words",
  },
  {
    action: "summary",
    label: "Summarize",
    icon: <AlignLeft className="h-3.5 w-3.5" />,
    description: "Condense to key points",
  },
];

export function AIToolbar({ documentText, onOpenAI }: AIToolbarProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleAction = (action: AIAction) => {
    const text = documentText.trim();
    onOpenAI(action, text || "Please add some text to the editor first.");
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative w-full">
      <div className="relative">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-[calc(100%+0.5rem)] z-20 w-full min-w-[240px] max-w-[280px] rounded-lg border border-brand-200 bg-white shadow-xl dark:border-brand-800 dark:bg-[#0f0f1a]"
            >
              <div className="border-b border-brand-100 px-3 py-2 dark:border-brand-900">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  ✨ Mio AI
                </p>
              </div>
              <div className="p-1">
                {AI_ACTIONS.map(({ action, label, icon, description }) => (
                  <button
                    key={action}
                    onClick={() => handleAction(action)}
                    className="flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition hover:bg-brand-50 dark:hover:bg-brand-900/30"
                  >
                    <span className="mt-0.5 text-brand-500 dark:text-brand-400">{icon}</span>
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => setOpen((v) => !v)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          className={`flex w-full items-center justify-between gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium shadow-md transition ${
            open
              ? "border-brand-400 bg-brand-500 text-white shadow-brand-200 dark:shadow-brand-900/40"
              : "border-brand-300 bg-white text-brand-600 hover:bg-brand-50 dark:border-brand-700 dark:bg-[#0f0f1a] dark:text-brand-400 dark:hover:bg-brand-900/30"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4" />
            Mio AI
          </span>
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        </motion.button>
      </div>
    </div>
  );
}
