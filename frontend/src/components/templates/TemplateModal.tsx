import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, AlertCircle } from "lucide-react";
import { TEMPLATES } from "../../constants/templates";
import type { Template } from "../../constants/templates";
import { TemplateCard } from "./TemplateCard";
import { useTemplateStore } from "../../store/template-store";
import { useCreateFromTemplate } from "../../hooks/use-create-from-template";

export function TemplateModal() {
  const isOpen = useTemplateStore((s) => s.isOpen);
  const closeModal = useTemplateStore((s) => s.closeModal);
  const { create, isLoading, error } = useCreateFromTemplate();
  const overlayRef = useRef<HTMLDivElement>(null);
  const firstCardRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !isLoading) closeModal();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, isLoading, closeModal]);

  // Focus trap — focus first card when modal opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to let animation start
      const t = setTimeout(() => {
        const el = document.getElementById("template-modal-close");
        el?.focus();
      }, 50);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  function handleSelect(template: Template) {
    if (!isLoading) create(template);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            ref={overlayRef}
            onClick={() => { if (!isLoading) closeModal(); }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            key="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Choose a document template"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={[
              "fixed inset-x-4 top-[50%] z-50 mx-auto max-h-[90vh] w-full max-w-3xl",
              "-translate-y-1/2 overflow-hidden",
              "rounded-3xl border border-brand-100 bg-white shadow-[0_32px_80px_rgba(91,33,182,0.22)]",
              "dark:border-brand-900/60 dark:bg-ink dark:shadow-[0_32px_80px_rgba(91,33,182,0.3)]",
              "flex flex-col",
            ].join(" ")}
          >
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between border-b border-brand-100 px-6 py-5 dark:border-brand-900/50">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-brand-500">
                  Templates
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                  Choose a template
                </h2>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  Select a template to start writing instantly.
                </p>
              </div>
              <button
                id="template-modal-close"
                type="button"
                onClick={() => { if (!isLoading) closeModal(); }}
                disabled={isLoading}
                aria-label="Close template picker"
                className="mt-1 flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-brand-50 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:opacity-40 dark:hover:bg-brand-900/30 dark:hover:text-brand-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body — scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {/* Error state */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-400"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </motion.div>
              )}

              {/* Loading overlay */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mb-4 flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300"
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating your document…
                </motion.div>
              )}

              {/* Template grid */}
              <div
                ref={firstCardRef as React.RefObject<HTMLDivElement>}
                className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
              >
                {TEMPLATES.map((template, index) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onSelect={handleSelect}
                    isLoading={isLoading}
                    index={index}
                  />
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-brand-100 px-6 py-4 dark:border-brand-900/50">
              <p className="text-center text-xs text-slate-400 dark:text-slate-500">
                Selecting a template creates a new document and opens it in the editor.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
