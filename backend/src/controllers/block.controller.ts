import type { Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { getOwnedDocumentOrNull } from "../services/document.service.js";

const BlockTypeEnum = z.enum(["paragraph", "heading_1", "heading_2", "todo", "code", "divider", "image"]);

const createBlockSchema = z.object({
  type: BlockTypeEnum.default("paragraph"),
  content: z.record(z.unknown()).default({}),
  orderIndex: z.number(),
  afterBlockId: z.string().uuid().optional()
});

const updateBlockSchema = z.object({
  type: BlockTypeEnum.optional(),
  content: z.record(z.unknown()).optional(),
  orderIndex: z.number().optional()
});

const reorderBlocksSchema = z.object({
  blocks: z.array(z.object({ id: z.string().uuid(), orderIndex: z.number() }))
});

function getRouteParam(req: Request, key: string) {
  const value = req.params[key];
  return Array.isArray(value) ? value[0] : value;
}

function toInputJsonValue(value: Record<string, unknown>) {
  return value as Prisma.InputJsonValue;
}

async function checkDocumentAccess(userId: string, documentId: string, res: Response) {
  const doc = await getOwnedDocumentOrNull(userId, documentId);
  if (!doc) {
    const exists = await prisma.document.findUnique({ where: { id: documentId } });
    res.status(exists ? StatusCodes.FORBIDDEN : StatusCodes.NOT_FOUND)
       .json({ message: exists ? "You do not have access to this document." : "Document not found." });
    return null;
  }
  return doc;
}

export async function getBlocks(req: Request, res: Response) {
  const documentId = getRouteParam(req, "documentId");
  const doc = await checkDocumentAccess(req.auth!.userId, documentId, res);
  if (!doc) return;

  const blocks = await prisma.block.findMany({
    where: { documentId },
    orderBy: { orderIndex: "asc" }
  });
  res.status(StatusCodes.OK).json({ blocks });
}

export async function createBlock(req: Request, res: Response) {
  const documentId = getRouteParam(req, "documentId");
  const doc = await checkDocumentAccess(req.auth!.userId, documentId, res);
  if (!doc) return;

  const payload = createBlockSchema.parse(req.body);

  // Re-normalise if gap < 0.001 between any two adjacent blocks
  const existingBlocks = await prisma.block.findMany({
    where: { documentId },
    orderBy: { orderIndex: "asc" },
    select: { id: true, orderIndex: true }
  });

  // Check if normalization needed
  let needsNorm = false;
  for (let i = 1; i < existingBlocks.length; i++) {
    if (existingBlocks[i].orderIndex - existingBlocks[i - 1].orderIndex < 0.001) {
      needsNorm = true;
      break;
    }
  }

  if (needsNorm) {
    // Re-index all existing blocks with spacing of 1000
    await Promise.all(
      existingBlocks.map((b, idx) =>
        prisma.block.update({ where: { id: b.id }, data: { orderIndex: (idx + 1) * 1000 } })
      )
    );
  }

  const block = await prisma.block.create({
    data: {
      documentId,
      type: payload.type,
      content: toInputJsonValue(payload.content),
      orderIndex: payload.orderIndex
    }
  });

  // Touch document updatedAt
  await prisma.document.update({ where: { id: documentId }, data: { updatedAt: new Date() } });

  res.status(StatusCodes.CREATED).json({ block });
}

export async function updateBlock(req: Request, res: Response) {
  const documentId = getRouteParam(req, "documentId");
  const blockId = getRouteParam(req, "blockId");
  const doc = await checkDocumentAccess(req.auth!.userId, documentId, res);
  if (!doc) return;

  const existing = await prisma.block.findFirst({ where: { id: blockId, documentId } });
  if (!existing) {
    res.status(StatusCodes.NOT_FOUND).json({ message: "Block not found." });
    return;
  }

  const payload = updateBlockSchema.parse(req.body);
  const block = await prisma.block.update({
    where: { id: blockId },
    data: {
      ...(payload.type !== undefined && { type: payload.type }),
      ...(payload.content !== undefined && { content: toInputJsonValue(payload.content) }),
      ...(payload.orderIndex !== undefined && { orderIndex: payload.orderIndex })
    }
  });

  await prisma.document.update({ where: { id: documentId }, data: { updatedAt: new Date() } });

  res.status(StatusCodes.OK).json({ block });
}

export async function deleteBlock(req: Request, res: Response) {
  const documentId = getRouteParam(req, "documentId");
  const blockId = getRouteParam(req, "blockId");
  const doc = await checkDocumentAccess(req.auth!.userId, documentId, res);
  if (!doc) return;

  const existing = await prisma.block.findFirst({ where: { id: blockId, documentId } });
  if (!existing) {
    res.status(StatusCodes.NOT_FOUND).json({ message: "Block not found." });
    return;
  }

  await prisma.block.delete({ where: { id: blockId } });
  await prisma.document.update({ where: { id: documentId }, data: { updatedAt: new Date() } });

  res.status(StatusCodes.OK).json({ message: "Block deleted." });
}

export async function reorderBlocks(req: Request, res: Response) {
  const documentId = getRouteParam(req, "documentId");
  const doc = await checkDocumentAccess(req.auth!.userId, documentId, res);
  if (!doc) return;

  const payload = reorderBlocksSchema.parse(req.body);

  await Promise.all(
    payload.blocks.map((b) =>
      prisma.block.updateMany({
        where: { id: b.id, documentId },
        data: { orderIndex: b.orderIndex }
      })
    )
  );

  await prisma.document.update({ where: { id: documentId }, data: { updatedAt: new Date() } });

  res.status(StatusCodes.OK).json({ message: "Reordered." });
}

export async function bulkSaveBlocks(req: Request, res: Response) {
  const documentId = getRouteParam(req, "documentId");
  const doc = await checkDocumentAccess(req.auth!.userId, documentId, res);
  if (!doc) return;

  const schema = z.object({
    blocks: z.array(z.object({
      id: z.string().uuid().optional(),
      type: BlockTypeEnum,
      content: z.record(z.unknown()),
      orderIndex: z.number()
    })),
    version: z.number().optional()
  });

  const payload = schema.parse(req.body);

  // Delete all existing blocks and recreate (full replace)
  await prisma.$transaction(async (tx) => {
    await tx.block.deleteMany({ where: { documentId } });
    if (payload.blocks.length > 0) {
      await tx.block.createMany({
        data: payload.blocks.map((b) => ({
          id: b.id,
          documentId,
          type: b.type,
          content: toInputJsonValue(b.content),
          orderIndex: b.orderIndex
        }))
      });
    }
    await tx.document.update({ where: { id: documentId }, data: { updatedAt: new Date() } });
  });

  const blocks = await prisma.block.findMany({
    where: { documentId },
    orderBy: { orderIndex: "asc" }
  });

  res.status(StatusCodes.OK).json({ blocks });
}
