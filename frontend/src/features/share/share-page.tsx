import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { fetchSharedDocument } from "../editor/editor-api";
import { BlockEditor } from "../editor/block-editor";
import type { Block, Document } from "../editor/types";

export function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [doc, setDoc] = useState<(Document & { blocks: Block[] }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setError("Invalid share link."); return; }
    fetchSharedDocument(token)
      .then(setDoc)
      .catch((e: any) => setError(e?.response?.data?.message ?? "Document not found or sharing has been disabled."));
  }, [token]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-900">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-900 dark:bg-rose-950/20">
          <p className="text-rose-600 dark:text-rose-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">Loading…</div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-2 text-xs font-medium uppercase tracking-widest text-brand-500">
          Shared document — read only
        </div>
        <h1 className="mb-8 text-4xl font-bold text-slate-900 dark:text-white">{doc.title}</h1>
        <BlockEditor
          documentId={doc.id}
          initialBlocks={doc.blocks}
          readOnly
        />
      </div>
    </div>
  );
}
