import { useEffect, useRef } from "react";
import type { BlockType } from "./types";

interface SlashItem {
  type: BlockType;
  label: string;
  description: string;
  icon: string;
}

const SLASH_ITEMS: SlashItem[] = [
  { type: "paragraph", label: "Text", description: "Plain paragraph", icon: "¶" },
  { type: "heading_1", label: "Heading 1", description: "Large heading", icon: "H1" },
  { type: "heading_2", label: "Heading 2", description: "Medium heading", icon: "H2" },
  { type: "todo", label: "To-do", description: "Checkbox list item", icon: "☐" },
  { type: "code", label: "Code", description: "Monospace code block", icon: "</>" },
  { type: "divider", label: "Divider", description: "Horizontal rule", icon: "—" },
  { type: "image", label: "Image", description: "Embed image from URL", icon: "🖼" },
];

interface Props {
  filter: string;
  position: { top: number; left: number };
  onSelect: (type: BlockType) => void;
  onClose: () => void;
}

export function SlashMenu({ filter, position, onSelect, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const maxHeight = Math.min(320, Math.max(160, window.innerHeight - position.top - 12));
  const top = Math.min(position.top, window.innerHeight - maxHeight - 12);
  const left = Math.min(position.left, window.innerWidth - 236);
  const filtered = SLASH_ITEMS.filter(
    (item) =>
      filter === "" ||
      item.label.toLowerCase().includes(filter.toLowerCase()) ||
      item.type.toLowerCase().includes(filter.toLowerCase())
  );

  const selectedRef = useRef(0);

  function highlightItem() {
    if (!ref.current) return;
    const items = ref.current.querySelectorAll("[data-slash-item]");
    items.forEach((el, i) => {
      el.classList.toggle("bg-brand-100", i === selectedRef.current);
      el.classList.toggle("dark:bg-brand-900/40", i === selectedRef.current);
    });
  }

  useEffect(() => {
    selectedRef.current = 0;
    highlightItem();
  }, [filter]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (filtered.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        selectedRef.current = (selectedRef.current + 1) % filtered.length;
        highlightItem();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        selectedRef.current = (selectedRef.current - 1 + filtered.length) % filtered.length;
        highlightItem();
      } else if (e.key === "Enter") {
        e.preventDefault();
        onSelect(filtered[selectedRef.current]?.type ?? filtered[0].type);
      }
    }
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [filtered, onSelect, onClose]);

  if (filtered.length === 0) return null;

  return (
    <div
      ref={ref}
      style={{ top: Math.max(8, top), left: Math.max(8, left), maxHeight }}
      className="fixed z-50 min-w-[220px] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
    >
      {filtered.map((item, i) => (
        <button
          key={item.type}
          data-slash-item
          onMouseDown={(e) => { e.preventDefault(); onSelect(item.type); }}
          className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition hover:bg-brand-50 dark:hover:bg-brand-900/30 ${
            i === 0 ? "rounded-t-xl" : ""
          } ${i === filtered.length - 1 ? "rounded-b-xl" : ""}`}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold dark:border-slate-600 dark:bg-slate-800">
            {item.icon}
          </span>
          <div>
            <div className="font-medium text-slate-800 dark:text-slate-100">{item.label}</div>
            <div className="text-xs text-slate-400">{item.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
