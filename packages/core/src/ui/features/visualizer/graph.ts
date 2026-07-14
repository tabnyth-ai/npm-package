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
}

export interface ConnectorGeometry {
  path: string;
  sx: number;
  sy: number;
  ex: number;
  ey: number;
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
        targetColumn: column.foreignKey.column
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

// Geometry is computed from LIVE node positions at render time (so it follows
// dragged cards), and uses orthogonal "step" routing instead of a bezier for a
// cleaner, straighter look. Returns the path plus the two endpoint anchor points
// so the panel can draw connection dots on the card edges.
export function buildConnectorGeometry(
  source: VisualizerNode,
  target: VisualizerNode,
  sourceColumn: string,
  targetColumn: string
): ConnectorGeometry {
  const sourceIsLeft = source.x + source.width / 2 <= target.x + target.width / 2;
  const sx = sourceIsLeft ? source.x + source.width : source.x;
  const ex = sourceIsLeft ? target.x : target.x + target.width;
  const sy = getFieldAnchorY(source, sourceColumn);
  const ey = getFieldAnchorY(target, targetColumn);

  return { path: orthogonalPath(sx, sy, ex, ey), sx, sy, ex, ey };
}

function orthogonalPath(sx: number, sy: number, ex: number, ey: number): string {
  const midX = (sx + ex) / 2;
  const deltaStartX = midX - sx;
  const deltaEndX = ex - midX;
  const deltaY = ey - sy;
  const radius = Math.max(0, Math.min(10, Math.abs(deltaStartX), Math.abs(deltaEndX), Math.abs(deltaY) / 2));

  if (radius < 1) {
    return `M ${round(sx)} ${round(sy)} L ${round(midX)} ${round(sy)} L ${round(midX)} ${round(ey)} L ${round(ex)} ${round(ey)}`;
  }

  const signStartX = Math.sign(deltaStartX) || 1;
  const signY = Math.sign(deltaY) || 1;
  const signEndX = Math.sign(deltaEndX) || 1;

  return [
    `M ${round(sx)} ${round(sy)}`,
    `L ${round(midX - radius * signStartX)} ${round(sy)}`,
    `Q ${round(midX)} ${round(sy)} ${round(midX)} ${round(sy + radius * signY)}`,
    `L ${round(midX)} ${round(ey - radius * signY)}`,
    `Q ${round(midX)} ${round(ey)} ${round(midX + radius * signEndX)} ${round(ey)}`,
    `L ${round(ex)} ${round(ey)}`
  ].join(" ");
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function getFieldAnchorY(node: VisualizerNode, columnName: string): number {
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
