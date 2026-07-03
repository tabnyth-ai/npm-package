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

  it("expands a row into field boxes", () => {
    render(<DataGrid columns={["id", "email"]} rows={[{ id: 1, email: "ada@example.com" }]} />);

    fireEvent.click(screen.getByRole("button", { name: "Expand row 1" }));

    expect(screen.getByRole("button", { name: "Collapse row 1" })).toBeTruthy();
    expect(screen.getAllByText("email").length).toBeGreaterThan(1);
    expect(screen.getAllByText("ada@example.com").length).toBeGreaterThan(1);
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

  it("renders an insert draft row above existing rows", () => {
    const onInsertDraftChange = vi.fn();

    render(
      <DataGrid
        columnMeta={
          new Map([
            ["id", { name: "id", type: "integer", generated: true }],
            ["name", { name: "name", type: "text", nullable: false }]
          ])
        }
        columns={["id", "name"]}
        insertDraft={{ values: {} }}
        rows={[{ id: 1, name: "Ada" }]}
        onInsertDraftChange={onInsertDraftChange}
      />
    );

    expect(screen.getByLabelText("New id").getAttribute("placeholder")).toBe("(auto-increment)");
    fireEvent.input(screen.getByLabelText("New name"), { target: { value: "Grace" } });

    expect(onInsertDraftChange).toHaveBeenCalledWith("name", "Grace");
  });
});
