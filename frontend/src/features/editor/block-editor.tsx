import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Block, BlockType, BlockContent, SaveStatus } from "./types";
import { BlockComponent } from "./block-component";
import type { BlockHandle } from "./block-component";
import { SlashMenu } from "./slash-menu";
import { RichTextToolbar } from "./toolbar";
import { AIToolbar } from "./ai-toolbar";
import { bulkSaveBlocks, reorderBlocksApi } from "./editor-api";
import type { AIAction } from "../../store/ai-store";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface EditorProps {
  documentId: string;
  initialBlocks: Block[];
  readOnly?: boolean;
  onAIApplyRef?: React.MutableRefObject<((text: string) => void) | null>;
  onOpenAI?: (action: AIAction, text: string) => void;
}

function makeBlock(documentId: string, type: BlockType, orderIndex: number, content: BlockContent = {}): Block {
  return { id: uuidv4(), documentId, type, content, orderIndex };
}

const NON_TEXT_TYPES: BlockType[] = ["divider", "image"];
const AI_EDITABLE_TYPES: BlockType[] = ["paragraph", "heading_1", "heading_2", "todo"];
const FONT_SCALE = new Set(["12", "13", "14", "15", "16", "18", "20", "24", "28", "32", "36"]);

function getInitialContentForType(type: BlockType): BlockContent {
  if (type === "todo") return { html: "", checked: false };
  if (type === "image") return { url: "", caption: "" };
  if (type === "code") return { text: "" };
  return { html: "" };
}

function normalizeEditorMarkup(root: HTMLElement) {
  root.querySelectorAll('font[size="7"]').forEach((node) => {
    const element = node as HTMLElement;
    const span = document.createElement("span");
    span.innerHTML = element.innerHTML;
    span.style.fontSize = element.style.fontSize || "14px";
    span.style.lineHeight = "inherit";
    element.replaceWith(span);
  });
  root.querySelectorAll("ul").forEach((list) => {
    (list as HTMLElement).style.listStyleType = "disc";
  });
  root.querySelectorAll("ol").forEach((list) => {
    (list as HTMLElement).style.listStyleType = "decimal";
  });
}

function htmlToText(html: string) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent?.trim() ?? "";
}

function textToHtml(text: string) {
  const tmp = document.createElement("div");
  tmp.textContent = text;
  return tmp.innerHTML.replace(/\n/g, "<br>");
}

function findSplitIndex(text: string, target: number) {
  if (target <= 0) return 0;
  if (target >= text.length) return text.length;

  const windowSize = Math.max(40, Math.floor(text.length * 0.12));
  const start = Math.max(0, target - windowSize);
  const end = Math.min(text.length, target + windowSize);
  const candidates = ["\n\n", ". ", "? ", "! ", "; ", ", ", " "];

  for (const separator of candidates) {
    let best = -1;
    let index = text.indexOf(separator, start);
    while (index !== -1 && index <= end) {
      const splitAt = index + separator.length;
      if (best === -1 || Math.abs(splitAt - target) < Math.abs(best - target)) best = splitAt;
      index = text.indexOf(separator, index + 1);
    }
    if (best !== -1) return best;
  }

  return target;
}

function splitTextForBlocks(text: string, sourceTexts: string[]) {
  const cleaned = text.trim();
  if (!cleaned) return sourceTexts.map(() => "");
  if (sourceTexts.length <= 1) return [cleaned];

  const chunks = cleaned
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  if (chunks.length === sourceTexts.length) return chunks;
  if (chunks.length > sourceTexts.length) {
    return sourceTexts.map((_, index) =>
      index === sourceTexts.length - 1 ? chunks.slice(index).join("\n\n") : chunks[index]
    );
  }

  const result: string[] = [];
  let remaining = cleaned;
  let remainingSourceLength = sourceTexts.reduce((sum, source) => sum + Math.max(source.length, 1), 0);

  for (let index = 0; index < sourceTexts.length - 1; index += 1) {
    const sourceLength = Math.max(sourceTexts[index].length, 1);
    const target = Math.round(remaining.length * (sourceLength / remainingSourceLength));
    const splitAt = findSplitIndex(remaining, target);
    result.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
    remainingSourceLength -= sourceLength;
  }

  result.push(remaining);
  return result;
}

