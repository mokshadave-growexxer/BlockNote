import { Router } from "express";
import {
  createDocument,
  deleteDocument,
  getDocument,
  getDocuments,
  updateDocument,
  togglePin,
  updateIcon,
  updateCover
} from "../controllers/document.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const documentRouter = Router();

documentRouter.use(requireAuth);
documentRouter.get("/", getDocuments);
documentRouter.post("/", createDocument);
documentRouter.get("/:id", getDocument);
documentRouter.patch("/:id", updateDocument);
documentRouter.delete("/:id", deleteDocument);
documentRouter.patch("/:id/pin", togglePin);
documentRouter.patch("/:id/icon", updateIcon);
documentRouter.patch("/:id/cover", updateCover);
