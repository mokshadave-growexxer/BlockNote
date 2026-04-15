import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ZodError } from "zod";

export function notFoundHandler(_request: Request, response: Response) {
  response.status(StatusCodes.NOT_FOUND).json({ message: "Route not found." });
}

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction
) {
  if (error instanceof ZodError) {
    response.status(StatusCodes.BAD_REQUEST).json({
      message: "Validation failed.",
      issues: error.flatten()
    });
    return;
  }

  if (error instanceof Error && "status" in error && typeof error.status === "number") {
    response.status(error.status).json({ message: error.message });
    return;
  }

  if (
    error instanceof Error &&
    "code" in error &&
    typeof error.code === "string" &&
    error.code === "P2002"
  ) {
    response.status(StatusCodes.CONFLICT).json({ message: "Unique value already exists." });
    return;
  }

  if (error instanceof Error) {
    response.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
    return;
  }

  response.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Unexpected server error." });
}
