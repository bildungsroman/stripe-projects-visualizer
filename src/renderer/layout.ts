import type { ArchitectureGraph, ArchitectureNode } from "../analyzer/types.js";

export interface LayoutNode {
  node: ArchitectureNode;
  x: number;
  y: number;
  width: number;
  height: number;
  wrappedDesc: string[];
}

export interface LayoutEdge {
  from: LayoutNode;
  to: LayoutNode;
  label: string;
}

export interface Layout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  width: number;
  height: number;
  title: string;
  description: string;
}

const BOX_MIN_WIDTH = 20;
const BOX_MAX_WIDTH = 56;
const LAYER_GAP = 3;
const NODE_GAP = 4;
const LEFT_MARGIN = 2;

export function getTerminalWidth(): number {
  return process.stdout.columns ?? 120;
}

export function computeLayout(
  graph: ArchitectureGraph,
  terminalWidth?: number,
): Layout {
  const cols = terminalWidth ?? getTerminalWidth();
  const usable = cols - LEFT_MARGIN * 2;

  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));

  const layerNodes: ArchitectureNode[][] = graph.layers.map((layerIds) =>
    layerIds
      .map((id) => nodeMap.get(id))
      .filter((n): n is ArchitectureNode => n !== undefined),
  );

  const layerBoxWidths: number[] = layerNodes.map((layer) => {
    const count = layer.length;
    if (count === 0) return BOX_MIN_WIDTH;

    const available = Math.floor(
      (usable - (count - 1) * NODE_GAP) / count,
    );
    return Math.min(BOX_MAX_WIDTH, Math.max(BOX_MIN_WIDTH, available));
  });

  const layoutNodes: LayoutNode[] = [];
  const nodeLayoutMap = new Map<string, LayoutNode>();

  let maxLayerWidth = 0;
  const layerMeta: {
    nodes: ArchitectureNode[];
    boxWidth: number;
    totalWidth: number;
  }[] = [];

  for (let li = 0; li < layerNodes.length; li++) {
    const layer = layerNodes[li];
    const boxWidth = layerBoxWidths[li];
    const totalWidth =
      layer.length * boxWidth + Math.max(0, layer.length - 1) * NODE_GAP;

    layerMeta.push({ nodes: layer, boxWidth, totalWidth });
    if (totalWidth > maxLayerWidth) maxLayerWidth = totalWidth;
  }

  const canvasWidth = Math.min(maxLayerWidth, usable);
  let currentY = 0;

  for (const { nodes, boxWidth, totalWidth } of layerMeta) {
    const offsetX = Math.max(
      0,
      Math.floor((canvasWidth - totalWidth) / 2),
    );
    let currentX = offsetX;
    let maxHeight = 0;

    for (const node of nodes) {
      const innerWidth = boxWidth - 2;
      const wrappedDesc = wrapText(node.description, innerWidth);
      const boxHeight = 2 + 1 + wrappedDesc.length + 1 + 1;

      const layoutNode: LayoutNode = {
        node,
        x: currentX,
        y: currentY,
        width: boxWidth,
        height: boxHeight,
        wrappedDesc,
      };

      layoutNodes.push(layoutNode);
      nodeLayoutMap.set(node.id, layoutNode);

      currentX += boxWidth + NODE_GAP;
      if (boxHeight > maxHeight) maxHeight = boxHeight;
    }

    currentY += maxHeight + LAYER_GAP;
  }

  const totalHeight = currentY - LAYER_GAP;

  const layoutEdges: LayoutEdge[] = graph.edges
    .map((e) => {
      const from = nodeLayoutMap.get(e.from);
      const to = nodeLayoutMap.get(e.to);
      if (!from || !to) return null;
      return { from, to, label: e.label };
    })
    .filter((e): e is LayoutEdge => e !== null);

  return {
    nodes: layoutNodes,
    edges: layoutEdges,
    width: canvasWidth,
    height: totalHeight,
    title: graph.title,
    description: graph.description,
  };
}

export function wrapText(text: string, width: number): string[] {
  if (text.length <= width) return [text];

  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (current.length === 0) {
      current = word;
    } else if (current.length + 1 + word.length <= width) {
      current += " " + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current.length > 0) lines.push(current);

  return lines;
}
