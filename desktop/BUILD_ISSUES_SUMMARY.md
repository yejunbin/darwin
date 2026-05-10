# Darwin Desktop App — Build Issues Summary

## Overview

This document summarizes all technical issues encountered while building the 100% standalone Darwin desktop app (Tauri v2 + React + bundled Node.js), and their resolutions.

---

## Issue 1: Standalone Executable Approach Failed

**Problem**: Attempted to use `@yao-pkg/pkg` to compile `bin/darwin.js` into a single standalone executable.

**Root Cause**: `bin/darwin.js` and `dist/pi/pi-cli-wrapper.js` use ESM dynamic `import(pathToFileURL(...))`, which `pkg` cannot resolve in its snapshot filesystem. Additionally, `launchPiChat` spawns a child Node.js process with `--import` loader flags — fundamentally incompatible with a single `pkg` executable.

**Resolution**: Abandoned `pkg` approach. Switched to bundling a full Node.js binary + pruned app source as Tauri `bundle.resources`.

---

## Issue 2: Bundled npm — EACCES Permission Error

**Problem**: macOS app showed `[stderr] failed to run npm root -g: spawnSync npm EACCES`.

**Root Cause**: The `bin/npm` wrapper script created by `prepare-desktop-bundle.mjs` using `writeFileSync` had no execute permission (`0o644`). Unix requires `+x` to execute a script.

**Resolution**: Added `chmodSync(resolve(binDir, "npm"), 0o755)` after creating the wrapper script.

**File**: `scripts/prepare-desktop-bundle.mjs`

---

## Issue 3: Bundled npm — `require(...) is not a function`

**Problem**: macOS app showed `[stderr] Failed to run npm root -g: require(...) is not a function`.

**Root Cause**: The npm wrapper script was written as:
```js
require("../lib/node_modules/npm/bin/npm-cli.js")(process)
```
But `npm-cli.js` has no `module.exports`, so `require()` returns `undefined`, and `(undefined)(process)` throws.

**Resolution**: Changed wrapper to:
```js
require("../lib/node_modules/npm/bin/npm-cli.js")
```
The script executes as a side effect, no need to call its return value.

**File**: `scripts/prepare-desktop-bundle.mjs`

---

## Issue 4: Frontend TypeScript — Used Before Declaration

**Problem**: GitHub Actions build failed on all 4 platforms with:
```
Variable 'appendSystemMessage' is used before being assigned.
Block-scoped variable 'appendSystemMessage' used before its declaration.
```

**Root Cause**: `startLoadingTimeout` (line 49) referenced `appendSystemMessage` in its `useCallback` dependency array, but `appendSystemMessage` was defined later (line 228). TypeScript caught the temporal dead zone violation.

**Resolution**:
- Moved `appendSystemMessage` declaration before `startLoadingTimeout`
- Added missing `appendSystemMessage` and `clearLoadingTimeout` dependencies to `handleRpcMessage`'s `useCallback`

**File**: `desktop/src/App.tsx`

---

## Issue 5: Double `.darwin/.darwin` Path

**Problem**: Extension packages installed to `/Users/<user>/.darwin/.darwin/npm-global/lib/node_modules/`, causing path confusion and extension loading failures.

**Root Cause**: In `patch-embedded-pi.mjs`:
```js
const darwinHome = resolve(process.env.DARWIN_HOME ?? homedir(), ".darwin");
```
The desktop app sets `DARWIN_HOME=~/.darwin`, so this resolved to `~/.darwin/.darwin`.

**Resolution**: Check if `DARWIN_HOME` already ends with `.darwin` before appending:
```js
const darwinHome = process.env.DARWIN_HOME?.endsWith(".darwin")
    ? process.env.DARWIN_HOME
    : resolve(process.env.DARWIN_HOME ?? homedir(), ".darwin");
```

**File**: `scripts/patch-embedded-pi.mjs`

---

## Issue 6: `node:sqlite` Not Available in Node.js 20

**Problem**: Extension `@samfp/pi-memory` failed to load with:
```
No such built-in module: node:sqlite
```

**Root Cause**: `node:sqlite` was introduced in Node.js 22.5.0 as experimental. The bundled Node.js was 20.19.0.

**Resolution**: Upgraded bundled Node.js from `20.19.0` to `22.15.1`.

**Also fixed**: `supportsNativePackageSources()` was incorrectly returning `true` for Node.js 20 (checking `<= 24`). Changed to require `>= 22 && <= 24`.

