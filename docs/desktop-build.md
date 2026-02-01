# Building the Mac/Windows desktop app

The desktop app uses **Tauri v2** (Rust + webview), not a web-wrapper. It loads the **Next.js web app** (`apps/web`) in a native window—no duplicated code.

---

## Prerequisites

1. **Rust**  
   Install from [rustup.rs](https://rustup.rs):
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```
   Or via Homebrew (macOS):
   ```bash
   brew install rust
   ```

2. **Platform deps**
   - **macOS:** Xcode Command Line Tools: `xcode-select --install`
   - **Windows:** [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (Desktop development with C++) and [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (usually already present on Windows 11)

3. **Node**  
   Use the same Node/npm as the rest of the monorepo.

---

## Install and run (dev)

From the **repo root**:

```bash
npm install
cd apps/web
npm install
cd ../desktop
npm install
npm run tauri:dev
```

This will:
1. Start the Next.js dev server on `localhost:3000`
2. Open a native Tauri window loading the web app

First Rust compile can take a few minutes.

---

## Build installers / binaries

The desktop app is a **lightweight wrapper**: it does **not** build the Next.js app. It bundles a tiny static page that redirects to the web app URL (default `http://localhost:3000`). So the desktop build no longer depends on the web app’s build or `@overlap/core`.

From **apps/desktop**:

```bash
cd apps/desktop
npm install
npm run tauri:build
```

This will:
1. Bundle the minimal redirect page from `apps/desktop/static/`
2. Produce the native Tauri app + installer

Outputs (paths relative to `apps/desktop`):

- **macOS**
  - Binary: `src-tauri/target/release/bundle/macos/Overlap.app`
  - Installer: `src-tauri/target/release/bundle/dmg/Overlap_0.1.0_aarch64.dmg` (or x64)
- **Windows**
  - Binary: `src-tauri/target/release/overlap-desktop.exe`
  - Installer: `src-tauri/target/release/bundle/nsis/Overlap_0.1.0_x64-setup.exe` (or MSI under `msi/`)

To build for a different target (e.g. Windows from macOS):

```bash
npm run tauri build -- --target x86_64-pc-windows-msvc   # Windows from macOS
npm run tauri build -- --target aarch64-apple-darwin     # Apple Silicon
npm run tauri build -- --target x86_64-apple-darwin       # Intel Mac
```

---

**Using the built app:** The bundled app redirects to `http://localhost:3000`, so you need the web app running locally. To point at a deployed URL instead, edit `apps/desktop/static/index.html` and replace `http://localhost:3000` with your web app URL, then rebuild.

**One-liner from repo root:**

```bash
cd apps/desktop && npm install && npm run tauri:build
```

Then pick the installer from `apps/desktop/src-tauri/target/release/bundle/` (dmg on Mac, nsis or msi on Windows).

---

## Optional: app icons

To set custom icons, add them under `apps/desktop/src-tauri/icons/` (see [Tauri icons](https://v2.tauri.app/develop/icons/)) and reference them in `src-tauri/tauri.conf.json` under `bundle.icon`. Current placeholder is a 1x1 PNG—replace with a proper square icon (512×512 or 1024×1024) or generate all sizes with:

```bash
cd apps/desktop
npx tauri icon /path/to/your/1024x1024.png
```
