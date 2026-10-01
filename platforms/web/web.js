// platforms/web/web.js — Version 1.9

import { createNavigation } from "../../source/application/navigation/navigation.js";
import { renderFinance } from "../../source/presentation/finance/finance.js";
import { renderAuthEntry } from "../../source/presentation/auth/auth.js";
import { renderRegistration } from "../../source/presentation/auth/register.js";
import { createWebApplication } from "./composition/root.js";
import { configureLiquidFundsMemory } from "../../source/application/finance/finance.js";
import {
    saveLiquidFundsSnapshot,
    getLiquidFundsSnapshotAtOrBefore
} from "../../source/memory/finance/liquid.funds.memory.js";
import { subscribe } from "../../source/core/events/event.bus.js";

const APP_ROOT_ID = "app";
const DEFAULT_AUTH_ROUTE = "register";
const DEFAULT_APPLICATION_ROUTE = "finance";

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

    const moduleContent = applicationShell.querySelector("#module-content");

    if (!moduleContent) {
        throw new Error(
            "LifeGame Web: module content container was not found."
        );
    }

    let navigationInitialized = false;

    function getRoute() {
        return window.location.hash.slice(1);
    }

    function redirectToAuth() {
        if (getRoute() !== DEFAULT_AUTH_ROUTE) {
            window.location.hash = DEFAULT_AUTH_ROUTE;
            return;
        }

        renderAuthRoute(DEFAULT_AUTH_ROUTE);
    }

    function renderModule(moduleId) {
        moduleContent.replaceChildren();

        if (moduleId === "finance") {
            renderFinance(moduleContent);
        }

        // Other authenticated modules will be connected here.
    }

    function renderAuthRoute(route) {
        applicationShell.hidden = true;
        authRoot.hidden = false;
        authRoot.replaceChildren();

        if (route === "auth") {
            renderAuthEntry(authRoot, () => {
                window.location.hash = DEFAULT_AUTH_ROUTE;
            });
            return;
        }

        renderRegistration(
            authRoot,
            application.auth,
            () => {
                window.location.hash = "auth";
            },
            () => {
                window.location.hash = DEFAULT_APPLICATION_ROUTE;
            }
        );
    }

    function initializeApplicationShell() {
        if (navigationInitialized) {
            return;
        }

        createNavigation(appRoot);
        navigationInitialized = true;

        const navigationItems = [
            ...applicationShell.querySelectorAll(".navigation-item")
        ];

        navigationItems.forEach((item) => {
            item.addEventListener("click", renderRoute);
        });
    }

    function renderApplicationRoute(route) {
        initializeApplicationShell();

        authRoot.hidden = true;
        applicationShell.hidden = false;

        renderModule(route || DEFAULT_APPLICATION_ROUTE);
    }

    async function renderRoute() {
        const route = getRoute();

        try {
            const sessionResult = await application.auth.getCurrentSession();
            const session = sessionResult?.data?.session ?? null;

            if (!session) {
                redirectToAuth();
                return;
            }

            if (route === "auth" || route === "register" || route === "") {
                if (route === "auth" || route === "register") {
                    window.location.hash = DEFAULT_APPLICATION_ROUTE;
                    return;
                }

                renderApplicationRoute(DEFAULT_APPLICATION_ROUTE);
                return;
            }

            renderApplicationRoute(route);
        } catch (error) {
            applicationShell.hidden = true;
            authRoot.hidden = false;
            authRoot.replaceChildren();

            const message = document.createElement("p");
            message.setAttribute("role", "alert");
            message.textContent =
                "Authentication state could not be verified. Please try again.";

            authRoot.appendChild(message);

            console.error("LifeGame Web: authentication check failed.", error);
        }
    }

    window.addEventListener("popstate", renderRoute);
    window.addEventListener("hashchange", renderRoute);

    renderRoute();
}

startWeb();
