import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Clock3,
  FileText,
  Grid2X2,
  LayoutList,
  Pin,
  PinOff,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createDocument,
  deleteDocument,
  fetchDocuments,
  renameDocument,
  togglePinDocument,
  updateDocumentIcon,
} from "../../api/documents";
import { Button } from "../../components/button";
import { EmojiPicker } from "../../components/EmojiPicker";
import { TemplateButton } from "../../components/templates/TemplateButton";
import { TemplateModal } from "../../components/templates/TemplateModal";
import { TEMPLATES } from "../../constants/templates";
import toast from "../../lib/toast";
import { useThemeStore } from "../../store/theme-store";

type SortMode = "recent" | "oldest" | "title";
type ViewMode = "grid" | "list";

const fallbackCovers = [
  "https://images.unsplash.com/photo-1510936111840-65e151ad71bb?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80"
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function getReadableTitle(title: string) {
  return /^untitled/i.test(title.trim()) ? "Untitled document" : title;
}

export function DocumentDashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toggleTheme } = useThemeStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const documentsQuery = useQuery({ queryKey: ["documents"], queryFn: fetchDocuments });

  const createMutation = useMutation({
    mutationFn: () => createDocument(),
    onSuccess: async (doc) => {
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
      navigate(`/editor/${doc.id}`);
    },
    onError: () => toast.error("Failed to create document"),
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => renameDocument(id, title),
    onSuccess: async () => {
      setEditingId(null);
      setDraftTitle("");
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDocument,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document deleted");
    },
    onError: () => toast.error("Failed to delete document"),
  });

  const pinMutation = useMutation({
    mutationFn: togglePinDocument,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["documents"] });
      const prev = queryClient.getQueryData<Awaited<ReturnType<typeof fetchDocuments>>>(["documents"]);
      queryClient.setQueryData<Awaited<ReturnType<typeof fetchDocuments>>>(["documents"], (old) =>
        old?.map((d) => d.id === id ? { ...d, isPinned: !d.isPinned } : d)
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["documents"], ctx.prev);
      toast.error("Failed to update pin");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["documents"] }),
  });

  const iconMutation = useMutation({
    mutationFn: ({ id, icon }: { id: string; icon: string | null }) => updateDocumentIcon(id, icon),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents"] }),
  });

  const documents = useMemo(() => {
    const base = documentsQuery.data ?? [];
    const filtered = base.filter((document) =>
      getReadableTitle(document.title).toLowerCase().includes(query.trim().toLowerCase())
    );

    return [...filtered].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      if (sortMode === "title") return getReadableTitle(a.title).localeCompare(getReadableTitle(b.title));
      const aTime = new Date(a.updatedAt).getTime();
      const bTime = new Date(b.updatedAt).getTime();
      return sortMode === "oldest" ? aTime - bTime : bTime - aTime;
    });
  }, [documentsQuery.data, query, sortMode]);

  const pinned = documents.filter((document) => document.isPinned);
  const recent = documents.filter((document) => !document.isPinned);

  const submitRename = useCallback((id: string) => {
    renameMutation.mutate({ id, title: draftTitle.trim() || "Untitled Document" });
  }, [draftTitle, renameMutation]);

  const handleKeyboard = useCallback((e: KeyboardEvent) => {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;

    if (e.key === "n" && !e.shiftKey) {
      e.preventDefault();
      createMutation.mutate();
    }
    if ((e.key === "D" || e.key === "d") && e.shiftKey) {
      e.preventDefault();
      toggleTheme();
      toast.info("Theme toggled");
    }
  }, [createMutation, toggleTheme]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyboard);
    return () => document.removeEventListener("keydown", handleKeyboard);
  }, [handleKeyboard]);

  const renderDocumentCard = (document: NonNullable<typeof documentsQuery.data>[number], index: number) => {
    const title = getReadableTitle(document.title);
    const cover = document.coverUrl || fallbackCovers[index % fallbackCovers.length];

    return (
      <article
        key={document.id}
        className="group overflow-hidden rounded-lg border border-brand-200/60 bg-white/74 shadow-atelier transition hover:-translate-y-1 hover:border-brand-300 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-brand-300/40"
      >
        <button type="button" onClick={() => navigate(`/editor/${document.id}`)} className="block w-full text-left">
          <div className="relative h-40 overflow-hidden">
            <img src={cover} alt="" className="h-full w-full object-cover opacity-82 transition duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080b14]/84 via-[#080b14]/20 to-transparent" />
            <div className="absolute bottom-4 left-4 flex items-center gap-2">
              <span className="rounded-full bg-white/12 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-white backdrop-blur">
                {document.isPinned ? "Pinned" : "Document"}
              </span>
            </div>
          </div>
        </button>

        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="shrink-0">
              {editingId === document.id ? (
                <EmojiPicker
                  value={document.icon}
                  onChange={(icon) => iconMutation.mutate({ id: document.id, icon })}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => navigate(`/editor/${document.id}`)}
                  className="flex h-11 w-11 items-center justify-center rounded-lg border border-brand-200/70 bg-brand-50 text-2xl dark:border-white/10 dark:bg-white/[0.06]"
                >
                  {document.icon || <FileText className="h-5 w-5 text-brand-500" />}
                </button>
              )}
            </div>
            <div className="min-w-0 flex-1">
              {editingId === document.id ? (
                <form onSubmit={(e) => { e.preventDefault(); submitRename(document.id); }}>
                  <input
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    onBlur={() => submitRename(document.id)}
                    autoFocus
                    className="w-full rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 dark:border-white/10 dark:bg-[#080b14]"
                  />
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(document.id);
                    setDraftTitle(/^untitled/i.test(document.title.trim()) ? "" : document.title);
                  }}
                  className="line-clamp-2 text-left font-serif text-2xl leading-tight text-slate-950 transition hover:text-brand-700 dark:text-white dark:hover:text-brand-200"
                  title="Click to rename"
                >
                  {title}
                </button>
              )}
              <p className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Clock3 className="h-3.5 w-3.5" />
                Updated {formatDate(document.updatedAt)}
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-2 border-t border-brand-100 pt-4 dark:border-white/10">
            <button
              type="button"
              onClick={() => navigate(`/editor/${document.id}`)}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 dark:bg-brand-300 dark:text-[#090b14] dark:hover:bg-brand-200"
            >
              Open
              <ArrowRight className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => pinMutation.mutate(document.id)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-white/5"
                title={document.isPinned ? "Unpin document" : "Pin document"}
              >
                {document.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(document.id)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                aria-label={`Delete ${title}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </article>
    );
  };

  const renderDocumentRow = (document: NonNullable<typeof documentsQuery.data>[number]) => {
    const title = getReadableTitle(document.title);

    return (
      <article
        key={document.id}
        className="grid gap-4 border-b border-brand-100/80 px-4 py-4 transition hover:bg-brand-50/70 dark:border-white/10 dark:hover:bg-white/[0.04] md:grid-cols-[1fr_220px_130px]"
      >
        <div className="flex min-w-0 items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(`/editor/${document.id}`)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-xl dark:bg-white/[0.06]"
          >
            {document.icon || <FileText className="h-5 w-5 text-brand-500" />}
          </button>
          <div className="min-w-0">
            <button type="button" onClick={() => navigate(`/editor/${document.id}`)} className="truncate text-left font-semibold text-slate-900 hover:text-brand-700 dark:text-white">
              {title}
            </button>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{document.isPinned ? "Pinned note" : "Library note"}</p>
          </div>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{formatDate(document.updatedAt)}</p>
        <div className="flex items-center justify-start gap-1 md:justify-end">
          <button type="button" onClick={() => pinMutation.mutate(document.id)} className="rounded-lg p-2 text-slate-400 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-white/5">
            {document.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
          </button>
          <button type="button" onClick={() => deleteMutation.mutate(document.id)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </article>
    );
  };

  return (
    <>
      <TemplateModal />
      <section className="px-4 py-8 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
            <div>
              <MotionHeader />
              <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {TEMPLATES.slice(0, 4).map((template) => (
                  <div key={template.id} className="rounded-lg border border-brand-200/60 bg-white/62 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
                    <p className="text-2xl">{template.icon}</p>
                    <h3 className="mt-3 font-semibold text-slate-950 dark:text-white">{template.name}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{template.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <aside className="rounded-lg border border-brand-200/60 bg-white/64 p-5 shadow-atelier dark:border-white/10 dark:bg-white/[0.04]">
              <p className="text-xs font-bold uppercase tracking-[0.26em] text-brand-600 dark:text-brand-300">Quick Start</p>
              <h2 className="mt-4 font-serif text-3xl text-slate-950 dark:text-white">Shape a new draft.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Start blank or use an existing template. Your notes auto-save in the editor.
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <Button
                  type="button"
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending}
                  className="h-12 rounded-lg bg-gradient-to-r from-brand-300 to-brand-600 shadow-glow"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Document
                </Button>
                <TemplateButton className="h-12 rounded-lg" />
              </div>
            </aside>
          </div>

          <div className="mt-10 rounded-lg border border-brand-200/60 bg-white/64 shadow-atelier dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex flex-col gap-4 border-b border-brand-100/80 p-5 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-serif text-3xl text-slate-950 dark:text-white">
                  {pinned.length > 0 ? "Pinned Documents" : "All Documents"}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {documents.length} item{documents.length === 1 ? "" : "s"} in your library
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="flex h-11 min-w-0 items-center gap-2 rounded-lg border border-brand-200/70 bg-white/70 px-3 text-sm text-slate-500 dark:border-white/10 dark:bg-[#080b14]/70">
                  <Search className="h-4 w-4" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search documents..."
                    className="min-w-0 bg-transparent outline-none placeholder:text-slate-400"
                  />
                </label>
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className="h-11 rounded-lg border border-brand-200/70 bg-white/70 px-3 text-sm font-medium outline-none dark:border-white/10 dark:bg-[#080b14]/70"
                >
                  <option value="recent">Sort: Recent</option>
                  <option value="oldest">Sort: Oldest</option>
                  <option value="title">Sort: Title</option>
                </select>
                <div className="flex h-11 rounded-lg border border-brand-200/70 bg-white/70 p-1 dark:border-white/10 dark:bg-[#080b14]/70">
                  <button type="button" onClick={() => setViewMode("grid")} className={`rounded-md px-3 ${viewMode === "grid" ? "bg-brand-100 text-brand-700 dark:bg-white/10 dark:text-white" : "text-slate-400"}`} aria-label="Grid view">
                    <Grid2X2 className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => setViewMode("list")} className={`rounded-md px-3 ${viewMode === "list" ? "bg-brand-100 text-brand-700 dark:bg-white/10 dark:text-white" : "text-slate-400"}`} aria-label="List view">
                    <LayoutList className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {documentsQuery.isLoading ? (
              <div className="p-10 text-sm text-slate-500 dark:text-slate-400">Loading documents...</div>
            ) : documents.length === 0 ? (
              <div className="p-10 text-center">
                <SlidersHorizontal className="mx-auto h-8 w-8 text-brand-400" />
                <h3 className="mt-4 font-serif text-3xl text-slate-950 dark:text-white">No documents found</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Create a document or adjust your search.</p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="space-y-8 p-5">
                {pinned.length > 0 ? (
                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {pinned.map(renderDocumentCard)}
                  </div>
                ) : null}
                {recent.length > 0 ? (
                  <div>
                    {pinned.length > 0 ? <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">Recent Notes</h3> : null}
                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                      {recent.map(renderDocumentCard)}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div>
                <div className="hidden grid-cols-[1fr_220px_130px] px-4 py-3 text-xs font-bold uppercase tracking-[0.24em] text-slate-400 md:grid">
                  <span>Name</span>
                  <span>Last Modified</span>
                  <span className="text-right">Actions</span>
                </div>
                {documents.map(renderDocumentRow)}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function MotionHeader() {
  return (
    <div className="rounded-lg border border-brand-200/60 bg-white/56 p-8 shadow-atelier backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
      <p className="text-xs font-bold uppercase tracking-[0.32em] text-brand-600 dark:text-brand-300">BlockNote / Library</p>
      <h1 className="mt-5 max-w-4xl font-serif text-5xl leading-tight text-slate-950 dark:text-white">
        Curated documents for your sharpest notes.
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
        Organize drafts, pin important work, start from templates, and open the editor when the next idea arrives.
      </p>
    </div>
  );
}
