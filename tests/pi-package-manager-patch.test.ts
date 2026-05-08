import test from "node:test";
import assert from "node:assert/strict";

import { patchPiPackageManagerSource } from "../scripts/lib/pi-package-manager-patch.mjs";

test("patchPiPackageManagerSource adds legacy peer deps to npm installs", () => {
	const source = [
		'await this.runNpmCommand(["install", "-g", ...specs]);',
		'await this.runNpmCommand(["install", ...specs, "--prefix", installRoot]);',
		'await this.runNpmCommand(["install", "-g", source.spec]);',
		'await this.runNpmCommand(["install", source.spec, "--prefix", installRoot]);',
	].join("\n");

	const patched = patchPiPackageManagerSource(source);

	assert.match(patched, /\["install", "--legacy-peer-deps", "-g", \.\.\.specs\]/);
	assert.match(patched, /\["install", "--legacy-peer-deps", \.\.\.specs, "--prefix", installRoot\]/);
	assert.match(patched, /\["install", "--legacy-peer-deps", "-g", source\.spec\]/);
	assert.match(patched, /\["install", "--legacy-peer-deps", source\.spec, "--prefix", installRoot\]/);
});

test("patchPiPackageManagerSource is idempotent", () => {
	const source = 'await this.runNpmCommand(["install", source.spec, "--prefix", installRoot]);';
	const once = patchPiPackageManagerSource(source);
	const twice = patchPiPackageManagerSource(once);

	assert.equal(twice, once);
});
