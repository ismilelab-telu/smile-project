import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { learningProgressStorageKey } from "@/features/learning/progress/learning-progress";

const foundationsTrackPath = "/learn/track-machine-learning-foundations";

function seedCompletedLessons(completedLessonIds: string[]) {
  window.localStorage.setItem(
    learningProgressStorageKey,
    JSON.stringify({
      attempts: {},
      completedLessonIds,
      version: 1,
    }),
  );
}

function getStoredCompletedLessonIds() {
  const stored = window.localStorage.getItem(learningProgressStorageKey);

  if (!stored) {
    throw new Error("Expected learning progress to be stored.");
  }

  return (JSON.parse(stored) as { completedLessonIds: string[] }).completedLessonIds;
}

async function chooseColumnRole(columnLabel: string, roleLabel: string) {
  fireEvent.click(screen.getByRole("button", { name: `Role for ${columnLabel}` }));
  fireEvent.click(await screen.findByRole("option", { name: roleLabel }));
}

function getFirstDatasetRow() {
  const table = screen.getByRole("table");
  const rows = within(table).getAllByRole("row");

  if (!rows[1]) {
    throw new Error("Expected the dataset table to have at least one data row.");
  }

  return rows[1];
}

describe("App", () => {
  const lazyRouteTimeout = { timeout: 3000 };

  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.history.pushState(null, "", "/");
  });

  it("routes from landing to the Explore mode selection", async () => {
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

  it("shows the Learning Mode track choices before a lesson list", async () => {
    window.history.pushState(null, "", "/learn");
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Choose a learning path" }, lazyRouteTimeout),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Machine Learning Foundations" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Start path/ })).toHaveAttribute(
      "href",
      foundationsTrackPath,
    );
    expect(screen.getByText("Regression")).toBeInTheDocument();
    expect(screen.getByText("Classification")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Coming soon/ })).toHaveLength(2);
  });

  it("shows only the first Machine Learning Foundations lesson as available without progress", async () => {
    window.history.pushState(null, "", foundationsTrackPath);
    render(<App />);

    expect(
      await screen.findByRole(
        "heading",
        { name: "Machine Learning Foundations" },
        lazyRouteTimeout,
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Start lesson/ })).toHaveLength(1);
    expect(screen.getByRole("link", { name: /Start lesson/ })).toHaveAttribute(
      "href",
      `${foundationsTrackPath}/lesson-0-1-feature-target`,
    );
    expect(
      document.querySelector(
        `a[href="${foundationsTrackPath}/lesson-0-2-regression-classification"]`,
      ),
    ).toBeNull();
    expect(
      document.querySelector(`a[href="${foundationsTrackPath}/lesson-0-3-ml-workflow-order"]`),
    ).toBeNull();
    expect(screen.getAllByText("Locked").length).toBeGreaterThanOrEqual(2);
  });

  it("requires confirmation before resetting learning progress", async () => {
    seedCompletedLessons(["lesson-0-1-feature-target", "lesson-0-2-regression-classification"]);
    window.history.pushState(null, "", foundationsTrackPath);
    render(<App />);

    expect(
      await screen.findByRole(
        "heading",
        { name: "Machine Learning Foundations" },
        lazyRouteTimeout,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("2/32")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reset progress" }));

    const firstDialog = await screen.findByRole("alertdialog", {
      name: "Reset learning progress?",
    });
    expect(
      within(firstDialog).getByText(
        "This action cannot be undone. It will delete your learning progress.",
      ),
    ).toBeInTheDocument();
    expect(getStoredCompletedLessonIds()).toEqual([
      "lesson-0-1-feature-target",
      "lesson-0-2-regression-classification",
    ]);

    fireEvent.click(within(firstDialog).getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
    expect(screen.getByText("2/32")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reset progress" }));

    const secondDialog = await screen.findByRole("alertdialog", {
      name: "Reset learning progress?",
    });
    fireEvent.click(within(secondDialog).getByRole("button", { name: "Reset progress" }));

    await waitFor(() => {
      expect(screen.getByText("0/32")).toBeInTheDocument();
    });
    expect(getStoredCompletedLessonIds()).toEqual([]);
  });

  it("completes the first lesson, persists progress, and unlocks the next lesson", async () => {
    window.history.pushState(null, "", `${foundationsTrackPath}/lesson-0-1-feature-target`);
    render(<App />);

    expect(
      await screen.findByRole(
        "heading",
        { name: "Understanding Dataframes for ML" },
        lazyRouteTimeout,
      ),
    ).toBeInTheDocument();

    await chooseColumnRole("Shift ID", "Metadata");
    await chooseColumnRole("Day Part", "Safe feature");
    await chooseColumnRole("Weather", "Safe feature");
    await chooseColumnRole("Temperature", "Safe feature");
    await chooseColumnRole("Promo Active", "Safe feature");
    await chooseColumnRole("Drinks Sold", "Target");

    fireEvent.click(screen.getByRole("button", { name: "Submit answer" }));

    expect(await screen.findByRole("heading", { name: "Correct" })).toBeInTheDocument();
    expect(getStoredCompletedLessonIds()).toContain("lesson-0-1-feature-target");

    fireEvent.click(screen.getAllByRole("link", { name: "Back to Learning Path" })[0]);

    expect(
      await screen.findByRole(
        "heading",
        { name: "Machine Learning Foundations" },
        lazyRouteTimeout,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Review lesson/ })).toHaveAttribute(
      "href",
      `${foundationsTrackPath}/lesson-0-1-feature-target`,
    );
    expect(screen.getByRole("link", { name: /Start lesson/ })).toHaveAttribute(
      "href",
      `${foundationsTrackPath}/lesson-0-2-regression-classification`,
    );
    expect(
      document.querySelector(`a[href="${foundationsTrackPath}/lesson-0-3-ml-workflow-order"]`),
    ).toBeNull();
  });

  it("sorts the dataset preview when a column header is clicked", async () => {
    window.history.pushState(null, "", `${foundationsTrackPath}/lesson-0-1-feature-target`);
    render(<App />);

    expect(
      await screen.findByRole(
        "heading",
        { name: "Understanding Dataframes for ML" },
        lazyRouteTimeout,
      ),
    ).toBeInTheDocument();

    const drinksSoldHeader = screen.getByRole("button", { name: "Sort by Drinks Sold" });

    fireEvent.click(drinksSoldHeader);
    expect(within(getFirstDatasetRow()).getByText("SHIFT-010")).toBeInTheDocument();
    expect(within(getFirstDatasetRow()).getByText("58")).toBeInTheDocument();

    fireEvent.click(drinksSoldHeader);
    expect(within(getFirstDatasetRow()).getByText("SHIFT-012")).toBeInTheDocument();
    expect(within(getFirstDatasetRow()).getByText("155")).toBeInTheDocument();
  });

  it("keeps the next lesson locked after an incorrect answer", async () => {
    window.history.pushState(null, "", `${foundationsTrackPath}/lesson-0-1-feature-target`);
    render(<App />);

    expect(
      await screen.findByRole(
        "heading",
        { name: "Understanding Dataframes for ML" },
        lazyRouteTimeout,
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Submit answer" }));

    expect(await screen.findByRole("heading", { name: "Not quite" })).toBeInTheDocument();
    expect(screen.queryByText("Expected role check")).not.toBeInTheDocument();
    expect(screen.queryByText("drinks_sold: target")).not.toBeInTheDocument();
    expect(getStoredCompletedLessonIds()).not.toContain("lesson-0-1-feature-target");

    fireEvent.click(screen.getAllByRole("link", { name: "Back to Learning Path" })[0]);

    expect(
      await screen.findByRole(
        "heading",
        { name: "Machine Learning Foundations" },
        lazyRouteTimeout,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Start lesson/ })).toHaveAttribute(
      "href",
      `${foundationsTrackPath}/lesson-0-1-feature-target`,
    );
    expect(
      document.querySelector(
        `a[href="${foundationsTrackPath}/lesson-0-2-regression-classification"]`,
      ),
    ).toBeNull();
  });

  it("blocks direct access to locked Learning Mode lessons", async () => {
    window.history.pushState(
      null,
      "",
      `${foundationsTrackPath}/lesson-0-2-regression-classification`,
    );
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Lesson locked" }, lazyRouteTimeout),
    ).toBeInTheDocument();
    expect(screen.getByText("Complete Lesson 0.1 first.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit answer" })).not.toBeInTheDocument();
  });

  it("submits the regression vs classification lesson", async () => {
    seedCompletedLessons(["lesson-0-1-feature-target"]);
    window.history.pushState(
      null,
      "",
      `${foundationsTrackPath}/lesson-0-2-regression-classification`,
    );
    render(<App />);

    expect(
      await screen.findByRole(
        "heading",
        { name: "Regression vs Classification" },
        lazyRouteTimeout,
      ),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByLabelText("Predict how many drinks Smile Cafe will sell in a shift."),
    );
    fireEvent.click(screen.getByLabelText("Predict the average customer wait time in minutes."));
    fireEvent.click(screen.getByRole("button", { name: "Submit answer" }));

    expect(await screen.findByRole("heading", { name: "Correct" })).toBeInTheDocument();
    expect(getStoredCompletedLessonIds()).toContain("lesson-0-2-regression-classification");
  });

  it("submits the ML workflow ordering lesson", async () => {
    seedCompletedLessons(["lesson-0-1-feature-target", "lesson-0-2-regression-classification"]);
    window.history.pushState(null, "", `${foundationsTrackPath}/lesson-0-3-ml-workflow-order`);
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "ML Workflow Order" }, lazyRouteTimeout),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Move Baseline up" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit answer" }));

    expect(await screen.findByRole("heading", { name: "Correct" })).toBeInTheDocument();
    expect(getStoredCompletedLessonIds()).toContain("lesson-0-3-ml-workflow-order");
  });

  it("unlocks the first lesson in the next module after the previous module is complete", async () => {
    seedCompletedLessons([
      "lesson-0-1-feature-target",
      "lesson-0-2-regression-classification",
      "lesson-0-3-ml-workflow-order",
    ]);
    window.history.pushState(null, "", `${foundationsTrackPath}/lesson-1-1-column-types`);
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Column Types" }, lazyRouteTimeout),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit answer" })).toBeInTheDocument();
  });
});
