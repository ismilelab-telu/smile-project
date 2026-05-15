import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "./App";

describe("App", () => {
  it("renders the regression playground shell", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Simple Linear Regression" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Smile Project home" })).toBeInTheDocument();
  });

  it("shows grouped machine learning models in the mode menu", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Simple Linear Regression/ }));

    const modeMenu = screen.getByRole("listbox", { name: "Machine learning models" });

    expect(modeMenu).toBeInTheDocument();
    expect(within(modeMenu).getByText("Supervised Learning")).toBeInTheDocument();
    expect(within(modeMenu).getByText("Unsupervised Learning")).toBeInTheDocument();
    expect(
      within(modeMenu).getByRole("option", { name: "K-Means Clustering" }),
    ).toBeInTheDocument();
    expect(within(modeMenu).getByRole("option", { name: "Transformer" })).toBeInTheDocument();
  });

  it("updates the active playground title from the mode menu", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Simple Linear Regression/ }));
    fireEvent.click(screen.getByRole("option", { name: "Transformer" }));

    expect(screen.getByRole("heading", { name: "Transformer" })).toBeInTheDocument();
    expect(screen.getByTestId("selected-model-group")).toHaveTextContent("Deep Learning");
  });
});
