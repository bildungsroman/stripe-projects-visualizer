import type { ArchitectureGraph } from "../analyzer/types.js";
import { computeLayout } from "./layout.js";
import type { LayoutNode, Layout } from "./layout.js";
import { colors } from "./colors.js";

type ColorFn = (s: string) => string;

const LEFT_MARGIN = 2;

function colorForType(type: string): ColorFn {
  switch (type) {
    case "service":
      return colors.orange;
    case "component":
      return colors.pink;
    case "external":
      return colors.blurple;
    case "user":
      return colors.yellow;
    default:
      return colors.dim;
  }
}

export function renderTerminal(graph: ArchitectureGraph): string {
  const layout = computeLayout(graph);
  const lines: string[] = [];

  renderTitle(lines, layout);
  lines.push("");

  for (let li = 0; li < graph.layers.length; li++) {
    const layerNodeIds = new Set(graph.layers[li]);
    const layerLayoutNodes = layout.nodes.filter((ln) =>
      layerNodeIds.has(ln.node.id),
    );

    if (li > 0) {
      const prevIds = graph.layers[li - 1];
      const curIds = graph.layers[li];
      renderEdges(lines, layout, prevIds, curIds);
    }

    renderLayerBoxes(lines, layerLayoutNodes, layout.width);
    lines.push("");
  }

  return lines.join("\n");
}

function renderTitle(lines: string[], layout: Layout): void {
  const innerWidth = Math.min(Math.max(layout.width, 40), 80);
  const titleLine = layout.title.toUpperCase();
  const descLine =
    layout.description.length > innerWidth - 4
      ? layout.description.slice(0, innerWidth - 7) + "..."
      : layout.description;

  const leftOffset =
    Math.max(0, Math.floor((layout.width - innerWidth) / 2)) + LEFT_MARGIN;
  const pad = " ".repeat(leftOffset);

  const padTitle = Math.max(
    0,
    Math.floor((innerWidth - 2 - titleLine.length) / 2),
  );
  const padDesc = Math.max(
    0,
    Math.floor((innerWidth - 2 - descLine.length) / 2),
  );

  lines.push(pad + colors.yellow("╔" + "═".repeat(innerWidth - 2) + "╗"));
  lines.push(
    pad +
      colors.yellow(
        "║" +
          " ".repeat(padTitle) +
          titleLine +
          " ".repeat(innerWidth - 2 - padTitle - titleLine.length) +
          "║",
      ),
  );
  lines.push(
    pad +
      colors.yellow("║") +
      " ".repeat(padDesc) +
      colors.dim(descLine) +
      " ".repeat(Math.max(0, innerWidth - 2 - padDesc - descLine.length)) +
      colors.yellow("║"),
  );
  lines.push(pad + colors.yellow("╚" + "═".repeat(innerWidth - 2) + "╝"));
}

function renderLayerBoxes(
  lines: string[],
  nodes: LayoutNode[],
  canvasWidth: number,
): void {
  if (nodes.length === 0) return;

  const maxHeight = Math.max(...nodes.map((n) => n.height));
  const boxes = nodes.map((ln) => buildBox(ln, maxHeight));
  const maxLines = Math.max(...boxes.map((b) => b.length));

  for (let row = 0; row < maxLines; row++) {
    let line = " ".repeat(LEFT_MARGIN);
    for (let ni = 0; ni < boxes.length; ni++) {
      const box = boxes[ni];
      const ln = nodes[ni];

      const padBefore = ni === 0 ? ln.x : 0;
      line += " ".repeat(padBefore);

      if (row < box.length) {
        line += box[row];
      } else {
        line += " ".repeat(ln.width);
      }

      if (ni < boxes.length - 1) {
        const nextNode = nodes[ni + 1];
        const gapStart = ln.x + ln.width;
        const gapWidth = nextNode.x - gapStart;
        line += " ".repeat(Math.max(0, gapWidth));
      }
    }
    lines.push(line);
  }
}

function buildBox(ln: LayoutNode, maxHeight: number): string[] {
  const { node, width, wrappedDesc } = ln;
  const color = colorForType(node.type);
  const innerWidth = width - 2;
  const boxLines: string[] = [];

  boxLines.push(color("┌" + "─".repeat(innerWidth) + "┐"));
  boxLines.push(
    color("│") + colors.bold(color(padCenter(node.label, innerWidth))) + color("│"),
  );

  for (const descLine of wrappedDesc) {
    boxLines.push(
      color("│") + colors.dim(padCenter(descLine, innerWidth)) + color("│"),
    );
  }

  boxLines.push(color("│") + colors.purple("░".repeat(innerWidth)) + color("│"));
  boxLines.push(color("└" + "─".repeat(innerWidth) + "┘"));

  while (boxLines.length < maxHeight) {
    boxLines.push(" ".repeat(width));
  }

  return boxLines;
}

interface EdgeGroup {
  sourceCenter: number;
  targets: { center: number; label: string }[];
}