// ── BlockSpacer: hover-reveal insert button above/below non-editable blocks ──
function BlockSpacer({ onInsert }: { onInsert: () => void }) {
  return (
    <div
      className="group/spacer relative flex items-center justify-center h-5 cursor-pointer opacity-0 hover:opacity-100 transition-opacity duration-150"
      onClick={onInsert}
    >
      <div className="absolute inset-x-2 h-px bg-purple-300 dark:bg-purple-700 opacity-60" />
      <button
        type="button"
        className="relative z-10 flex items-center gap-1 rounded border border-purple-300 dark:border-purple-600 bg-white dark:bg-[#1A1A2E] px-2 py-0 text-xs text-purple-500 dark:text-purple-400 shadow-sm hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors select-none leading-5"
        tabIndex={-1}
      >
        + Add Block
      </button>
    </div>
  );
}

// ── SortableBlockWrapper ──────────────────────────────────────────────────────
interface SortableBlockWrapperProps {
  id: string;
  readOnly: boolean;
  children: (dragHandleProps: React.HTMLAttributes<HTMLElement>, isDragging: boolean) => React.ReactNode;
}
function SortableBlockWrapper({ id, readOnly, children }: SortableBlockWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: readOnly });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dragHandleProps: React.HTMLAttributes<HTMLElement> & { ref?: React.Ref<HTMLElement> } = readOnly
    ? {}
    : {
        ref: setActivatorNodeRef as React.Ref<HTMLElement>,
        ...attributes,
        ...listeners,
        style: { touchAction: "none" },
        onMouseDown: (e: React.MouseEvent) => e.preventDefault(),
      };

  return (
    <div ref={setNodeRef} style={style} data-block-id={id}>
      {children(dragHandleProps, isDragging)}
    </div>
  );
}

