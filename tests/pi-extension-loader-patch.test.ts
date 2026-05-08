import test from "node:test";
import assert from "node:assert/strict";

import { patchPiExtensionLoaderSource } from "../scripts/lib/pi-extension-loader-patch.mjs";

test("patchPiExtensionLoaderSource rewrites Windows extension imports to file URLs", () => {
	const input = [
		'import * as path from "node:path";',
		'import { fileURLToPath } from "node:url";',
		"async function loadExtensionModule(extensionPath) {",
		"    const jiti = createJiti(import.meta.url);",
		'    const module = await jiti.import(extensionPath, { default: true });',
		"    return module;",
		"}",
		"",
	].join("\n");

	const patched = patchPiExtensionLoaderSource(input);

	assert.match(patched, /pathToFileURL/);
	assert.match(patched, /process\.platform === "win32"/);
	assert.match(patched, /path\.isAbsolute\(extensionPath\)/);
	assert.match(patched, /jiti\.import\(extensionSpecifier, \{ default: true \}\)/);
});

test("patchPiExtensionLoaderSource is idempotent", () => {
	const input = [
		'import * as path from "node:path";',
		'import { fileURLToPath } from "node:url";',
		"async function loadExtensionModule(extensionPath) {",
		"    const jiti = createJiti(import.meta.url);",
		'    const module = await jiti.import(extensionPath, { default: true });',
		"    return module;",
		"}",
		"",
	].join("\n");

	const once = patchPiExtensionLoaderSource(input);
	const twice = patchPiExtensionLoaderSource(once);

	assert.equal(twice, once);
});
