import { fireEvent, render, screen } from "@testing-library/preact";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppLayout } from "./AppLayout";

describe("AppLayout", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("toggles theme from the header", () => {
    render(
      <AppLayout activeView="query" sidebar={<div>Sidebar</div>} onViewChange={() => {}}>
        <div>Content</div>
      </AppLayout>
    );

    fireEvent.click(screen.getByRole("button", { name: "Switch to light theme" }));

    expect(screen.getByRole("button", { name: "Switch to dark theme" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Notifications" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Account" })).toBeNull();
  });

  it("switches top navigation tabs", () => {
    const onViewChange = vi.fn();

    render(
      <AppLayout activeView="query" sidebar={<div>Sidebar</div>} onViewChange={onViewChange}>
        <div>Content</div>
      </AppLayout>
    );

    fireEvent.click(screen.getByRole("button", { name: "Data Browser" }));
    fireEvent.click(screen.getByRole("button", { name: "Visualizer" }));
    fireEvent.click(screen.getByRole("button", { name: "Logs" }));

    expect(onViewChange).toHaveBeenNthCalledWith(1, "browser");
    expect(onViewChange).toHaveBeenNthCalledWith(2, "visualizer");
    expect(onViewChange).toHaveBeenNthCalledWith(3, "logs");
  });
});
