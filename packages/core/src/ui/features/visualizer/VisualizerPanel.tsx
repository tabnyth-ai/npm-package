import { CircleHelp, Database, KeyRound, Link2, Maximize2, Minimize2, Minus, Plus, Table2 } from "lucide-preact";
import type { ComponentChildren } from "preact";
import { useMemo, useState } from "preact/hooks";

import type { ContainerInfo } from "../../api/types";
import { ErrorMessage } from "../../components/ErrorMessage";
import { LoadingState } from "../../components/LoadingState";
import { useSchemaStructures } from "../../hooks/useSchemaStructures";
import { buildVisualizerGraph, type VisualizerNode } from "./graph";

interface VisualizerPanelProps {
  containers: ContainerInfo[];
  selectedName?: string;
  onSelect(container: ContainerInfo): void;
}

export function VisualizerPanel({ containers, selectedName, onSelect }: VisualizerPanelProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const structureState = useSchemaStructures(containers);
  const graph = useMemo(
    () => buildVisualizerGraph(containers, structureState.structures),
    [containers, structureState.structures]
  );
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
            width: `${graph.width * zoom}px`,
            height: `${graph.height * zoom}px`
          }}
        >
          <div
            class="visualizer-board"
            style={{
              transform: `scale(${zoom})`,
              width: `${graph.width}px`,
              height: `${graph.height}px`
            }}
          >
            <svg
              aria-hidden="true"
              class="relation-layer"
              height={graph.height}
              viewBox={`0 0 ${graph.width} ${graph.height}`}
              width={graph.width}
            >
              <defs>
                <marker id="relation-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
                  <path d="M 0 0 L 8 4 L 0 8 z" />
                </marker>
              </defs>
              {graph.edges.map((edge) => (
                <path class="relation-path" d={edge.path} key={edge.id} markerEnd="url(#relation-arrow)" />
              ))}
            </svg>

            {graph.nodes.map((node) => (
              <SchemaCard
                active={node.id === selectedName}
                key={node.id}
                node={node}
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
  onSelect(): void;
}

function SchemaCard({ active, node, onSelect }: SchemaCardProps) {
  return (
    <button
      class={active ? "schema-card active" : "schema-card"}
      style={{
        transform: `translate(${node.x}px, ${node.y}px)`,
        width: `${node.width}px`,
        height: `${node.height}px`
      }}
      type="button"
      onClick={onSelect}
    >
      <span class="schema-card-header">
        <span class="schema-title">
          <Table2 aria-hidden="true" size={15} />
          <strong>{node.title}</strong>
        </span>
        <span class="schema-type">{node.container.type}</span>
      </span>

      <span class="schema-field-list">
        {node.structure.columns.length === 0 ? <span class="schema-field empty">No fields loaded</span> : null}
        {node.structure.columns.map((column) => (
          <span class="schema-field" key={column.name}>
            <span class="schema-field-icons">
              {column.primaryKey ? (
                <span class="field-icon primary" title="Primary key">
                  <KeyRound aria-hidden="true" size={12} />
                </span>
              ) : null}
              {column.nullable ? (
                <span class="field-icon nullable" title="Nullable">
                  <CircleHelp aria-hidden="true" size={12} />
                </span>
              ) : null}
              {column.foreignKey ? (
                <span class="field-icon foreign" title={`Foreign key to ${column.foreignKey.table}.${column.foreignKey.column}`}>
                  <Link2 aria-hidden="true" size={12} />
                </span>
              ) : null}
            </span>
            <span class="field-name">{column.name}</span>
            <span class="field-type">{column.type}</span>
          </span>
        ))}
      </span>
    </button>
  );
}
