export async function measureDuration<T>(fn: () => Promise<T>): Promise<{ value: T; durationMs: number }> {
  const startedAt = performance.now();
  const value = await fn();
  return {
    value,
    durationMs: Math.round(performance.now() - startedAt)
  };
}
