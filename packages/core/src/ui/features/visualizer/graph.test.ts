import { describe, expect, it } from "vitest";

import type { ContainerInfo, ContainerStructure } from "../../api/types";
import { buildVisualizerGraph } from "./graph";

describe("buildVisualizerGraph", () => {
  it("builds nodes and foreign-key edges from structures", () => {
    const containers: ContainerInfo[] = [
      { name: "public.users", schema: "public", displayName: "public.users", type: "table" },
      { name: "public.posts", schema: "public", displayName: "public.posts", type: "table" }
    ];
    const structures: ContainerStructure[] = [
      {
        name: "public.users",
        columns: [{ name: "id", type: "uuid", primaryKey: true }]
      },
      {
        name: "public.posts",
        columns: [
          { name: "id", type: "uuid", primaryKey: true },
          {
            name: "userId",
            type: "uuid",
            foreignKey: { schema: "public", table: "users", column: "id" }
          }
        ]
      }
    ];

    const graph = buildVisualizerGraph(containers, structures);

    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]).toMatchObject({
      sourceId: "public.posts",
      targetId: "public.users",
      sourceColumn: "userId",
      targetColumn: "id"
    });
    expect(graph.edges[0]?.path).toContain("C");
    expect(graph.width).toBeGreaterThan(0);
    expect(graph.height).toBeGreaterThan(0);
  });
});
