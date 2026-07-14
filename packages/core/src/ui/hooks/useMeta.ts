import { useEffect, useState } from "preact/hooks";

import { getMeta } from "../api/client";
import type { StudioMeta } from "../api/types";

export function useMeta() {
  const [meta, setMeta] = useState<StudioMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh(): Promise<StudioMeta | null> {
    setLoading(true);
    setError(null);

    try {
      const nextMeta = await getMeta();
      setMeta(nextMeta);
      return nextMeta;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setLoading(false);
    }
  }

  function replace(nextMeta: StudioMeta): void {
    setMeta(nextMeta);
    setError(null);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, []);

  return { meta, error, loading, refresh, replace };
}
