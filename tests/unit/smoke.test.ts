import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "../..");

describe("repository structure", () => {
  it("package.json declares the expected project name and a build script", () => {
    const pkg = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
    expect(pkg.name).toBe("lab-screenshot-manager");
    expect(typeof pkg.scripts?.build).toBe("string");
    expect(pkg.scripts.build.length).toBeGreaterThan(0);
  });

  it("tsconfig.json has strict mode enabled", () => {
    // Strip JSON comments before parsing.
    const raw = readFileSync(resolve(repoRoot, "tsconfig.json"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");
    const tsconfig = JSON.parse(raw);
    expect(tsconfig.compilerOptions?.strict).toBe(true);
  });

  it("GitHub Actions workflows directory is populated", () => {
    const workflowsDir = resolve(repoRoot, ".github/workflows");
    expect(existsSync(workflowsDir)).toBe(true);
    for (const file of ["ci.yml", "deploy.yml", "codeql.yml", "e2e.yml"]) {
      expect(existsSync(resolve(workflowsDir, file)), `missing workflow ${file}`).toBe(true);
    }
  });

  it("Dependabot config exists", () => {
    const dependabotPath = resolve(repoRoot, ".github/dependabot.yml");
    expect(existsSync(dependabotPath)).toBe(true);
    const raw = readFileSync(dependabotPath, "utf8");
    expect(raw).toMatch(/package-ecosystem:\s*"npm"/);
  });
});
