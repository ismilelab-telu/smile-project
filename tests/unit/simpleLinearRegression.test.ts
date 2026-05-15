import { describe, expect, it } from "vitest";

import { fitSimpleLinearRegression } from "../../src/features/regression/simple-linear/simpleLinearRegression";

describe("fitSimpleLinearRegression", () => {
  it("fits a perfect positive line", () => {
    const model = fitSimpleLinearRegression([
      { x: 1, y: 3 },
      { x: 2, y: 5 },
      { x: 3, y: 7 },
    ]);

    expect(model.slope).toBeCloseTo(2);
    expect(model.intercept).toBeCloseTo(1);
    expect(model.predict(4)).toBeCloseTo(9);
  });

  it("rejects identical x values", () => {
    expect(() =>
      fitSimpleLinearRegression([
        { x: 2, y: 1 },
        { x: 2, y: 4 },
      ]),
    ).toThrow("x values");
  });
});
