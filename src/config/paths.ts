import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

export function getDarwinHome(): string {
	return resolve(process.env.DARWIN_HOME ?? homedir(), ".darwin");
}

export function getDarwinAgentDir(home = getDarwinHome()): string {
	return resolve(home, "agent");
}

export function getDarwinMemoryDir(home = getDarwinHome()): string {
	return resolve(home, "memory");
}

export function getDarwinStateDir(home = getDarwinHome()): string {
	return resolve(home, ".state");
}

export function getDefaultSessionDir(home = getDarwinHome()): string {
	return resolve(home, "sessions");
}

export function getBootstrapStatePath(home = getDarwinHome()): string {
	return resolve(getDarwinStateDir(home), "bootstrap.json");
}

export function ensureDarwinHome(home = getDarwinHome()): void {
	for (const dir of [
		home,
		getDarwinAgentDir(home),
		getDarwinMemoryDir(home),
		getDarwinStateDir(home),
		getDefaultSessionDir(home),
	]) {
		mkdirSync(dir, { recursive: true });
	}
}
