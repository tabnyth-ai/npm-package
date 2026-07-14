import { fireEvent, render, screen, waitFor } from "@testing-library/preact";
import { describe, expect, it, vi } from "vitest";

import { connectDatabase } from "../api/client";
import type { ConnectDatabaseResponse } from "../api/types";
import { Sidebar } from "./Sidebar";

vi.mock("../api/client", () => ({
  connectDatabase: vi.fn()
}));

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

  it("opens a new connection modal and deploys the connection", async () => {
    const response = {
      meta: {
        adapter: "postgres",
        kind: "sql" as const,
        allowWrite: false,
        defaultLimit: 100,
        maxLimit: 1000,
        timeoutMs: 10000
      },
      containers: [{ name: "public.users", type: "table", schema: "public" }]
    } satisfies ConnectDatabaseResponse;
    const onConnected = vi.fn();
    vi.mocked(connectDatabase).mockResolvedValue(response);

    render(
      <Sidebar
        adapterLabel="postgres sql"
        containers={[]}
        loading={false}
        onConnected={onConnected}
        onSelect={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "New Connection" }));
    fireEvent.input(screen.getByLabelText("DATABASE_URL"), {
      target: { value: "postgresql://user:pass@localhost:5432/app" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Deploy connection" }));

    await waitFor(() => {
      expect(connectDatabase).toHaveBeenCalledWith({
        databaseUrl: "postgresql://user:pass@localhost:5432/app",
        mode: "view"
      });
      expect(onConnected).toHaveBeenCalledWith(response);
    });
  });
});
