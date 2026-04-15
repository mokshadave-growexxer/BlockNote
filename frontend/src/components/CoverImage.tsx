import { useState } from "react";
import { ImageIcon, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const PRESET_COVERS = [
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&q=80",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80",
  "https://images.unsplash.com/photo-1475274047050-1d0c0975c63e?w=1200&q=80",
  "https://images.unsplash.com/photo-1490750967868-88df5691cc3e?w=1200&q=80",
  "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1200&q=80",
];

interface CoverImageProps {
  value: string | null;
  onChange: (url: string | null) => void;
}

export function CoverImagePicker({ value, onChange }: CoverImageProps) {
  const [open, setOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState("");

  const handleUrlApply = () => {
    if (!urlInput.trim()) return;
    try {
      new URL(urlInput.trim());
      onChange(urlInput.trim());
      setUrlInput("");
      setUrlError("");
      setOpen(false);
    } catch {
      setUrlError("Please enter a valid URL.");
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:border-brand-400 hover:text-brand-500 dark:border-slate-700 dark:text-slate-400"
        title="Set cover image"
      >
        <ImageIcon className="h-3.5 w-3.5" />
        {value ? "Change Cover" : "Add Cover"}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-10 z-50 w-80 rounded-2xl border border-brand-100 bg-white p-4 shadow-xl dark:border-brand-900 dark:bg-[#0f0f1a]"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Cover Image</span>
                {value && (
                  <button
                    onClick={() => { onChange(null); setOpen(false); }}
                    className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-500"
                  >
                    <X className="h-3 w-3" /> Remove
                  </button>
                )}
              </div>

              {/* Preset covers */}
              <div className="mb-3 grid grid-cols-3 gap-1.5">
                {PRESET_COVERS.map((url) => (
                  <button
                    key={url}
                    onClick={() => { onChange(url); setOpen(false); }}
                    className={`relative h-14 overflow-hidden rounded-lg border-2 transition ${
                      value === url ? "border-brand-500" : "border-transparent hover:border-brand-300"
                    }`}
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    {value === url && (
                      <div className="absolute inset-0 flex items-center justify-center bg-brand-500/30">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* URL input */}
              <div className="space-y-1">
                <p className="text-xs text-slate-400">Or paste an image URL:</p>
                <div className="flex gap-1">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => { setUrlInput(e.target.value); setUrlError(""); }}
                    placeholder="https://..."
                    className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    onKeyDown={(e) => e.key === "Enter" && handleUrlApply()}
                  />
                  <button
                    onClick={handleUrlApply}
                    className="rounded-lg bg-brand-500 px-2.5 py-1.5 text-xs text-white hover:bg-brand-600"
                  >
                    Add
                  </button>
                </div>
                {urlError && <p className="text-xs text-rose-400">{urlError}</p>}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
