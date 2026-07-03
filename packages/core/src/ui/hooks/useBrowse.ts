import { useEffect, useState } from "preact/hooks";

import { browse } from "../api/client";
import type { BrowseFilter, ContainerInfo, QueryResult } from "../api/types";

export function useBrowse(container: ContainerInfo | null, limit: number, page: number, filters: BrowseFilter[] = []) {
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const filtersKey = JSON.stringify(filters);

  async function refresh(): Promise<void> {
    if (!container) {
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await browse({
        container: container.name,
        schema: container.schema,
        limit,
        offset: (page - 1) * limit,
        filters: filters.length > 0 ? filters : undefined
      });
      setResult(response.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [container?.name, limit, page, filtersKey]);

  return { result, error, loading, refresh };
}
