// source/application/navigation/navigation.js — Version 1.2

const MODULES = Object.freeze({
    finance: Object.freeze({ id: "finance", number: "01", name: "Finance", localName: "Финансы" }),
    health: Object.freeze({ id: "health", number: "02", name: "Health", localName: "Здоровье" }),
    development: Object.freeze({ id: "development", number: "03", name: "Development", localName: "Развитие" }),
    profile: Object.freeze({ id: "profile", number: "04", name: "Profile", localName: "Профиль" })
});

const DEFAULT_MODULE_ID = "development";

function createNavigation(appRoot) {
    const shell = appRoot.querySelector(".app-shell");
    const title = appRoot.querySelector("#module-title");
    const localTitle = appRoot.querySelector(".module-title-local");
    const moduleLabel = appRoot.querySelector(".module-label");
    const moduleNumber = appRoot.querySelector(".module-number");
    const moduleStatus = appRoot.querySelector(".module-status");
    const navigationItems = [...appRoot.querySelectorAll(".navigation-item")];

    if (!shell) {
        throw new Error("LifeGame Navigation: application shell was not found.");
    }

    function resolveModule(moduleId) {
        return MODULES[moduleId] || MODULES[DEFAULT_MODULE_ID];
    }

    function render(moduleId, updateUrl = true) {
        const module = resolveModule(moduleId);
        shell.dataset.module = module.id;
        if (title) {
            title.textContent = module.name;
        }

        if (localTitle) {
            localTitle.textContent = module.localName;
        }

        if (moduleLabel) {
            moduleLabel.textContent = "LIFE MODULE " + module.number;
        }

        if (moduleNumber) {
            moduleNumber.textContent = module.number;
        }

        if (moduleStatus) {
            moduleStatus.textContent = module.name + " module подключён.";
        }

        navigationItems.forEach((item) => {
            const isActive = item.dataset.module === module.id;
            item.classList.toggle("is-active", isActive);

            if (isActive) {
                item.setAttribute("aria-current", "page");
            } else {
                item.removeAttribute("aria-current");
            }
        });

        if (updateUrl) {
            history.pushState({ module: module.id }, "", "#" + module.id);
        }
    }

    navigationItems.forEach((item) => {
        item.addEventListener("click", (event) => {
            event.preventDefault();
            render(item.dataset.module);
        });
    });

    window.addEventListener("popstate", () => {
        render(window.location.hash.slice(1), false);
    });

    render(window.location.hash.slice(1) || DEFAULT_MODULE_ID, false);
}

export { createNavigation };
