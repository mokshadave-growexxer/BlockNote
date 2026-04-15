import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smile, X } from "lucide-react";

const EMOJI_CATEGORIES = [
  { label: "Common", emojis: ["📝","📄","📋","📌","🔖","⭐","🎯","🚀","💡","🔥","✅","❤️","🎉","🌟","💎","🎨","📊","🗂️","🏆","🌈"] },
  { label: "Work", emojis: ["💼","📎","✂️","🔧","⚙️","🖥️","💻","📱","🖨️","📡","🔬","🔭","📐","📏","🗃️","📑","🗒️","📆","🗓️","⏰"] },
  { label: "Nature", emojis: ["🌿","🌸","🌺","🍀","🌊","⛰️","🌙","☀️","🌤️","❄️","🌻","🍁","🌴","🦋","🐝","🌵","🍃","🌾","🦁","🐬"] },
  { label: "Food", emojis: ["☕","🍎","🍕","🍔","🌮","🍣","🍜","🎂","🍰","🧁","🍩","🍪","🥗","🥤","🍵","🧋","🍫","🍓","🥑","🍋"] },
];

interface EmojiPickerProps {
  value: string | null;
  onChange: (emoji: string | null) => void;
}

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-200 bg-white text-xl shadow-sm hover:border-brand-400 hover:bg-brand-50 dark:border-brand-800 dark:bg-[#0f0f1a] dark:hover:bg-brand-900/30"
        title="Set emoji icon"
      >
        {value ? (
          <span>{value}</span>
        ) : (
          <Smile className="h-5 w-5 text-slate-400" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-12 z-50 w-72 rounded-2xl border border-brand-100 bg-white shadow-xl dark:border-brand-900 dark:bg-[#0f0f1a]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-brand-100 px-3 py-2 dark:border-brand-900">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Choose an icon</span>
              <div className="flex gap-1">
                {value && (
                  <button
                    onClick={() => { onChange(null); setOpen(false); }}
                    className="rounded px-2 py-0.5 text-xs text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  >
                    Remove
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="rounded p-0.5 text-slate-400 hover:text-slate-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Category tabs */}
            <div className="flex gap-1 border-b border-brand-100 px-3 py-1.5 dark:border-brand-900">
              {EMOJI_CATEGORIES.map((cat, i) => (
                <button
                  key={cat.label}
                  onClick={() => setActiveCategory(i)}
                  className={`rounded px-2 py-0.5 text-xs transition ${
                    activeCategory === i
                      ? "bg-brand-100 text-brand-600 dark:bg-brand-900/50 dark:text-brand-300"
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Emoji grid */}
            <div className="grid grid-cols-10 gap-0.5 p-2">
              {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => { onChange(emoji); setOpen(false); }}
                  className={`flex h-7 w-7 items-center justify-center rounded text-lg transition hover:bg-brand-50 dark:hover:bg-brand-900/30 ${
                    value === emoji ? "bg-brand-100 dark:bg-brand-900/50" : ""
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
