import fs from "node:fs";
import { builtinModules } from "node:module";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Every bare import in the app and the functions must be a declared dependency. A package
 * that only works because some other package happens to pull it in breaks the day that
 * other package changes its own dependencies.
 */
const root = path.resolve(".");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")) as {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
};
const declared = new Set([...Object.keys(pkg.dependencies), ...Object.keys(pkg.devDependencies)]);

function sources(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {return entry.name === "node_modules" ? [] : sources(full);}
        return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
    });
}

function packageOf(specifier: string): string {
    const parts = specifier.split("/");
    return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

const builtins = new Set(builtinModules);

function importedPackages(): Map<string, string[]> {
    const found = new Map<string, string[]>();
    for (const file of [...sources(path.join(root, "src")), ...sources(path.join(root, "netlify")), ...sources(path.join(root, "db"))]) {
        const text = fs.readFileSync(file, "utf8");
        for (const match of text.matchAll(/(?:^|\n)\s*(?:import|export)\s[^;]*?from\s+["']([^"']+)["']|(?:^|\n)\s*import\s+["']([^"']+)["']/g)) {
            const specifier = match[1] || match[2];
            if (specifier.startsWith(".") || specifier.startsWith("/") || specifier.startsWith("node:")) {continue;}
            if (builtins.has(specifier)) {continue;}
            const name = packageOf(specifier);
            found.set(name, [...(found.get(name) ?? []), path.relative(root, file)]);
        }
    }
    return found;
}

describe("dependencies", () => {
    const undeclared = [...importedPackages()].filter(([name]) => !declared.has(name));

    it("finds the project's imports", () => {
        const names = [...importedPackages().keys()];
        expect(names).toEqual(expect.arrayContaining(["react", "ably", "firebase"]));
    });

    it("every imported package is declared in package.json", () => {
        expect(undeclared).toEqual([]);
    });

    it("the declared `motion` package that provides it is installed", () => {
        expect(declared.has("motion")).toBe(true);
    });
});
