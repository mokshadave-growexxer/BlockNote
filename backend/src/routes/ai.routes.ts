import { Router } from "express";
import { processAI } from "../controllers/ai.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const aiRouter = Router();
aiRouter.use(requireAuth);
aiRouter.post("/process", processAI);
