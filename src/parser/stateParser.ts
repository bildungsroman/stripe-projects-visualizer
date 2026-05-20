import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { StateJson } from "./types.js";

const STATE_PATH = ".projects/state.json";

export async function parseState(projectDir: string): Promise<StateJson> {
  const filePath = join(projectDir, STATE_PATH);

  let raw: string;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch {
    throw new Error(
      `Not a Stripe Projects directory: ${STATE_PATH} not found.\n` +
        `Run \`stripe projects init\` first.`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${STATE_PATH} contains invalid JSON.`);
  }

  return validateState(parsed);
}

function validateState(data: unknown): StateJson {
  if (typeof data !== "object" || data === null) {
    throw new Error("state.json must be a JSON object.");
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.version !== "number") {
    throw new Error("state.json missing numeric 'version' field.");
  }

  if (typeof obj.providers !== "object" || obj.providers === null) {
    throw new Error("state.json missing 'providers' object.");
  }

  if (typeof obj.resources !== "object" || obj.resources === null) {
    throw new Error("state.json missing 'resources' object.");
  }

  return obj as unknown as StateJson;
}
