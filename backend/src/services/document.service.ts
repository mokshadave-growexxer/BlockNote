import { prisma } from "../lib/prisma.js";

export async function listDocuments(userId: string) {
  return prisma.document.findMany({
    where: { userId },
    orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      updatedAt: true,
      isPublic: true,
      isPinned: true,
      icon: true,
      coverUrl: true
    }
  });
}

export async function getOwnedDocumentOrNull(userId: string, documentId: string) {
  return prisma.document.findFirst({
    where: {
      id: documentId,
      userId
    }
  });
}
