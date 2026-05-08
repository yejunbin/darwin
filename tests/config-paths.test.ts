import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import {
	ensureDarwinHome,
	getBootstrapStatePath,
	getDefaultSessionDir,
	getDarwinAgentDir,
	getDarwinHome,
	getDarwinMemoryDir,
	getDarwinStateDir,
} from "../src/config/paths.js";

test("getDarwinHome uses FEYNMAN_HOME env var when set", () => {
	const previous = process.env.FEYNMAN_HOME;
	try {
		process.env.FEYNMAN_HOME = "/custom/home";
		assert.equal(getDarwinHome(), resolve("/custom/home", ".feynman"));
	} finally {
		if (previous === undefined) {
			delete process.env.FEYNMAN_HOME;
		} else {
			process.env.FEYNMAN_HOME = previous;
		}
	}
});

test("getDarwinHome falls back to homedir when FEYNMAN_HOME is unset", () => {
	const previous = process.env.FEYNMAN_HOME;
	try {
		delete process.env.FEYNMAN_HOME;
		const home = getDarwinHome();
		assert.ok(home.endsWith(".feynman"), `expected path ending in .feynman, got: ${home}`);
		assert.ok(!home.includes("undefined"), `expected no 'undefined' in path, got: ${home}`);
	} finally {
		if (previous === undefined) {
			delete process.env.FEYNMAN_HOME;
		} else {
			process.env.FEYNMAN_HOME = previous;
		}
	}
});

test("getDarwinAgentDir resolves to <home>/agent", () => {
	assert.equal(getDarwinAgentDir("/some/home"), resolve("/some/home", "agent"));
});

test("getDarwinMemoryDir resolves to <home>/memory", () => {
	assert.equal(getDarwinMemoryDir("/some/home"), resolve("/some/home", "memory"));
});

test("getDarwinStateDir resolves to <home>/.state", () => {
	assert.equal(getDarwinStateDir("/some/home"), resolve("/some/home", ".state"));
});

test("getDefaultSessionDir resolves to <home>/sessions", () => {
	assert.equal(getDefaultSessionDir("/some/home"), resolve("/some/home", "sessions"));
});

test("getBootstrapStatePath resolves to <home>/.state/bootstrap.json", () => {
	assert.equal(getBootstrapStatePath("/some/home"), resolve("/some/home", ".state", "bootstrap.json"));
});

test("ensureDarwinHome creates all required subdirectories", () => {
	const root = mkdtempSync(join(tmpdir(), "feynman-paths-"));
	try {
		const home = join(root, "home");
		ensureDarwinHome(home);

		assert.ok(existsSync(home), "home dir should exist");
		assert.ok(existsSync(join(home, "agent")), "agent dir should exist");
		assert.ok(existsSync(join(home, "memory")), "memory dir should exist");
		assert.ok(existsSync(join(home, ".state")), ".state dir should exist");
		assert.ok(existsSync(join(home, "sessions")), "sessions dir should exist");
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("ensureDarwinHome is idempotent when dirs already exist", () => {
	const root = mkdtempSync(join(tmpdir(), "feynman-paths-"));
	try {
		const home = join(root, "home");
		ensureDarwinHome(home);
		assert.doesNotThrow(() => ensureDarwinHome(home));
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
