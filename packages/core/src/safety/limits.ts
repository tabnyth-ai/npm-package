export interface PaginationLimits {
  defaultLimit: number;
  maxLimit: number;
}

export function clampLimit(value: unknown, limits: PaginationLimits): number {
  const parsed = typeof value === "number" || typeof value === "string" ? Number(value) : limits.defaultLimit;

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return limits.defaultLimit;
  }

  return Math.min(Math.floor(parsed), limits.maxLimit);
}

export function readOffset(value: unknown): number {
  const parsed = typeof value === "number" || typeof value === "string" ? Number(value) : 0;

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.floor(parsed);
}
