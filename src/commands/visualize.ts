import { resolve } from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { join } from "node:path";
import { parseState } from "../parser/stateParser.js";
import { collectContext } from "../context/collector.js";
import { analyzeArchitecture, FREE_MODEL } from "../analyzer/aiAnalyzer.js";
import { buildFallbackGraph } from "../analyzer/fallbackGraph.js";
import { renderTerminal } from "../renderer/terminalRenderer.js";
import { renderSvg } from "../renderer/svgRenderer.js";
import { colors } from "../renderer/colors.js";

interface VisualizeOptions {
  dir?: string;
  model?: string;
  saveSvg?: boolean;
  basic?: boolean;
  free?: boolean;
}

async function loadEnvFile(dir: string): Promise<void> {
  for (const name of [".env", ".env.local"]) {
    try {
      const content = await readFile(join(dir, name), "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIndex = trimmed.indexOf("=");
        if (eqIndex === -1) continue;
        const key = trimmed.slice(0, eqIndex).trim();
        let value = trimmed.slice(eqIndex + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    } catch {
      // file doesn't exist, skip
    }
  }
}

/**
 * Main entry point for the `visualize` command. Like Stackery but for Stripe Projects.
 *
 * Reads `.projects/state.json` from the target directory, then either
 * sends codebase context to an AI model (default) or builds a simple
 * graph from state alone (`--basic` / missing API key). The resulting
 * architecture graph is rendered as a colored terminal diagram and
 * optionally exported as SVG.
 */
export async function visualize(options: VisualizeOptions): Promise<void> {
  const projectDir = resolve(options.dir ?? process.cwd());

  await loadEnvFile(projectDir);

  console.log(colors.dim("  Reading project state..."));
  const state = await parseState(projectDir);

  const providerCount = Object.keys(state.providers).length;
  const resourceCount = Object.keys(state.resources).length;

  if (providerCount === 0) {
    console.log(
      colors.yellow("\n  No services provisioned yet.\n") +
        colors.dim(
          "  Run `stripe projects add <provider>/<service>` to get started.\n",
        ),
    );
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  let graph;

  if (apiKey && !options.basic) {
    console.log(colors.dim("  Scanning codebase..."));
    const context = await collectContext(projectDir);
    console.log(
      colors.dim(
        `  Found ${context.fileTree.length} source files, ${context.sourceSnippets.length} key files sampled.`,
      ),
    );
    console.log(
      colors.dim("  Analyzing architecture with AI...") +
        colors.dim(
          ` (${providerCount} providers, ${resourceCount} resources)`,
        ),
    );
    const model = options.free ? FREE_MODEL : options.model;
    const result = await analyzeArchitecture(state, context, apiKey, model);
    graph = result.graph;
    console.log(colors.dim(`  Model: ${result.resolvedModel}`));
  } else {
    const projectName = projectDir.split("/").pop() ?? "App";
    if (!options.basic) {
      console.log(
        colors.yellow("\n  No OPENROUTER_API_KEY found — using basic mode.\n") +
          colors.dim(
            "  For richer AI-powered diagrams, provision OpenRouter:\n",
          ) +
          colors.dim("    stripe projects add openrouter/api\n") +
          colors.dim("    stripe projects env --pull && source .env\n"),
      );
    }
    graph = buildFallbackGraph(state, projectName);
  }

  console.log("");
  const diagram = renderTerminal(graph);
  console.log(diagram);

  if (options.saveSvg) {
    await saveSvgDiagram(diagram, projectDir);
  } else {
    const save = await promptYesNo(
      colors.dim("  Save diagram as SVG? ") + colors.dim("(y/N) "),
    );
    if (save) {
      await saveSvgDiagram(diagram, projectDir);
    }
  }
}

async function saveSvgDiagram(
  terminalOutput: string,
  projectDir: string,
): Promise<void> {
  const svg = renderSvg(terminalOutput);
  const outPath = join(projectDir, ".projects", "architecture.svg");
  await writeFile(outPath, svg, "utf-8");
  console.log(
    colors.dim("\n  Saved to ") +
      colors.blurple(".projects/architecture.svg") +
      "\n",
  );
}

function promptYesNo(question: string): Promise<boolean> {
  if (!process.stdin.isTTY) return Promise.resolve(false);

  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}
