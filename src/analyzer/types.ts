export type NodeType = "service" | "component" | "external" | "user";

export interface ArchitectureNode {
  id: string;
  label: string;
  type: NodeType;
  description: string;
}

export interface ArchitectureEdge {
  from: string;
  to: string;
  label: string;
}

export interface ArchitectureGraph {
  title: string;
  description: string;
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  layers: string[][];
}
