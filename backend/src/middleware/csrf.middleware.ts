import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { getCSRFTokenHashFromCookies, verifyCSRFToken } from "../services/token.service.js";

const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * CSRF protection middleware using double-submit cookie pattern
 * 
 * Flow:
 * 1. Auth endpoints send csrfToken in JSON + hash in cookie
 * 2. Client stores csrfToken and sends it in X-CSRF-Token header for each request
 * 3. Server validates: submitted token hash matches cookie hash
 * 
 * This protects against CSRF for cross-origin requests (SameSite=None)
 * While same-origin requests are also protected by browser SameSite enforcement
 */
export function verifyCsrf(request: Request, response: Response, next: NextFunction) {
  // Only validate for state-changing requests
  if (!["POST", "PUT", "DELETE", "PATCH"].includes(request.method)) {
    next();
    return;
  }

  // Skip CSRF for internal/private endpoints (e.g., backend-to-backend)
  // Auth endpoints use their own token validation during auth operations
  if (request.path.startsWith("/auth/")) {
    next();
    return;
  }

  const tokenHash = getCSRFTokenHashFromCookies(request.cookies);
  const token = request.headers[CSRF_HEADER_NAME];

  if (!tokenHash || !token) {
    response.status(StatusCodes.FORBIDDEN).json({ message: "CSRF token missing." });
    return;
  }

  if (typeof token !== "string") {
    response.status(StatusCodes.FORBIDDEN).json({ message: "Invalid CSRF token." });
    return;
  }

  try {
    if (!verifyCSRFToken(token, tokenHash)) {
      response.status(StatusCodes.FORBIDDEN).json({ message: "CSRF token invalid." });
      return;
    }
    next();
  } catch {
    response.status(StatusCodes.FORBIDDEN).json({ message: "CSRF validation failed." });
  }
}
