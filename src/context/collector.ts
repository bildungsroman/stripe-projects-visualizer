import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative, extname } from "node:path";
import type { CodeContext, SourceSnippet } from "./types.js";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".vercel",
  ".projects",
  "dist",
  "build",
  "coverage",
  ".turbo",
  "__pycache__",
]);

const SOURCE_EXTS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".py",
  ".go",
  ".rs",
  ".rb",
  ".java",
  ".mjs",
  ".cjs",
]);

const PRIORITY_PATTERNS = [
  /route\.(ts|js|tsx|jsx)$/,
  /server\.(ts|js)$/,
  /index\.(ts|js|tsx|jsx)$/,
  /config\.(ts|js|mjs|cjs)$/,
  /middleware\.(ts|js)$/,
  /layout\.(ts|js|tsx|jsx)$/,
  /page\.(ts|js|tsx|jsx)$/,
];

const MAX_FILES = 200;
const MAX_SNIPPET_LINES_PRIORITY = 120;
const MAX_SNIPPET_LINES_DEFAULT = 60;
const MAX_SNIPPETS = 15;

export async function collectContext(
  projectDir: string,
): Promise<CodeContext> {
  const [fileTree, packageInfo, readme] = await Promise.all([
    walkDir(projectDir, projectDir),
    readPackageJson(projectDir),
    readReadme(projectDir),
  ]);

  const snippetFiles = pickSnippetFiles(fileTree);
  const sourceSnippets = await readSnippets(projectDir, snippetFiles);

  return {
    fileTree,
    dependencies: packageInfo.dependencies,
    devDependencies: packageInfo.devDependencies,
    sourceSnippets,
    readme,
  };
}

async function walkDir(
  dir: string,
  root: string,
  files: string[] = [],
): Promise<string[]> {
  if (files.length >= MAX_FILES) return files;

  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    if (files.length >= MAX_FILES) break;

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
      await walkDir(join(dir, entry.name), root, files);
    } else if (entry.isFile()) {
      const ext = extname(entry.name);
      if (SOURCE_EXTS.has(ext) || entry.name === "package.json") {
        files.push(relative(root, join(dir, entry.name)));
      }
    }
  }

  return files;
}

function pickSnippetFiles(fileTree: string[]): string[] {
  const prioritized: string[] = [];
  const rest: string[] = [];

  for (const file of fileTree) {
    if (file === "package.json") continue;
    const isPriority = PRIORITY_PATTERNS.some((p) => p.test(file));
    if (isPriority) {
      prioritized.push(file);
    } else {
      rest.push(file);
    }
  }

  return [...prioritized, ...rest].slice(0, MAX_SNIPPETS);
}

async function readSnippets(
  projectDir: string,
  files: string[],
): Promise<SourceSnippet[]> {
  const results: SourceSnippet[] = [];

  for (const file of files) {
    try {
      const fullPath = join(projectDir, file);
      const info = await stat(fullPath);
      if (info.size > 50_000) continue;

      const isPriority = PRIORITY_PATTERNS.some((p) => p.test(file));
      const maxLines = isPriority
        ? MAX_SNIPPET_LINES_PRIORITY
        : MAX_SNIPPET_LINES_DEFAULT;

      const content = await readFile(fullPath, "utf-8");
      const lines = content.split("\n").slice(0, maxLines);
      results.push({ path: file, content: lines.join("\n") });
    } catch {
      continue;
    }
  }

  return results;
}

async function readReadme(projectDir: string): Promise<string | null> {
  for (const name of ["README.md", "readme.md", "README", "README.txt"]) {
    try {
      const content = await readFile(join(projectDir, name), "utf-8");
      const trimmed = content.slice(0, 3000);
      return trimmed;
    } catch {
      continue;
    }
  }
  return null;
}

async function readPackageJson(projectDir: string): Promise<{
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}> {
  try {
    const raw = await readFile(join(projectDir, "package.json"), "utf-8");
    const pkg = JSON.parse(raw);
    return {
      dependencies: pkg.dependencies ?? {},
      devDependencies: pkg.devDependencies ?? {},
    };
  } catch {
    return { dependencies: {}, devDependencies: {} };
  }
}
