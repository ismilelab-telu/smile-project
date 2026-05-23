import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";

describe("App", () => {
  const lazyRouteTimeout = { timeout: 3000 };

  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.history.pushState(null, "", "/");
  });

  it("renders the landing page", async () => {
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Smile Project" }, lazyRouteTimeout),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("link", { name: /Open Explore page/ }, lazyRouteTimeout),
    ).toHaveAttribute("href", "/explore");
  });

  it("opens the orchestrated GSAP navigation island", async () => {
    render(<App />);

    const menuButton = await screen.findByRole(
      "button",
      { name: "Open navigation menu" },
      lazyRouteTimeout,
    );

    fireEvent.click(menuButton);

    const menuDialog = screen.getByRole("dialog", { name: "Navigation menu" });
    const workLink = await within(menuDialog).findByRole("link", { name: "Work 01" });

    expect(menuButton).toHaveAttribute("aria-expanded", "true");
    expect(workLink).toBeInTheDocument();
    expect(within(menuDialog).getByRole("link", { name: "Contacts 05" })).toBeInTheDocument();
  });

  it("hides the navigation island while the footer is visible", async () => {
    render(<App />);

    const menuButton = await screen.findByRole(
      "button",
      { name: "Open navigation menu" },
      lazyRouteTimeout,
    );
    let footerHideZone: HTMLElement | null = null;

    await waitFor(() => {
      footerHideZone = document.querySelector<HTMLElement>("[data-navigation-menu-hide-zone]");
      expect(footerHideZone).not.toBeNull();
    });

    expect(menuButton).toBeInTheDocument();

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

  it("renders fuzzy text utility pages", async () => {
    window.history.pushState(null, "", "/support");
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "404 not found." }, lazyRouteTimeout),
    ).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: "404" }, lazyRouteTimeout)).toBeInTheDocument();
    expect(
      await screen.findByRole("img", { name: "not found." }, lazyRouteTimeout),
    ).toBeInTheDocument();
  });

  it("routes inactive mode placeholders back to explore", async () => {
    for (const placeholderPath of ["/playground", "/algorithm-lab"]) {
      window.history.pushState(null, "", placeholderPath);
      const { unmount } = render(<App />);

      expect(
        await screen.findByRole("heading", { name: "404 not found." }, lazyRouteTimeout),
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Explore" })).toHaveAttribute("href", "/explore");

      unmount();
    }
  });

  it("opens the explore page menu", async () => {
    window.history.pushState(null, "", "/explore");
    render(<App />);

    const menuButton = await screen.findByRole("button", { name: "Open menu" }, lazyRouteTimeout);

    fireEvent.click(menuButton);

    const exploreMenu = await screen.findByRole("navigation", {
      name: "Explore menu",
    });

    expect(menuButton).toHaveAttribute("aria-expanded", "true");
    expect(within(exploreMenu).getByRole("link", { name: /Learning Mode/ })).toHaveAttribute(
      "href",
      "/learn",
    );

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(menuButton).toHaveAttribute("aria-expanded", "false");
    });
  });

  it("routes the explore action to the mode selection page", async () => {
    render(<App />);

    fireEvent.click(
      await screen.findByRole("link", { name: /Open Explore page/ }, lazyRouteTimeout),
    );

    expect(
      await screen.findByRole("heading", { name: "Choose a mode." }, lazyRouteTimeout),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Learning Mode/ })).toHaveAttribute("href", "/learn");
    expect(screen.getByRole("link", { name: /ML Playground/ })).toHaveAttribute(
      "href",
      "/playground",
    );
    expect(screen.getByRole("link", { name: /Algorithm Lab/ })).toHaveAttribute(
      "href",
      "/algorithm-lab",
    );
    expect(window.location.pathname).toBe("/explore");
  });

  it("renders the Learning Mode home", async () => {
    window.history.pushState(null, "", "/learn");
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Regression Foundations" }, lazyRouteTimeout),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Modules" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Start module/ })).toHaveAttribute(
      "href",
      "/learn/track-regression-foundations/lesson-0-1-feature-target",
    );
  });

  it("submits the first Learning Mode exercise and persists progress", async () => {
    window.history.pushState(
      null,
      "",
      "/learn/track-regression-foundations/lesson-0-1-feature-target",
    );
    render(<App />);

    expect(
      await screen.findByRole(
        "heading",
        { name: "Rows, Columns, Features, and Targets" },
        lazyRouteTimeout,
      ),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Role for Listing ID"), {
      target: { value: "metadata" },
    });
    fireEvent.change(screen.getByLabelText("Role for District"), {
      target: { value: "safe-feature" },
    });
    fireEvent.change(screen.getByLabelText("Role for Property Type"), {
      target: { value: "safe-feature" },
    });
    fireEvent.change(screen.getByLabelText("Role for Building Area"), {
      target: { value: "safe-feature" },
    });
    fireEvent.change(screen.getByLabelText("Role for Bedrooms"), {
      target: { value: "safe-feature" },
    });
    fireEvent.change(screen.getByLabelText("Role for Price"), {
      target: { value: "target" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Submit answer" }));

    expect(await screen.findByRole("heading", { name: "Correct" })).toBeInTheDocument();
    expect(window.localStorage.getItem("smile-learning-progress-v1")).toContain(
      "lesson-0-1-feature-target",
    );
  });
});
