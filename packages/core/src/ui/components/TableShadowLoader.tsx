import { QuickLoader } from "./QuickLoader";

interface TableShadowLoaderProps {
  columns?: number;
  rows?: number;
}

const cellWidths = [82, 58, 70, 46, 64, 76, 52, 68];

export function TableShadowLoader({ columns = 6, rows = 8 }: TableShadowLoaderProps) {
  const columnCount = Math.max(2, Math.min(columns, 8));
  const rowCount = Math.max(3, Math.min(rows, 12));

  return (
    <div class="table-shadow-loader" role="status" aria-label="Loading rows">
      <span class="inline-loader-label">
        <QuickLoader color="teal" />
        <span>Loading rows</span>
      </span>
      <div
        aria-hidden="true"
        class="table-shadow-grid"
        style={{ "--shadow-columns": String(columnCount) }}
      >
        <div class="table-shadow-row header">
          {range(columnCount).map((column) => (
            <span class="table-shadow-cell" key={column}>
              <span class="table-shadow-bar" style={{ width: `${cellWidths[(column * 5) % cellWidths.length] - 14}%` }} />
            </span>
          ))}
        </div>
        {range(rowCount).map((row) => (
          <div class="table-shadow-row" key={row} style={{ "--shadow-row-index": String(row) }}>
            {range(columnCount).map((column) => (
              <span class="table-shadow-cell" key={column}>
                <span
                  class="table-shadow-bar"
                  style={{ width: `${cellWidths[(row + column * 3) % cellWidths.length]}%` }}
                />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function range(length: number): number[] {
  return Array.from({ length }, (_, index) => index);
}
