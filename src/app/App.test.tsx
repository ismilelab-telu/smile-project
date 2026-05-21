import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";

describe("App", () => {
  const lazyRouteTimeout = { timeout: 3000 };

  beforeEach(() => {
    vi.restoreAllMocks();
    window.history.pushState(null, "", "/");
  });

  it("renders the landing page", async () => {
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Smile Project" }, lazyRouteTimeout),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("link", { name: /Open 404 page/ }, lazyRouteTimeout),
    ).toHaveAttribute("href", "/404");
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

  it("routes the explore action to the 404 page", async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole("link", { name: /Open 404 page/ }, lazyRouteTimeout));

    expect(
      await screen.findByRole("heading", { name: "404 not found." }, lazyRouteTimeout),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe("/404");
  });
});
