import { fireEvent, render, screen } from "@testing-library/preact";
import { describe, expect, it, vi } from "vitest";

import { Sidebar } from "./Sidebar";

describe("Sidebar", () => {
  it("renders containers and notifies selection", () => {
    const onSelect = vi.fn();

    render(
      <Sidebar
        adapterLabel="postgres sql"
        containers={[{ name: "public.users", type: "table", schema: "public" }]}
        loading={false}
        onSelect={onSelect}
      />
    );

    fireEvent.click(screen.getByText("public.users"));
    expect(onSelect).toHaveBeenCalledWith({ name: "public.users", type: "table", schema: "public" });
  });
});
