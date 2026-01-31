/**
 * Desktop UI entry. Same route structure as web; shell adds tray, native dialogs.
 * Add Tauri or Electron to run this.
 */

import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./routes/App";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
