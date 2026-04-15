import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { verifyAccessToken } from "../lib/jwt.js";

export function requireAuth(request: Request, response: Response, next: NextFunction) {
  const header = request.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    response.status(StatusCodes.UNAUTHORIZED).json({ message: "Authentication required." });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    request.auth = {
      userId: payload.sub,
      email: payload.email
    };
    next();
  } catch {
    response.status(StatusCodes.UNAUTHORIZED).json({ message: "Invalid or expired access token." });
  }
}
