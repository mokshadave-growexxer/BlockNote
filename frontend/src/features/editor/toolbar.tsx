import { useState, useRef, useEffect } from "react";

interface ToolbarProps {
  onFormat: (command: string, value?: string) => void;
  visible: boolean;
  position: { top: number; left: number };
}

// Icon components
function BoldIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/></svg>;
}
function ItalicIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/></svg>;
}
function UnderlineIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z"/></svg>;
}
function StrikeIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M10 19h4v-3h-4v3zM5 4v3h6v3h2V7h6V4H5zM3 14h18v-2H3v2z"/></svg>;
}
function AlignLeftIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z"/></svg>;
}
function AlignCenterIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z"/></svg>;
}
function AlignRightIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z"/></svg>;
}
function AlignJustifyIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M3 21h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18V7H3v2zm0-6v2h18V3H3z"/></svg>;
}
function BulletListIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/></svg>;
}
function NumberedListIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/></svg>;
}
function IndentIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M3 21h18v-2H3v2zM3 8v8l4-4-4-4zm8 9h10v-2H11v2zM3 3v2h18V3H3zm8 6h10V7H11v2zm0 4h10v-2H11v2z"/></svg>;
}
function OutdentIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M11 17h10v-2H11v2zM3 12l4 4V8l-4 4zm0 9h18v-2H3v2zM3 3v2h18V3H3zm8 6h10V7H11v2zm0 4h10v-2H11v2z"/></svg>;
}

const FONT_SIZES = [
  { value: "12" },
  { value: "13" },
  { value: "14" },
  { value: "15" },
  { value: "16" },
  { value: "18" },
  { value: "20" },
  { value: "24" },
  { value: "28" },
  { value: "32" },
  { value: "36" },
];
const TEXT_COLORS = [
  { label: "Default", value: "" },
  { label: "Black", value: "#000000" },
  { label: "Dark Gray", value: "#374151" },
  { label: "Gray", value: "#6B7280" },
  { label: "Red", value: "#EF4444" },
  { label: "Orange", value: "#F97316" },
  { label: "Yellow", value: "#EAB308" },
  { label: "Green", value: "#22C55E" },
  { label: "Blue", value: "#3B82F6" },
  { label: "Purple", value: "#8B5CF6" },
  { label: "Pink", value: "#EC4899" },
];
const HIGHLIGHT_COLORS = [
  { label: "None", value: "" },
  { label: "Yellow", value: "#FEF08A" },
  { label: "Green", value: "#BBF7D0" },
  { label: "Blue", value: "#BFDBFE" },
  { label: "Pink", value: "#FBCFE8" },
  { label: "Orange", value: "#FED7AA" },
  { label: "Purple", value: "#E9D5FF" },
  { label: "Gray", value: "#E5E7EB" },
];

function Divider() {
  return <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-600" />;
}

interface ToolbarBtnProps {
  onClick: () => void;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}
