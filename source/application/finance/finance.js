// finance.js — Version 1.1

function createFinanceScreen(appRoot) {
    const shell = appRoot.querySelector(".app-shell");
    const screen = appRoot.querySelector('[data-module-screen="finance"]');
    const sections = [...appRoot.querySelectorAll(".finance-section")];

    if (!shell || !screen) {
        throw new Error("LifeGame Finance: required screen elements were not found.");
    }

    sections.forEach((section) => {
        const trigger = section.querySelector(".accordion-trigger");

        if (!trigger) {
            return;
        }

        trigger.addEventListener("click", () => {
            const isExpanded = trigger.getAttribute("aria-expanded") === "true";
            trigger.setAttribute("aria-expanded", String(!isExpanded));
            section.classList.toggle("is-collapsed", isExpanded);
        });
    });

    function syncScreen() {
        screen.hidden = shell.dataset.module !== "finance";
    }

    const observer = new MutationObserver(syncScreen);
    observer.observe(shell, { attributes: true, attributeFilter: ["data-module"] });

    syncScreen();
}

export { createFinanceScreen };
