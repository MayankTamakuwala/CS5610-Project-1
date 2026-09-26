import { HashRing, RING_SIZE } from "./hashRing.js";
import { RingView } from "./ringView.js";
import { PROJECTS, projectById } from "./projects.js";

const SAMPLE_KEYS = Array.from({ length: 1000 }, (_, i) => `sample-key-${i}`);
const FIRST_KEY = "hello world";
const count = new Intl.NumberFormat("en-US");

function formatHash(hash) {
  return `0x${hash.toString(16).padStart(8, "0")}`;
}

function degreesAround(hash) {
  return ((hash / RING_SIZE) * 360).toFixed(1);
}

function ownerLabel(nodeId) {
  const label = document.createElement("strong");
  label.className = `ring__owner node--${nodeId}`;
  label.textContent = projectById(nodeId).name;
  return label;
}

function projectLink(nodeId) {
  const link = document.createElement("a");
  link.className = "ring__link";
  link.href = `projects.html#${nodeId}`;
  link.textContent = `Read about ${projectById(nodeId).name}`;
  return link;
}

/**
 * Use DOM nodes so visitor input is never parsed as HTML.
 * @param {HTMLElement} container
 * @param {{ key: string, hash: number, point: { nodeId: string } }} route
 * @param {string | null} previousOwner Owner before a node was toggled.
 */
function renderResult(container, route, previousOwner = null) {
  const { nodeId } = route.point;
  const quoted = `“${route.key}”`;
  let parts;

  if (previousOwner === null) {
    const hash = document.createElement("code");
    hash.className = "ring__hash";
    hash.textContent = formatHash(route.hash);
    parts = [
      `${quoted} hashes to `,
      hash,
      `, ${degreesAround(route.hash)}° around the ring, and lands on `,
      ownerLabel(nodeId),
      `: ${projectById(nodeId).summary}. `,
    ];
  } else if (previousOwner !== nodeId) {
    parts = [
      `${quoted} moved from ${projectById(previousOwner).name} to `,
      ownerLabel(nodeId),
      ", the next online node clockwise. ",
    ];
  } else {
    parts = [
      `${quoted} stays on `,
      ownerLabel(nodeId),
      ". Only keys owned by the node you changed move. ",
    ];
  }

  container.replaceChildren(...parts, projectLink(nodeId), ".");
}

/**
 * @param {HTMLElement} root Element with the .ring class.
 */
export function initHashRing(root) {
  const form = root.querySelector(".ring-form");
  const input = root.querySelector(".ring-form__input");
  const result = root.querySelector(".ring__result");
  const stats = root.querySelector(".ring__stats");
  const toggles = [...root.querySelectorAll(".node-toggle__input")];
  const replicaInput = root.querySelector(".ring-replicas__input");
  const replicaValue = root.querySelector(".ring-replicas__value");

  const nodeIds = PROJECTS.map((project) => project.id);
  let ring = new HashRing(nodeIds, Number(replicaInput.value));
  const view = new RingView(root.querySelector(".ring__svg"), ring);
  let lastRoute = null;

  function updateShares() {
    const shares = ring.loadShare(SAMPLE_KEYS);
    for (const toggle of toggles) {
      const share = toggle.closest(".node-toggle").querySelector(
        ".node-toggle__share",
      );
      share.textContent = ring.isOnline(toggle.value)
        ? `${Math.round((shares.get(toggle.value) / SAMPLE_KEYS.length) * 100)}%`
        : "offline";
    }
  }

  function updateStats() {
    const down = ring.nodeIds.filter((nodeId) => !ring.isOnline(nodeId));
    if (down.length === 0) {
      stats.textContent =
        "Uncheck a node to take it offline and see which keys move.";
      return;
    }
    const { total, ringMoved, moduloMoved } = ring.movement(SAMPLE_KEYS);
    const names = down.map((nodeId) => projectById(nodeId).name).join(", ");
    stats.textContent =
      `With ${names} offline, ${count.format(ringMoved)} of ` +
      `${count.format(total)} sample keys moved. Placing keys with ` +
      `hash mod N would have moved ${count.format(moduloMoved)}.`;
  }

  function route(key, animate = true) {
    lastRoute = ring.route(key);
    view.showRoute(lastRoute, animate);
    renderResult(result, lastRoute);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const key = input.value.trim();
    if (key === "") {
      result.textContent = "Type at least one character to route a key.";
      input.focus();
      return;
    }
    route(key);
  });

  for (const toggle of toggles) {
    toggle.addEventListener("change", () => {
      if (!ring.setOnline(toggle.value, toggle.checked)) {
        toggle.checked = true;
        stats.textContent =
          "Keep at least one node online. With none, keys have nowhere to land.";
        return;
      }
      updateShares();
      updateStats();
      const previousOwner = lastRoute.point.nodeId;
      lastRoute = ring.route(lastRoute.key);
      view.showRoute(lastRoute, previousOwner !== lastRoute.point.nodeId);
      renderResult(result, lastRoute, previousOwner);
    });
  }

  replicaInput.addEventListener("input", () => {
    const next = new HashRing(nodeIds, Number(replicaInput.value));
    for (const nodeId of nodeIds) {
      next.setOnline(nodeId, ring.isOnline(nodeId));
    }
    ring = next;
    replicaValue.textContent = replicaInput.value;
    view.setRing(ring);
    updateShares();
    updateStats();
    route(lastRoute.key, false);
  });

  // Some browsers restore checkbox state on reload; the ring starts fully up.
  for (const toggle of toggles) {
    toggle.checked = true;
  }
  replicaValue.textContent = replicaInput.value;
  updateShares();
  updateStats();
  route(FIRST_KEY);
}
