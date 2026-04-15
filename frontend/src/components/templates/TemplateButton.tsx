import { LayoutTemplate } from "lucide-react";
import { useTemplateStore } from "../../store/template-store";

interface TemplateButtonProps {
  className?: string;
}

export function TemplateButton({ className }: TemplateButtonProps) {
  const openModal = useTemplateStore((s) => s.openModal);

  return (
    <button
      type="button"
      onClick={openModal}
      aria-label="Open template picker"
      className={[
        "inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition",
        "border-brand-200 bg-white text-brand-700 hover:bg-brand-50 hover:border-brand-400",
        "dark:border-brand-800 dark:bg-surface dark:text-brand-300 dark:hover:bg-brand-950/40 dark:hover:border-brand-600",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
        "shadow-sm",
        className ?? "",
      ].join(" ")}
    >
      <LayoutTemplate className="h-4 w-4" />
      Use Template
    </button>
  );
}
