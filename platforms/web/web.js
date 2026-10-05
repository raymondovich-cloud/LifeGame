// platforms/web/web.js — Version 3.2

import {
    trace,
    installGlobalApi
} from "../../source/core/diagnostics/lifecycle.trace.js";

import { createNavigation } from "../../source/application/navigation/navigation.js";
import { renderFinance } from "../../source/presentation/finance/finance.js";
import { renderRegistration } from "../../source/presentation/auth/register.js";
import { renderLogin } from "../../source/presentation/auth/login.js";
import { renderProfile } from "../../source/presentation/profile/profile.js";
import { createWebApplication } from "./composition/root.js";
import { configureAssetsMemory } from "../../source/application/finance/finance.js";
import { configureAssetsAnalyticsMemory } from "../../source/application/finance/assets.analytics.js";
import { configureAssetsAnalyticsAccess } from "../../source/application/finance/assets.analytics.access.js";
import {
    saveAssetsSnapshot,
    getAssetsSnapshotAtOrBefore,
    getLiquidAssetsAtOrBefore,
    getIlliquidAssetsAtOrBefore,
    getAssetsSnapshotsBetween,
    getFirstAssetsSnapshot
} from "../../source/memory/finance/assets.memory.js";
import { subscribe } from "../../source/core/events/event.bus.js";

const APP_ROOT_ID = "app";
const DEFAULT_APPLICATION_ROUTE = "finance";

