import { useEffect, useMemo, useState } from "preact/hooks";

import { getContainerStructure } from "../api/client";
import type { ContainerInfo, ContainerStructure } from "../api/types";

export function useSchemaStructures(containers: ContainerInfo[]) {
  const [structures, setStructures] = useState<ContainerStructure[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const signature = useMemo(() => containers.map((container) => container.name).join("\n"), [containers]);

  useEffect(() => {
    if (containers.length === 0) {
      setStructures([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    setLoading(true);
    setError(null);

    void loadStructures(containers)
      .then((loadedStructures) => {
        if (!cancelled) {
          setStructures(loadedStructures);
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
  }, [signature]);

  return { structures, error, loading };
}

async function loadStructures(containers: ContainerInfo[]): Promise<ContainerStructure[]> {
  const output = new Array<ContainerStructure | undefined>(containers.length);
  let nextIndex = 0;
  const workerCount = Math.min(6, containers.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < containers.length) {
        const index = nextIndex;
        nextIndex += 1;

        const response = await getContainerStructure(containers[index].name);
        output[index] = response.structure;
      }
    })
  );

  return output.filter((structure): structure is ContainerStructure => Boolean(structure));
}
