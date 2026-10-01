// platforms/web/web.js — Version 1.4

import { createNavigation } from "../../source/application/navigation/navigation.js";
import { renderFinance } from "../../source/presentation/finance/finance.js";
import { configureLiquidFundsMemory } from "../../source/application/finance/finance.js";
import {
    saveLiquidFundsSnapshot,
    getLiquidFundsSnapshotAtOrBefore
} from "../../source/memory/finance/liquid.funds.memory.js";
import { subscribe } from "../../source/core/events/event.bus.js";

const APP_ROOT_ID = "app";

function startWeb() {
    configureLiquidFundsMemory({
        getSnapshotAtOrBefore: getLiquidFundsSnapshotAtOrBefore
    });

    subscribe("finance.liquid-funds.state.changed", (event) => {
        saveLiquidFundsSnapshot({
            occurredAt: event.occurredAt,
            total: event.payload.total,
            entries: event.payload.entries
        });
    });

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