export function BlockEditor({ documentId, initialBlocks, readOnly = false, onAIApplyRef, onOpenAI }: EditorProps) {
  const [blocks, setBlocks] = useState<Block[]>(() =>
    initialBlocks.length > 0 ? initialBlocks : [makeBlock(documentId, "paragraph", 1000)]
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [slashState, setSlashState] = useState<{ blockId: string; filter: string; rect: DOMRect } | null>(null);
  const [toolbarState, setToolbarState] = useState<{ blockId: string; rect: DOMRect } | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const blockRefs = useRef<Map<string, BlockHandle>>(new Map());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const latestBlocksRef = useRef<Block[]>(blocks);
  latestBlocksRef.current = blocks;
  const slashSelectingRef = useRef(false);

  // ── AI apply: replace document text while preserving existing non-text blocks ──
  const handleAIApply = useCallback((text: string) => {
    const cleaned = text.trim();
    if (!cleaned) return;

    setBlocks((prev) => {
      const sorted = [...prev].sort((a, b) => a.orderIndex - b.orderIndex);
      const existingTextBlocks = sorted.filter((block) => AI_EDITABLE_TYPES.includes(block.type));
      if (existingTextBlocks.length === 0) return prev;

      let chunkIndex = 0;
      const sourceTexts = existingTextBlocks.map((block) => htmlToText(block.content.html ?? ""));
      const chunks = splitTextForBlocks(cleaned, sourceTexts);
      const updated = sorted.map((block) => {
        if (!AI_EDITABLE_TYPES.includes(block.type)) return block;
        const chunk = chunks[chunkIndex++] ?? "";
        return {
          ...block,
          content: {
            ...block.content,
            html: textToHtml(chunk),
            text: chunk,
          },
        };
      });

      return reindex(updated);
    });
  }, []);

  // Expose AI apply handler via ref
  useEffect(() => {
    if (onAIApplyRef) onAIApplyRef.current = handleAIApply;
  }, [handleAIApply, onAIApplyRef]);

  // ── Keyboard shortcuts ──────────────────────────────────────────────
  useEffect(() => {
    if (readOnly) return;
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      // Bold: handled natively by browser contenteditable
      // Italic: handled natively
      // Ctrl+/ — open slash menu on focused block
      if (e.key === "/" && !e.shiftKey) {
        e.preventDefault();
        if (activeBlockId) {
          const el = document.querySelector(
            `[data-block-id="${activeBlockId}"] [contenteditable]`
          ) as HTMLElement | null;
          if (el) {
            const rect = el.getBoundingClientRect();
            setSlashState({ blockId: activeBlockId, filter: "", rect });
          }
        }
        return;
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [readOnly, activeBlockId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // ── Auto-save ──────────────────────────────────────────────────────
  const scheduleSave = useCallback(() => {
    if (readOnly) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("saving");
    saveTimerRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      const snapshot = latestBlocksRef.current;
      try {
        await bulkSaveBlocks(documentId, snapshot);
        if (latestBlocksRef.current === snapshot) setSaveStatus("saved");
      } catch (err: any) {
        if (err?.name !== "CanceledError" && err?.code !== "ERR_CANCELED") setSaveStatus("error");
      }
    }, 1000);
  }, [documentId, readOnly]);

  useEffect(() => { if (!readOnly) scheduleSave(); }, [blocks, scheduleSave, readOnly]);

  // ── Focus helper ───────────────────────────────────────────────────
  const focusBlock = useCallback((id: string, atEnd = true) => {
    requestAnimationFrame(() => blockRefs.current.get(id)?.focus(atEnd));
  }, []);

  // ── Order helpers ──────────────────────────────────────────────────
  const midpoint = (a?: number, b?: number) => {
    if (a === undefined && b === undefined) return 1000;
    if (a === undefined) return (b ?? 1000) - 1000;
    if (b === undefined) return a + 1000;
    return (a + b) / 2;
  };

  const reindex = (list: Block[]): Block[] => {
    const sorted = [...list].sort((a, b) => a.orderIndex - b.orderIndex);
    let bad = false;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].orderIndex - sorted[i - 1].orderIndex < 0.001) { bad = true; break; }
    }
    if (!bad) return list;
    return sorted.map((b, i) => ({ ...b, orderIndex: (i + 1) * 1000 }));
  };

  // ── Insert block at sorted index ───────────────────────────────────
  const insertBlockAt = useCallback((index: number, type: BlockType = "paragraph") => {
    let newBlockId = "";
    setBlocks((prev) => {
      const sorted = [...prev].sort((a, b) => a.orderIndex - b.orderIndex);
      const before = sorted[index - 1];
      const after = sorted[index];
      const newOrderIndex = midpoint(before?.orderIndex, after?.orderIndex);
      const newBlock = makeBlock(documentId, type, newOrderIndex, getInitialContentForType(type));
      newBlockId = newBlock.id;
      const newList = [...sorted];
      newList.splice(index, 0, newBlock);
      return reindex(newList);
    });
    requestAnimationFrame(() => {
      if (newBlockId) focusBlock(newBlockId, false);
    });
  }, [documentId, focusBlock]);

  // ── Enter: split block at cursor ───────────────────────────────────
  const handleEnter = useCallback(
    (blockId: string, _offset: number, _total: number, beforeHTML: string, afterHTML: string) => {
      setBlocks((prev) => {
        const sorted = [...prev].sort((a, b) => a.orderIndex - b.orderIndex);
        const idx = sorted.findIndex((b) => b.id === blockId);
        if (idx === -1) return prev;
        const current = sorted[idx];
        const nextBlock = sorted[idx + 1];
        const newIdx = midpoint(current.orderIndex, nextBlock?.orderIndex);
        const updated = { ...current, content: { ...current.content, html: beforeHTML } };
        const newBlock = makeBlock(documentId, "paragraph", newIdx, { html: afterHTML });
        const newList = sorted.map((b) => (b.id === blockId ? updated : b));
        newList.splice(idx + 1, 0, newBlock);
        requestAnimationFrame(() => {
          const el = document.querySelector(`[data-block-id="${blockId}"] [contenteditable]`) as HTMLElement | null;
          if (el && el.innerHTML !== beforeHTML) el.innerHTML = beforeHTML;
          focusBlock(newBlock.id, false);
        });
        return reindex(newList);
      });
    },
    [documentId, focusBlock]
  );

  // ── Enter on non-editable block inserts paragraph below ───────────
  const handleNonEditableEnter = useCallback((blockId: string) => {
    let newBlockId = "";
    setBlocks((prev) => {
      const sorted = [...prev].sort((a, b) => a.orderIndex - b.orderIndex);
      const idx = sorted.findIndex((b) => b.id === blockId);
      if (idx === -1) return prev;
      const current = sorted[idx];
      const nextBlock = sorted[idx + 1];
      const newOrderIndex = midpoint(current.orderIndex, nextBlock?.orderIndex);
      const newBlock = makeBlock(documentId, "paragraph", newOrderIndex, { html: "" });
      newBlockId = newBlock.id;
      const newList = [...sorted];
      newList.splice(idx + 1, 0, newBlock);
      return reindex(newList);
    });
    requestAnimationFrame(() => { if (newBlockId) focusBlock(newBlockId, false); });
  }, [documentId, focusBlock]);

  // ── Backspace: merge or delete ────────────────────────────────────
  const handleBackspace = useCallback(
    (blockId: string) => {
      setBlocks((prev) => {
        const sorted = [...prev].sort((a, b) => a.orderIndex - b.orderIndex);
        const idx = sorted.findIndex((b) => b.id === blockId);
        if (idx === -1) return prev;
        const current = sorted[idx];
        const currentText = blockRefs.current.get(blockId)?.getText() ?? "";
        if (idx === 0) {
          if (currentText.length > 0) return prev;
          const nextBlock = sorted[1];
          if (nextBlock) {
            requestAnimationFrame(() => focusBlock(nextBlock.id, false));
            return sorted.filter((b) => b.id !== blockId);
          }
          if (current.type !== "paragraph") {
            return [{ ...current, type: "paragraph", content: { html: "" } }];
          }
          return prev;
        }
        const prevBlock = sorted[idx - 1];
        if (currentText.length > 0 && current.type !== "paragraph") {
          return prev.map((b) => b.id === blockId ? { ...b, type: "paragraph" } : b);
        }
        if (NON_TEXT_TYPES.includes(prevBlock.type)) {
          requestAnimationFrame(() => focusBlock(prevBlock.id, true));
          return sorted.filter((b) => b.id !== blockId);
        }
        const prevHTML = blockRefs.current.get(prevBlock.id)?.getHTML() ?? prevBlock.content.html ?? "";
        const curHTML = blockRefs.current.get(blockId)?.getHTML() ?? current.content.html ?? "";
        const prevTextLen = (blockRefs.current.get(prevBlock.id)?.getText() ?? "").length;
        const merged = prevHTML + curHTML;
        const updatedPrev = { ...prevBlock, content: { ...prevBlock.content, html: merged } };
        requestAnimationFrame(() => {
          const el = document.querySelector(`[data-block-id="${prevBlock.id}"] [contenteditable]`) as HTMLElement | null;
          if (el) {
            el.innerHTML = merged;
            let charCount = 0;
            const range = document.createRange();
            const sel = window.getSelection();
            function walk(node: Node): boolean {
              if (node.nodeType === Node.TEXT_NODE) {
                const len = node.textContent?.length ?? 0;
                if (charCount + len >= prevTextLen) { range.setStart(node, prevTextLen - charCount); range.collapse(true); return true; }
                charCount += len;
              } else {
                for (const child of Array.from(node.childNodes)) { if (walk(child)) return true; }
              }
              return false;
            }
            if (!walk(el)) { range.selectNodeContents(el); range.collapse(false); }
            sel?.removeAllRanges(); sel?.addRange(range); el.focus();
          }
        });
        return sorted.filter((b) => b.id !== blockId).map((b) => b.id === prevBlock.id ? updatedPrev : b);
      });
    },
    [focusBlock]
  );

  // ── Slash menu ────────────────────────────────────────────────────
  const handleSlashMenu = useCallback((blockId: string, filter: string, rect: DOMRect) => {
    setSlashState({ blockId, filter, rect });
  }, []);
  const handleSlashClose = useCallback(() => setSlashState(null), []);

  const handleSlashSelect = useCallback((type: BlockType) => {
    if (!slashState) return;
    const { blockId } = slashState;
    slashSelectingRef.current = true;
    setSlashState(null);
    setBlocks((prev) =>
      prev.map((b) => (b.id !== blockId ? b : { ...b, type, content: getInitialContentForType(type) }))
    );
    requestAnimationFrame(() => {
      const handle = blockRefs.current.get(blockId);
      if (!handle) { slashSelectingRef.current = false; return; }
      if (type === "image") { handle.focus(false); slashSelectingRef.current = false; return; }
      handle.resetAndFocusStart();
      slashSelectingRef.current = false;
    });
  }, [slashState]);

  // ── Content change ────────────────────────────────────────────────
  const handleChange = useCallback((blockId: string, content: Partial<BlockContent>) => {
    setBlocks((prev) => prev.map((b) => b.id === blockId ? { ...b, content: { ...b.content, ...content } } : b));
  }, []);

  // ── Formatting ────────────────────────────────────────────────────
  const handleFormat = useCallback((command: string, value?: string) => {
    if (command === "fontSize" && value && FONT_SCALE.has(value)) {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
      document.execCommand("styleWithCSS", false, "false");
      document.execCommand("fontSize", false, "7");
      if (activeBlockId) {
        const root = document.querySelector(`[data-block-id="${activeBlockId}"] [contenteditable]`) as HTMLElement | null;
        if (root) {
          root.querySelectorAll('font[size="7"]').forEach((node) => {
            const fontEl = node as HTMLElement;
            const span = document.createElement("span");
            span.style.fontSize = `${value}px`;
            span.style.lineHeight = "inherit";
            while (fontEl.firstChild) span.appendChild(fontEl.firstChild);
            fontEl.replaceWith(span);
          });
        }
      }
    } else if (command === "foreColor" && value === "inherit") {
      document.execCommand("styleWithCSS", false, "false");
      document.execCommand("foreColor", false, "inherit");
    } else if (command === "hiliteColor" && value === "transparent") {
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand("hiliteColor", false, "transparent");
    } else {
      const cssCommands = new Set(["foreColor", "hiliteColor"]);
      document.execCommand("styleWithCSS", false, cssCommands.has(command) ? "true" : "false");
      document.execCommand(command, false, value);
    }
    if (activeBlockId) {
      const el = document.querySelector(`[data-block-id="${activeBlockId}"] [contenteditable]`) as HTMLElement | null;
      if (el) {
        normalizeEditorMarkup(el);
        setBlocks((prev) => prev.map((b) => b.id === activeBlockId ? { ...b, content: { ...b.content, html: el.innerHTML } } : b));
      }
    }
  }, [activeBlockId]);

  // ── Selection / toolbar ───────────────────────────────────────────
  const handleSelectionChange = useCallback((blockId: string, rect: DOMRect | null) => {
    setToolbarState(rect ? { blockId, rect } : null);
  }, []);

  const toolbarPos = useMemo(() => {
    if (!toolbarState) return { top: 0, left: 0 };
    const { rect } = toolbarState;
    return { top: rect.top - 52, left: rect.left + rect.width / 2 };
  }, [toolbarState]);

  const slashPos = useMemo(() => {
    if (!slashState) return { top: 0, left: 0 };
    return { top: slashState.rect.bottom + 4, left: slashState.rect.left };
  }, [slashState]);

  // ── dnd-kit handlers ──────────────────────────────────────────────
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over || active.id === over.id) return;
    setBlocks((prev) => {
      const sorted = [...prev].sort((a, b) => a.orderIndex - b.orderIndex);
      const oldIndex = sorted.findIndex((b) => b.id === active.id);
      const newIndex = sorted.findIndex((b) => b.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const reordered = arrayMove(sorted, oldIndex, newIndex).map((block, i) => ({
        ...block,
        orderIndex: (i + 1) * 1000,
      }));
      // Persist reorder — fire and forget, auto-save will also sync
      reorderBlocksApi(documentId, reordered.map((b) => ({ id: b.id, orderIndex: b.orderIndex }))).catch(() => {});
      return reordered;
    });
  }, [documentId]);

  const sorted = useMemo(() => [...blocks].sort((a, b) => a.orderIndex - b.orderIndex), [blocks]);

  const documentText = useMemo(() => {
    return sorted
      .map((block) => {
        if (AI_EDITABLE_TYPES.includes(block.type)) return htmlToText(block.content.html ?? "");
        return "";
      })
      .filter(Boolean)
      .join("\n\n");
  }, [sorted]);

  // ── Word count ────────────────────────────────────────────────────
  const wordCount = useMemo(() => {
    const TEXT_BLOCK_TYPES: BlockType[] = ["paragraph", "heading_1", "heading_2", "todo", "code"];
    return blocks
      .filter((b) => TEXT_BLOCK_TYPES.includes(b.type))
      .map((b) => {
        if (b.content.html) {
          const tmp = document.createElement("div");
          tmp.innerHTML = b.content.html;
          return tmp.textContent || "";
        }
        return b.content.text || "";
      })
      .join(" ")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
  }, [blocks]);

  const activeDragBlock = useMemo(() => sorted.find((b) => b.id === activeDragId), [sorted, activeDragId]);

  return (
    <div className="editor relative w-full">
      {/* Save status badge */}
      {!readOnly && (
        <div className="absolute -top-7 right-0 text-xs text-slate-400 select-none">
          {saveStatus === "saving" && <span>Saving…</span>}
          {saveStatus === "saved" && <span className="text-emerald-500">Saved ✓</span>}
          {saveStatus === "error" && <span className="text-rose-500">Save failed ✗</span>}
        </div>
      )}

      {/* Block list */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sorted.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
            {sorted.map((block, index) => {
              const isNonEditable = NON_TEXT_TYPES.includes(block.type);
              return (
                <div key={block.id}>
                  {/* Insert ABOVE for image/divider */}
                  {isNonEditable && !readOnly && (
                    <BlockSpacer onInsert={() => insertBlockAt(index)} />
                  )}

                  <SortableBlockWrapper id={block.id} readOnly={!!readOnly}>
                    {(dragHandleProps, isDragging) => (
                      <BlockComponent
                        ref={(h) => { if (h) blockRefs.current.set(block.id, h); else blockRefs.current.delete(block.id); }}
                        block={block}
                        index={index}
                        isFirst={index === 0}
                        readOnly={readOnly}
                        isDragging={isDragging || activeDragId === block.id}
                        slashSelectionInProgress={slashSelectingRef.current}
                        onEnter={isNonEditable
                          ? (_id, _o, _t, _b, _a) => handleNonEditableEnter(block.id)
                          : handleEnter}
                        onBackspace={handleBackspace}
                        onChange={handleChange}
                        onSlashMenu={handleSlashMenu}
                        onSlashClose={handleSlashClose}
                        slashMenuBlockId={slashState?.blockId ?? null}
                        onFocus={setActiveBlockId}
                        onFormat={handleFormat}
                        onSelectionChange={handleSelectionChange}
                        dragHandleProps={dragHandleProps}
                      />
                    )}
                  </SortableBlockWrapper>

                  {/* Insert BELOW for image/divider */}
                  {isNonEditable && !readOnly && (
                    <BlockSpacer onInsert={() => insertBlockAt(index + 1)} />
                  )}
                </div>
              );
            })}
          </div>
        </SortableContext>

        {/* Drag ghost overlay */}
        <DragOverlay dropAnimation={{ duration: 150, easing: "ease" }}>
          {activeDragBlock ? (
            <div className="rounded-lg border border-brand-300 bg-white px-3 py-2 opacity-90 shadow-2xl dark:border-brand-500/60 dark:bg-[#080b14]">
              <span className="text-sm text-slate-500 dark:text-slate-400 truncate block max-w-xs">
                {activeDragBlock.type === "divider" ? "— Divider —"
                  : activeDragBlock.type === "image" ? "🖼 Image block"
                  : activeDragBlock.type === "code" ? "{ } Code block"
                  : (() => { const t = document.createElement("div"); t.innerHTML = activeDragBlock.content.html ?? ""; return t.textContent?.trim().slice(0, 60) || `${activeDragBlock.type} block`; })()}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Click-below-to-focus area */}
      {!readOnly && (
        <div className="mt-2 min-h-[80px] cursor-text" onClick={() => {
          const last = sorted[sorted.length - 1];
          if (last) focusBlock(last.id, true);
          else { const nb = makeBlock(documentId, "paragraph", 1000); setBlocks([nb]); setTimeout(() => focusBlock(nb.id), 50); }
        }} />
      )}

      {/* Slash command menu */}
      {slashState && (
        <SlashMenu filter={slashState.filter} position={slashPos} onSelect={handleSlashSelect} onClose={handleSlashClose} />
      )}

      {/* Rich text toolbar */}
      <RichTextToolbar visible={!!toolbarState} position={toolbarPos} onFormat={handleFormat} />

      {/* AI Assist toolbar */}
      {!readOnly && onOpenAI && (
        <AIToolbar
          activeBlockId={activeBlockId}
          documentText={documentText}
          onOpenAI={onOpenAI}
        />
      )}

      {/* Word count badge */}
      <div className="fixed bottom-4 right-6 z-50 rounded-lg border border-brand-200 bg-white/86 px-3 py-1.5 text-xs text-gray-500 shadow-md backdrop-blur select-none pointer-events-none dark:border-white/10 dark:bg-[#080b14]/86 dark:text-gray-400 xl:right-[390px]">
        <span className="text-purple-500 dark:text-purple-400 font-medium">{wordCount}</span>
        &nbsp;{wordCount === 1 ? "word" : "words"}
      </div>
    </div>
  );
}
