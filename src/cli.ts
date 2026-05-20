#!/usr/bin/env node

import { Command } from "commander";
import { visualize } from "./commands/visualize.js";

const program = new Command();

program
  .name("stripe-projects-viz")
  .description("Visualize the architecture and data flow of a Stripe Projects app")
  .version("0.1.0");

program
  .command("visualize")
  .description("Generate an architecture diagram for the current project")
  .option("-d, --dir <path>", "Path to the project directory (defaults to cwd)")
  .option("--save-svg", "Save SVG diagram without prompting")
  .action(async (opts) => {
    try {
      await visualize({ dir: opts.dir, saveSvg: opts.saveSvg });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\n  Error: ${message}\n`);
      process.exit(1);
    }
  });

program.parse();
