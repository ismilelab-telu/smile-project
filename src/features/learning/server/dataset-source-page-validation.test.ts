import { afterEach, describe, expect, it, vi } from "vitest";

import { validateDatasetSourcePage } from "./dataset-source-page-validation";

describe("validateDatasetSourcePage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("blocks localhost URLs before fetching", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await validateDatasetSourcePage(
      { id: "demand-source", url: "http://localhost:8788/private" },
      "id",
    );

    expect(result.status).toBe("invalid");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("extracts metadata and dataset signals from a readable page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          `<!doctype html>
          <html>
            <head>
              <title>Coffee Shop Data | Kaggle</title>
              <meta name="description" content="Dataset with coffee shop sales, CSV downloads, and license notes">
            </head>
            <body>Download the dataset as CSV. Includes 2024 orders and transaction data.</body>
          </html>`,
          {
            headers: { "content-type": "text/html; charset=utf-8" },
            status: 200,
          },
        ),
      ),
    );

    const result = await validateDatasetSourcePage(
      { id: "demand-source", url: "https://www.kaggle.com/datasets/example/coffee-shop" },
      "id",
    );

    expect(result.status).toBe("valid");
    expect(result.title).toBe("Coffee Shop Data | Kaggle");
    expect(result.description).toContain("coffee shop sales");
    expect(result.signals).toContain("sinyal sumber Kaggle");
    expect(result.signals).toContain("sinyal domain kafe");
  });

  it("returns structured dataset evidence from Kaggle JSON-LD", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          `<!doctype html>
          <html>
            <head>
              <meta name="description" content="Full Cycle of Coffee Shop Management">
              <script type="application/ld+json">
                {
                  "@context": "http://schema.org/",
                  "@type": "Dataset",
                  "name": "Coffee Shop Sales/Inventory/Staff",
                  "description": "The Coffee Shop Data dataset is a comprehensive collection designed for a wide array of data analysis, providing a deep dive into the operations of a coffee shop.",
                  "license": {
                    "@type": "CreativeWork",
                    "name": "CC0: Public Domain"
                  }
                }
              </script>
            </head>
            <body>About Dataset</body>
          </html>`,
          {
            headers: { "content-type": "text/html; charset=utf-8" },
            status: 200,
          },
        ),
      ),
    );

    const result = await validateDatasetSourcePage(
      { id: "demand-source", url: "https://www.kaggle.com/datasets/example/coffee-shop" },
      "id",
    );

    expect(result.status).toBe("valid");
    expect(result.title).toBe("Coffee Shop Sales/Inventory/Staff");
    expect(result.evidenceExcerpt).toContain("comprehensive collection");
    expect(result.license).toBe("CC0: Public Domain");
  });
});
