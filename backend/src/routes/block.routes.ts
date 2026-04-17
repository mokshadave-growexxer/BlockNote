import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { enforceDocumentOwnership } from "../middleware/document-ownership.middleware.js";
import {
  getBlocks,
  createBlock,
  updateBlock,
  deleteBlock,
  reorderBlocks,
  bulkSaveBlocks
} from "../controllers/block.controller.js";

export const blockRouter = Router({ mergeParams: true });

blockRouter.use(requireAuth);
blockRouter.use(enforceDocumentOwnership);

blockRouter.get("/", getBlocks);
blockRouter.post("/", createBlock);
blockRouter.put("/reorder", reorderBlocks);
blockRouter.put("/bulk", bulkSaveBlocks);
blockRouter.patch("/:blockId", updateBlock);
blockRouter.delete("/:blockId", deleteBlock);
