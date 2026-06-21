import { fireEvent, render, screen } from "@testing-library/preact";
import { describe, expect, it } from "vitest";

import { useSessionHistory } from "./useSessionHistory";

describe("useSessionHistory", () => {
  it("records recent queries for the current session", () => {
    function Harness() {
      const history = useSessionHistory();

      return (
        <div>
          <button type="button" onClick={() => history.remember("select 1")}>
            remember
          </button>
          <output>{history.history.join("|")}</output>
        </div>
      );
    }

    render(<Harness />);
    fireEvent.click(screen.getByText("remember"));

    expect(screen.getByText("select 1")).toBeTruthy();
  });
});
