#!/usr/bin/env node
import { existsSync, mkdirSync, cpSync, rmSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, dirname, delimiter } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const desktopDir = resolve(root, "desktop");
const resourcesDir = resolve(desktopDir, "src-tauri", "resources");
const darwinBundleDir = resolve(resourcesDir, "darwin");

const NODE_VERSION = "20.19.0";

const PLATFORM_CONFIG = {
	"macos-arm64": {
		archive: `node-v${NODE_VERSION}-darwin-arm64.tar.gz`,
		binaryPath: `node-v${NODE_VERSION}-darwin-arm64/bin/node`,
	},
	"macos-x64": {
		archive: `node-v${NODE_VERSION}-darwin-x64.tar.gz`,
		binaryPath: `node-v${NODE_VERSION}-darwin-x64/bin/node`,
	},
	"linux-x64": {
		archive: `node-v${NODE_VERSION}-linux-x64.tar.xz`,
		binaryPath: `node-v${NODE_VERSION}-linux-x64/bin/node`,
	},
	"win-x64": {
		archive: `node-v${NODE_VERSION}-win-x64.zip`,
		binaryPath: `node-v${NODE_VERSION}-win-x64/node.exe`,
	},
};

function getPlatform() {
	const flag = process.argv.find((arg) => arg.startsWith("--platform="));
	if (flag) return flag.slice("--platform=".length);
	const platform = process.platform === "darwin" ? "macos" : process.platform === "linux" ? "linux" : "win";
	const arch = process.arch === "arm64" ? "arm64" : "x64";
	return `${platform}-${arch}`;
}

function downloadAndExtractNodeJs(platform) {
	const config = PLATFORM_CONFIG[platform];
	const extractDir = resolve(resourcesDir, "node-extracted");

	rmSync(extractDir, { recursive: true, force: true });
	mkdirSync(extractDir, { recursive: true });

	const url = `https://nodejs.org/dist/v${NODE_VERSION}/${config.archive}`;
	const archivePath = resolve(extractDir, config.archive);

	console.log(`[darwin-bundle] Downloading Node.js ${NODE_VERSION} for ${platform}...`);
	execSync(`curl -fsSL "${url}" -o "${archivePath}"`);

	console.log("[darwin-bundle] Extracting Node.js...");
	if (platform === "win-x64") {
		execSync(`powershell -Command "Expand-Archive -Path '${archivePath}' -DestinationPath '${extractDir}'"`);
	} else if (config.archive.endsWith(".tar.gz")) {
		execSync(`tar -xzf "${archivePath}" -C "${extractDir}"`);
	} else {
		execSync(`tar -xf "${archivePath}" -C "${extractDir}"`);
	}

	rmSync(archivePath, { force: true });

	const nodePath = resolve(extractDir, config.binaryPath);
	if (!existsSync(nodePath)) {
		throw new Error(`Node.js binary not found at ${nodePath}`);
	}

	const version = execSync(`"${nodePath}" --version`, { encoding: "utf8", stdio: "pipe" }).trim();
	console.log(`[darwin-bundle] Node.js extracted: ${version}`);

	return { extractDir, nodePath };
}

function buildWithNodeJs(nodePath) {
	const nodeBinDir = dirname(nodePath);
	const originalPath = process.env.PATH ?? "";
	const buildPath = `${nodeBinDir}${delimiter}${originalPath}`;
	const buildEnv = { ...process.env, PATH: buildPath };

	if (!existsSync(resolve(root, "dist"))) {
		console.log("[darwin-bundle] Running npm run build...");
		execSync("npm run build", { cwd: root, stdio: "inherit", env: buildEnv });
	}

	const runtimeWorkspacePath = resolve(root, ".darwin", "runtime-workspace.tgz");
	if (!existsSync(runtimeWorkspacePath)) {
		const darwinDir = resolve(root, ".darwin");
		const settingsPath = resolve(darwinDir, "settings.json");
		if (!existsSync(settingsPath)) {
			mkdirSync(darwinDir, { recursive: true });
			writeFileSync(settingsPath, JSON.stringify({ packages: [] }, null, 2) + "\n", "utf8");
			console.log("[darwin-bundle] Created minimal .darwin/settings.json");
		}

		console.log("[darwin-bundle] Running prepare-runtime-workspace...");
		execSync(`"${nodePath}" scripts/prepare-runtime-workspace.mjs`, { cwd: root, stdio: "inherit", env: buildEnv });
	}

	console.log("[darwin-bundle] Applying runtime patches...");
	execSync(`"${nodePath}" scripts/patch-embedded-pi.mjs`, { cwd: root, stdio: "inherit", env: buildEnv });
}

