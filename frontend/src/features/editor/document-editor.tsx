import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Share2, Link, EyeOff, Check, Copy, Pin, PinOff } from "lucide-react";
import { BlockEditor } from "./block-editor";
import { fetchBlocks, fetchDocument, enableSharing, disableSharing } from "./editor-api";
import { renameDocument, togglePinDocument, updateDocumentIcon, updateDocumentCover } from "../../api/documents";
import { EmojiPicker } from "../../components/EmojiPicker";
import { CoverImagePicker } from "../../components/CoverImage";
import { useThemeStore } from "../../store/theme-store";
import { useAIStore } from "../../store/ai-store";
import toast from "../../lib/toast";
import type { Block, Document } from "./types";
import { MioPanel } from "./MioPanel";

interface Props {
  documentId: string;
  onDocumentContextChange?: (text: string) => void;
}

export function DocumentEditor({ documentId, onDocumentContextChange }: Props) {
  const navigate = useNavigate();
  const { toggleTheme } = useThemeStore();
  const openAIModal = useAIStore((s) => s.openModal);

  const [doc, setDoc] = useState<Document | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [documentContext, setDocumentContext] = useState("");

  // AI apply ref so block-editor can receive applied text
  const applyAIRef = useRef<((text: string) => void) | null>(null);
  const insertMioRef = useRef<((markdown: string) => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [document, blockList] = await Promise.all([
          fetchDocument(documentId),
          fetchBlocks(documentId),
        ]);
        if (!cancelled) {
          setDoc(document);
          setBlocks(blockList);
          setShareToken(document.shareToken ?? null);
          setIsPublic(document.isPublic ?? false);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.response?.data?.message ?? "Failed to load document.");
          setLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [documentId]);

  // ── Keyboard shortcuts ──────────────────────────────────────────────
  const handleKeyboard = useCallback((e: KeyboardEvent) => {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;

    // Ctrl+S — save (already auto-saves, just show confirmation)
    if (e.key === "s" && !e.shiftKey) {
      e.preventDefault();
      toast.success("Document saved ✓");
      return;
    }
    // Ctrl+Shift+P — pin/unpin
    if ((e.key === "P" || e.key === "p") && e.shiftKey) {
      e.preventDefault();
      if (!doc) return;
      togglePinDocument(doc.id).then((updated) => {
        setDoc((d) => d ? { ...d, isPinned: updated.isPinned } : d);
        toast.info(updated.isPinned ? "Document pinned 📌" : "Document unpinned");
      });
      return;
    }
    // Ctrl+Shift+D — toggle dark mode
    if ((e.key === "D" || e.key === "d") && e.shiftKey) {
      e.preventDefault();
      toggleTheme();
      toast.info("Theme toggled");
      return;
    }
  }, [doc, toggleTheme]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyboard);
    return () => document.removeEventListener("keydown", handleKeyboard);
  }, [handleKeyboard]);

  const handleRenameSubmit = useCallback(async () => {
    if (!doc) { setEditingTitle(false); return; }
    const trimmed = titleDraft.trim();
    if (!trimmed) { setEditingTitle(false); return; }
    try {
      await renameDocument(doc.id, trimmed);
      setDoc((d) => d ? { ...d, title: trimmed } : d);
    } catch {}
    setEditingTitle(false);
  }, [doc, titleDraft]);

  const handleEnableShare = async () => {
    try {
      const { shareToken: token } = await enableSharing(documentId);
      setShareToken(token);
      setIsPublic(true);
    } catch {}
  };

  const handleDisableShare = async () => {
    try {
      await disableSharing(documentId);
      setShareToken(null);
      setIsPublic(false);
    } catch {}
  };

  const handleIconChange = async (icon: string | null) => {
    if (!doc) return;
    try {
      await updateDocumentIcon(doc.id, icon);
      setDoc((d) => d ? { ...d, icon } : d);
    } catch {}
  };

  const handleCoverChange = async (coverUrl: string | null) => {
    if (!doc) return;
    try {
      await updateDocumentCover(doc.id, coverUrl);
      setDoc((d) => d ? { ...d, coverUrl } : d);
      toast.success(coverUrl ? "Cover updated" : "Cover removed");
    } catch {
      toast.error("Failed to update cover");
    }
  };

  const handleTogglePin = async () => {
    if (!doc) return;
    try {
      const updated = await togglePinDocument(doc.id);
      setDoc((d) => d ? { ...d, isPinned: updated.isPinned } : d);
      toast.info(updated.isPinned ? "Document pinned 📌" : "Document unpinned");
    } catch {
      toast.error("Failed to update pin");
    }
  };

  // AI apply handler — replaces active block text
  const handleAIApply = useCallback((text: string) => {
    if (applyAIRef.current) {
      applyAIRef.current(text);
    }
  }, []);

  const handleMioInsert = useCallback((markdown: string) => {
    if (insertMioRef.current) {
      insertMioRef.current(markdown);
    }
  }, []);

  const handleDocumentContextChange = useCallback((text: string) => {
    setDocumentContext(text);
    onDocumentContextChange?.(text);
  }, [onDocumentContextChange]);

  const shareUrl = shareToken ? `${window.location.origin}/share/${shareToken}` : null;

  const copyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-slate-400">Loading document…</div>
  );
  if (error) return (
    <div className="py-24 text-center">
      <p className="text-rose-500">{error}</p>
      <button onClick={() => navigate("/dashboard")} className="mt-4 text-sm text-brand-500 hover:underline">
        ← Back to dashboard
      </button>
    </div>
  );

  return (
    <div className="flex min-h-[calc(100vh-89px)] flex-col items-stretch xl:h-[calc(100vh-89px)] xl:min-h-0 xl:flex-row xl:overflow-hidden">
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10 xl:min-h-0 xl:overflow-y-auto">
        <div className="mx-auto max-w-4xl">
          <div className="mb-7 flex flex-wrap items-center justify-between gap-2">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 rounded-lg border border-brand-200/70 bg-white/60 px-3 py-2 text-sm font-semibold text-slate-500 transition hover:text-brand-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300"
            >
              <ArrowLeft className="h-4 w-4" /> Library
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <CoverImagePicker value={doc?.coverUrl ?? null} onChange={handleCoverChange} />
              <button
                onClick={handleTogglePin}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  doc?.isPinned
                    ? "border-brand-300 bg-brand-100/70 text-brand-700 dark:border-brand-300/40 dark:bg-brand-400/10 dark:text-brand-100"
                    : "border-brand-200/70 bg-white/60 text-slate-500 hover:border-brand-300 hover:text-brand-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300"
                }`}
              >
                {doc?.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                {doc?.isPinned ? "Unpin" : "Pin"}
              </button>
              <button
                onClick={() => setShowSharePanel((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg border border-brand-200/70 bg-white/60 px-3 py-2 text-sm font-semibold text-slate-500 transition hover:border-brand-300 hover:text-brand-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300"
              >
                <Share2 className="h-4 w-4" /> Share
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-brand-200/60 bg-white/52 shadow-atelier dark:border-white/10 dark:bg-white/[0.035]">
            <div className="relative h-64 overflow-hidden">
              {doc?.coverUrl ? (
                <img src={doc.coverUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <img
                  src="https://images.unsplash.com/photo-1510936111840-65e151ad71bb?auto=format&fit=crop&w=1400&q=80"
                  alt=""
                  className="h-full w-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#080b14]/78 via-[#080b14]/18 to-transparent" />
            </div>

      {/* Share panel */}
      {showSharePanel && (
        <div className="m-6 rounded-lg border border-brand-200/70 bg-brand-50/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
          <h3 className="mb-3 font-semibold text-slate-800 dark:text-slate-100">Sharing</h3>
          {isPublic && shareUrl ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Anyone with the link can view this document (read-only).
              </p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  className="flex-1 truncate rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                />
                <button
                  onClick={copyLink}
                  className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs text-white hover:bg-brand-500"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <button
                onClick={handleDisableShare}
                className="flex items-center gap-1.5 text-sm text-rose-500 hover:underline"
              >
                <EyeOff className="h-4 w-4" /> Disable sharing
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Generate a public read-only link to share this document.
              </p>
              <button
                onClick={handleEnableShare}
                className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
              >
                <Link className="h-4 w-4" /> Generate share link
              </button>
            </div>
          )}
        </div>
      )}

      {/* Title row with emoji */}
            <div className="px-6 py-8 sm:px-10">
              <div className="mb-7 flex items-start gap-4">
                <EmojiPicker value={doc?.icon ?? null} onChange={handleIconChange} />
                <div className="min-w-0 flex-1">
                  <p className="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-brand-600 dark:text-brand-300">
                    Draft / BlockNote
                  </p>
                  {editingTitle ? (
                    <input
                      autoFocus
                      value={titleDraft}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      onBlur={handleRenameSubmit}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRenameSubmit();
                        if (e.key === "Escape") setEditingTitle(false);
                      }}
                      placeholder="Untitled document"
                      className="w-full bg-transparent font-serif text-5xl leading-tight text-slate-950 outline-none placeholder:text-slate-300 dark:text-white dark:placeholder:text-slate-600"
                    />
                  ) : (
                    <h1
                      className="cursor-text font-serif text-5xl leading-tight text-slate-950 hover:opacity-80 dark:text-white"
                      onClick={() => {
                        const isUntitled = /^untitled/i.test((doc?.title ?? "").trim());
                        setTitleDraft(isUntitled ? "" : (doc?.title ?? ""));
                        setEditingTitle(true);
                      }}
                      title="Click to rename"
                    >
                      {/^untitled/i.test((doc?.title ?? "").trim())
                        ? <span className="text-slate-300 dark:text-slate-600">Untitled document</span>
                        : doc?.title
                      }
                    </h1>
                  )}
                </div>
              </div>

      {/* Editor */}
              <BlockEditor
                documentId={documentId}
                initialBlocks={blocks}
                readOnly={false}
                onAIApplyRef={applyAIRef}
                onMioInsertRef={insertMioRef}
                onOpenAI={(action, text) => openAIModal(action, text)}
                onDocumentTextChange={handleDocumentContextChange}
              />
            </div>
          </div>
        </div>
      </main>
      <MioPanel documentContext={documentContext} onApply={handleAIApply} onInsertMarkdown={handleMioInsert} />
    </div>
  );
}
