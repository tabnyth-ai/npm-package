import { Activity, Database, Gauge, ShieldCheck, Table2 } from "lucide-preact";
import type { ComponentChildren } from "preact";

import type { QueryResult } from "../../api/types";

interface LogsPanelProps {
  adapterLabel: string;
  allowWrite: boolean;
  containersCount: number;
  lastBrowse: QueryResult | null;
  selectedTitle: string;
  timeoutMs: number;
}

export function LogsPanel({
  adapterLabel,
  allowWrite,
  containersCount,
  lastBrowse,
  selectedTitle,
  timeoutMs
}: LogsPanelProps) {
  return (
    <section class="content-panel logs-panel">
      <div class="panel-toolbar">
        <div class="panel-title">
          <Activity aria-hidden="true" size={20} />
          <h2>Logs</h2>
        </div>
      </div>

      <div class="logs-content">
        <div class="log-summary-grid">
          <LogSummary icon={<Database aria-hidden="true" size={18} />} label="Connection" value={adapterLabel} />
          <LogSummary icon={<Table2 aria-hidden="true" size={18} />} label="Containers" value={String(containersCount)} />
          <LogSummary
            icon={<ShieldCheck aria-hidden="true" size={18} />}
            label="Mode"
            value={allowWrite ? "Write enabled" : "Read-only"}
          />
          <LogSummary icon={<Gauge aria-hidden="true" size={18} />} label="Timeout" value={`${timeoutMs} ms`} />
        </div>

        <div class="log-stream">
          <div class="log-entry">
            <span>ready</span>
            <p>Studio connected using {adapterLabel}.</p>
          </div>
          <div class="log-entry">
            <span>selected</span>
            <p>{selectedTitle}</p>
          </div>
          {lastBrowse ? (
            <div class="log-entry">
              <span>browse</span>
              <p>
                Loaded {lastBrowse.rowCount} rows in {lastBrowse.durationMs} ms.
              </p>
            </div>
          ) : (
            <div class="log-entry muted-entry">
              <span>browse</span>
              <p>No browse result loaded yet.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

interface LogSummaryProps {
  icon: ComponentChildren;
  label: string;
  value: string;
}

function LogSummary({ icon, label, value }: LogSummaryProps) {
  return (
    <div class="log-summary">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
