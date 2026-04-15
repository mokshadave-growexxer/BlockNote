import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { getOwnedDocumentOrNull, listDocuments } from "../services/document.service.js";

const createDocumentSchema = z.object({
  title: z.string().trim().min(1).max(120).optional()
});

const updateDocumentSchema = z.object({
  title: z.string().trim().min(1).max(120)
});

const iconSchema = z.object({
  icon: z.string().max(10).nullable()
});

const coverSchema = z.object({
  coverUrl: z.string().url().max(2000).nullable()
});

const SELECT_FIELDS = {
  id: true,
  title: true,
  updatedAt: true,
  isPublic: true,
  isPinned: true,
  icon: true,
  coverUrl: true
} as const;

function getDocumentId(request: Request) {
  return Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
}

async function assertOwned(request: Request, response: Response, documentId: string) {
  const owned = await getOwnedDocumentOrNull(request.auth!.userId, documentId);
  if (!owned) {
    const exists = await prisma.document.findUnique({ where: { id: documentId } });
    response
      .status(exists ? StatusCodes.FORBIDDEN : StatusCodes.NOT_FOUND)
      .json({ message: exists ? "You do not have access to this document." : "Document not found." });
    return null;
  }
  return owned;
}

export async function getDocuments(request: Request, response: Response) {
  const documents = await listDocuments(request.auth!.userId);
  response.status(StatusCodes.OK).json({ documents });
}

export async function createDocument(request: Request, response: Response) {
  const payload = createDocumentSchema.parse(request.body);
  const document = await prisma.document.create({
    data: {
      title: payload.title ?? "Untitled Document",
      userId: request.auth!.userId
    },
    select: SELECT_FIELDS
  });
  response.status(StatusCodes.CREATED).json({ document });
}

export async function getDocument(request: Request, response: Response) {
  const documentId = getDocumentId(request);
  const owned = await getOwnedDocumentOrNull(request.auth!.userId, documentId);

  if (!owned) {
    const exists = await prisma.document.findUnique({ where: { id: documentId } });
    response
      .status(exists ? StatusCodes.FORBIDDEN : StatusCodes.NOT_FOUND)
      .json({ message: exists ? "You do not have access to this document." : "Document not found." });
    return;
  }

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      ...SELECT_FIELDS,
      shareToken: true,
      isPublic: true,
    }
  });

  response.status(StatusCodes.OK).json({ document });
}

export async function updateDocument(request: Request, response: Response) {
  const documentId = getDocumentId(request);
  const owned = await assertOwned(request, response, documentId);
  if (!owned) return;

  const payload = updateDocumentSchema.parse(request.body);
  const document = await prisma.document.update({
    where: { id: documentId },
    data: { title: payload.title },
    select: SELECT_FIELDS
  });
  response.status(StatusCodes.OK).json({ document });
}

export async function deleteDocument(request: Request, response: Response) {
  const documentId = getDocumentId(request);
  const owned = await assertOwned(request, response, documentId);
  if (!owned) return;

  await prisma.document.delete({ where: { id: documentId } });
  response.status(StatusCodes.OK).json({ message: "Document deleted." });
}

export async function togglePin(request: Request, response: Response) {
  const documentId = getDocumentId(request);
  const owned = await assertOwned(request, response, documentId);
  if (!owned) return;

  const document = await prisma.document.update({
    where: { id: documentId },
    data: { isPinned: !owned.isPinned },
    select: SELECT_FIELDS
  });
  response.status(StatusCodes.OK).json({ document });
}

export async function updateIcon(request: Request, response: Response) {
  const documentId = getDocumentId(request);
  const owned = await assertOwned(request, response, documentId);
  if (!owned) return;

  const payload = iconSchema.parse(request.body);
  const document = await prisma.document.update({
    where: { id: documentId },
    data: { icon: payload.icon },
    select: SELECT_FIELDS
  });
  response.status(StatusCodes.OK).json({ document });
}

export async function updateCover(request: Request, response: Response) {
  const documentId = getDocumentId(request);
  const owned = await assertOwned(request, response, documentId);
  if (!owned) return;

  const payload = coverSchema.parse(request.body);
  const document = await prisma.document.update({
    where: { id: documentId },
    data: { coverUrl: payload.coverUrl },
    select: SELECT_FIELDS
  });
  response.status(StatusCodes.OK).json({ document });
}
