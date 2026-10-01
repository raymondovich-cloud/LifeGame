// platforms/web/web.js — Version 1.7

import { createNavigation } from "../../source/application/navigation/navigation.js";
import { renderFinance } from "../../source/presentation/finance/finance.js";
import { renderRegistration } from "../../source/presentation/auth/register.js";
import { createWebApplication } from "./composition/root.js";
import { configureLiquidFundsMemory } from "../../source/application/finance/finance.js";
import {
    saveLiquidFundsSnapshot,
    getLiquidFundsSnapshotAtOrBefore
} from "../../source/memory/finance/liquid.funds.memory.js";
import { subscribe } from "../../source/core/events/event.bus.js";

const APP_ROOT_ID = "app";

function startWeb() {
    const application = createWebApplication();

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
        throw new Error(
            "LifeGame Web: application root #" + APP_ROOT_ID + " was not found."
        );
    }

    const applicationShell = appRoot.querySelector("#application-shell");
    const authRoot = appRoot.querySelector("#auth-root");

    if (!applicationShell) {
        throw new Error("LifeGame Web: application shell was not found.");
    }

    if (!authRoot) {
        throw new Error("LifeGame Web: auth root was not found.");
    }

    // Navigation owns the application shell and expects the page root.
    // Keep the existing navigation composition boundary unchanged.
    createNavigation(appRoot);

    const moduleContent = applicationShell.querySelector("#module-content");
    const navigationItems = [
        ...applicationShell.querySelectorAll(".navigation-item")
    ];

    if (!moduleContent) {
        throw new Error(
            "LifeGame Web: module content container was not found."
        );
    }

    function renderModule(moduleId) {
        moduleContent.replaceChildren();

        if (moduleId === "finance") {
            renderFinance(moduleContent);
        }

        // Profile is intentionally not connected to Registration.
        // Its authenticated content will be implemented separately.
    }

    function renderAuthRoute(route) {
        authRoot.replaceChildren();

        if (route === "register") {
            renderRegistration(authRoot, application.auth);
        }
    }

    function renderRoute() {
        const route = window.location.hash.slice(1);

        if (route === "register") {
            applicationShell.hidden = true;
            authRoot.hidden = false;
            renderAuthRoute(route);
            return;
        }

        authRoot.hidden = true;
        applicationShell.hidden = false;

        renderModule(route || "finance");
    }

    navigationItems.forEach((item) => {
        item.addEventListener("click", () => {
            renderRoute();
        });
    });

    window.addEventListener("popstate", renderRoute);
    window.addEventListener("hashchange", renderRoute);

    renderRoute();
}

startWeb();
