import { motion } from "framer-motion";
import type { Template } from "../../constants/templates";

interface TemplateCardProps {
  template: Template;
  onSelect: (template: Template) => void;
  isLoading: boolean;
  index: number;
}

export function TemplateCard({ template, onSelect, isLoading, index }: TemplateCardProps) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: index * 0.04 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(template)}
      disabled={isLoading}
      aria-label={`Use template: ${template.name}`}
      className={[
        "group relative flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all",
        "bg-white/80 hover:bg-brand-50/60 dark:bg-surface/70 dark:hover:bg-brand-950/40",
        "border-brand-100 hover:border-brand-300 dark:border-brand-900/60 dark:hover:border-brand-700",
        "shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
        "disabled:cursor-not-allowed disabled:opacity-50",
      ].join(" ")}
    >
      {/* Icon */}
      <span
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100/70 text-2xl dark:bg-brand-900/40"
        aria-hidden="true"
      >
        {template.icon}
      </span>

      {/* Text */}
      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-800 group-hover:text-brand-700 dark:text-slate-100 dark:group-hover:text-brand-300">
          {template.name}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {template.description}
        </p>
      </div>

      {/* Block count badge */}
      <span className="absolute right-3 top-3 rounded-full bg-brand-100/80 px-2 py-0.5 text-[10px] font-medium text-brand-600 dark:bg-brand-900/60 dark:text-brand-400">
        {template.blocks.length} block{template.blocks.length !== 1 ? "s" : ""}
      </span>
    </motion.button>
  );
}
