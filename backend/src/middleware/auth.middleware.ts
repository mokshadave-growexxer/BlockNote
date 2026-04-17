import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { verifyAccessToken } from "../lib/jwt.js";

export function requireAuth(request: Request, response: Response, next: NextFunction) {
  // Try to get token from cookies first (new secure method)
  const cookieToken = (request.cookies as Record<string, unknown>)["accessToken"];
  let token: string | null = typeof cookieToken === "string" ? cookieToken : null;
  
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      request.auth = {
        userId: payload.sub,
        email: payload.email
      };
      next();
      return;
    } catch {
      // Cookie token is invalid, try Authorization header
      token = null;
    }
  }

  // Fallback to Authorization header (backward compatibility)
  const header = request.headers.authorization;
  token = header?.startsWith("Bearer ") ? header.slice(7) : null;

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
