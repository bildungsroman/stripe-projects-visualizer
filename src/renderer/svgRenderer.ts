import { svgColors } from "./colors.js";

const CHAR_WIDTH = 8.4;
const LINE_HEIGHT = 18;
const PADDING_X = 20;
const PADDING_Y = 16;
const FONT_SIZE = 14;
const FONT_FAMILY = "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Menlo', 'Courier New', monospace";

const ANSI_TO_HEX: Record<string, string> = {
  "30": "#000000",
  "31": "#cc0000",
  "32": "#00cc00",
  "33": "#cccc00",
  "34": "#5555ff",
  "35": "#cc00cc",
  "36": "#00cccc",
  "37": "#cccccc",
  "90": "#888888",
  "91": "#ff5555",
  "92": "#55ff55",
  "93": "#ffff55",
  "94": "#5555ff",
  "95": "#ff55ff",
  "96": "#55ffff",
  "97": "#ffffff",
};

interface StyledSpan {
  text: string;
  color: string | null;
  bold: boolean;
  dim: boolean;
}

function parseAnsiLine(line: string): StyledSpan[] {
  const spans: StyledSpan[] = [];
  let color: string | null = null;
  let bold = false;
  let dim = false;
  let pos = 0;

  while (pos < line.length) {
    const escIdx = line.indexOf("\x1b[", pos);
    if (escIdx === -1) {
      const text = line.slice(pos);
      if (text) spans.push({ text, color, bold, dim });
      break;
    }

    if (escIdx > pos) {
      spans.push({ text: line.slice(pos, escIdx), color, bold, dim });
    }

    const mIdx = line.indexOf("m", escIdx + 2);
    if (mIdx === -1) {
      spans.push({ text: line.slice(escIdx), color, bold, dim });
      break;
    }

    const codes = line.slice(escIdx + 2, mIdx).split(";");
    for (const code of codes) {
      if (code === "0" || code === "") {
        color = null;
        bold = false;
        dim = false;
      } else if (code === "1") {
        bold = true;
      } else if (code === "2") {
        dim = true;
      } else if (code === "22") {
        bold = false;
        dim = false;
      } else if (code === "39") {
        color = null;
      } else if (ANSI_TO_HEX[code]) {
        color = ANSI_TO_HEX[code];
      } else if (code === "38") {
        const nextCodes = codes.slice(codes.indexOf(code) + 1);
        if (nextCodes[0] === "2" && nextCodes.length >= 4) {
          color = `#${int2hex(+nextCodes[1])}${int2hex(+nextCodes[2])}${int2hex(+nextCodes[3])}`;
        } else if (nextCodes[0] === "5") {
          color = ansi256ToHex(+nextCodes[1]);
        }
        break;
      }
    }

    pos = mIdx + 1;
  }

  return spans;
}

function int2hex(n: number): string {
  return Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
}

function ansi256ToHex(n: number): string {
  if (n < 16) {
    const basic = [
      "#000000", "#800000", "#008000", "#808000",
      "#000080", "#800080", "#008080", "#c0c0c0",
      "#808080", "#ff0000", "#00ff00", "#ffff00",
      "#0000ff", "#ff00ff", "#00ffff", "#ffffff",
    ];
    return basic[n] ?? "#ffffff";
  }
  if (n < 232) {
    const idx = n - 16;
    const r = Math.floor(idx / 36);
    const g = Math.floor((idx % 36) / 6);
    const b = idx % 6;
    const toVal = (v: number) => (v === 0 ? 0 : 55 + v * 40);
    return `#${int2hex(toVal(r))}${int2hex(toVal(g))}${int2hex(toVal(b))}`;
  }
  const gray = 8 + (n - 232) * 10;
  return `#${int2hex(gray)}${int2hex(gray)}${int2hex(gray)}`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function renderSvg(ansiText: string): string {
  const lines = ansiText.split("\n");
  const maxVisibleWidth = lines.reduce((max, line) => {
    const stripped = line.replace(/\x1b\[[0-9;]*m/g, "");
    return Math.max(max, stripped.length);
  }, 0);

  const svgWidth = maxVisibleWidth * CHAR_WIDTH + PADDING_X * 2;
  const svgHeight = lines.length * LINE_HEIGHT + PADDING_Y * 2;

  const parts: string[] = [];

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(svgWidth)}" height="${Math.ceil(svgHeight)}" viewBox="0 0 ${Math.ceil(svgWidth)} ${Math.ceil(svgHeight)}">`,
  );
  parts.push(
    `<rect width="100%" height="100%" fill="${svgColors.background}" rx="8"/>`,
  );

  for (let i = 0; i < lines.length; i++) {
    const y = PADDING_Y + (i + 1) * LINE_HEIGHT - 4;
    const spans = parseAnsiLine(lines[i]);

    if (spans.length === 0 || spans.every((s) => !s.text.trim())) continue;

    let x = PADDING_X;
    for (const span of spans) {
      if (!span.text) continue;

      const attrs: string[] = [
        `x="${x.toFixed(1)}"`,
        `y="${y}"`,
        `font-family="${FONT_FAMILY}"`,
        `font-size="${FONT_SIZE}"`,
        `xml:space="preserve"`,
      ];

      let fill = span.color ?? "#cccccc";
      let opacity = "1";

      if (span.dim) {
        opacity = "0.6";
      }
      if (span.bold) {
        attrs.push(`font-weight="bold"`);
      }

      attrs.push(`fill="${fill}"`);
      if (opacity !== "1") attrs.push(`opacity="${opacity}"`);

      parts.push(`<text ${attrs.join(" ")}>${escapeXml(span.text)}</text>`);
      x += span.text.length * CHAR_WIDTH;
    }
  }

  parts.push("</svg>");
  return parts.join("\n");
}
