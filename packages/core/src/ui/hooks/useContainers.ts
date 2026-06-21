import { useEffect, useState } from "preact/hooks";

import { getContainers } from "../api/client";
import type { ContainerInfo } from "../api/types";

export function useContainers() {
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh(): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      const response = await getContainers();
      setContainers(response.containers);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return { containers, error, loading, refresh };
}
