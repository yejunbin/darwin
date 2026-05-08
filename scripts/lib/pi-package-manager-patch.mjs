const INSTALL_REPLACEMENTS = [
	{
		from: '["install", "-g", ...specs]',
		to: '["install", "--legacy-peer-deps", "-g", ...specs]',
	},
	{
		from: '["install", ...specs, "--prefix", installRoot]',
		to: '["install", "--legacy-peer-deps", ...specs, "--prefix", installRoot]',
	},
	{
		from: '["install", "-g", source.spec]',
		to: '["install", "--legacy-peer-deps", "-g", source.spec]',
	},
	{
		from: '["install", source.spec, "--prefix", installRoot]',
		to: '["install", "--legacy-peer-deps", source.spec, "--prefix", installRoot]',
	},
];

export function patchPiPackageManagerSource(source) {
	let patched = source;
	for (const { from, to } of INSTALL_REPLACEMENTS) {
		patched = patched.split(from).join(to);
	}
	return patched;
}