function startWeb() {
    const application = createWebApplication();

    configureAssetsMemory({
        getSnapshotAtOrBefore: getAssetsSnapshotAtOrBefore,
        getLiquidAssetsAtOrBefore,
        getIlliquidAssetsAtOrBefore
    });

    configureAssetsAnalyticsMemory({
        getSnapshotAtOrBefore: getAssetsSnapshotAtOrBefore,
        getSnapshotsBetween: getAssetsSnapshotsBetween,
        getFirstSnapshot: getFirstAssetsSnapshot
    });

    configureAssetsAnalyticsAccess({
        getEntitlement: () => "free"
    });

    subscribe("finance.assets.state.changed", (event) => {
        saveAssetsSnapshot({
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
    let publicMode = true;
    let sessionState = "unknown";
    let authenticationEstablished = false;

    async function readSessionWithHydrationRetry() {
        const attempts = 4;
        const delays = [0, 120, 240, 400];

        for (let attempt = 0; attempt < attempts; attempt += 1) {
            if (delays[attempt] > 0) {
                await new Promise((resolve) => {
                    window.setTimeout(resolve, delays[attempt]);
                });
            }

            const result = await application.auth.getCurrentSession();

            if (result?.session) {
                return result;
            }
        }

        return { session: null };
    }

    // Each route render gets a monotonically increasing request id.
    // Authentication can trigger a second render before an earlier
    // asynchronous session check finishes. A stale render must never
    // overwrite the authenticated shell with public state.
    let routeRenderSequence = 0;

    function getRoute() {
        return window.location.hash.slice(1);
    }

    function isApplicationModule(route) {
        return route === "finance" ||
            route === "health" ||
            route === "development" ||
            route === "profile";
    }

    function isPublicModule(route) {
        return route === "finance" ||
            route === "health" ||
            route === "development";
    }

    function getModuleRoute() {
        const route = getRoute();

        if (isPublicModule(route)) {
            return route;
        }

        return DEFAULT_APPLICATION_ROUTE;
    }

    function getCurrentApplicationRoute() {
        const route = getRoute();

        return isApplicationModule(route)
            ? route
            : DEFAULT_APPLICATION_ROUTE;
    }

    function closeRegistrationModal() {
        const modal = authRoot.querySelector(".registration-modal");

        if (modal) {
            modal.remove();
        }

        authRoot.hidden = true;
    }

    function openRegistrationModal(pendingAction = null) {
        const originRoute = getCurrentApplicationRoute();
        closeRegistrationModal();
        authRoot.hidden = false;

        const modal = document.createElement("div");
        modal.className = "registration-modal";

        const dialog = document.createElement("div");
        dialog.className = "registration-modal__dialog";
        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");
        dialog.setAttribute("aria-labelledby", "registration-title");

        const context = document.createElement("p");
        context.className = "registration-modal__context";
        context.textContent =
            "Создайте аккаунт, чтобы сохранять изменения в LifeGame.";

        dialog.appendChild(context);
        modal.appendChild(dialog);
        authRoot.appendChild(modal);

        renderRegistration(
            dialog,
            application.auth,
            closeRegistrationModal,
            async () => {
                await handleAuthenticated(pendingAction, originRoute);
            },
            () => {
                openLoginModal(pendingAction);
            }
        );

        modal.addEventListener("click", (event) => {
            if (event.target === modal) {
                closeRegistrationModal();
            }
        });
    }

    function openLoginModal(pendingAction = null) {
        const originRoute = getCurrentApplicationRoute();
        closeRegistrationModal();
        authRoot.hidden = false;

        const modal = document.createElement("div");
        modal.className = "registration-modal";

        const dialog = document.createElement("div");
        dialog.className = "registration-modal__dialog";
        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");
        dialog.setAttribute("aria-labelledby", "login-title");

        modal.appendChild(dialog);
        authRoot.appendChild(modal);

        renderLogin(
            dialog,
            application.auth,
            () => openRegistrationModal(pendingAction),
            async () => {
                await handleAuthenticated(pendingAction, originRoute);
            }
        );

        modal.addEventListener("click", (event) => {
            if (event.target === modal) {
                closeRegistrationModal();
            }
        });
    }

    function renderPreviewModule(moduleId) {
        const modules = {
            health: {
                label: "HEALTH SYSTEM",
                description: "Энергия и физическое состояние.",
                items: ["Сила", "Восстановление", "Привычки"]
            },
            development: {
                label: "DEVELOPMENT SYSTEM",
                description: "Знания и личный рост.",
                items: ["Навыки", "Цели", "Прогресс"]
            }
        };

        const module = modules[moduleId];

        if (!module) {
            renderFinance(
                moduleContent,
                null,
                (action) => openRegistrationModal(action)
            );
            return;
        }

        moduleContent.replaceChildren();

        const section = document.createElement("section");
        section.className = "module-subblocks";

        const heading = document.createElement("div");
        heading.className = "module-subblocks-header";
        heading.innerHTML =
            '<span class="module-subblocks-label">' + module.label + "</span>" +
            "<p>" + module.description + "</p>";

        const list = document.createElement("div");
        list.className = "preview-subblock-list";

        module.items.forEach((item, index) => {
            const row = document.createElement("button");
            row.type = "button";
            row.className = "preview-subblock";
            row.innerHTML =
                '<span class="preview-subblock-index">' +
                String(index + 1).padStart(2, "0") +
                "</span>" +
                '<span class="preview-subblock-name">' +
                item +
                "</span>" +
                '<span class="preview-subblock-action">OPEN</span>';

            row.addEventListener("click", () => {
                if (publicMode) {
                    openRegistrationModal();
                }
            });

            list.appendChild(row);
        });

        section.append(heading, list);
        moduleContent.appendChild(section);
    }

    function renderModule(moduleId, session = null) {
        if (moduleId === "finance") {
            renderFinance(
                moduleContent,
                null,
                publicMode ? (action) => openRegistrationModal(action) : null
            );
            return;
        }

        if (moduleId === "profile") {
            if (publicMode) {
                renderPreviewModule("profile");
                openRegistrationModal();
                return;
            }

            renderProfile(moduleContent, session);
            return;
        }

        renderPreviewModule(moduleId);
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

    async function handleAuthenticated(pendingAction = null, originRoute = DEFAULT_APPLICATION_ROUTE) {
        closeRegistrationModal();

        // The authentication action itself is authoritative. Supabase can
        // briefly return a stale/null session from a concurrent getSession()
        // call immediately after login/registration. Mark authentication as
        // established before the route re-check so a transient null session
        // can never downgrade the authenticated shell to public mode.
        authenticationEstablished = true;
        publicMode = false;
        sessionState = "authenticated";

        await renderRoute();

        if (typeof pendingAction === "function") {
            pendingAction();
            return;
        }

        if (getRoute() !== originRoute) {
            window.location.hash = originRoute;
        }
    }

    function renderApplicationShell(route, isPublic, session = null) {
        publicMode = isPublic;
        sessionState = isPublic ? "unauthenticated" : "authenticated";

        trace("web-shell", "render", {
            route,
            access: isPublic ? "public" : "authenticated",
            sessionState
        });
        appRoot.dataset.access = isPublic ? "public" : "authenticated";

        initializeApplicationShell();

        authRoot.hidden = true;
        applicationShell.hidden = false;

        renderModule(route, session);
    }

    async function renderRoute() {
        const renderId = ++routeRenderSequence;
        const requestedRoute = getRoute();

        trace("web-shell", "route.check.begin", {
            requestedRoute,
            currentSessionState: sessionState,
            renderId
        });

        try {
            const sessionResult = await readSessionWithHydrationRetry();
            const session = sessionResult?.session ?? null;

            trace("web-shell", "route.session.result", {
                requestedRoute,
                authenticated: Boolean(session),
                renderId
            });

            // A newer route render may have started while the session check
            // was awaiting. Never allow this stale result to overwrite it.
            if (renderId !== routeRenderSequence) {
                trace("web-shell", "route.render.stale", {
                    requestedRoute,
                    renderId,
                    latestRenderId: routeRenderSequence
                });
                return;
            }

            if (session) {
                authenticationEstablished = true;
            }

            if (!session && authenticationEstablished) {
                sessionState = "authenticated";

                trace("web-shell", "route.session.pending-after-auth", {
                    requestedRoute
                });

                renderApplicationShell(
                    isApplicationModule(requestedRoute)
                        ? requestedRoute
                        : DEFAULT_APPLICATION_ROUTE,
                    false
                );
                return;
            }

            if (!session) {
                sessionState = "unauthenticated";

                trace("web-shell", "route.session.unauthenticated", {
                    requestedRoute
                });

                const publicRoute = isPublicModule(requestedRoute)
                    ? requestedRoute
                    : DEFAULT_APPLICATION_ROUTE;

                renderApplicationShell(publicRoute, true);
                return;
            }

            if (
                requestedRoute === "auth" ||
                requestedRoute === "register" ||
                requestedRoute === ""
            ) {
                window.location.hash = DEFAULT_APPLICATION_ROUTE;
                return;
            }

            sessionState = "authenticated";

            trace("web-shell", "route.session.authenticated", {
                requestedRoute
            });

            renderApplicationShell(
                isApplicationModule(requestedRoute)
                    ? requestedRoute
                    : DEFAULT_APPLICATION_ROUTE,
                false,
                session
            );
        } catch (error) {
            if (renderId !== routeRenderSequence) {
                trace("web-shell", "route.error.stale", {
                    requestedRoute,
                    renderId,
                    latestRenderId: routeRenderSequence
                });
                return;
            }

            if (authenticationEstablished) {
                sessionState = "authenticated";

                trace("web-shell", "route.session.error-after-auth", {
                    requestedRoute,
                    error: error?.message || "unknown"
                });

                renderApplicationShell(
                    isApplicationModule(requestedRoute)
                        ? requestedRoute
                        : DEFAULT_APPLICATION_ROUTE,
                    false
                );
                return;
            }

            sessionState = "error";

            trace("web-shell", "route.session.error", {
                requestedRoute,
                error: error?.message || "unknown"
            });

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

    window.addEventListener("popstate", () => {
        trace("web-shell", "navigation.popstate");
        renderRoute();
    });

    window.addEventListener("hashchange", () => {
        trace("web-shell", "navigation.hashchange", {
            route: getRoute()
        });
        renderRoute();
    });

    installGlobalApi();
    trace("web-shell", "application.start");
    renderRoute();
}

startWeb();
