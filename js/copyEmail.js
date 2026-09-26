/**
 * "Copy email address" buttons. Each button carries the address in
 * data-email and reports the outcome in a sibling .copy-email__status.
 * @param {ParentNode} root
 */
export function initCopyEmail(root) {
  for (const button of root.querySelectorAll(".copy-email")) {
    const status = button.parentElement.querySelector(".copy-email__status");
    button.addEventListener("click", async () => {
      const address = button.dataset.email;
      try {
        await navigator.clipboard.writeText(address);
        status.textContent = `Copied ${address}.`;
      } catch {
        status.textContent = `Your browser blocked copying. The address is ${address}.`;
      }
    });
  }
}
