// platforms/web/web.js — Version 2.0

import { createNavigation } from "../../source/application/navigation/navigation.js";
import { renderFinance } from "../../source/presentation/finance/finance.js";
import { renderRegistration } from "../../source/presentation/auth/register.js";
import { renderPublicEntry } from "../../source/presentation/auth/public-entry.js";
import { createWebApplication } from "./composition/root.js";
import { configureLiquidFundsMemory } from "../../source/application/finance/finance.js";
import {
    saveLiquidFundsSnapshot,
    getLiquidFundsSnapshotAtOrBefore
} from "../../source/memory/finance/liquid.funds.memory.js";
import { subscribe } from "../../source/core/events/event.bus.js";

const APP_ROOT_ID = "app";
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

    function clearPublicRoute() {
        if (window.location.hash) {
            history.replaceState({}, "", window.location.pathname + window.location.search);
        }
    }

    function renderModule(moduleId) {
        moduleContent.replaceChildren();

        if (moduleId === "finance") {
            renderFinance(moduleContent);
        }

        // Other authenticated modules will be connected here.
    }

    function closeRegistrationModal() {
        const modal = authRoot.querySelector(".registration-modal");
        if (modal) {
            modal.remove();
        }
    }

    function openRegistrationModal(moduleId) {
        closeRegistrationModal();

        const modal = document.createElement("div");
        modal.className = "registration-modal";
        modal.setAttribute("role", "presentation");

        const dialog = document.createElement("div");
        dialog.className = "registration-modal__dialog";
        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");
        dialog.setAttribute("aria-labelledby", "registration-title");

        modal.append(dialog);
        authRoot.append(modal);

        const moduleNames = {
            finance: "Финансы",
            health: "Здоровье",
            development: "Развитие"
        };

        const modalContext = document.createElement("p");
        modalContext.className = "registration-modal__context";
        modalContext.textContent =
            "Чтобы изменять раздел «" +
            (moduleNames[moduleId] || "LifeGame") +
            "», необходимо создать аккаунт.";
        dialog.append(modalContext);

        renderRegistration(
            dialog,
            application.auth,
            closeRegistrationModal,
            () => {
                closeRegistrationModal();
                window.location.hash = DEFAULT_APPLICATION_ROUTE;
            }
        );

        modal.addEventListener("click", (event) => {
            if (event.target === modal) {
                closeRegistrationModal();
            }
        });
    }

    function renderPublicRoute() {
        applicationShell.hidden = true;
        authRoot.hidden = false;

        renderPublicEntry(authRoot, openRegistrationModal);
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
                clearPublicRoute();
                renderPublicRoute();
                return;
            }

            if (route === "auth" || route === "register" || route === "") {
                window.location.hash = DEFAULT_APPLICATION_ROUTE;
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
