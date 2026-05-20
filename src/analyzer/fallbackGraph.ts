import type { StateJson } from "../parser/types.js";
import type { ArchitectureGraph } from "./types.js";

export function buildFallbackGraph(
  state: StateJson,
  projectName: string,
): ArchitectureGraph {
  const providers = Object.entries(state.providers);
  const resources = Object.entries(state.resources);

  const resourcesByProvider = new Map<string, string[]>();
  for (const [, resource] of resources) {
    const key = resource.providerName.toLowerCase();
    if (!resourcesByProvider.has(key)) {
      resourcesByProvider.set(key, []);
    }
    resourcesByProvider.get(key)!.push(resource.serviceId);
  }

  const nodes: ArchitectureGraph["nodes"] = [
    {
      id: "app",
      label: projectName,
      type: "component",
      description: "Your application",
    },
  ];

  const edges: ArchitectureGraph["edges"] = [];
  const serviceIds: string[] = [];

  for (const [key, provider] of providers) {
    const id = key.replace(/[^a-zA-Z0-9]/g, "");
    const services = resourcesByProvider.get(key) ?? [];
    const serviceList = services.length > 0 ? services.join(", ") : "service";

    nodes.push({
      id,
      label: provider.name,
      type: "service",
      description: `Provisioned ${serviceList}`,
    });

    edges.push({
      from: "app",
      to: id,
      label: serviceList,
    });

    serviceIds.push(id);
  }

  const layers: string[][] = [["app"], serviceIds];

  return {
    title: projectName,
    description: `${providers.length} provisioned service${providers.length !== 1 ? "s" : ""} via Stripe Projects`,
    nodes,
    edges,
    layers,
  };
}
