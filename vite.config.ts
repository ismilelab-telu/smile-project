import mdx from "@mdx-js/rollup";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { IncomingMessage, ServerResponse } from "node:http";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite-plus";
import type { Plugin } from "vite-plus";

import { handleDatasetSourcePageValidationRequest } from "./src/features/learning/server/dataset-source-page-validation.ts";

function readIncomingRequestBody(request: IncomingMessage) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];

    request.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    request.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    request.on("error", reject);
  });
}

async function writeWebResponse(response: Response, serverResponse: ServerResponse) {
  serverResponse.statusCode = response.status;
  response.headers.forEach((value, key) => {
    serverResponse.setHeader(key, value);
  });
  serverResponse.end(Buffer.from(await response.arrayBuffer()));
}

function datasetSourceValidationDevPlugin(): Plugin {
  return {
    configureServer(server) {
      server.middlewares.use(
        "/api/learning/dataset-source-validation",
        async (request, response) => {
          const origin = `${request.headers["x-forwarded-proto"] ?? "http"}://${request.headers.host ?? "127.0.0.1"}`;
          const body =
            request.method === "GET" ? undefined : await readIncomingRequestBody(request);
          const webRequest = new Request(`${origin}${request.url ?? ""}`, {
            body,
            headers: request.headers as HeadersInit,
            method: request.method,
          });
          const webResponse = await handleDatasetSourcePageValidationRequest(webRequest);

          await writeWebResponse(webResponse, response);
        },
      );
    },
    name: "smile-dataset-source-validation-dev",
  };
}

export default defineConfig({
  plugins: [datasetSourceValidationDevPlugin(), tailwindcss(), mdx(), react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          includeDependenciesRecursively: false,
          groups: [
            {
              entriesAware: true,
              name: "react-vendor",
              priority: 50,
              test: /node_modules[\\/](react|react-dom|scheduler|next-themes)[\\/]/,
            },
            {
              entriesAware: true,
              name: "gsap-vendor",
              priority: 40,
              test: /node_modules[\\/]gsap[\\/]/,
            },
            {
              entriesAware: true,
              name: "motion-vendor",
              priority: 40,
              test: /node_modules[\\/]motion[\\/]/,
            },
            {
              entriesAware: true,
              maxSize: 260_000,
              name: "three-vendor",
              priority: 40,
              test: /node_modules[\\/]three[\\/]/,
            },
            {
              entriesAware: true,
              name: "icons-vendor",
              priority: 30,
              test: /node_modules[\\/]@tabler[\\/]icons-react[\\/]/,
            },
          ],
          minSize: 20_000,
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5317,
  },
  preview: {
    host: "127.0.0.1",
    port: 4317,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    include: ["src/**/*.test.{ts,tsx}", "tests/unit/**/*.test.{ts,tsx}"],
    exclude: ["tests/e2e/**"],
  },
  staged: {
    "*.{js,jsx,ts,tsx}": "vp check --fix",
    "*.{json,html,css,md,mdx}": "vp fmt --write",
  },
  lint: {
    env: {
      browser: true,
      node: true,
    },
    ignorePatterns: [
      "coverage/**",
      "dist/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
    ],
    rules: {
      "no-undef": "error",
    },
  },
  fmt: {
    semi: true,
    singleQuote: false,
  },
});
