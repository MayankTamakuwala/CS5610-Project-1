const PARAM = "area";

/**
 * Filter the project list by area using toggle buttons. The active filter is
 * mirrored in the URL (?area=frontend) so a filtered view can be shared.
 * @param {HTMLElement} filterRoot Element containing .filter-button elements.
 * @param {HTMLElement} grid Element containing .project items.
 */
export function initProjectFilter(filterRoot, grid) {
  const buttons = [...filterRoot.querySelectorAll(".filter-button")];
  const projects = [...grid.querySelectorAll(".project")];
  const status = filterRoot.querySelector(".project-filter__status");

  function apply(area) {
    let shown = 0;
    for (const project of projects) {
      const areas = project.dataset.areas.split(" ");
      const visible = area === "all" || areas.includes(area);
      project.hidden = !visible;
      if (visible) {
        shown += 1;
      }
    }

    for (const button of buttons) {
      button.setAttribute("aria-pressed", String(button.dataset.area === area));
    }

    status.textContent =
      shown === projects.length
        ? `Showing all ${projects.length} projects.`
        : `Showing ${shown} of ${projects.length} projects.`;

    const url = new URL(window.location.href);
    if (area === "all") {
      url.searchParams.delete(PARAM);
    } else {
      url.searchParams.set(PARAM, area);
    }
    window.history.replaceState(null, "", url);
  }

  for (const button of buttons) {
    button.addEventListener("click", () => apply(button.dataset.area));
  }

  const requested = new URLSearchParams(window.location.search).get(PARAM);
  const known = buttons.some((button) => button.dataset.area === requested);
  apply(known ? requested : "all");
}
