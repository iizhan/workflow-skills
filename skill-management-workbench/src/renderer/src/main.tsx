import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { createPreviewWorkbenchApi } from "./preview-api";
import "./styles.css";

if (!window.workbench) {
  if (navigator.userAgent.includes("Electron")) {
    throw new Error("Workbench preload API is unavailable in Electron.");
  }
  window.workbench = createPreviewWorkbenchApi();
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
