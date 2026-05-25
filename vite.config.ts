import mdx from "@mdx-js/rollup";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [tailwindcss(), mdx(), react()],
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
  lint: {
    ignorePatterns: [
      "coverage/**",
      "dist/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  fmt: {
    semi: true,
    singleQuote: false,
  },
});
