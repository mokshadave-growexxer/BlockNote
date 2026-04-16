import {
  useRef,
  useEffect,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Trash2 } from "lucide-react";
import type { Block, BlockType, BlockContent } from "./types";

export interface BlockHandle {
  focus: (atEnd?: boolean) => void;
  resetAndFocusStart: () => void;
  getHTML: () => string;
  getText: () => string;
}

interface BlockProps {
  block: Block;
  index: number;
  isFirst: boolean;
  readOnly?: boolean;
  slashSelectionInProgress?: boolean;
  onEnter: (blockId: string, offset: number, totalLength: number, beforeHTML: string, afterHTML: string) => void;
  onBackspace: (blockId: string) => void;
  onChange: (blockId: string, content: Partial<BlockContent>) => void;
  onSlashMenu: (blockId: string, filter: string, rect: DOMRect) => void;
  onSlashClose: () => void;
  slashMenuBlockId: string | null;
  onFocus: (blockId: string) => void;
  onFormat: (command: string, value?: string) => void;
  onSelectionChange: (blockId: string, rect: DOMRect | null) => void;
  onDelete: (blockId: string) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLElement> & { ref?: React.Ref<HTMLElement> };
  isDragging?: boolean;
}

function isPlainCharacterKey(event: React.KeyboardEvent<HTMLDivElement>) {
  return event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getCaretOffset(el: HTMLElement): number {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0);
  const pre = document.createRange();
  pre.selectNodeContents(el);
  pre.setEnd(range.startContainer, range.startOffset);
  return pre.toString().length;
}

function getSelectedTextInElement(el: HTMLElement): string {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return "";
  if (!el.contains(sel.anchorNode) || !el.contains(sel.focusNode)) return "";
  return sel.toString();
}

function splitHTMLAtCaret(el: HTMLElement): { before: string; after: string } {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return { before: el.innerHTML, after: "" };
  const range = sel.getRangeAt(0);
  const beforeRange = document.createRange();
  beforeRange.selectNodeContents(el);
  beforeRange.setEnd(range.startContainer, range.startOffset);
  const beforeDiv = document.createElement("div");
  beforeDiv.appendChild(beforeRange.cloneContents());
  const afterRange = document.createRange();
  afterRange.selectNodeContents(el);
  afterRange.setStart(range.endContainer, range.endOffset);
  const afterDiv = document.createElement("div");
  afterDiv.appendChild(afterRange.cloneContents());
  return { before: beforeDiv.innerHTML, after: afterDiv.innerHTML };
}

