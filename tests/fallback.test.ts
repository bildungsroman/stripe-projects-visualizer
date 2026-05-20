import { describe, it, expect } from "vitest";
import type { StateJson } from "../src/parser/types.js";
import { buildFallbackGraph } from "../src/analyzer/fallbackGraph.js";
import { renderTerminal } from "../src/renderer/terminalRenderer.js";

const sampleState: StateJson = {
  version: 1,
  providers: {
    openrouter: { name: "OpenRouter" },
    vercel: { name: "Vercel" },
  },
  resources: {
    "openrouter-api": {
      name: "openrouter-api",
      providerName: "openrouter",
      serviceId: "api",
    },
    "vercel-project": {
      name: "vercel-project",
      providerName: "vercel",
      serviceId: "project",
    },
  },
};

describe("buildFallbackGraph", () => {
  it("creates an app node plus one node per provider", () => {
    const graph = buildFallbackGraph(sampleState, "my-app");
    expect(graph.nodes).toHaveLength(3);
    expect(graph.nodes[0].id).toBe("app");
    expect(graph.nodes[0].label).toBe("my-app");
  });

  it("creates edges from app to each provider", () => {
    const graph = buildFallbackGraph(sampleState, "my-app");
    expect(graph.edges).toHaveLength(2);
    expect(graph.edges.every((e) => e.from === "app")).toBe(true);
  });

  it("uses service IDs as edge labels", () => {
    const graph = buildFallbackGraph(sampleState, "my-app");
    const labels = graph.edges.map((e) => e.label);
    expect(labels).toContain("api");
    expect(labels).toContain("project");
  });

  it("arranges layers as [app] then [services]", () => {
    const graph = buildFallbackGraph(sampleState, "my-app");
    expect(graph.layers).toHaveLength(2);
    expect(graph.layers[0]).toEqual(["app"]);
    expect(graph.layers[1]).toHaveLength(2);
  });

  it("sets title and description", () => {
    const graph = buildFallbackGraph(sampleState, "my-app");
    expect(graph.title).toBe("my-app");
    expect(graph.description).toContain("2 provisioned services");
  });

  it("renders without errors", () => {
    const graph = buildFallbackGraph(sampleState, "my-app");
    const output = renderTerminal(graph);
    expect(output).toContain("OpenRouter");
    expect(output).toContain("Vercel");
    expect(output).toContain("MY-APP");
  });

  it("handles single provider with singular text", () => {
    const singleState: StateJson = {
      version: 1,
      providers: { vercel: { name: "Vercel" } },
      resources: {
        "vercel-project": {
          name: "vercel-project",
          providerName: "vercel",
          serviceId: "project",
        },
      },
    };
    const graph = buildFallbackGraph(singleState, "app");
    expect(graph.description).toContain("1 provisioned service");
    expect(graph.description).not.toContain("services");
  });
});
