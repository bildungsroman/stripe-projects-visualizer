export interface CodeContext {
  fileTree: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  sourceSnippets: SourceSnippet[];
  readme: string | null;
}

export interface SourceSnippet {
  path: string;
  content: string;
}
