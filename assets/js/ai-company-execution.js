(() => {
  "use strict";
  const image = document.querySelector("#cockpit-image");
  const fallback = document.querySelector("#cockpit-fallback");
  const trigger = document.querySelector("#cockpit-enlarge");
  const dialog = document.querySelector("#cockpit-dialog");
  const closeButton = document.querySelector("#cockpit-dialog-close");

  if (image && fallback) {
    image.addEventListener("error", () => {
      image.closest(".cockpit-image-button")?.setAttribute("hidden", "");
      fallback.hidden = false;
    }, { once: true });
  }

  if (!trigger || !dialog || !closeButton) return;
  const openDialog = () => {
    if (typeof dialog.showModal === "function") dialog.showModal();
  };
  const closeDialog = () => {
    if (dialog.open) dialog.close();
    trigger.focus();
  };
  trigger.addEventListener("click", openDialog);
  closeButton.addEventListener("click", closeDialog);
  dialog.addEventListener("click", event => {
    if (event.target === dialog) closeDialog();
  });
  dialog.addEventListener("cancel", event => {
    event.preventDefault();
    closeDialog();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && dialog.open) {
      event.preventDefault();
      closeDialog();
    }
  });
})();
