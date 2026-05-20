import chalk from "chalk";

chalk.level = 3;

export const colors = {
  orange: chalk.hex("#ef8784"),
  yellow: chalk.hex("#ffff92"),
  pink: chalk.hex("#ef87f9"),
  blurple: chalk.hex("#8080f7"),
  purple: chalk.hex("#75147c"),
  dim: chalk.dim,
  bold: chalk.bold,
} as const;

export const svgColors = {
  background: "#0a0a0a",
  orange: "#ef8784",
  yellow: "#ffff92",
  pink: "#ef87f9",
  blurple: "#8080f7",
  purple: "#75147c",
} as const;
