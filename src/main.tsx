import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import "@fontsource-variable/jetbrains-mono/index.css";
import "@fontsource-variable/lexend/index.css";

import { App } from "./app/App";
import "./styles.css";

if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

const initialLightRoutePaths = new Set([
  "/",
  "/explore",
  "/login",
  "/register",
  "/playground",
  "/algorithm-lab",
]);
const initialPathname = window.location.pathname;

document.documentElement.dataset.routeTheme =
  initialLightRoutePaths.has(initialPathname) ||
  initialPathname === "/learn" ||
  initialPathname.startsWith("/learn/")
    ? "light"
    : "dark";
window.scrollTo(0, 0);

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableColorScheme={false}
      enableSystem={false}
    >
      <App />
    </ThemeProvider>
  </StrictMode>,
);