function ToolbarBtn({ onClick, title, active, children }: ToolbarBtnProps) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded transition ${
        active
          ? "bg-brand-100 text-brand-700 dark:bg-brand-900/60 dark:text-brand-300"
          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

export function RichTextToolbar({ onFormat, visible, position }: ToolbarProps) {
  const [showFontSize, setShowFontSize] = useState(false);
  const [showTextColor, setShowTextColor] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);
  const [showFormat, setShowFormat] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) {
      setShowFontSize(false);
      setShowTextColor(false);
      setShowHighlight(false);
      setShowFormat(false);
    }
  }, [visible]);

  if (!visible) return null;
  const top = Math.min(Math.max(8, position.top), window.innerHeight - 96);
  const halfWidth = Math.min(260, Math.max(0, (window.innerWidth - 16) / 2));
  const left = Math.min(Math.max(8 + halfWidth, position.left), window.innerWidth - 8 - halfWidth);
  const dropdownPosition = top > window.innerHeight - 220 ? "bottom-8" : "top-8";

  return (
    <div
      ref={ref}
      style={{ top, left, maxWidth: "calc(100vw - 16px)", transform: "translateX(-50%)" }}
      className="fixed z-50 flex flex-wrap items-center gap-0.5 rounded-xl border border-slate-200 bg-white px-1.5 py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
      onMouseDown={(e) => e.preventDefault()}
    >
      <ToolbarBtn onClick={() => onFormat("bold")} title="Bold (Ctrl+B)"><BoldIcon /></ToolbarBtn>
      <ToolbarBtn onClick={() => onFormat("italic")} title="Italic (Ctrl+I)"><ItalicIcon /></ToolbarBtn>
      <ToolbarBtn onClick={() => onFormat("underline")} title="Underline (Ctrl+U)"><UnderlineIcon /></ToolbarBtn>
      <ToolbarBtn onClick={() => onFormat("strikeThrough")} title="Strikethrough"><StrikeIcon /></ToolbarBtn>

      <Divider />

      {/* Font size */}
      <div className="relative">
        <button
          onMouseDown={(e) => { e.preventDefault(); setShowFontSize(v => !v); setShowTextColor(false); setShowHighlight(false); setShowFormat(false); }}
          title="Font size"
          className="flex h-7 items-center gap-1 rounded px-1.5 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <span>Size</span>
          <svg viewBox="0 0 10 6" className="h-2 w-2 fill-current"><path d="M0 0l5 6 5-6z"/></svg>
        </button>
        {showFontSize && (
          <div className={`absolute left-0 z-10 max-h-52 w-16 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900 ${dropdownPosition}`}>
            {FONT_SIZES.map(({ value }) => (
              <button
                key={value}
                onMouseDown={(e) => { e.preventDefault(); onFormat("fontSize", value); setShowFontSize(false); }}
                className="block w-full px-3 py-1.5 text-left text-sm hover:bg-brand-50 dark:hover:bg-brand-900/30"
              >
                {value}px
              </button>
            ))}
          </div>
        )}
      </div>

      <Divider />

      {/* Text color */}
      <div className="relative">
        <button
          onMouseDown={(e) => { e.preventDefault(); setShowTextColor(v => !v); setShowFontSize(false); setShowHighlight(false); setShowFormat(false); }}
          title="Text color"
          className="flex h-7 items-center gap-1 rounded px-1.5 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <span className="font-bold underline decoration-2">A</span>
          <svg viewBox="0 0 10 6" className="h-2 w-2 fill-current"><path d="M0 0l5 6 5-6z"/></svg>
        </button>
        {showTextColor && (
          <div className={`absolute left-0 z-10 max-h-56 w-36 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900 ${dropdownPosition}`}>
            <div className="mb-1 text-xs font-medium text-slate-500">Text Color</div>
            <div className="flex flex-wrap gap-1">
              {TEXT_COLORS.map(c => (
                <button
                  key={c.value}
                  onMouseDown={(e) => { e.preventDefault(); onFormat("foreColor", c.value || "inherit"); setShowTextColor(false); }}
                  title={c.label}
                  className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 hover:scale-110 transition"
                  style={{ background: c.value || "transparent" }}
                >
                  {!c.value && <span className="text-xs text-slate-400">✕</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Highlight */}
      <div className="relative">
        <button
          onMouseDown={(e) => { e.preventDefault(); setShowHighlight(v => !v); setShowFontSize(false); setShowTextColor(false); setShowFormat(false); }}
          title="Highlight"
          className="flex h-7 items-center gap-1 rounded px-1.5 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <span style={{ background: "#FEF08A" }} className="px-0.5 font-bold">H</span>
          <svg viewBox="0 0 10 6" className="h-2 w-2 fill-current"><path d="M0 0l5 6 5-6z"/></svg>
        </button>
        {showHighlight && (
          <div className={`absolute left-0 z-10 max-h-56 w-36 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900 ${dropdownPosition}`}>
            <div className="mb-1 text-xs font-medium text-slate-500">Highlight</div>
            <div className="flex flex-wrap gap-1">
              {HIGHLIGHT_COLORS.map(c => (
                <button
                  key={c.label}
                  onMouseDown={(e) => { e.preventDefault(); onFormat("hiliteColor", c.value || "transparent"); setShowHighlight(false); }}
                  title={c.label}
                  className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 hover:scale-110 transition"
                  style={{ background: c.value || "transparent" }}
                >
                  {!c.value && <span className="text-xs text-slate-400">✕</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <Divider />

      {/* Format: alignment as icon grid */}
      <div className="relative">
        <button
          onMouseDown={(e) => { e.preventDefault(); setShowFormat(v => !v); setShowFontSize(false); setShowTextColor(false); setShowHighlight(false); }}
          title="Text alignment"
          className="flex h-7 items-center gap-1 rounded px-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <AlignLeftIcon />
          <svg viewBox="0 0 10 6" className="h-2 w-2 fill-current"><path d="M0 0l5 6 5-6z"/></svg>
        </button>
        {showFormat && (
          <div className={`absolute left-0 z-10 flex gap-0.5 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900 ${dropdownPosition}`}>
            <ToolbarBtn onClick={() => { onFormat("justifyLeft"); setShowFormat(false); }} title="Align Left"><AlignLeftIcon /></ToolbarBtn>
            <ToolbarBtn onClick={() => { onFormat("justifyCenter"); setShowFormat(false); }} title="Align Center"><AlignCenterIcon /></ToolbarBtn>
            <ToolbarBtn onClick={() => { onFormat("justifyRight"); setShowFormat(false); }} title="Align Right"><AlignRightIcon /></ToolbarBtn>
            <ToolbarBtn onClick={() => { onFormat("justifyFull"); setShowFormat(false); }} title="Justify"><AlignJustifyIcon /></ToolbarBtn>
          </div>
        )}
      </div>

      <Divider />

      <ToolbarBtn onClick={() => onFormat("insertUnorderedList")} title="Bullet list"><BulletListIcon /></ToolbarBtn>
      <ToolbarBtn onClick={() => onFormat("insertOrderedList")} title="Numbered list"><NumberedListIcon /></ToolbarBtn>
      <ToolbarBtn onClick={() => onFormat("indent")} title="Indent"><IndentIcon /></ToolbarBtn>
      <ToolbarBtn onClick={() => onFormat("outdent")} title="Outdent"><OutdentIcon /></ToolbarBtn>
    </div>
  );
}
