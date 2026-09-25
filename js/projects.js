/**
 * Projects that act as nodes on the home page hash ring.
 * `id` matches the node--{id} CSS class and the anchor on projects.html.
 */
export const PROJECTS = [
  {
    id: "hermes",
    name: "HERMES",
    summary: "hybrid dense and sparse retrieval over 10k+ code artifacts",
  },
  {
    id: "kvstore",
    name: "KV store",
    summary: "a distributed key-value database across 5 nodes",
  },
  {
    id: "originhub",
    name: "OriginHub",
    summary: "an agentic MLOps platform running multi-agent RAG on GKE",
  },
  {
    id: "adscanvas",
    name: "AdsCanvas",
    summary: "a privacy-first ad console with 12 reusable web components",
  },
  {
    id: "adpilot",
    name: "AdPilot",
    summary: "three cooperating agents for ad copy, targeting, and evaluation",
  },
];

/**
 * @param {string} id
 * @returns {{ id: string, name: string, summary: string }}
 */
export function projectById(id) {
  return PROJECTS.find((project) => project.id === id);
}