function renderEdges(
  lines: string[],
  layout: Layout,
  fromLayerIds: string[],
  toLayerIds: string[],
): void {
  const fromSet = new Set(fromLayerIds);
  const toSet = new Set(toLayerIds);

  const relevantEdges = layout.edges.filter(
    (e) => fromSet.has(e.from.node.id) && toSet.has(e.to.node.id),
  );

  if (relevantEdges.length === 0) {
    lines.push("");
    return;
  }

  const groups = new Map<string, EdgeGroup>();
  for (const edge of relevantEdges) {
    const srcId = edge.from.node.id;
    const sourceCenter = edge.from.x + Math.floor(edge.from.width / 2);
    const targetCenter = edge.to.x + Math.floor(edge.to.width / 2);

    if (!groups.has(srcId)) {
      groups.set(srcId, { sourceCenter, targets: [] });
    }
    groups.get(srcId)!.targets.push({ center: targetCenter, label: edge.label });
  }

  const canvasWidth = layout.width + LEFT_MARGIN * 2;

  const pipeLine = new Array(canvasWidth).fill(" ");
  for (const group of groups.values()) {
    const col = group.sourceCenter + LEFT_MARGIN;
    if (col >= 0 && col < canvasWidth) {
      pipeLine[col] = "│";
    }
  }
  lines.push(pipeLine.map((c) => (c === "│" ? colors.yellow(c) : c)).join(""));

  const sourceCols = [...groups.values()].map(
    (g) => g.sourceCenter + LEFT_MARGIN,
  );

  const allLabels: { col: number; label: string }[] = [];
  const seenLabels = new Set<string>();
  for (const group of groups.values()) {
    for (const t of group.targets) {
      if (t.label) {
        const key = `${t.center}:${t.label}`;
        if (!seenLabels.has(key)) {
          seenLabels.add(key);
          allLabels.push({ col: t.center + LEFT_MARGIN, label: t.label });
        }
      }
    }
  }

  if (allLabels.length > 0) {
    allLabels.sort((a, b) => a.col - b.col);

    const rows: { start: number; end: number; label: string }[][] = [[]];
    for (const item of allLabels) {
      const halfLen = Math.floor(item.label.length / 2);
      const start = Math.max(0, item.col - halfLen);
      const end = start + item.label.length;
      const entry = { start, end, label: item.label };

      let placed = false;
      for (const row of rows) {
        if (!row.some((r) => start < r.end + 2 && end + 2 > r.start)) {
          row.push(entry);
          placed = true;
          break;
        }
      }
      if (!placed) {
        rows.push([entry]);
      }
    }

    for (const row of rows) {
      row.sort((a, b) => a.start - b.start);
      let line = "";
      let cursor = 0;

      const pipeSet = new Set(
        sourceCols.filter((sc) => sc >= 0 && sc < canvasWidth),
      );

      const labelRanges = row.map((e) => ({
        start: e.start,
        end: e.end,
        label: e.label,
      }));

      while (cursor < canvasWidth) {
        const labelEntry = labelRanges.find(
          (r) => cursor >= r.start && cursor < r.end,
        );

        if (labelEntry) {
          if (cursor < labelEntry.start) {
            line += " ".repeat(labelEntry.start - cursor);
          }
          line += colors.yellow(labelEntry.label);
          cursor = labelEntry.end;
        } else if (pipeSet.has(cursor)) {
          line += colors.yellow("│");
          cursor++;
        } else {
          let end = cursor + 1;
          while (
            end < canvasWidth &&
            !pipeSet.has(end) &&
            !labelRanges.some((r) => end >= r.start && end < r.end)
          ) {
            end++;
          }
          line += " ".repeat(end - cursor);
          cursor = end;
        }
      }

      lines.push(line);
    }
  }

  const dirs = new Array<number>(canvasWidth).fill(0);
  const arrowLine = new Array(canvasWidth).fill(" ");
  let needsBranch = false;

  for (const group of groups.values()) {
    const srcCol = group.sourceCenter + LEFT_MARGIN;
    const targetCols = group.targets
      .map((t) => t.center + LEFT_MARGIN)
      .sort((a, b) => a - b);

    if (targetCols.length === 1 && targetCols[0] === srcCol) {
      arrowLine[srcCol] = "▼";
      continue;
    }

    needsBranch = true;
    const allCols = [...new Set([srcCol, ...targetCols])].sort((a, b) => a - b);
    const minCol = allCols[0];
    const maxCol = allCols[allCols.length - 1];

    for (let c = minCol; c <= maxCol; c++) {
      if (c < 0 || c >= canvasWidth) continue;
      const left = c > minCol ? 0b0010 : 0;
      const right = c < maxCol ? 0b0001 : 0;
      dirs[c] |= left | right;
    }

    if (srcCol >= 0 && srcCol < canvasWidth) {
      dirs[srcCol] |= 0b1000;
    }

    for (const tc of targetCols) {
      if (tc >= 0 && tc < canvasWidth) {
        dirs[tc] |= 0b0100;
        arrowLine[tc] = "▼";
      }
    }
  }

  if (needsBranch) {
    const branchLine = dirs.map((d) => (d ? junctionChar(d) : " "));
    lines.push(
      branchLine.map((c) => (c !== " " ? colors.yellow(c) : c)).join(""),
    );
  }

  lines.push(
    arrowLine.map((c) => (c === "▼" ? colors.yellow(c) : c)).join(""),
  );
}

function junctionChar(bits: number): string {
  const chars: Record<number, string> = {
    0b0001: "─", // right only
    0b0010: "─", // left only
    0b0011: "─", // left + right
    0b0100: "╷", // down only
    0b0101: "┌", // down + right
    0b0110: "┐", // down + left
    0b0111: "┬", // down + left + right
    0b1000: "╵", // up only
    0b1001: "└", // up + right
    0b1010: "┘", // up + left
    0b1011: "┴", // up + left + right
    0b1100: "│", // up + down
    0b1101: "├", // up + down + right
    0b1110: "┤", // up + down + left
    0b1111: "┼", // all four
  };
  return chars[bits] ?? "─";
}

function padCenter(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width);
  const left = Math.floor((width - text.length) / 2);
  const right = width - text.length - left;
  return " ".repeat(left) + text + " ".repeat(right);
}
