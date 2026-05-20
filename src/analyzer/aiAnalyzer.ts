import { OpenRouter } from "@openrouter/sdk";
import type { StateJson } from "../parser/types.js";
import type { CodeContext } from "../context/types.js";
import type { ArchitectureGraph } from "./types.js";
import { buildSystemPrompt, buildUserPrompt } from "./prompt.js";

const DEFAULT_MODEL = "openrouter/auto";
const MAX_RETRIES = 1;

export interface AnalysisResult {
  graph: ArchitectureGraph;
  resolvedModel: string;
}

export async function analyzeArchitecture(
  state: StateJson,
  context: CodeContext,
  apiKey: string,
  model?: string,
): Promise<AnalysisResult> {
  const client = new OpenRouter({ apiKey });
  const selectedModel = model ?? DEFAULT_MODEL;

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(state, context);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await client.chat.send({
        chatRequest: {
          model: selectedModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.2,
          maxTokens: 4096,
        },
      });

      const content = response.choices?.[0]?.message?.content;
      if (!content || typeof content !== "string") {
        throw new Error("Empty response from model.");
      }

      const cleaned = content
        .replace(/^```(?:json)?\s*/m, "")
        .replace(/```\s*$/m, "")
        .trim();

      const graph = JSON.parse(cleaned) as ArchitectureGraph;
      validateGraph(graph);
      return { graph, resolvedModel: response.model ?? selectedModel };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES) continue;
    }
  }

  throw new Error(
    `AI analysis failed after ${MAX_RETRIES + 1} attempts: ${lastError?.message}`,
  );
}

function validateGraph(graph: ArchitectureGraph): void {
  if (!graph.title || typeof graph.title !== "string") {
    throw new Error("Graph missing 'title'.");
  }
  if (!graph.description || typeof graph.description !== "string") {
    throw new Error("Graph missing 'description'.");
  }
  if (!Array.isArray(graph.nodes) || graph.nodes.length === 0) {
    throw new Error("Graph must have at least one node.");
  }
  if (!Array.isArray(graph.edges)) {
    throw new Error("Graph missing 'edges' array.");
  }
  if (!Array.isArray(graph.layers) || graph.layers.length === 0) {
    throw new Error("Graph must have at least one layer.");
  }

  const nodeIds = new Set(graph.nodes.map((n) => n.id));

  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.from)) {
      throw new Error(`Edge references unknown node: ${edge.from}`);
    }
    if (!nodeIds.has(edge.to)) {
      throw new Error(`Edge references unknown node: ${edge.to}`);
    }
  }

  const layeredIds = new Set(graph.layers.flat());
  for (const node of graph.nodes) {
    if (!layeredIds.has(node.id)) {
      graph.layers[graph.layers.length - 1].push(node.id);
    }
  }
}
