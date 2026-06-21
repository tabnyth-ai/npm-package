import { useState } from "preact/hooks";

import { runQuery } from "../api/client";
import type { QueryInput, QueryResult } from "../api/types";

export function useQueryRunner() {
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function run(input: QueryInput): Promise<QueryResult | null> {
    setRunning(true);
    setError(null);

    try {
      const response = await runQuery(input);
      setResult(response.result);
      return response.result;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setRunning(false);
    }
  }

  return { result, error, running, run };
}
