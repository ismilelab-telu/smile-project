import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { App } from "./App";

describe("App", () => {
  beforeEach(() => {
    window.history.pushState(null, "", "/");
  });

  it("renders the landing page", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Smile Project" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open model picker/ })).toBeInTheDocument();
  });

  it("renders fuzzy text utility pages", () => {
    window.history.pushState(null, "", "/support");
    render(<App />);

    expect(screen.getByRole("heading", { name: "404 not found." })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "404" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "not found." })).toBeInTheDocument();
  });

  it("shows grouped machine learning models in the mode menu", () => {
    window.history.pushState(null, "", "/model-picker");
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

  it("updates the active model picker title from the mode menu", () => {
    window.history.pushState(null, "", "/model-picker");
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Simple Linear Regression/ }));
    fireEvent.click(screen.getByRole("option", { name: "Transformer" }));

    expect(screen.getByRole("heading", { name: "Transformer" })).toBeInTheDocument();
    expect(screen.getByTestId("selected-model-group")).toHaveTextContent("Deep Learning");
  });
});
