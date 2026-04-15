export type BlockType =
  | "paragraph"
  | "heading_1"
  | "heading_2"
  | "todo"
  | "code"
  | "divider"
  | "image";

export interface BlockContent {
  // Rich text for paragraph/heading_1/heading_2
  html?: string;
  // Plain text for code
  text?: string;
  // Todo
  checked?: boolean;
  // Image
  url?: string;
  caption?: string;
  // Text alignment
  align?: "left" | "center" | "right" | "justify";
}

export interface Block {
  id: string;
  documentId: string;
  type: BlockType;
  content: BlockContent;
  orderIndex: number;
}

export interface Document {
  id: string;
  title: string;
  updatedAt: string;
  isPublic: boolean;
  isPinned: boolean;
  icon: string | null;
  coverUrl: string | null;
  shareToken?: string | null;
  blocks?: Block[];
}

export type SaveStatus = "idle" | "saving" | "saved" | "error";
