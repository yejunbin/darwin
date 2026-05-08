import { readFileSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";

export const APP_ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), "..", "..");

export const DARWIN_VERSION = (() => {
	try {
		const pkg = JSON.parse(readFileSync(resolvePath(APP_ROOT, "package.json"), "utf8")) as { version?: string };
		return pkg.version ?? "dev";
	} catch {
		return "dev";
	}
})();

export { DARWIN_ASCII_LOGO as DARWIN_AGENT_LOGO } from "../../logo.mjs";
