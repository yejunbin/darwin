import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export const DARWIN_SERVICE_TIERS = [
	"auto",
	"default",
	"flex",
	"priority",
	"standard_only",
] as const;

export type DarwinServiceTier = (typeof DARWIN_SERVICE_TIERS)[number];

const SERVICE_TIER_SET = new Set<string>(DARWIN_SERVICE_TIERS);
const OPENAI_SERVICE_TIERS = new Set<DarwinServiceTier>(["auto", "default", "flex", "priority"]);
const ANTHROPIC_SERVICE_TIERS = new Set<DarwinServiceTier>(["auto", "standard_only"]);

function readSettings(settingsPath: string): Record<string, unknown> {
	try {
		return JSON.parse(readFileSync(settingsPath, "utf8")) as Record<string, unknown>;
	} catch {
		return {};
	}
}

export function normalizeServiceTier(value: string | undefined): DarwinServiceTier | undefined {
	if (!value) return undefined;
	const normalized = value.trim().toLowerCase();
	return SERVICE_TIER_SET.has(normalized) ? (normalized as DarwinServiceTier) : undefined;
}

export function getConfiguredServiceTier(settingsPath: string): DarwinServiceTier | undefined {
	const settings = readSettings(settingsPath);
	return normalizeServiceTier(typeof settings.serviceTier === "string" ? settings.serviceTier : undefined);
}

export function setConfiguredServiceTier(settingsPath: string, tier: DarwinServiceTier | undefined): void {
	const settings = readSettings(settingsPath);
	if (tier) {
		settings.serviceTier = tier;
	} else {
		delete settings.serviceTier;
	}

	mkdirSync(dirname(settingsPath), { recursive: true });
	writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf8");
}

export function resolveActiveServiceTier(settingsPath: string): DarwinServiceTier | undefined {
	return normalizeServiceTier(process.env.DARWIN_SERVICE_TIER) ?? getConfiguredServiceTier(settingsPath);
}

export function resolveProviderServiceTier(
	provider: string | undefined,
	tier: DarwinServiceTier | undefined,
): DarwinServiceTier | undefined {
	if (!provider || !tier) return undefined;
	if ((provider === "openai" || provider === "openai-codex") && OPENAI_SERVICE_TIERS.has(tier)) {
		return tier;
	}
	if (provider === "anthropic" && ANTHROPIC_SERVICE_TIERS.has(tier)) {
		return tier;
	}
	return undefined;
}
