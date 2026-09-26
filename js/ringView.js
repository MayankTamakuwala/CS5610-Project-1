import { RING_SIZE, clockwiseDistance } from "./hashRing.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const CENTER = 200;
const RADIUS = 150;
const MAX_POINT_RADIUS = 8;
const MIN_POINT_RADIUS = 4;
const FULL_TURN_MS = 1400;

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// Put 0 at the top of the ring.
function angleAt(position) {
  return (position / RING_SIZE) * Math.PI * 2 - Math.PI / 2;
}

function pointAt(angle) {
  return {
    x: (CENTER + RADIUS * Math.cos(angle)).toFixed(2),
    y: (CENTER + RADIUS * Math.sin(angle)).toFixed(2),
  };
}

function createSvg(tag, attributes) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, String(value));
  }
  return element;
}

function arcPath(startAngle, sweep) {
  const start = pointAt(startAngle);
  const end = pointAt(startAngle + sweep);
  const largeArc = sweep > Math.PI ? 1 : 0;
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

export class RingView {
  /**
   * @param {SVGSVGElement} svg Must contain .ring__points and .ring__route.
   * @param {import("./hashRing.js").HashRing} ring
   */
  constructor(svg, ring) {
    this.svg = svg;
    this.pointLayer = svg.querySelector(".ring__points");
    this.routeLayer = svg.querySelector(".ring__route");
    this.frame = 0;
    this.setRing(ring);
  }

  /**
   * Shrink markers as points are added to limit overlap.
   * @param {import("./hashRing.js").HashRing} ring
   */
  setRing(ring) {
    this.ring = ring;
    this.pointRadius = Math.max(
      MIN_POINT_RADIUS,
      Math.min(MAX_POINT_RADIUS, 160 / ring.points.length),
    );
    this.markers = ring.points.map((point) => {
      const { x, y } = pointAt(angleAt(point.hash));
      const circle = createSvg("circle", {
        class: `ring-point node--${point.nodeId}`,
        cx: x,
        cy: y,
        r: this.pointRadius,
      });
      return { point, circle };
    });
    this.pointLayer.replaceChildren(
      ...this.markers.map((marker) => marker.circle),
    );
    this.svg.setAttribute(
      "aria-label",
      `A hash ring with ${ring.replicas} points for each of ${ring.nodeIds.length} projects`,
    );
  }

  /**
   * @param {object | null} [owner=null]
   */
  refresh(owner = null) {
    for (const { point, circle } of this.markers) {
      const isOwner = point === owner;
      circle.classList.toggle(
        "ring-point--offline",
        !this.ring.isOnline(point.nodeId),
      );
      circle.classList.toggle("ring-point--owner", isOwner);
      const radius = isOwner ? this.pointRadius + 4 : this.pointRadius;
      circle.setAttribute("r", String(radius));
    }
  }

  /**
   * @param {{ hash: number, point: object }} route
   * @param {boolean} [animate=true]
   */
  showRoute(route, animate = true) {
    cancelAnimationFrame(this.frame);
    const startAngle = angleAt(route.hash);
    const distance = clockwiseDistance(route.hash, route.point.hash);
    const sweep = (distance / RING_SIZE) * Math.PI * 2;
    const start = pointAt(startAngle);

    const arc = createSvg("path", { class: "ring-route__arc", d: "M 0 0" });
    const key = createSvg("circle", {
      class: "ring-route__key",
      cx: start.x,
      cy: start.y,
      r: 7,
    });
    const traveler = createSvg("circle", {
      class: "ring-route__traveler",
      cx: start.x,
      cy: start.y,
      r: 5,
    });
    this.routeLayer.setAttribute(
      "class",
      `ring__route node--${route.point.nodeId}`,
    );
    this.routeLayer.replaceChildren(arc, key, traveler);
    this.refresh();

    const draw = (progress) => {
      const current = sweep * progress;
      arc.setAttribute("d", arcPath(startAngle, current));
      const position = pointAt(startAngle + current);
      traveler.setAttribute("cx", position.x);
      traveler.setAttribute("cy", position.y);
    };

    const finish = () => {
      draw(1);
      this.refresh(route.point);
    };

    if (!animate || reducedMotion.matches || sweep === 0) {
      finish();
      return;
    }

    const duration = FULL_TURN_MS * (0.35 + 0.65 * (sweep / (Math.PI * 2)));
    const startTime = performance.now();
    const step = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      draw(easeOutCubic(t));
      if (t < 1) {
        this.frame = requestAnimationFrame(step);
      } else {
        finish();
      }
    };
    this.frame = requestAnimationFrame(step);
  }
}
