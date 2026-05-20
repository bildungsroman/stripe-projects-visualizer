#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { visualize } from "./commands/visualize.js";

const program = new Command();

program
  .name("stripe-projects-viz")
  .description("Visualize the architecture and data flow of a Stripe Projects app")
  .version("0.1.0")
  .helpCommand("help [command]", "Display help for a command")
  .action(() => {
    console.log("");
    console.log(chalk.bold("  stripe-projects-viz") + chalk.dim(" — architecture diagrams for Stripe Projects apps"));
    console.log("");
    console.log(chalk.yellow("  Usage:"));
    console.log(chalk.dim("    $ ") + "stripe-projects-viz visualize" + chalk.dim("          # AI-powered diagram"));
    console.log(chalk.dim("    $ ") + "stripe-projects-viz visualize --basic" + chalk.dim("  # simple diagram from state.json"));
    console.log("");
    console.log(chalk.yellow("  Options:"));
    console.log("    -d, --dir <path>     " + chalk.dim("Project directory (defaults to cwd)"));
    console.log("    -m, --model <model>  " + chalk.dim("OpenRouter model (default: openrouter/auto)"));
    console.log("    --save-svg           " + chalk.dim("Save SVG without prompting"));
    console.log("    --basic              " + chalk.dim("Skip AI, diagram from state.json only"));
    console.log("");
    console.log(chalk.yellow("  Examples:"));
    console.log(chalk.dim("    $ ") + "stripe-projects-viz visualize");
    console.log(chalk.dim("    $ ") + "stripe-projects-viz visualize --dir ./my-project --save-svg");
    console.log(chalk.dim("    $ ") + "stripe-projects-viz visualize -m anthropic/claude-sonnet-4");
    console.log(chalk.dim("    $ ") + "stripe-projects-viz visualize --basic");
    console.log("");
    console.log(chalk.yellow("  Prerequisites:"));
    console.log("    " + chalk.dim("Requires .projects/state.json (run `stripe projects init`)"));
    console.log("    " + chalk.dim("Set OPENROUTER_API_KEY for AI mode, or use --basic without it"));
    console.log("");
  });

program
  .command("visualize")
  .description("Generate an architecture diagram for the current project")
  .option("-d, --dir <path>", "Path to the project directory (defaults to cwd)")
  .option("-m, --model <model>", "OpenRouter model to use (default: openrouter/auto)")
  .option("--save-svg", "Save SVG diagram without prompting")
  .option("--basic", "Skip AI analysis and show a simple diagram from state.json")
  .action(async (opts) => {
    try {
      await visualize({ dir: opts.dir, model: opts.model, saveSvg: opts.saveSvg, basic: opts.basic });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\n  Error: ${message}\n`);
      process.exit(1);
    }
  });

program.parse();
