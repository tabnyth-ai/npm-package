import { useEffect, useState } from "preact/hooks";

import { getMeta } from "../api/client";
import type { StudioMeta } from "../api/types";

export function useMeta() {
  const [meta, setMeta] = useState<StudioMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void getMeta()
      .then(setMeta)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

  return { meta, error, loading };
}
