(() => {
  const themeNames = { system: "System", light: "Light", dark: "Dark" };
  const themes = Object.keys(themeNames);
  const storageKey = "dashboard-theme-v2";
  let storedTheme = null;
  try {
    storedTheme = localStorage.getItem(storageKey);
  } catch (_error) {
    // Storage can be unavailable in privacy modes; System remains the default.
  }
  let theme = themes.includes(storedTheme) ? storedTheme : "system";

  const applyTheme = () => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(storageKey, theme);
    } catch (_error) {
      // The active page still honors the selected theme without persistence.
    }
    const button = document.querySelector(".theme-button");
    if (button) {
      button.textContent = `Theme: ${themeNames[theme]}`;
      button.setAttribute("aria-label", `Color theme is ${themeNames[theme]}. Activate to change it.`);
    }
  };

  applyTheme();

  const source = document.querySelector(".source");
  if (source) {
    const button = document.createElement("button");
    button.className = "theme-button";
    button.type = "button";
    button.addEventListener("click", () => {
      theme = themes[(themes.indexOf(theme) + 1) % themes.length];
      applyTheme();
    });
    source.append(button);
    applyTheme();
  }

  let activeHelp = null;
  const popover = document.createElement("div");
  popover.id = "help-popover";
  popover.className = "help-popover";
  popover.setAttribute("role", "tooltip");
  document.body.append(popover);

  const positionPopover = () => {
    if (!activeHelp) return;
    const anchor = activeHelp.getBoundingClientRect();
    const gap = 8;
    const margin = 12;
    const width = Math.min(360, window.innerWidth - (margin * 2));
    popover.style.width = `${width}px`;
    const left = Math.max(margin, Math.min(anchor.left, window.innerWidth - width - margin));
    const below = anchor.bottom + gap;
    const popoverHeight = popover.offsetHeight;
    const top = below + popoverHeight <= window.innerHeight - margin
      ? below
      : Math.max(margin, anchor.top - popoverHeight - gap);
    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
  };

  const closeHelp = (except) => {
    document.querySelectorAll(".help-tip.is-open").forEach((tip) => {
      if (tip !== except) {
        tip.classList.remove("is-open");
        tip.setAttribute("aria-expanded", "false");
        tip.removeAttribute("aria-describedby");
      }
    });
    if (!except) {
      activeHelp = null;
      popover.classList.remove("visible");
      popover.textContent = "";
    }
  };

  document.querySelectorAll(".help-tip").forEach((tip) => {
    tip.setAttribute("role", "button");
    tip.setAttribute("aria-expanded", "false");
    tip.setAttribute("aria-haspopup", "true");
    const toggle = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const opening = !tip.classList.contains("is-open");
      closeHelp(tip);
      tip.classList.toggle("is-open", opening);
      tip.setAttribute("aria-expanded", String(opening));
      if (opening) {
        activeHelp = tip;
        popover.textContent = tip.getAttribute("aria-label") || "";
        popover.classList.add("visible");
        tip.setAttribute("aria-describedby", popover.id);
        positionPopover();
      } else {
        closeHelp();
      }
    };
    tip.addEventListener("click", toggle);
    tip.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") toggle(event);
      if (event.key === "Escape") closeHelp();
    });
  });

  document.addEventListener("click", () => closeHelp());
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeHelp();
  });
  window.addEventListener("resize", positionPopover);
  window.addEventListener("scroll", positionPopover, true);
})();
