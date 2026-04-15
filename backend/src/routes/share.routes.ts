import { Router } from "express";
import { getSharedDocument } from "../controllers/share.controller.js";

export const shareRouter = Router();

// Public endpoint - no auth
shareRouter.get("/:token", getSharedDocument);
