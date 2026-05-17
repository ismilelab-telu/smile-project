import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";

describe("App", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.history.pushState(null, "", "/");
  });

  it("renders the landing page", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Smile Project" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open model picker/ })).toBeInTheDocument();
  });

  it("opens the orchestrated GSAP navigation island", async () => {
    render(<App />);

    const menuButton = screen.getByRole("button", { name: "Open navigation menu" });

    fireEvent.click(menuButton);

    const menuDialog = screen.getByRole("dialog", { name: "Navigation menu" });
    const workLink = await within(menuDialog).findByRole("link", { name: "Work 01" });

    expect(menuButton).toHaveAttribute("aria-expanded", "true");
    expect(workLink).toBeInTheDocument();
    expect(within(menuDialog).getByRole("link", { name: "Contacts 05" })).toBeInTheDocument();
  });

  it("hides the navigation island while the footer is visible", async () => {
    render(<App />);

    const footerHideZone = document.querySelector<HTMLElement>("[data-navigation-menu-hide-zone]");

    expect(footerHideZone).not.toBeNull();
    expect(screen.getByRole("button", { name: "Open navigation menu" })).toBeInTheDocument();

    vi.spyOn(footerHideZone!, "getBoundingClientRect").mockReturnValue({
      bottom: window.innerHeight + 320,
      height: 360,
      left: 0,
      right: window.innerWidth,
      top: window.innerHeight - 40,
      width: window.innerWidth,
      x: 0,
      y: window.innerHeight - 40,
      toJSON: () => ({}),
    });

    fireEvent.scroll(window);

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Open navigation menu" }),
      ).not.toBeInTheDocument();
    });
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
