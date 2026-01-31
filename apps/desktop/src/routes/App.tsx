import React from "react";

export function App(): React.ReactElement {
  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>Overlap (desktop)</h1>
      <p>Same route structure as web. Add Tauri/Electron for native shell.</p>
      <nav>
        <a href="#thread">Thread</a> · <a href="#settings">Settings</a>
      </nav>
    </div>
  );
}
