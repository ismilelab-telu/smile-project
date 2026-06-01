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

  it("blocks non-Kaggle URLs before fetching", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await validateDatasetSourcePage(
      { id: "demand-source", url: "https://example.com/datasets/food-delivery" },
      "en",
    );

    expect(result.status).toBe("invalid");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks redirects to disallowed internal URLs", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        headers: { location: "http://127.0.0.1:8788/private" },
        status: 302,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await validateDatasetSourcePage(
      { id: "demand-source", url: "https://www.kaggle.com/datasets/example/food-delivery" },
      "en",
    );

    expect(result.status).toBe("invalid");
    expect(result.issues).toContain("This URL is not allowed for automatic validation.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("follows allowed Kaggle redirects", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          headers: { location: "/datasets/example/food-delivery-time" },
          status: 302,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          `<!doctype html>
          <html>
            <head>
              <title>Food Delivery Time Prediction | Kaggle</title>
              <meta name="description" content="Dataset with food delivery time, distance, traffic, CSV downloads, and license notes">
            </head>
            <body>Download the dataset as CSV. Includes 2024 delivery orders, distance, weather, and traffic data.</body>
          </html>`,
          {
            headers: { "content-type": "text/html; charset=utf-8" },
            status: 200,
          },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await validateDatasetSourcePage(
      { id: "demand-source", url: "https://www.kaggle.com/datasets/example/food-delivery" },
      "en",
    );

    expect(result.status).toBe("valid");
    expect(result.url).toBe("https://www.kaggle.com/datasets/example/food-delivery-time");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("extracts metadata and dataset signals from a readable page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          `<!doctype html>
          <html>
            <head>
              <title>Food Delivery Time Prediction | Kaggle</title>
              <meta name="description" content="Dataset with food delivery time, distance, traffic, CSV downloads, and license notes">
            </head>
            <body>Download the dataset as CSV. Includes 2024 delivery orders, distance, weather, and traffic data.</body>
          </html>`,
          {
            headers: { "content-type": "text/html; charset=utf-8" },
            status: 200,
          },
        ),
      ),
    );

    const result = await validateDatasetSourcePage(
      { id: "demand-source", url: "https://www.kaggle.com/datasets/example/food-delivery" },
      "id",
    );

    expect(result.status).toBe("valid");
    expect(result.title).toBe("Food Delivery Time Prediction | Kaggle");
    expect(result.description).toContain("food delivery time");
    expect(result.signals).toContain("sinyal sumber Kaggle");
    expect(result.signals).toContain("sinyal domain pengiriman");
  });

  it("returns structured dataset evidence from Kaggle JSON-LD", async () => {
    const fullDatasetDescription =
      "## About Dataset\n\nThe **Food Delivery Time Prediction** dataset is designed for predicting food delivery times based on distance, weather, traffic conditions, and time of day.\n\n- Distance_km\n- Delivery_Time_min";
    const structuredDatasetJson = JSON.stringify({
      "@context": "http://schema.org/",
      "@type": "Dataset",
      description: fullDatasetDescription,
      license: {
        "@type": "CreativeWork",
        name: "CC0: Public Domain",
      },
      name: "Food Delivery Time Prediction",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          `<!doctype html>
          <html>
            <head>
              <meta name="description" content="Optimize Food Delivery: Predict Times with Real-World Data!">
              <script type="application/ld+json">
                ${structuredDatasetJson}
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
      { id: "demand-source", url: "https://www.kaggle.com/datasets/example/food-delivery" },
      "id",
    );

    expect(result.status).toBe("valid");
    expect(result.title).toBe("Food Delivery Time Prediction");
    expect(result.evidenceExcerpt).toBe(fullDatasetDescription);
    expect(result.evidenceExcerpt).not.toContain("...");
    expect(result.license).toBe("CC0: Public Domain");
  });
});
