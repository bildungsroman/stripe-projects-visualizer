import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { collectContext } from "../src/context/collector.js";

describe("collectContext", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "viz-ctx-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("collects file tree and package.json deps", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({
        dependencies: { next: "^16.0.0" },
        devDependencies: { typescript: "^5.0.0" },
      }),
    );
    await mkdir(join(tempDir, "src"), { recursive: true });
    await writeFile(join(tempDir, "src", "index.ts"), "export const x = 1;");

    const ctx = await collectContext(tempDir);

    expect(ctx.fileTree).toContain("src/index.ts");
    expect(ctx.fileTree).toContain("package.json");
    expect(ctx.dependencies.next).toBe("^16.0.0");
    expect(ctx.devDependencies.typescript).toBe("^5.0.0");
  });

  it("skips node_modules and dot-directories", async () => {
    await writeFile(join(tempDir, "package.json"), "{}");
    await mkdir(join(tempDir, "node_modules", "foo"), { recursive: true });
    await writeFile(join(tempDir, "node_modules", "foo", "index.js"), "x");
    await mkdir(join(tempDir, ".hidden"), { recursive: true });
    await writeFile(join(tempDir, ".hidden", "secret.ts"), "x");
    await mkdir(join(tempDir, "src"), { recursive: true });
    await writeFile(join(tempDir, "src", "app.ts"), "export const y = 2;");

    const ctx = await collectContext(tempDir);

    expect(ctx.fileTree).toContain("src/app.ts");
    expect(ctx.fileTree).not.toContain("node_modules/foo/index.js");
    expect(ctx.fileTree).not.toContain(".hidden/secret.ts");
  });

  it("reads source snippets from key files", async () => {
    await writeFile(join(tempDir, "package.json"), "{}");
    await mkdir(join(tempDir, "src", "app", "api"), { recursive: true });
    await writeFile(
      join(tempDir, "src", "app", "api", "route.ts"),
      'export async function POST() { return new Response("ok"); }',
    );

    const ctx = await collectContext(tempDir);

    expect(ctx.sourceSnippets.length).toBeGreaterThan(0);
    const routeSnippet = ctx.sourceSnippets.find((s) =>
      s.path.includes("route.ts"),
    );
    expect(routeSnippet).toBeDefined();
    expect(routeSnippet!.content).toContain("POST");
  });

  it("returns empty deps when package.json is missing", async () => {
    const ctx = await collectContext(tempDir);

    expect(ctx.dependencies).toEqual({});
    expect(ctx.devDependencies).toEqual({});
  });
});
