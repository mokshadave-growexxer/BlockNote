import { http } from "./http";

export type DocumentItem = {
  id: string;
  title: string;
  updatedAt: string;
  isPublic: boolean;
  isPinned: boolean;
  icon: string | null;
  coverUrl: string | null;
};

export async function fetchDocuments() {
  const { data } = await http.get<{ documents: DocumentItem[] }>("/documents");
  return data.documents;
}

export async function createDocument(title?: string) {
  const { data } = await http.post<{ document: DocumentItem }>("/documents", { title });
  return data.document;
}

export async function renameDocument(id: string, title: string) {
  const { data } = await http.patch<{ document: DocumentItem }>(`/documents/${id}`, { title });
  return data.document;
}

export async function deleteDocument(id: string) {
  await http.delete(`/documents/${id}`);
}

export async function togglePinDocument(id: string) {
  const { data } = await http.patch<{ document: DocumentItem }>(`/documents/${id}/pin`);
  return data.document;
}

export async function updateDocumentIcon(id: string, icon: string | null) {
  const { data } = await http.patch<{ document: DocumentItem }>(`/documents/${id}/icon`, { icon });
  return data.document;
}

export async function updateDocumentCover(id: string, coverUrl: string | null) {
  const { data } = await http.patch<{ document: DocumentItem }>(`/documents/${id}/cover`, { coverUrl });
  return data.document;
}
