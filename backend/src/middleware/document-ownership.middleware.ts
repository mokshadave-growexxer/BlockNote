import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../lib/prisma.js";

/**
 * Middleware to enforce document ownership for write operations.
 * Prevents modifications to shared documents even if user is authenticated.
 * 
 * Only allows GET requests on shared documents.
 * POST, PUT, DELETE, PATCH require full ownership.
 */
export async function enforceDocumentOwnership(request: Request, response: Response, next: NextFunction) {
  // Allow GET requests on all accessible documents
  if (request.method === "GET") {
    next();
    return;
  }

  // For write operations, verify ownership
  const documentIdParam = request.params.documentId;
  const documentId = Array.isArray(documentIdParam) ? documentIdParam[0] : documentIdParam;
  
  if (!documentId) {
    next();
    return;
  }

  const userId = request.auth?.userId;
  if (!userId) {
    response.status(StatusCodes.UNAUTHORIZED).json({ message: "Authentication required." });
    return;
  }

  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { userId: true }
  });

  if (!doc) {
    response.status(StatusCodes.NOT_FOUND).json({ message: "Document not found." });
    return;
  }

  // Only owner can modify
  if (doc.userId !== userId) {
    response.status(StatusCodes.FORBIDDEN).json({ message: "You do not have permission to modify this document." });
    return;
  }

  next();
}
