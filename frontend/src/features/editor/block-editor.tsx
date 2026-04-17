import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Block, BlockType, BlockContent, SaveStatus } from "./types";
import { BlockComponent } from "./block-component";
import type { BlockHandle } from "./block-component";
import { SlashMenu } from "./slash-menu";
import { RichTextToolbar } from "./toolbar";
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
  onMioInsertRef?: React.MutableRefObject<((markdown: string) => void) | null>;
  onOpenAI?: (action: AIAction, text: string) => void;
  onDocumentTextChange?: (text: string) => void;
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

function markdownInlineToHtml(markdown: string) {
  const escaped = textToHtml(markdown);
  return escaped
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

function stripMarkdownTableDivider(line: string) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function parseMarkdownToBlockData(markdown: string): Array<{ type: BlockType; content: BlockContent }> {
  const normalized = markdown.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const blocks: Array<{ type: BlockType; content: BlockContent }> = [];
  const paragraphLines: string[] = [];
  const lines = normalized.split("\n");
  let inCode = false;
  let codeLines: string[] = [];

  const flushParagraph = () => {
    const text = paragraphLines.join("\n").trim();
    paragraphLines.length = 0;
    if (!text) return;
    blocks.push({ type: "paragraph", content: { html: markdownInlineToHtml(text) } });
  };

  const addParagraph = (text: string) => {
    if (!text.trim()) return;
    blocks.push({ type: "paragraph", content: { html: markdownInlineToHtml(text.trim()) } });
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.trim().startsWith("```")) {
      if (inCode) {
        blocks.push({ type: "code", content: { text: codeLines.join("\n") } });
        codeLines = [];
        inCode = false;
      } else {
        flushParagraph();
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeLines.push(rawLine);
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      continue;
    }

    const imageMatch = trimmed.match(/^!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)$/);
    if (imageMatch) {
      flushParagraph();
      blocks.push({ type: "image", content: { url: imageMatch[1], caption: "" } });
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      flushParagraph();
      blocks.push({ type: "divider", content: {} });
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      blocks.push({
        type: headingMatch[1].length === 1 ? "heading_1" : "heading_2",
        content: { html: markdownInlineToHtml(headingMatch[2]) }
      });
      continue;
    }

    const todoMatch = trimmed.match(/^[-*]\s+\[( |x|X)\]\s+(.+)$/);
    if (todoMatch) {
      flushParagraph();
      blocks.push({
        type: "todo",
        content: { html: markdownInlineToHtml(todoMatch[2]), checked: todoMatch[1].toLowerCase() === "x" }
      });
      continue;
    }

    if (stripMarkdownTableDivider(trimmed)) continue;

    const tableRowMatch = trimmed.match(/^\|(.+)\|$/);
    if (tableRowMatch) {
      flushParagraph();
      const cells = tableRowMatch[1].split("|").map((cell) => cell.trim()).filter(Boolean);
      addParagraph(cells.join(" | "));
      continue;
    }

    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      addParagraph(`• ${bulletMatch[1]}`);
      continue;
    }

    const numberedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (numberedMatch) {
      flushParagraph();
      addParagraph(trimmed);
      continue;
    }

    paragraphLines.push(line);
  }

  if (inCode) blocks.push({ type: "code", content: { text: codeLines.join("\n") } });
  flushParagraph();

  return blocks.length > 0 ? blocks : [{ type: "paragraph", content: { html: markdownInlineToHtml(normalized) } }];
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

