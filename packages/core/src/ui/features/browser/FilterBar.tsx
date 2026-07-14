import { Check, Plus, X } from "lucide-preact";
import { useState } from "preact/hooks";

import type { BrowseFilter, BrowseFilterOperator, ColumnInfo } from "../../api/types";

interface FilterDraft {
  id: number;
  column: string;
  operator: BrowseFilterOperator;
  value: string;
}

interface FilterBarProps {
  columns: string[];
  columnMeta: Map<string, ColumnInfo>;
  filters: BrowseFilter[];
  onApply(filters: BrowseFilter[]): void;
}

const operatorOptions: Array<{ value: BrowseFilterOperator; label: string; symbol: string }> = [
  { value: "eq", label: "Equals", symbol: "=" },
  { value: "neq", label: "Not equal", symbol: "!=" },
  { value: "gt", label: "Greater than", symbol: ">" },
  { value: "gte", label: "Greater or equal", symbol: ">=" },
  { value: "lt", label: "Less than", symbol: "<" },
  { value: "lte", label: "Less or equal", symbol: "<=" },
  { value: "contains", label: "Contains", symbol: "~" },
  { value: "isNull", label: "Is null", symbol: "IS" },
  { value: "isNotNull", label: "Is not null", symbol: "NOT" }
];

const nullOperators: ReadonlySet<BrowseFilterOperator> = new Set(["isNull", "isNotNull"]);

export function FilterBar({ columns, columnMeta, filters, onApply }: FilterBarProps) {
  const [drafts, setDrafts] = useState<FilterDraft[]>(() => toDrafts(filters, columns));

  function updateDraft(id: number, patch: Partial<FilterDraft>): void {
    setDrafts((current) => current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)));
  }

  function addDraft(): void {
    setDrafts((current) => [
      ...current,
      { id: nextDraftId(current), column: columns[0] ?? "", operator: "eq", value: "" }
    ]);
  }

  function removeDraft(id: number): void {
    const next = drafts.filter((draft) => draft.id !== id);
    setDrafts(next);
    onApply(toFilters(next, columnMeta));
  }

  function clearAll(): void {
    setDrafts([]);
    onApply([]);
  }

  function apply(): void {
    onApply(toFilters(drafts, columnMeta));
  }

  return (
    <div class="filter-bar" aria-label="Table filters">
      {drafts.map((draft) => {
        const needsValue = !nullOperators.has(draft.operator);

        return (
          <div class="filter-row" key={draft.id}>
            <select
              aria-label="Filter column"
              value={draft.column}
              onChange={(event) => updateDraft(draft.id, { column: event.currentTarget.value })}
            >
              {columns.map((column) => (
                <option key={column} value={column}>
                  {column}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter operator"
              value={draft.operator}
              onChange={(event) =>
                updateDraft(draft.id, { operator: event.currentTarget.value as BrowseFilterOperator })
              }
            >
              {operatorOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.symbol})
                </option>
              ))}
            </select>

            {needsValue ? (
              <input
                aria-label="Filter value"
                placeholder="Value"
                type="text"
                value={draft.value}
                onInput={(event) => updateDraft(draft.id, { value: event.currentTarget.value })}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    apply();
                  }
                }}
              />
            ) : (
              <span class="filter-value-placeholder">No value needed</span>
            )}

            <button
              aria-label="Remove filter"
              class="icon-button filter-remove-button"
              type="button"
              onClick={() => removeDraft(draft.id)}
            >
              <X aria-hidden="true" size={15} />
            </button>
          </div>
        );
      })}

      <div class="filter-bar-actions">
        <button class="secondary-button" type="button" onClick={addDraft} disabled={columns.length === 0}>
          <Plus aria-hidden="true" size={14} />
          Add filter
        </button>
        {drafts.length > 0 ? (
          <>
            <button class="filter-apply-button" type="button" onClick={apply}>
              <Check aria-hidden="true" size={14} />
              Apply
            </button>
            <button class="secondary-button" type="button" onClick={clearAll}>
              Clear all
            </button>
          </>
        ) : (
          <span class="filter-bar-hint">Filter rows in this table, e.g. sNo greater or equal to 10.</span>
        )}
      </div>
    </div>
  );
}

function toDrafts(filters: BrowseFilter[], columns: string[]): FilterDraft[] {
  return filters.map((filter, index) => ({
    id: index + 1,
    column: filter.column || columns[0] || "",
    operator: filter.operator,
    value: filter.value === undefined || filter.value === null ? "" : String(filter.value)
  }));
}

function nextDraftId(drafts: FilterDraft[]): number {
  return drafts.reduce((max, draft) => Math.max(max, draft.id), 0) + 1;
}

function toFilters(drafts: FilterDraft[], columnMeta: Map<string, ColumnInfo>): BrowseFilter[] {
  const filters: BrowseFilter[] = [];

  for (const draft of drafts) {
    if (!draft.column) {
      continue;
    }

    if (nullOperators.has(draft.operator)) {
      filters.push({ column: draft.column, operator: draft.operator });
      continue;
    }

    if (draft.value.trim() === "") {
      continue;
    }

    filters.push({
      column: draft.column,
      operator: draft.operator,
      value: coerceFilterValue(draft.value, columnMeta.get(draft.column))
    });
  }

  return filters;
}

function coerceFilterValue(value: string, meta: ColumnInfo | undefined): unknown {
  if (!meta || meta.type === "" || /char|text|string|uuid|json|date|time/i.test(meta.type)) {
    return value;
  }

  if (/int|numeric|decimal|double|real|float|serial|number/i.test(meta.type)) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }

  if (/bool/i.test(meta.type)) {
    const trimmed = value.trim().toLowerCase();

    if (trimmed === "true") {
      return true;
    }

    if (trimmed === "false") {
      return false;
    }
  }

  return value;
}
