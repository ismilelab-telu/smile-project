import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "./App";

describe("App", () => {
  it("renders the regression playground shell", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Simple Linear Regression" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Smile Project home" })).toBeInTheDocument();
  });
});
