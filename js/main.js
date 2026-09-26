import { initCopyEmail } from "./copyEmail.js";
import { initHashRing } from "./ringWidget.js";
import { initProjectFilter } from "./projectFilter.js";

initCopyEmail(document);

const ring = document.querySelector(".ring");
if (ring) {
  initHashRing(ring);
}

const filter = document.querySelector(".project-filter");
const grid = document.querySelector(".project-grid");
if (filter && grid) {
  initProjectFilter(filter, grid);
}
