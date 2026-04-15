import { v4 as uuidv4 } from "uuid";
import { http } from "../api/http";
import type { Template } from "../constants/templates";
import type { DocumentItem } from "../api/documents";
import type { Block } from "../features/editor/types";

/**
 * Creates a new document pre-filled with template blocks.
 * Uses only the existing REST API — no schema changes needed.
 *
 * Steps:
 *  1. POST /documents          → get document id
 *  2. PATCH /documents/:id     → rename to template's default title
 *  3. PUT /documents/:id/blocks/bulk → insert template blocks
 */
export async function createDocumentFromTemplate(template: Template): Promise<string> {
  // 1. Create blank document
  const { data: docData } = await http.post<{ document: DocumentItem }>("/documents", {
    title: template.defaultTitle,
  });
  const documentId = docData.document.id;

  // 2. Build block payloads with stable UUIDs and float order_index
  //    order_index = (index + 1) * 1000  → plenty of headroom for future inserts
  const blocks: Omit<Block, "documentId">[] = template.blocks.map((b, idx) => ({
    id: uuidv4(),
    type: b.type,
    content: b.content,
    orderIndex: (idx + 1) * 1000,
  }));

  // 3. Bulk-save blocks (replaces any default empty block the server may have created)
  await http.put(`/documents/${documentId}/blocks/bulk`, { blocks });

  return documentId;
}
