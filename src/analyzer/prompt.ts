import type { StateJson } from "../parser/types.js";
import type { CodeContext } from "../context/types.js";

export function buildSystemPrompt(): string {
  return `You are an expert software architect producing a HIGH-LEVEL architecture diagram. A developer who has never seen this codebase should understand the system at a glance — in under 10 seconds.

CRITICAL CONSTRAINT: Keep it simple. Aim for 5-8 nodes total and 3-4 layers. This is a 30,000-foot view, not a code map.

Your output MUST be valid JSON conforming exactly to this schema:

{
  "title": "string — project name (human-readable)",
  "description": "string — what the app does in one plain sentence",
  "nodes": [
    {
      "id": "string — unique camelCase identifier",
      "label": "string — short display name",
      "type": "service | component | external | user",
      "description": "string — 5-12 words, what this does for the system"
    }
  ],
  "edges": [
    {
      "from": "string — source node id",
      "to": "string — target node id",
      "label": "string — short, specific: protocol + what flows (e.g. 'SSE transcript corrections')"
    }
  ],
  "layers": [["nodeId", ...], ...] // top-to-bottom hierarchy
}

## What to include
- The user/client as the top layer
- The application as ONE node (the frontend + backend together, unless they're truly separate)
- Each provisioned service from state.json as its own node (these are the most important)
- Any external runtime dependency not in state.json
- The hosting/deployment platform if known

## What NOT to include
- Internal implementation details (agents, validators, middleware, utility modules)
- Separate nodes for things that are really just the app calling a service
- Wrapper clients or SDK abstractions — show the app connecting directly to the service
- Multiple nodes for different API routes — merge them into the app node

## Node types
- "user": the person using the app
- "component": the application itself (1-2 nodes max)
- "service": third-party service from state.json providers
- "external": external dependency not in state.json

## Security — NEVER expose sensitive data
- Do NOT include API keys, tokens, secrets, passwords, or env var values in any output
- Do NOT include PII (names, emails, addresses, phone numbers) from source files or config
- Node labels and descriptions must be generic (e.g. "OpenRouter" not "sk-or-v1-abc...")
- Edge labels describe data flow patterns, never actual data values

## Edge labels — keep them SHORT and specific
- 3-6 words max per label
- Name what actually flows: "SSE transcript fixes", "chat completion (streaming)"
- Every label must be unique across the entire graph
- Each node pair gets at most ONE edge

## Layers
- Layer 0: user
- Layer 1: the application
- Layer 2+: services and external dependencies
- 3-4 layers total is ideal

Output ONLY the JSON object. No markdown, no explanation, no wrapping.`;
}

export function buildUserPrompt(
  state: StateJson,
  context: CodeContext,
): string {
  const parts: string[] = [];

  if (context.readme) {
    parts.push("## README\n");
    parts.push(context.readme);
    parts.push("\n");
  }

  parts.push("## Stripe Projects state.json (provisioned services)\n");
  parts.push("```json");
  parts.push(JSON.stringify(state, null, 2));
  parts.push("```\n");

  parts.push("## package.json dependencies\n");
  parts.push("```json");
  parts.push(
    JSON.stringify(
      {
        dependencies: context.dependencies,
        devDependencies: context.devDependencies,
      },
      null,
      2,
    ),
  );
  parts.push("```\n");

  parts.push("## Source file tree\n");
  parts.push("```");
  parts.push(context.fileTree.join("\n"));
  parts.push("```\n");

  if (context.sourceSnippets.length > 0) {
    parts.push("## Key source files\n");
    for (const snippet of context.sourceSnippets) {
      parts.push(`### ${snippet.path}\n`);
      parts.push("```");
      parts.push(snippet.content);
      parts.push("```\n");
    }
  }

  parts.push(
    "Return the ArchitectureGraph JSON. Remember:\n" +
      "- The provisioned SERVICES (from state.json) are the stars of the diagram\n" +
      "- The app itself should be 1-2 nodes, not broken into internal pieces\n" +
      "- Show how the app connects to each service and what data flows between them\n" +
      "- A new developer should understand the full picture in 10 seconds",
  );

  return parts.join("\n");
}
