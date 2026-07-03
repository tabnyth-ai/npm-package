import { useEffect, useState } from "preact/hooks";

import { getContainers } from "../api/client";
import type { ContainerInfo } from "../api/types";

export function useContainers() {
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh(): Promise<ContainerInfo[]> {
    setLoading(true);
    setError(null);

    try {
      const response = await getContainers();
      setContainers(response.containers);
      return response.containers;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return [];
    } finally {
      setLoading(false);
    }
  }

  function replace(nextContainers: ContainerInfo[]): void {
    setContainers(nextContainers);
    setError(null);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, []);

  return { containers, error, loading, refresh, replace };
}
