import { describe, it, expect } from "vitest";
import type { ArchitectureGraph } from "../src/analyzer/types.js";
import { renderTerminal } from "../src/renderer/terminalRenderer.js";
import { renderSvg } from "../src/renderer/svgRenderer.js";
import { computeLayout } from "../src/renderer/layout.js";

const sampleGraph: ArchitectureGraph = {
  title: "test-project",
  description: "A test project for unit testing",
  nodes: [
    { id: "user", label: "User", type: "user", description: "End user" },
    {
      id: "webapp",
      label: "Web App",
      type: "component",
      description: "Next.js frontend",
    },
    {
      id: "api",
      label: "API Route",
      type: "component",
      description: "Server endpoint",
    },
    {
      id: "openrouter",
      label: "OpenRouter",
      type: "service",
      description: "LLM inference",
    },
  ],
  edges: [
    { from: "user", to: "webapp", label: "browser" },
    { from: "webapp", to: "api", label: "fetch" },
    { from: "api", to: "openrouter", label: "streaming" },
  ],
  layers: [["user"], ["webapp"], ["api"], ["openrouter"]],
};

describe("computeLayout", () => {
  it("positions all nodes", () => {
    const layout = computeLayout(sampleGraph);

    expect(layout.nodes).toHaveLength(4);
    expect(layout.edges).toHaveLength(3);
    expect(layout.title).toBe("test-project");
  });

  it("assigns increasing Y per layer", () => {
    const layout = computeLayout(sampleGraph);

    const yByNode = new Map(layout.nodes.map((n) => [n.node.id, n.y]));
    expect(yByNode.get("user")!).toBeLessThan(yByNode.get("webapp")!);
    expect(yByNode.get("webapp")!).toBeLessThan(yByNode.get("api")!);
    expect(yByNode.get("api")!).toBeLessThan(yByNode.get("openrouter")!);
  });

  it("handles side-by-side nodes in same layer", () => {
    const graph: ArchitectureGraph = {
      ...sampleGraph,
      nodes: [
        ...sampleGraph.nodes,
        {
          id: "sentry",
          label: "Sentry",
          type: "service",
          description: "Error tracking",
        },
      ],
      layers: [["user"], ["webapp"], ["api"], ["openrouter", "sentry"]],
    };

    const layout = computeLayout(graph);
    const openrouterNode = layout.nodes.find(
      (n) => n.node.id === "openrouter",
    )!;
    const sentryNode = layout.nodes.find((n) => n.node.id === "sentry")!;

    expect(openrouterNode.y).toBe(sentryNode.y);
    expect(openrouterNode.x).not.toBe(sentryNode.x);
  });
});

describe("renderTerminal", () => {
  it("produces output containing the title", () => {
    const output = renderTerminal(sampleGraph);

    expect(output).toContain("TEST-PROJECT");
  });

  it("includes all node labels", () => {
    const output = renderTerminal(sampleGraph);

    expect(output).toContain("User");
    expect(output).toContain("Web App");
    expect(output).toContain("API Route");
    expect(output).toContain("OpenRouter");
  });

  it("includes edge labels", () => {
    const output = renderTerminal(sampleGraph);

    expect(output).toContain("browser");
    expect(output).toContain("fetch");
    expect(output).toContain("streaming");
  });

  it("uses box-drawing characters", () => {
    const output = renderTerminal(sampleGraph);

    expect(output).toContain("╔");
    expect(output).toContain("╗");
    expect(output).toContain("╚");
    expect(output).toContain("╝");
    expect(output).toContain("┌");
    expect(output).toContain("┐");
    expect(output).toContain("└");
    expect(output).toContain("┘");
  });
});

describe("renderSvg", () => {
  it("produces valid SVG with namespace", () => {
    const terminalOutput = renderTerminal(sampleGraph);
    const svg = renderSvg(terminalOutput);

    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain("</svg>");
  });

  it("preserves node labels from terminal output", () => {
    const terminalOutput = renderTerminal(sampleGraph);
    const svg = renderSvg(terminalOutput);

    expect(svg).toContain("User");
    expect(svg).toContain("Web App");
    expect(svg).toContain("API Route");
    expect(svg).toContain("OpenRouter");
  });

  it("preserves edge labels from terminal output", () => {
    const terminalOutput = renderTerminal(sampleGraph);
    const svg = renderSvg(terminalOutput);

    expect(svg).toContain("browser");
    expect(svg).toContain("fetch");
    expect(svg).toContain("streaming");
  });

  it("converts ANSI colors to hex fills", () => {
    const ansiYellow = "\x1b[38;2;255;255;146mhello\x1b[39m";
    const svg = renderSvg(ansiYellow);

    expect(svg).toContain('fill="#ffff92"');
    expect(svg).toContain("hello");
  });

  it("handles bold and dim attributes", () => {
    const ansiBold = "\x1b[1mbold text\x1b[22m";
    const ansiDim = "\x1b[2mdim text\x1b[22m";
    const svg = renderSvg(ansiBold + "\n" + ansiDim);

    expect(svg).toContain('font-weight="bold"');
    expect(svg).toContain('opacity="0.6"');
  });

  it("has dark background", () => {
    const svg = renderSvg("hello");

    expect(svg).toContain("#0a0a0a");
  });

  it("skips empty lines", () => {
    const svg = renderSvg("hello\n\n\nworld");
    const textCount = (svg.match(/<text /g) ?? []).length;

    expect(textCount).toBe(2);
  });
});
