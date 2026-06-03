import mdx from "@mdx-js/rollup";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { IncomingMessage, ServerResponse } from "node:http";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite-plus";
import type { Plugin } from "vite-plus";

import { handleDatasetSourcePageValidationRequest } from "./src/features/learning/server/dataset-source-page-validation.ts";
import { handleLearningBackendProxyRequest } from "./src/features/learning/server/learning-backend-proxy.ts";

const learningBackendProxyDevPath = "/api/learning-backend";

type LearningBackendProxyDevEnv = {
  LEARNING_BACKEND_PROXY_AUTH_RATE_LIMITS?: string;
  LEARNING_BACKEND_PROXY_SECRET?: string;
  LEARNING_BACKEND_URL?: string;
};

function readIncomingRequestBody(request: IncomingMessage) {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const chunks: Buffer[] = [];

    request.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    request.on("end", () => {
      const body = Buffer.concat(chunks);
      const arrayBuffer = body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength);

      resolve(arrayBuffer as ArrayBuffer);
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

function getIncomingRequestOrigin(request: IncomingMessage) {
  return `${request.headers["x-forwarded-proto"] ?? "http"}://${request.headers.host ?? "127.0.0.1"}`;
}

function shouldReadIncomingRequestBody(method = "GET") {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

function createLocalProxyHeaders(request: IncomingMessage) {
  const headers = new Headers();

  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(name, item);
      }
    } else if (typeof value === "string") {
      headers.set(name, value);
    }
  }

  const source = request.socket.remoteAddress?.replace(/^::ffff:/, "") || "127.0.0.1";
  headers.set("cf-connecting-ip", source);
  headers.set("x-forwarded-for", source);

  return headers;
}

function getLearningBackendProxyPath(requestUrl = "/") {
  const url = new URL(requestUrl, "http://local.test");
  const pathWithoutDevPrefix = url.pathname.startsWith(learningBackendProxyDevPath)
    ? url.pathname.slice(learningBackendProxyDevPath.length)
    : url.pathname;

  return pathWithoutDevPrefix
    .split("/")
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment));
}

function learningBackendProxyDevPlugin(env: LearningBackendProxyDevEnv): Plugin {
  return {
    configureServer(server) {
      server.middlewares.use(learningBackendProxyDevPath, async (request, response) => {
        const origin = getIncomingRequestOrigin(request);
        const body = shouldReadIncomingRequestBody(request.method)
          ? await readIncomingRequestBody(request)
          : undefined;
        const webRequest = new Request(`${origin}${request.url ?? ""}`, {
          body,
          headers: createLocalProxyHeaders(request),
          method: request.method,
        });
        const webResponse = await handleLearningBackendProxyRequest({
          env,
          params: { path: getLearningBackendProxyPath(request.url) },
          request: webRequest,
        });

        await writeWebResponse(webResponse, response);
      });
    },
    name: "smile-learning-backend-proxy-dev",
  };
}

function datasetSourceValidationDevPlugin(): Plugin {
  return {
    configureServer(server) {
      server.middlewares.use(
        "/api/learning/dataset-source-validation",
        async (request, response) => {
          const origin = getIncomingRequestOrigin(request);
          const body = shouldReadIncomingRequestBody(request.method)
            ? await readIncomingRequestBody(request)
            : undefined;
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

const learningBackendProxyEnv = loadEnv("development", process.cwd(), "");

export default defineConfig({
  plugins: [
    learningBackendProxyDevPlugin({
      LEARNING_BACKEND_PROXY_AUTH_RATE_LIMITS:
        process.env.LEARNING_BACKEND_PROXY_AUTH_RATE_LIMITS ??
        learningBackendProxyEnv.LEARNING_BACKEND_PROXY_AUTH_RATE_LIMITS,
      LEARNING_BACKEND_PROXY_SECRET:
        process.env.LEARNING_BACKEND_PROXY_SECRET ??
        learningBackendProxyEnv.LEARNING_BACKEND_PROXY_SECRET,
      LEARNING_BACKEND_URL:
        process.env.LEARNING_BACKEND_URL ?? learningBackendProxyEnv.LEARNING_BACKEND_URL,
    }),
    datasetSourceValidationDevPlugin(),
    tailwindcss(),
    mdx(),
    react(),
  ],
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