export function BlockEditor({
  documentId,
  initialBlocks,
  readOnly = false,
  onAIApplyRef,
  onMioInsertRef,
  onOpenAI,
  onDocumentTextChange,
}: EditorProps) {
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
      
      // Find all text blocks
      const textBlockIndices: number[] = [];
      sorted.forEach((block, idx) => {
        if (AI_EDITABLE_TYPES.includes(block.type)) {
          textBlockIndices.push(idx);
        }
      });
      
      if (textBlockIndices.length === 0) return prev;

      // Check if result has markdown structure (headings, lists, etc.)
      const hasMarkdown = /^#+\s|\n#+\s|^[-*]\s|\n[-*]\s|^\d+\.\s|\n\d+\.\s|```|^>|\n>/.test(cleaned);
      
      if (hasMarkdown) {
        // Parse as markdown and smart-distribute
        const parsedBlocks = parseMarkdownToBlockData(cleaned);
        if (parsedBlocks.length === 0) return prev;

        // Build the new block list by replacing text blocks with parsed ones
        const newSorted: Block[] = [];
        let parsedIndex = 0;

        sorted.forEach((block, idx) => {
          if (textBlockIndices.includes(idx)) {
            // This is a text block - replace with parsed content
            if (parsedIndex < parsedBlocks.length) {
              const parsedBlock = parsedBlocks[parsedIndex++];
              newSorted.push({
                ...block,
                type: parsedBlock.type as BlockType,
                content: parsedBlock.content,
              });
            }
          } else {
            // Non-text block - keep as is
            newSorted.push(block);
          }
        });

        // If there are more parsed blocks than text blocks, append them
        while (parsedIndex < parsedBlocks.length) {
          const parsedBlock = parsedBlocks[parsedIndex++];
          const lastBlock = newSorted[newSorted.length - 1];
          const newOrderIndex = midpoint(lastBlock?.orderIndex, undefined);
          newSorted.push(makeBlock(documentId, parsedBlock.type as BlockType, newOrderIndex, parsedBlock.content));
        }

        return reindex(newSorted);
      } else {
        // Plain text - preserve block types and just update content
        // BUT: Apply markdown inline conversion for formatting like **bold**, *italic*, `code`
        let chunkIndex = 0;
        const sourceTexts = sorted
          .filter((block, idx) => textBlockIndices.includes(idx))
          .map((block) => htmlToText(block.content.html ?? ""));
        const chunks = splitTextForBlocks(cleaned, sourceTexts);
        
        const updated = sorted.map((block, idx) => {
          if (!textBlockIndices.includes(idx)) return block;
          const chunk = chunks[chunkIndex++] ?? "";
          return {
            ...block,
            content: {
              ...block.content,
              html: markdownInlineToHtml(chunk),
              text: chunk,
            },
          };
        });

        return reindex(updated);
      }
    });
  }, [documentId]);

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

  const handleMioInsert = useCallback((markdown: string) => {
    const parsedBlocks = parseMarkdownToBlockData(markdown);
    if (parsedBlocks.length === 0) return;

    let firstInsertedId = "";
    setBlocks((prev) => {
      const sorted = [...prev].sort((a, b) => a.orderIndex - b.orderIndex);
      const activeIndex = activeBlockId ? sorted.findIndex((block) => block.id === activeBlockId) : -1;
      const insertIndex = activeIndex >= 0 ? activeIndex + 1 : sorted.length;
      const before = sorted[insertIndex - 1];
      const after = sorted[insertIndex];
      const step = after
        ? (after.orderIndex - (before?.orderIndex ?? after.orderIndex - 1000)) / (parsedBlocks.length + 1)
        : 1000;
      const start = before?.orderIndex ?? ((after?.orderIndex ?? 1000) - step * (parsedBlocks.length + 1));
      const inserted = parsedBlocks.map((block, index) => {
        const newBlock = makeBlock(documentId, block.type, start + step * (index + 1), block.content);
        if (index === 0) firstInsertedId = newBlock.id;
        return newBlock;
      });
      const next = [...sorted];
      next.splice(insertIndex, 0, ...inserted);
      return reindex(next);
    });
    requestAnimationFrame(() => {
      if (firstInsertedId) focusBlock(firstInsertedId, true);
    });
  }, [activeBlockId, documentId, focusBlock]);

  useEffect(() => {
    if (onMioInsertRef) onMioInsertRef.current = handleMioInsert;
  }, [handleMioInsert, onMioInsertRef]);

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
        // Create new block with same type if heading, otherwise paragraph
        const newBlockType = (current.type === "heading_1" || current.type === "heading_2") ? current.type : "paragraph";
        const newBlock = makeBlock(documentId, newBlockType, newIdx, { html: afterHTML });
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
        // If previous block is divider/image, just focus it (don't delete current)
        if (NON_TEXT_TYPES.includes(prevBlock.type)) {
          requestAnimationFrame(() => focusBlock(prevBlock.id, true));
          return prev;
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

  const handleDeleteBlock = useCallback((blockId: string) => {
    let nextFocusId: string | null = null;
    setBlocks((prev) => {
      const sorted = [...prev].sort((a, b) => a.orderIndex - b.orderIndex);
      const idx = sorted.findIndex((block) => block.id === blockId);
      if (idx === -1) return prev;

      if (sorted.length === 1) {
        const replacement = makeBlock(documentId, "paragraph", 1000, { html: "" });
        nextFocusId = replacement.id;
        return [replacement];
      }

      nextFocusId = sorted[idx - 1]?.id ?? sorted[idx + 1]?.id ?? null;
      return sorted.filter((block) => block.id !== blockId);
    });

    requestAnimationFrame(() => {
      if (nextFocusId) focusBlock(nextFocusId, true);
    });
  }, [documentId, focusBlock]);

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

  useEffect(() => {
    onDocumentTextChange?.(documentText);
  }, [documentText, onDocumentTextChange]);

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
              const showAddButton = isNonEditable || block.type === "code";
              return (
                <div 
                  key={block.id} 
                  onClick={() => setActiveBlockId(block.id)}
                  className={`group/block ${!readOnly ? "cursor-pointer" : ""}`}
                >
                  {/* Insert ABOVE - only for image/divider/code */}
                  {!readOnly && showAddButton && (
                    <div className="opacity-0 group-hover/block:opacity-100 transition-opacity">
                      <BlockSpacer onInsert={() => insertBlockAt(index)} />
                    </div>
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
                        onDelete={handleDeleteBlock}
                        dragHandleProps={dragHandleProps}
                      />
                    )}
                  </SortableBlockWrapper>

                  {/* Insert BELOW - only for image/divider/code */}
                  {!readOnly && showAddButton && (
                    <div className="opacity-0 group-hover/block:opacity-100 transition-opacity">
                      <BlockSpacer onInsert={() => insertBlockAt(index + 1)} />
                    </div>
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

      {/* Word count badge */}
      <div className="fixed bottom-4 right-6 z-50 rounded-lg border border-brand-200 bg-white/86 px-3 py-1.5 text-xs text-gray-500 shadow-md backdrop-blur select-none pointer-events-none dark:border-white/10 dark:bg-[#080b14]/86 dark:text-gray-400 xl:right-[390px]">
        <span className="text-purple-500 dark:text-purple-400 font-medium">{wordCount}</span>
        &nbsp;{wordCount === 1 ? "word" : "words"}
      </div>
    </div>
  );
}
