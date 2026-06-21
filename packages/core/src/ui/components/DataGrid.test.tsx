import { fireEvent, render, screen } from "@testing-library/preact";
import { describe, expect, it, vi } from "vitest";

import { DataGrid } from "./DataGrid";

describe("DataGrid", () => {
  it("renders rows and nested JSON values", () => {
    render(<DataGrid columns={["id", "profile"]} rows={[{ id: 1, profile: { role: "admin" } }]} />);

    expect(screen.getByText("id")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText(/admin/)).toBeTruthy();
  });

  it("allows editable cells to be changed after double click", () => {
    const onEditCell = vi.fn();

    render(
      <DataGrid
        columns={["id", "name"]}
        editable
        keyColumns={["id"]}
        rows={[{ id: 1, name: "Ada" }]}
        onEditCell={onEditCell}
      />
    );

    fireEvent.dblClick(screen.getByText("Ada"));
    const input = screen.getByDisplayValue("Ada");
    fireEvent.input(input, { target: { value: "Grace" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onEditCell).toHaveBeenCalledWith(0, "name", "Grace");
  });
});
