import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { getOwnedDocumentOrNull } from "../services/document.service.js";

function getRouteParam(req: Request, key: string) {
  const value = req.params[key];
  return Array.isArray(value) ? value[0] : value;
}

export async function enableSharing(req: Request, res: Response) {
  const documentId = getRouteParam(req, "id");
  const doc = await getOwnedDocumentOrNull(req.auth!.userId, documentId);
  if (!doc) {
    res.status(StatusCodes.NOT_FOUND).json({ message: "Document not found." });
    return;
  }

  const shareToken = doc.shareToken ?? crypto.randomBytes(24).toString("hex");
  const updated = await prisma.document.update({
    where: { id: documentId },
    data: { shareToken, isPublic: true },
    select: { id: true, shareToken: true, isPublic: true }
  });

  res.status(StatusCodes.OK).json({ document: updated });
}

export async function disableSharing(req: Request, res: Response) {
  const documentId = getRouteParam(req, "id");
  const doc = await getOwnedDocumentOrNull(req.auth!.userId, documentId);
  if (!doc) {
    res.status(StatusCodes.NOT_FOUND).json({ message: "Document not found." });
    return;
  }

  const updated = await prisma.document.update({
    where: { id: documentId },
    data: { isPublic: false, shareToken: null },
    select: { id: true, shareToken: true, isPublic: true }
  });

  res.status(StatusCodes.OK).json({ document: updated });
}

export async function getSharedDocument(req: Request, res: Response) {
  const token = getRouteParam(req, "token");

  const document = await prisma.document.findUnique({
    where: { shareToken: token },
    select: {
      id: true,
      title: true,
      isPublic: true,
      isPinned: true,
      icon: true,
      coverUrl: true,
      updatedAt: true,
      blocks: {
        orderBy: { orderIndex: "asc" }
      }
    }
  });

  if (!document || !document.isPublic) {
    res.status(StatusCodes.NOT_FOUND).json({ message: "Shared document not found or sharing has been disabled." });
    return;
  }

  res.status(StatusCodes.OK).json({ document });
}
