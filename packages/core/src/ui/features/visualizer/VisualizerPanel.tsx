import {
  Binary,
  Braces,
  Calendar,
  CircleHelp,
  Columns3,
  Database,
  ExternalLink,
  Hash,
  KeyRound,
  Link2,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  Table2,
  ToggleLeft,
  Type
} from "lucide-preact";
import type { ComponentChildren, JSX } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";

import type { ContainerInfo } from "../../api/types";
import { ErrorMessage } from "../../components/ErrorMessage";
import { LoadingState } from "../../components/LoadingState";
import { useSchemaStructures } from "../../hooks/useSchemaStructures";
import { buildConnectorGeometry, buildVisualizerGraph, type VisualizerNode } from "./graph";

const BOARD_MARGIN = 48;
const DRAG_THRESHOLD = 3;

interface NodePosition {
  x: number;
  y: number;
}

interface VisualizerPanelProps {
  containers: ContainerInfo[];
  selectedName?: string;
  onSelect(container: ContainerInfo): void;
  onOpen(container: ContainerInfo): void;
}

export function VisualizerPanel({ containers, selectedName, onSelect, onOpen }: VisualizerPanelProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [positions, setPositions] = useState<Record<string, NodePosition>>({});
  const structureState = useSchemaStructures(containers);
  const graph = useMemo(
    () => buildVisualizerGraph(containers, structureState.structures),
    [containers, structureState.structures]
  );

  // Seed positions for any new node from the grid layout, keep already-dragged
  // nodes where the user put them, and drop nodes that no longer exist.
  useEffect(() => {
    setPositions((current) => {
      const next: Record<string, NodePosition> = {};
      let changed = graph.nodes.length !== Object.keys(current).length;

      for (const node of graph.nodes) {
        if (current[node.id]) {
          next[node.id] = current[node.id];
        } else {
          next[node.id] = { x: node.x, y: node.y };
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [graph]);

  const liveNodes = useMemo(
    () => graph.nodes.map((node) => ({ ...node, ...(positions[node.id] ?? { x: node.x, y: node.y }) })),
    [graph.nodes, positions]
  );

  const liveById = useMemo(() => new Map(liveNodes.map((node) => [node.id, node])), [liveNodes]);

  const board = useMemo(() => {
    let width = graph.width;
    let height = graph.height;

    for (const node of liveNodes) {
      width = Math.max(width, node.x + node.width + BOARD_MARGIN);
      height = Math.max(height, node.y + node.height + BOARD_MARGIN);
    }

    return { width, height };
  }, [liveNodes, graph.width, graph.height]);

  const edges = useMemo(() => {
    const computed: Array<{ id: string; path: string; sx: number; sy: number; ex: number; ey: number }> = [];

    for (const edge of graph.edges) {
      const source = liveById.get(edge.sourceId);
      const target = liveById.get(edge.targetId);

      if (!source || !target) {
        continue;
      }

      const geometry = buildConnectorGeometry(source, target, edge.sourceColumn, edge.targetColumn);
      computed.push({ id: edge.id, ...geometry });
    }

    return computed;
  }, [graph.edges, liveById]);

  function handleDrag(id: string, x: number, y: number): void {
    setPositions((current) => ({ ...current, [id]: { x: Math.max(0, x), y: Math.max(0, y) } }));
  }

  const zoomLabel = `${Math.round(zoom * 100)}%`;

  return (
    <section class={fullscreen ? "content-panel visualizer-panel fullscreen" : "content-panel visualizer-panel"}>
      <div class="visualizer-toolbar">
        <div class="panel-title">
          <Database aria-hidden="true" size={22} />
          <h2>Visualizer</h2>
          <span class="visualizer-count">{containers.length} resources</span>
        </div>

        <div class="visualizer-actions">
          <div class="visualizer-legend" aria-label="Schema legend">
            <LegendItem icon={<KeyRound aria-hidden="true" size={14} />} label="Primary Key" tone="primary" />
            <LegendItem icon={<CircleHelp aria-hidden="true" size={14} />} label="Nullable" />
            <LegendItem icon={<Link2 aria-hidden="true" size={14} />} label="Foreign Key" tone="foreign" />
          </div>
          <div class="zoom-controls" aria-label="Visualizer zoom">
            <button
              aria-label="Zoom out"
              class="icon-button bordered"
              type="button"
              disabled={zoom <= 0.6}
              onClick={() => setZoom((current) => Math.max(0.6, roundZoom(current - 0.1)))}
            >
              <Minus aria-hidden="true" size={16} />
            </button>
            <span>{zoomLabel}</span>
            <button
              aria-label="Zoom in"
              class="icon-button bordered"
              type="button"
              disabled={zoom >= 1.8}
              onClick={() => setZoom((current) => Math.min(1.8, roundZoom(current + 0.1)))}
            >
              <Plus aria-hidden="true" size={16} />
            </button>
          </div>
          <button
            aria-label={fullscreen ? "Exit visualizer fullscreen" : "Expand visualizer"}
            class="icon-button bordered"
            type="button"
            onClick={() => setFullscreen((current) => !current)}
          >
            {fullscreen ? <Minimize2 aria-hidden="true" size={18} /> : <Maximize2 aria-hidden="true" size={18} />}
          </button>
        </div>
      </div>

      <ErrorMessage message={structureState.error} />

      <div class="visualizer-canvas">
        {structureState.loading ? <LoadingState label="Loading schema graph..." /> : null}
        {!structureState.loading && containers.length === 0 ? (
          <div class="empty-state">No tables or collections found.</div>
        ) : null}
        <div
          class="visualizer-stage"
          style={{
            width: `${board.width * zoom}px`,
            height: `${board.height * zoom}px`
          }}
        >
          <div
            class="visualizer-board"
            style={{
              transform: `scale(${zoom})`,
              width: `${board.width}px`,
              height: `${board.height}px`
            }}
          >
            <svg
              aria-hidden="true"
              class="relation-layer"
              height={board.height}
              viewBox={`0 0 ${board.width} ${board.height}`}
              width={board.width}
            >
              <defs>
                <marker id="relation-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
                  <path d="M 0 0 L 8 4 L 0 8 z" />
                </marker>
              </defs>
              {edges.map((edge) => (
                <g key={edge.id}>
                  <path class="relation-path" d={edge.path} markerEnd="url(#relation-arrow)" />
                  <circle class="relation-dot" cx={edge.sx} cy={edge.sy} r="3.4" />
                  <circle class="relation-dot" cx={edge.ex} cy={edge.ey} r="3.4" />
                </g>
              ))}
            </svg>

            {liveNodes.map((node) => (
              <SchemaCard
                active={node.id === selectedName}
                key={node.id}
                node={node}
                position={{ x: node.x, y: node.y }}
                zoom={zoom}
                onDrag={handleDrag}
                onOpen={() => onOpen(node.container)}
                onSelect={() => onSelect(node.container)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function roundZoom(value: number): number {
  return Math.round(value * 10) / 10;
}

function typeIcon(rawType: string): ComponentChildren {
  const type = (rawType ?? "").toLowerCase();

  if (/bool/.test(type)) {
    return <ToggleLeft aria-hidden="true" size={13} />;
  }
  if (/(int|serial|numeric|decimal|float|double|real|number|long|money)/.test(type)) {
    return <Hash aria-hidden="true" size={13} />;
  }
  if (/(timestamp|datetime|date|time)/.test(type)) {
    return <Calendar aria-hidden="true" size={13} />;
  }
  if (/(json|object|array|map)/.test(type)) {
    return <Braces aria-hidden="true" size={13} />;
  }
  if (/(uuid|bytea|binary|blob|bit)/.test(type)) {
    return <Binary aria-hidden="true" size={13} />;
  }
  if (/(text|char|string|enum|citext|name)/.test(type)) {
    return <Type aria-hidden="true" size={13} />;
  }

  return <Columns3 aria-hidden="true" size={13} />;
}

interface LegendItemProps {
  icon: ComponentChildren;
  label: string;
  tone?: "primary" | "foreign";
}

function LegendItem({ icon, label, tone }: LegendItemProps) {
  return (
    <span class={tone ? `legend-item ${tone}` : "legend-item"}>
      {icon}
      {label}
    </span>
  );
}

interface SchemaCardProps {
  active: boolean;
  node: VisualizerNode;
  position: NodePosition;
  zoom: number;
  onDrag(id: string, x: number, y: number): void;
  onOpen(): void;
  onSelect(): void;
}

interface DragState {
  pointerX: number;
  pointerY: number;
  originX: number;
  originY: number;
  moved: boolean;
}

function SchemaCard({ active, node, position, zoom, onDrag, onOpen, onSelect }: SchemaCardProps) {
  const dragRef = useRef<DragState | null>(null);

  function handlePointerDown(event: JSX.TargetedPointerEvent<HTMLDivElement>): void {
    if ((event.target as HTMLElement).closest(".schema-open-button")) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      originX: position.x,
      originY: position.y,
      moved: false
    };
  }

  function handlePointerMove(event: JSX.TargetedPointerEvent<HTMLDivElement>): void {
    const state = dragRef.current;

    if (!state) {
      return;
    }

    const dx = (event.clientX - state.pointerX) / zoom;
    const dy = (event.clientY - state.pointerY) / zoom;

    if (!state.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      state.moved = true;
    }

    if (state.moved) {
      onDrag(node.id, state.originX + dx, state.originY + dy);
    }
  }

  function handlePointerUp(event: JSX.TargetedPointerEvent<HTMLDivElement>): void {
    const state = dragRef.current;
    dragRef.current = null;

    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (state && !state.moved) {
      onSelect();
    }
  }

  return (
    <div
      class={active ? "schema-card active" : "schema-card"}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        width: `${node.width}px`,
        height: `${node.height}px`
      }}
    >
      <div
        class="schema-card-header"
        onPointerCancel={handlePointerUp}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <span class="schema-title">
          <Table2 aria-hidden="true" size={15} />
          <strong>{node.title}</strong>
        </span>
        <span class="schema-header-meta">
          <span class="schema-type">{node.container.type}</span>
          <button
            aria-label={`Open ${node.title}`}
            class="schema-open-button"
            title="Open table"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpen();
            }}
          >
            <ExternalLink aria-hidden="true" size={14} />
          </button>
        </span>
      </div>

      <div class="schema-field-list">
        {node.structure.columns.length === 0 ? <span class="schema-field empty">No fields loaded</span> : null}
        {node.structure.columns.map((column) => (
          <span class="schema-field" key={column.name}>
            <span class="schema-field-lead" title={column.type}>
              {typeIcon(column.type)}
            </span>
            <span class="field-name">{column.name}</span>
            <span class="schema-field-trail">
              {column.primaryKey ? (
                <span class="field-icon primary" title="Primary key">
                  <KeyRound aria-hidden="true" size={11} />
                </span>
              ) : null}
              {column.foreignKey ? (
                <span
                  class="field-icon foreign"
                  title={`Foreign key to ${column.foreignKey.table}.${column.foreignKey.column}`}
                >
                  <Link2 aria-hidden="true" size={11} />
                </span>
              ) : null}
              {column.nullable ? (
                <span class="field-icon nullable" title="Nullable">
                  <CircleHelp aria-hidden="true" size={11} />
                </span>
              ) : null}
              <span class="field-type">{column.type}</span>
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