export const BlockComponent = forwardRef<BlockHandle, BlockProps>(
  ({ block, index, isFirst, readOnly, slashSelectionInProgress = false, onEnter, onBackspace, onChange, onSlashMenu, onSlashClose, slashMenuBlockId, onFocus, onSelectionChange, onDelete, dragHandleProps, isDragging }, ref) => {
    const editableRef = useRef<HTMLDivElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [imageUrl, setImageUrl] = useState(block.content.url ?? "");
    const [imageInput, setImageInput] = useState(block.content.url ?? "");
    const slashActiveRef = useRef(false);
    const slashFilterRef = useRef("");
    const isComposingRef = useRef(false);
    const isFocusedRef = useRef(false);

    useImperativeHandle(ref, () => ({
      focus(atEnd = true) {
        if (block.type === "image") {
          imageInputRef.current?.focus();
          return;
        }
        const el = editableRef.current;
        if (!el) return;
        el.focus();
        try {
          const range = document.createRange();
          const sel = window.getSelection();
          if (atEnd) { range.selectNodeContents(el); range.collapse(false); }
          else { range.setStart(el, 0); range.collapse(true); }
          sel?.removeAllRanges();
          sel?.addRange(range);
        } catch {}
      },
      resetAndFocusStart() {
        if (block.type === "image") {
          imageInputRef.current?.focus();
          return;
        }
        const el = editableRef.current;
        if (!el) return;
        if (block.type === "code") el.textContent = "";
        else el.innerHTML = "";
        el.focus();
        try {
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(el);
          range.collapse(true);
          sel?.removeAllRanges();
          sel?.addRange(range);
        } catch {}
      },
      getHTML() { return editableRef.current?.innerHTML ?? ""; },
      getText() {
        if (block.type === "image") return imageInputRef.current?.value ?? imageInput;
        return editableRef.current?.textContent ?? "";
      },
    }), [block.type, imageInput]);

    // Initial content population
    useEffect(() => {
      const el = editableRef.current;
      if (!el) return;
      if (block.type === "code") el.textContent = block.content.text ?? "";
      else el.innerHTML = block.content.html ?? "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sync external content changes when not focused
    useEffect(() => {
      const el = editableRef.current;
      if (!el || isFocusedRef.current) return;
      if (block.type === "code") {
        if (el.textContent !== (block.content.text ?? "")) el.textContent = block.content.text ?? "";
      } else {
        const html = block.content.html ?? "";
        if (el.innerHTML !== html) el.innerHTML = html;
      }
    }, [block.content.html, block.content.text, block.type]);

    useEffect(() => {
      setImageUrl(block.content.url ?? "");
      setImageInput(block.content.url ?? "");
    }, [block.content.url]);

    useEffect(() => {
      if (slashMenuBlockId !== block.id) {
        slashActiveRef.current = false;
        slashFilterRef.current = "";
      }
    }, [block.id, slashMenuBlockId]);

    useEffect(() => {
      if (block.type === "image" && !readOnly && !block.content.url) {
        requestAnimationFrame(() => imageInputRef.current?.focus());
      }
    }, [block.type, block.content.url, readOnly]);

    const updateSlashState = useCallback(() => {
      const el = editableRef.current;
      if (!el) return;
      onSlashMenu(block.id, slashFilterRef.current, el.getBoundingClientRect());
    }, [block.id, onSlashMenu]);

    const closeSlashMenu = useCallback((clearContent = false) => {
      slashActiveRef.current = false;
      slashFilterRef.current = "";
      onSlashClose();
      if (clearContent) {
        const el = editableRef.current;
        if (el) {
          el.innerHTML = "";
          el.textContent = "";
        }
        onChange(block.id, { html: "", text: "" });
      }
    }, [block.id, onChange, onSlashClose]);

    const handleInput = useCallback(() => {
      if (isComposingRef.current) return;
      const el = editableRef.current;
      if (!el) return;
      if (block.type === "code") { onChange(block.id, { text: el.textContent ?? "" }); return; }
      if (slashActiveRef.current) {
        // Slash filtering is handled via keydown so the editor surface stays clean.
        if (el.innerHTML !== "") {
          el.innerHTML = "";
        }
        onChange(block.id, { html: "", text: "" });
        updateSlashState();
        return;
      }
      onChange(block.id, { html: el.innerHTML });
    }, [block.id, block.type, onChange, updateSlashState]);

    const embedImageUrl = useCallback(() => {
      const nextUrl = imageInput.trim();
      if (!isValidUrl(nextUrl)) {
        return;
      }

      setImageUrl(nextUrl);
      onChange(block.id, { url: nextUrl, caption: block.content.caption ?? "" });
    }, [block.content.caption, block.id, imageInput, onChange]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
      const el = editableRef.current;
      if (!el) return;

      if (block.type === "code" && e.key === "Tab") {
        e.preventDefault();
        const sel = window.getSelection();
        if (sel?.rangeCount) {
          const range = sel.getRangeAt(0);
          const spaces = document.createTextNode("  ");
          range.deleteContents();
          range.insertNode(spaces);
          range.setStartAfter(spaces);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
          onChange(block.id, { text: el.textContent ?? "" });
        }
        return;
      }

      const offset = getCaretOffset(el);
      const total = el.textContent?.length ?? 0;

      if (!slashActiveRef.current && e.key === "/" && offset === 0) {
        e.preventDefault();
        slashActiveRef.current = true;
        slashFilterRef.current = "";
        onChange(block.id, { html: "", text: "" });
        updateSlashState();
        return;
      }

      if (slashActiveRef.current) {
        if (e.key === "Escape") {
          e.preventDefault();
          closeSlashMenu(true);
          return;
        }
        if (e.key === "Backspace") {
          e.preventDefault();
          if (slashFilterRef.current.length === 0) {
            closeSlashMenu(true);
            return;
          }
          slashFilterRef.current = slashFilterRef.current.slice(0, -1);
          updateSlashState();
          return;
        }
        if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          return;
        }
        if (isPlainCharacterKey(e)) {
          e.preventDefault();
          slashFilterRef.current += e.key;
          updateSlashState();
          return;
        }
      }

      if (e.key === "Enter" && !e.shiftKey) {
        if (slashSelectionInProgress) {
          e.preventDefault();
          return;
        }
        if (block.type === "code") return;
        e.preventDefault();
        const { before, after } = splitHTMLAtCaret(el);
        onEnter(block.id, offset, total, before, after);
        return;
      }

      if (e.key === "Backspace") {
        const selectedText = getSelectedTextInElement(el);
        if (selectedText.length > 0) {
          const selectedAllBlockText = selectedText.length >= total;
          if (selectedAllBlockText) {
            e.preventDefault();
            el.innerHTML = "";
            el.textContent = "";
            onChange(block.id, block.type === "code" ? { text: "" } : { html: "", text: "" });
          }
          return;
        }

        if (offset === 0) {
          e.preventDefault();
          onBackspace(block.id);
          return;
        }
      }
    }, [block.id, block.type, closeSlashMenu, onBackspace, onChange, onEnter, slashSelectionInProgress, updateSlashState]);

    const handleSelectionChange = useCallback(() => {
      const sel = window.getSelection();
      const editable = editableRef.current;
      if (
        !sel ||
        sel.isCollapsed ||
        !editable ||
        (!editable.contains(sel.anchorNode) && !editable.contains(sel.focusNode))
      ) {
        onSelectionChange(block.id, null); return;
      }
      try {
        const range = sel.getRangeAt(0);
        const rects = Array.from(range.getClientRects());
        const rect = rects[0] ?? range.getBoundingClientRect();
        onSelectionChange(block.id, rect.width > 0 || rect.height > 0 ? rect : null);
      } catch { onSelectionChange(block.id, null); }
    }, [block.id, onSelectionChange]);

    useEffect(() => {
      document.addEventListener("selectionchange", handleSelectionChange);
      return () => document.removeEventListener("selectionchange", handleSelectionChange);
    }, [handleSelectionChange]);

    const editableAttrs = readOnly ? { contentEditable: false as const } : {
      contentEditable: true as const,
      suppressContentEditableWarning: true,
      onInput: handleInput,
      onKeyDown: handleKeyDown,
      onFocus: () => { isFocusedRef.current = true; onFocus(block.id); },
      onBlur: () => {
        isFocusedRef.current = false;
        if (slashActiveRef.current) {
          closeSlashMenu(true);
        }
      },
      onCompositionStart: () => { isComposingRef.current = true; },
      onCompositionEnd: () => { isComposingRef.current = false; handleInput(); },
    };

    const wrap = `group relative flex items-start gap-3 px-1 py-1 rounded-lg transition ${isDragging ? "opacity-40" : "hover:bg-brand-50/50 dark:hover:bg-white/[0.025]"}`;

    const DragHandle = () => {
      if (readOnly) return null;
      const { ref: dragRef, ...restDragProps } = (dragHandleProps ?? {}) as React.HTMLAttributes<HTMLElement> & { ref?: React.Ref<HTMLElement> };
      return (
        <div
          ref={dragRef as React.Ref<HTMLDivElement>}
          {...restDragProps}
          className="mt-2 flex h-5 w-5 shrink-0 cursor-grab select-none items-center justify-center rounded opacity-0 transition group-hover:opacity-40 hover:!opacity-100 active:cursor-grabbing"
          title="Drag to reorder"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4 fill-brand-400">
            <circle cx="5" cy="4" r="1.4"/><circle cx="5" cy="8" r="1.4"/><circle cx="5" cy="12" r="1.4"/>
            <circle cx="11" cy="4" r="1.4"/><circle cx="11" cy="8" r="1.4"/><circle cx="11" cy="12" r="1.4"/>
          </svg>
        </div>
      );
    };

    const DeleteButton = ({ label = "Delete block" }: { label?: string }) => {
      if (readOnly) return null;
      return (
        <button
          type="button"
          onClick={() => onDelete(block.id)}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 bg-white/92 text-rose-500 opacity-0 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 dark:border-rose-500/30 dark:bg-[#101526] dark:text-rose-300 dark:hover:bg-rose-500/10"
          title={label}
          aria-label={label}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      );
    };

    if (block.type === "divider") return (
      <div className={wrap}>
        <DragHandle />
        <div className="flex flex-1 items-center gap-3 py-2">
          <div className="flex-1 py-2">
            <hr className="border-brand-200 dark:border-white/10"/>
          </div>
          <DeleteButton label="Delete divider block" />
        </div>
      </div>
    );

    if (block.type === "image") return (
      <div className={wrap}>
        <DragHandle />
        <div className="flex-1">
          {imageUrl ? (
            <div className="group/img relative">
              <img src={imageUrl} alt={block.content.caption ?? ""} className="max-w-full rounded-lg shadow-atelier"
                onError={() => { setImageUrl(""); setImageInput(""); }}/>
              {!readOnly && (
                <div className="absolute right-2 top-2 flex items-center gap-2 opacity-0 transition group-hover/img:opacity-100">
                  <button onClick={() => { setImageUrl(""); setImageInput(""); onChange(block.id, { url: "" }); }}
                    className="rounded-md bg-black/55 px-2 py-1 text-xs text-white">
                    Change URL
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(block.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-md bg-rose-500/90 text-white"
                    aria-label="Delete image block"
                    title="Delete image block"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ) : readOnly ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">No image</div>
          ) : (
            <div className="flex items-start gap-2 rounded-lg border border-dashed border-brand-300/70 bg-brand-50/50 p-3 dark:border-white/10 dark:bg-white/[0.035]">
              <input ref={imageInputRef} type="text" value={imageInput} onChange={(e) => setImageInput(e.target.value)}
                placeholder="Paste image URL and press Enter…"
                className="flex-1 bg-transparent pt-1 text-sm outline-none placeholder:text-slate-400"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); embedImageUrl(); } }}/>
              <button onClick={embedImageUrl}
                className="rounded bg-brand-500 px-3 py-1 text-xs text-white hover:bg-brand-600">Embed</button>
              <DeleteButton label="Delete image block" />
            </div>
          )}
        </div>
      </div>
    );

    if (block.type === "todo") return (
      <div className={wrap}>
        <DragHandle />
        <input type="checkbox" checked={!!block.content.checked} disabled={readOnly}
          onChange={readOnly ? undefined : (e) => onChange(block.id, { checked: e.target.checked })}
          className="mt-1.5 h-4 w-4 shrink-0 cursor-pointer rounded accent-brand-500"/>
        <div ref={editableRef} {...editableAttrs}
          data-placeholder={readOnly ? "" : "To-do item…"}
          className={`editor-block-content flex-1 min-w-0 outline-none break-words ${block.content.checked ? "text-slate-400 line-through dark:text-slate-500" : "text-slate-700 dark:text-slate-200"} empty:before:text-slate-300 empty:before:content-[attr(data-placeholder)] dark:empty:before:text-slate-600`}
          style={{ fontSize: "16px", lineHeight: "1.85" }}/>
      </div>
    );

    if (block.type === "code") return (
      <div className={wrap}>
        <DragHandle />
        <pre className="flex-1 overflow-x-auto rounded-lg border border-white/10 bg-[#080b14] p-4 shadow-atelier">
          <div ref={editableRef} {...editableAttrs}
            data-placeholder={readOnly ? "" : "// Write code here…"}
            className="font-mono text-sm text-slate-100 outline-none whitespace-pre-wrap break-words empty:before:text-slate-500 empty:before:content-[attr(data-placeholder)]"
            style={{ minHeight: "1.5em" }}/>
        </pre>
      </div>
    );

    const hClass =
      block.type === "heading_1" ? "font-serif font-semibold text-slate-950 dark:text-white" :
      block.type === "heading_2" ? "font-serif font-semibold text-slate-900 dark:text-slate-100" :
      "text-slate-700 dark:text-slate-200";

    const typeStyle =
      block.type === "heading_1" ? { fontSize: "38px", lineHeight: "1.16" } :
      block.type === "heading_2" ? { fontSize: "28px", lineHeight: "1.25" } :
      { fontSize: "16px", lineHeight: "1.85" };

    const ph =
      block.type === "heading_1" ? "Heading 1" :
      block.type === "heading_2" ? "Heading 2" :
      isFirst ? "Start writing, or type / for commands…" : "Type / for commands…";

    return (
      <div className={wrap}>
        <DragHandle />
        <div ref={editableRef} {...editableAttrs}
          data-placeholder={readOnly ? "" : ph}
          style={{ textAlign: block.content.align ?? "left", ...typeStyle }}
          className={`editor-block-content flex-1 min-w-0 outline-none break-words ${hClass}`}
        />
      </div>
    );
  }
);
BlockComponent.displayName = "BlockComponent";
