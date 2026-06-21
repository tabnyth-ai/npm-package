import type { ContainerInfo, ContainerStructure } from "../../api/types";

const NODE_WIDTH = 250;
const NODE_HEIGHT = 248;
const GAP_X = 72;
const GAP_Y = 34;
const PADDING = 32;
const HEADER_HEIGHT = 48;
const FIELD_HEIGHT = 28;
const MAX_ANCHORED_FIELDS = 6;

export interface VisualizerNode {
  id: string;
  container: ContainerInfo;
  structure: ContainerStructure;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VisualizerEdge {
  id: string;
  sourceId: string;
  targetId: string;
  sourceColumn: string;
  targetColumn: string;
  path: string;
}

export interface VisualizerGraph {
  nodes: VisualizerNode[];
  edges: VisualizerEdge[];
  width: number;
  height: number;
}

export function buildVisualizerGraph(
  containers: ContainerInfo[],
  structures: ContainerStructure[]
): VisualizerGraph {
  const structureByName = new Map(structures.map((structure) => [structure.name, structure]));
  const columns = resolveColumnCount(containers.length);
  const nodes = containers.map((container, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const structure = structureByName.get(container.name) ?? {
      name: container.name,
      columns: []
    };

    return {
      id: container.name,
      container,
      structure,
      title: container.displayName ?? container.name,
      x: PADDING + column * (NODE_WIDTH + GAP_X),
      y: PADDING + row * (NODE_HEIGHT + GAP_Y),
      width: NODE_WIDTH,
      height: NODE_HEIGHT
    };
  });

  const edges = buildEdges(nodes);
  const rows = Math.ceil(containers.length / columns);

  return {
    nodes,
    edges,
    width: PADDING * 2 + columns * NODE_WIDTH + Math.max(0, columns - 1) * GAP_X,
    height: PADDING * 2 + rows * NODE_HEIGHT + Math.max(0, rows - 1) * GAP_Y
  };
}

function buildEdges(nodes: VisualizerNode[]): VisualizerEdge[] {
  const edges: VisualizerEdge[] = [];

  for (const source of nodes) {
    for (const column of source.structure.columns) {
      if (!column.foreignKey) {
        continue;
      }

      const target = findTargetNode(nodes, column.foreignKey.schema, column.foreignKey.table);

      if (!target || target.id === source.id) {
        continue;
      }

      edges.push({
        id: `${source.id}.${column.name}->${target.id}.${column.foreignKey.column}`,
        sourceId: source.id,
        targetId: target.id,
        sourceColumn: column.name,
        targetColumn: column.foreignKey.column,
        path: buildConnectorPath(source, target, column.name, column.foreignKey.column)
      });
    }
  }

  return edges;
}

function findTargetNode(nodes: VisualizerNode[], schema: string | undefined, table: string): VisualizerNode | undefined {
  const qualified = schema ? `${schema}.${table}` : table;

  return (
    nodes.find((node) => node.id === qualified || node.structure.name === qualified) ??
    nodes.find((node) => node.container.schema === schema && getTableName(node.container.name) === table) ??
    nodes.find((node) => getTableName(node.container.name) === table)
  );
}

function buildConnectorPath(
  source: VisualizerNode,
  target: VisualizerNode,
  sourceColumn: string,
  targetColumn: string
): string {
  const sourceIsLeft = source.x <= target.x;
  const startX = sourceIsLeft ? source.x + source.width : source.x;
  const endX = sourceIsLeft ? target.x : target.x + target.width;
  const startY = getFieldAnchorY(source, sourceColumn);
  const endY = getFieldAnchorY(target, targetColumn);
  const controlOffset = Math.max(70, Math.abs(endX - startX) * 0.32);
  const firstControlX = sourceIsLeft ? startX + controlOffset : startX - controlOffset;
  const secondControlX = sourceIsLeft ? endX - controlOffset : endX + controlOffset;

  return `M ${startX} ${startY} C ${firstControlX} ${startY}, ${secondControlX} ${endY}, ${endX} ${endY}`;
}

function getFieldAnchorY(node: VisualizerNode, columnName: string): number {
  const index = node.structure.columns.findIndex((column) => column.name === columnName);
  const anchoredIndex = Math.min(Math.max(index, 0), MAX_ANCHORED_FIELDS - 1);

  return node.y + HEADER_HEIGHT + anchoredIndex * FIELD_HEIGHT + FIELD_HEIGHT / 2;
}

function getTableName(name: string): string {
  return name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : name;
}

function resolveColumnCount(count: number): number {
  if (count <= 1) {
    return 1;
  }

  return Math.max(2, Math.ceil(Math.sqrt(count * 1.35)));
}
