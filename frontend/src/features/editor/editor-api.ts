import { http } from "../../api/http";
import type { Block, Document } from "../editor/types";

export async function fetchDocument(id: string): Promise<Document> {
  const { data } = await http.get<{ document: Document }>(`/documents/${id}`);
  return {
    ...data.document,
    isPinned: data.document.isPinned ?? false,
    icon: data.document.icon ?? null,
    coverUrl: data.document.coverUrl ?? null,
  };
}

export async function fetchBlocks(documentId: string): Promise<Block[]> {
  const { data } = await http.get<{ blocks: Block[] }>(`/documents/${documentId}/blocks`);
  return data.blocks;
}

export async function bulkSaveBlocks(documentId: string, blocks: Omit<Block, "documentId">[]): Promise<Block[]> {
  const { data } = await http.put<{ blocks: Block[] }>(`/documents/${documentId}/blocks/bulk`, { blocks });
  return data.blocks;
}

export async function enableSharing(documentId: string): Promise<{ shareToken: string }> {
  const { data } = await http.post<{ document: { shareToken: string } }>(`/documents/${documentId}/share`);
  return { shareToken: data.document.shareToken };
}

export async function disableSharing(documentId: string): Promise<void> {
  await http.delete(`/documents/${documentId}/share`);
}

export async function fetchSharedDocument(token: string): Promise<Document & { blocks: Block[] }> {
  const { data } = await http.get<{ document: Document & { blocks: Block[] } }>(`/share/${token}`);
  return data.document;
}

export async function reorderBlocksApi(
  documentId: string,
  blocks: { id: string; orderIndex: number }[]
): Promise<void> {
  await http.put(`/documents/${documentId}/blocks/reorder`, { blocks });
}
