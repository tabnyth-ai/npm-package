import { useEffect, useState } from "preact/hooks";

import { getContainerStructure } from "../api/client";
import type { ContainerInfo, ContainerStructure } from "../api/types";

export function useContainerStructure(container: ContainerInfo | null) {
  const [structure, setStructure] = useState<ContainerStructure | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!container) {
      setStructure(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void getContainerStructure(container.name)
      .then((response) => {
        if (!cancelled) {
          setStructure(response.structure);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [container?.name]);

  return { structure, error, loading };
}
