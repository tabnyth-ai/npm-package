import type { Context } from "hono";

import { ApiError } from "./errors";

export function jsonError(c: Context, error: unknown): Response {
  if (error instanceof ApiError) {
    return errorResponse(error.message, error.status);
  }

  const message = error instanceof Error ? error.message : "Unexpected error.";
  return errorResponse(message, 500);
}

function errorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8"
    }
  });
}
