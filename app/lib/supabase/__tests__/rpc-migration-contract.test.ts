import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();

function filesUnder(directory: string): string[] {
	return readdirSync(directory).flatMap((name) => {
		const path = join(directory, name);
		return statSync(path).isDirectory() ? filesUnder(path) : [path];
	});
}

function applicationRpcContracts() {
	const contracts = new Map<string, Set<string>>();
	for (const directory of [join(root, "app", "actions"), join(root, "app", "lib")]) {
		for (const path of filesUnder(directory).filter((file) => file.endsWith(".ts"))) {
			const source = readFileSync(path, "utf8");
			for (const match of source.matchAll(/\.rpc\(\s*"([a-z0-9_]+)"\s*,\s*\{([\s\S]*?)\}\s*\)/g)) {
				const parameters = contracts.get(match[1]) ?? new Set<string>();
				for (const parameter of match[2].matchAll(/\b(p_[a-z0-9_]+)\s*:/g)) {
					parameters.add(parameter[1]);
				}
				contracts.set(match[1], parameters);
			}
		}
	}
	return contracts;
}

describe("Supabase RPC migration contract", () => {
	it("declares every RPC name and parameter used by the application", () => {
		const migrations = filesUnder(join(root, "supabase", "migrations"))
			.filter((file) => file.endsWith(".sql"))
			.map((file) => `-- ${relative(root, file)}\n${readFileSync(file, "utf8")}`)
			.join("\n");
		const missing: string[] = [];

		for (const [name, parameters] of applicationRpcContracts()) {
			const declaration = new RegExp(
				`create\\s+or\\s+replace\\s+function\\s+(?:public\\.)?${name}\\s*\\(([^)]*)\\)`,
				"i",
			).exec(migrations);
			if (!declaration) {
				missing.push(name);
				continue;
			}
			for (const parameter of parameters) {
				if (!new RegExp(`\\b${parameter}\\b`, "i").test(declaration[1])) {
					missing.push(`${name}.${parameter}`);
				}
			}
		}

		expect(missing).toEqual([]);
	});
});