function copyDarwinSource() {
	rmSync(darwinBundleDir, { recursive: true, force: true });
	mkdirSync(darwinBundleDir, { recursive: true });

	const filesToCopy = [
		"bin",
		"dist",
		"scripts/patch-embedded-pi.mjs",
		"scripts/lib",
		"prompts",
		"skills",
		"extensions",
		"metadata",
		".darwin",
		"package.json",
		"package-lock.json",
		"logo.mjs",
		"logo.d.mts",
	];

	for (const file of filesToCopy) {
		const src = resolve(root, file);
		const dest = resolve(darwinBundleDir, file);
		if (!existsSync(src)) {
			console.warn(`[darwin-bundle] Warning: ${file} not found, skipping`);
			continue;
		}
		cpSync(src, dest, { recursive: true, force: true });
		console.log(`[darwin-bundle] Copied ${file}`);
	}
}

function pruneNodeModules() {
	const destNodeModules = resolve(darwinBundleDir, "node_modules");
	const srcNodeModules = resolve(root, "node_modules");

	if (!existsSync(srcNodeModules)) {
		console.warn("[darwin-bundle] Warning: node_modules not found");
		return;
	}

	cpSync(srcNodeModules, destNodeModules, { recursive: true, force: true });
	console.log("[darwin-bundle] Copied node_modules");

	console.log("[darwin-bundle] Pruning dev dependencies...");
	execSync("npm prune --production", { cwd: darwinBundleDir, stdio: "inherit" });

	console.log("[darwin-bundle] Running runtime deps pruner...");
	execSync(`node ${resolve(root, "scripts", "prune-runtime-deps.mjs")} ${darwinBundleDir}`, { stdio: "inherit" });
}

function installNodeJsToBundle(nodePath, extractDir) {
	const bundleNodeDir = resolve(darwinBundleDir, "node");
	const binDir = resolve(bundleNodeDir, "bin");

	rmSync(bundleNodeDir, { recursive: true, force: true });
	mkdirSync(binDir, { recursive: true });

	const nodeBinaryName = process.platform === "win32" ? "node.exe" : "node";
	cpSync(nodePath, resolve(binDir, nodeBinaryName));

	// Determine extracted root directory (e.g. node-v20.19.0-darwin-arm64)
	const extractedEntries = readdirSync(extractDir);
	const extractedRoot = extractedEntries.length === 1
		? resolve(extractDir, extractedEntries[0])
		: extractDir;

	// Copy npm wrapper from extracted bin dir (Unix). Only npm is needed;
	// corepack is a symlink that becomes broken when copied, and npx is unused.
	const extractedBinDir = resolve(extractedRoot, "bin");
	if (existsSync(extractedBinDir)) {
		for (const file of ["npm", "npx"]) {
			const src = resolve(extractedBinDir, file);
			if (existsSync(src)) {
				const dest = resolve(binDir, file);
				cpSync(src, dest);
				console.log(`[darwin-bundle] Copied ${file}`);
			}
		}
	}

	// Windows: npm.cmd is in the root dir
	if (process.platform === "win32") {
		for (const file of ["npm.cmd", "npx.cmd"]) {
			const src = resolve(extractedRoot, file);
			if (existsSync(src)) {
				cpSync(src, resolve(binDir, file));
				console.log(`[darwin-bundle] Copied ${file}`);
			}
		}
	}

	// Copy npm lib directory so wrapper scripts work
	const extractedNpmLib = resolve(extractedRoot, "lib", "node_modules", "npm");
	if (existsSync(extractedNpmLib)) {
		const destNpmLib = resolve(bundleNodeDir, "lib", "node_modules", "npm");
		mkdirSync(dirname(destNpmLib), { recursive: true });
		cpSync(extractedNpmLib, destNpmLib, { recursive: true });
		console.log("[darwin-bundle] Copied lib/node_modules/npm");
	}

	const installedPath = resolve(binDir, nodeBinaryName);
	console.log(`[darwin-bundle] Node.js binary installed: ${installedPath}`);

	try {
		const version = execSync(`"${installedPath}" --version`, { encoding: "utf8", stdio: "pipe" }).trim();
		console.log(`[darwin-bundle] Node.js binary verified: ${version}`);
	} catch {
		console.warn("[darwin-bundle] Warning: Node.js binary verification failed");
	}
}

async function main() {
	const platform = getPlatform();
	const config = PLATFORM_CONFIG[platform];

	if (!config) {
		console.error(`[darwin-bundle] Unsupported platform: ${platform}`);
		process.exit(1);
	}

	console.log(`[darwin-bundle] Preparing desktop bundle for ${platform}...`);

	const { extractDir, nodePath } = downloadAndExtractNodeJs(platform);
	buildWithNodeJs(nodePath);
	copyDarwinSource();
	pruneNodeModules();
	installNodeJsToBundle(nodePath, extractDir);

	rmSync(extractDir, { recursive: true, force: true });

	console.log(`[darwin-bundle] Bundle ready at ${resourcesDir}`);
	console.log(`[darwin-bundle] Darwin source: ${darwinBundleDir}`);
	console.log(`[darwin-bundle] Node.js dir: ${resolve(darwinBundleDir, "node")}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
