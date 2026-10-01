// finance.js — Version 1.0

function createFinanceScreen(appRoot) {
    const sections = [...appRoot.querySelectorAll(".finance-section")];

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
}

export { createFinanceScreen };
