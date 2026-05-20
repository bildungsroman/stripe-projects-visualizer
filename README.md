# stripe-projects-visualizer

Visualize the architecture and data flow of a [Stripe Projects](https://projects.dev) app. Reads `state.json`, scans your codebase, and uses an AI model to generate an architecture diagram showing how your provisioned services connect and how data flows between them.

![Architecture diagram of this project... how meta](.projects/architecture.svg)

## Install

```bash
npm install -g stripe-projects-visualizer
```

Or run directly with npx:

```bash
npx stripe-projects-visualizer visualize
```

## Prerequisites

- **Node.js 20+**
- A Stripe Projects-initialized directory (must contain `.projects/state.json`)
- `OPENROUTER_API_KEY` environment variable set

If you don't have an OpenRouter key, provision one via Stripe Projects:

```bash
stripe projects add openrouter/api
stripe projects env --pull
source .env
```

## Usage

```bash
# Visualize the current directory
stripe-projects-viz visualize

# Visualize a specific project
stripe-projects-viz visualize --dir /path/to/project

# Choose a specific model (default: openrouter/auto)
stripe-projects-viz visualize --model anthropic/claude-sonnet-4
stripe-projects-viz visualize -m google/gemini-2.5-flash

# Auto-save SVG without prompting
stripe-projects-viz visualize --save-svg
```

The tool will:

1. Read `.projects/state.json` to discover provisioned services
2. Scan the codebase (file tree, dependencies, README, key source files)
3. Send the context to an AI model to analyze the architecture
4. Render a colorful data-flow diagram in the terminal
5. Optionally save the diagram as `.projects/architecture.svg`

## Development

```bash
npm install
npm run build
npm test
```