**Files**: `scripts/prepare-desktop-bundle.mjs`, `scripts/patch-embedded-pi.mjs`

---

## Issue 7: Pi Process Exits on Extension Loading Errors

**Problem**: After extension loading errors (e.g., missing peer dependency), the RPC process immediately disconnected.

**Root Cause**: Pi's `main.js` has:
```js
reportDiagnostics(runtime.diagnostics);
if (runtime.diagnostics.some((d) => d.type === "error")) {
    process.exit(1);
}
```
Extension loading errors are collected as diagnostics, then the process exits unconditionally — even in RPC mode.

**Resolution**: Patched `main.js` to skip `process.exit(1)` when `appMode === "rpc"`:
```js
if (runtime.diagnostics.some((d) => d.type === "error")) {
    if (appMode !== "rpc") {
        process.exit(1);
    }
}
```

**File**: `scripts/patch-embedded-pi.mjs` (new patch for Pi `main.js`)

---

## Issue 8: Pi Process Exits Without Pre-Configured Model

**Problem**: If no model was configured before launching the desktop app, Pi would exit with:
```
No models available. Configure a model provider first.
```

**Root Cause**: Pi's `main.js` has:
```js
if (appMode !== "interactive" && !session.model) {
    console.error(chalk.red(formatNoModelsAvailableMessage()));
    process.exit(1);
}
```
In RPC mode, the user configures models through the desktop Settings UI, not via CLI flags.

**Resolution**: Patched `main.js` to allow RPC mode without a pre-configured model:
```js
if (appMode !== "interactive" && appMode !== "rpc" && !session.model) {
    process.exit(1);
}
```

**File**: `scripts/patch-embedded-pi.mjs`

---

## Issue 9: Frontend Infinite Loading on RPC Errors

**Problem**: After sending a message, the UI spinner ran indefinitely with no response.

**Root Cause**: The frontend's `handleRpcMessage` did not handle Pi RPC `response` type events (which carry `success: false` + `error` on preflight/auth failures). Without receiving `message_end`, `isLoading` was never set to `false`.

**Resolution**:
- Added `response` branch in `handleRpcMessage` that closes loading and displays error
- Added 60-second loading timeout as a safety net

**File**: `desktop/src/App.tsx`

---

## Build-Time vs Runtime Issue Matrix

| Issue | Stage | Platforms Affected |
|-------|-------|-------------------|
| `pkg` ESM incompatibility | Design | All |
| npm EACCES | Runtime | macOS, Linux |
| npm `require()()` | Runtime | macOS, Linux |
| TS used-before-declaration | Build | All |
| Double `.darwin` path | Runtime | All |
| `node:sqlite` missing | Runtime | All |
| Pi exit on diagnostics | Runtime | All |
| Pi exit without model | Runtime | All |
| Frontend infinite loading | Runtime | All |

---

## Current Architecture

```
Tauri App Bundle
├── Darwin source (resources/darwin/)
│   ├── bin/darwin.js
│   ├── dist/
│   ├── node_modules/ (pruned)
│   ├── prompts/, skills/, extensions/
│   └── .darwin/ (runtime workspace)
├── Node.js binary (resources/darwin/node/bin/node)
└── Frontend (React + Vite)
```

- **No external dependencies**: Node.js binary is bundled
- **No PATH configuration**: Bundled `node/bin` is prepended to PATH
- **User data**: Stored in `~/.darwin/` (models, auth, sessions, outputs)
- **Extension packages**: Installed to `~/.darwin/npm-global/` via bundled npm

---

## Lessons Learned

1. **ESM + `pkg` = fragile**: Dynamic imports in ESM are fundamentally incompatible with snapshot filesystems. Bundling the runtime is more reliable.

2. **File permissions matter for bundled scripts**: `writeFileSync` creates files with `0o644`. Any executable script needs explicit `chmodSync(..., 0o755)`.

3. **`DARWIN_HOME` semantics must be consistent**: If the env var represents the final directory, don't append a subdirectory to it.

4. **Node.js built-in modules have version requirements**: Always check Node.js version compatibility for features like `node:sqlite`.

5. **RPC mode needs special handling**: CLI tools that call `process.exit()` on errors need to be patched when embedded as a long-running RPC server.

6. **Frontend must handle all RPC event types**: Missing event handlers cause UI state to hang indefinitely.
