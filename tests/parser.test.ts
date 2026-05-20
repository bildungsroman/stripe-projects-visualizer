import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseState } from "../src/parser/stateParser.js";

describe("parseState", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "viz-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("parses a valid state.json", async () => {
    await mkdir(join(tempDir, ".projects"), { recursive: true });
    await writeFile(
      join(tempDir, ".projects", "state.json"),
      JSON.stringify({
        version: 1,
        providers: {
          openrouter: { name: "OpenRouter" },
          vercel: { name: "Vercel" },
        },
        resources: {
          "openrouter-api": {
            name: "openrouter-api",
            providerName: "OpenRouter",
            serviceId: "api",
          },
        },
      }),
    );

    const state = await parseState(tempDir);
    expect(state.version).toBe(1);
    expect(Object.keys(state.providers)).toEqual(["openrouter", "vercel"]);
    expect(state.resources["openrouter-api"].providerName).toBe("OpenRouter");
  });

  it("throws when .projects/state.json is missing", async () => {
    await expect(parseState(tempDir)).rejects.toThrow(
      "Not a Stripe Projects directory",
    );
  });

  it("throws on invalid JSON", async () => {
    await mkdir(join(tempDir, ".projects"), { recursive: true });
    await writeFile(join(tempDir, ".projects", "state.json"), "not json");

    await expect(parseState(tempDir)).rejects.toThrow("invalid JSON");
  });

  it("throws when providers field is missing", async () => {
    await mkdir(join(tempDir, ".projects"), { recursive: true });
    await writeFile(
      join(tempDir, ".projects", "state.json"),
      JSON.stringify({ version: 1, resources: {} }),
    );

    await expect(parseState(tempDir)).rejects.toThrow("'providers'");
  });

  it("handles empty providers and resources", async () => {
    await mkdir(join(tempDir, ".projects"), { recursive: true });
    await writeFile(
      join(tempDir, ".projects", "state.json"),
      JSON.stringify({ version: 1, providers: {}, resources: {} }),
    );

    const state = await parseState(tempDir);
    expect(Object.keys(state.providers)).toHaveLength(0);
    expect(Object.keys(state.resources)).toHaveLength(0);
  });
});
