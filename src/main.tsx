import "@/lib/polyfills"; // must run before pdf.js and other libs load
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DevContextMenu } from "@/components/layout/DevContextMenu";
import { UpdateWindow } from "@/components/layout/UpdateWindow";
import { ThemeProvider } from "@/lib/theme";
import { Toaster } from "@/components/ui/toaster";
import { appendAppLog } from "@/lib/tauri";
import "@/styles/globals.css";

// Record otherwise-invisible failures (rejected promises, non-React errors) to
// the shared app log so they can be diagnosed from a user's bug report.
window.addEventListener("unhandledrejection", (e) => {
  const reason = e.reason;
  const msg = reason?.stack || reason?.message || String(reason);
  void appendAppLog(`Unhandled promise rejection: ${msg}`).catch(() => {});
});
window.addEventListener("error", (e) => {
  const msg = e.error?.stack || e.message || String(e.error);
  void appendAppLog(`Uncaught error: ${msg}`).catch(() => {});
});

// A dedicated, frameless window (opened by the updater) renders only the update
// UI via `?view=update`, in its own JS context.
const isUpdateWindow =
  new URLSearchParams(window.location.search).get("view") === "update";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      {isUpdateWindow ? (
        <ThemeProvider>
          <UpdateWindow />
        </ThemeProvider>
      ) : (
        <>
          <App />
          <Toaster />
          <DevContextMenu />
        </>
      )}
    </ErrorBoundary>
  </StrictMode>
);
