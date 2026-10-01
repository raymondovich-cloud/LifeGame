// platforms/web/web.js — Version 1.3

import { createNavigation } from "../../source/application/navigation/navigation.js";
import { renderFinance } from "../../source/presentation/finance/finance.js";

const APP_ROOT_ID = "app";

function startWeb() {
    const appRoot = document.getElementById(APP_ROOT_ID);
    if (!appRoot) {
        throw new Error("LifeGame Web: application root \"#" + APP_ROOT_ID + "\" was not found.");
    }

    createNavigation(appRoot);

    const moduleContent = appRoot.querySelector("#module-content");
    const navigationItems = [...appRoot.querySelectorAll(".navigation-item")];

    if (!moduleContent) {
        throw new Error("LifeGame Web: module content container was not found.");
    }

    function renderModule(moduleId) {
        moduleContent.replaceChildren();

        if (moduleId === "finance") {
            renderFinance(moduleContent);
        }
    }

    navigationItems.forEach((item) => {
        item.addEventListener("click", () => {
            renderModule(item.dataset.module);
        });
    });

    window.addEventListener("popstate", () => {
        renderModule(window.location.hash.slice(1));
    });

    renderModule(window.location.hash.slice(1) || "finance");
}

startWeb();
