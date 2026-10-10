// platforms/web/web.runtime.js — Version 5.13

import {
    trace,
    installGlobalApi
} from "../../source/core/diagnostics/lifecycle.trace.js";

import { createNavigation } from "../../source/application/navigation/navigation.js";
import { configureAssetsAnalyticsAccess } from "../../source/application/finance/assets.analytics.access.js";

const APP_ROOT_ID = "app";
const DEFAULT_APPLICATION_ROUTE = "finance";

export async function startWeb() {
    let application = null;
    const presentationModulePromises = new Map();

    function loadPresentationModule(name) {
        if (presentationModulePromises.has(name)) {
            return presentationModulePromises.get(name);
        }

        const paths = {
            finance: "../../source/presentation/finance/finance.js",
            register: "../../source/presentation/auth/register.js",
            login: "../../source/presentation/auth/login.js",
            profile: "../../source/presentation/profile/profile.js",
            health: "../../source/presentation/health/health.js",
            development: "../../source/presentation/development/development.js"
        };

        const path = paths[name];
        if (!path) {
            return Promise.reject(new Error("LifeGame Web: unknown presentation module: " + name));
        }

        const promise = import(path);
        presentationModulePromises.set(name, promise);
        return promise;
    }

    async function getPresentation(name) {
        return loadPresentationModule(name);
    }

    configureAssetsAnalyticsAccess({
        getEntitlement: () => "free"
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
    let navigation = null;
    let publicMode = true;
    let sessionState = "unknown";
    let authenticationEstablished = false;
    let activeUserId = null;

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
            route === "profile" ||
            route === "auth";
    }

    function isPublicModule(route) {
        return route === "finance" ||
            route === "health" ||
            route === "development" ||
            route === "auth";
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

    async function openRegistrationModal(pendingAction = null) {
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

        const { renderRegistration } = await getPresentation("register");

        renderRegistration(
            dialog,
            application.auth,
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

    async function openLoginModal(pendingAction = null) {
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

        const { renderLogin } = await getPresentation("login");

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
                label: "HEALTH",
                title: "Система здоровья",
                description: "Следите за активностью, тренировками и восстановлением, чтобы лучше понимать своё состояние и поддерживать энергию."
            },
            development: {
                label: "DEVELOPMENT",
                title: "Система развития",
                description: "Ставьте цели, развивайте навыки и отслеживайте прогресс, сохраняя комфортный темп и время на отдых."
            }
        };

        const module = modules[moduleId];

        if (!module) {
            getPresentation("finance").then(({ renderFinance }) => {
                renderFinance(
                    moduleContent,
                    null,
                    (action) => openRegistrationModal(action)
                );
            }).catch((error) => {
                trace("web-shell", "preview.finance.error", {
                    error: error?.message || "unknown"
                });
            });
            return;
        }

        moduleContent.replaceChildren();

        const section = document.createElement("section");
        section.className = "module-subblocks";

        // Keep the public preview focused on its premium header. Module details
        // are intentionally omitted until their dedicated experiences are ready.
        const heading = document.createElement("header");
        heading.className = "finance-workspace-header";

        const eyebrow = document.createElement("span");
        eyebrow.className = "finance-section-meta";
        eyebrow.textContent = module.label;

        const title = document.createElement("h2");
        title.textContent = module.title;

        const description = document.createElement("p");
        description.textContent = module.description;

        heading.append(eyebrow, title, description);
        section.appendChild(heading);
        moduleContent.appendChild(section);
    }
    async function handleLogout() {
        if (sessionState !== "authenticated") {
            return;
        }

        trace("web-shell", "logout.begin");

        await application.auth.logout();

        authenticationEstablished = false;
        publicMode = true;
        sessionState = "unauthenticated";

        // Remove the active user's scoped Application immediately. The public
        // finance view must never render the previous user's state.
        application.finance.clearForUser(activeUserId);
        application.health.clearForUser(activeUserId);
        application.development.clearForUser(activeUserId);
        activeUserId = null;

        trace("web-shell", "logout.completed", {
            authenticated: false
        });

        if (getRoute() !== DEFAULT_APPLICATION_ROUTE) {
            window.location.hash = DEFAULT_APPLICATION_ROUTE;
        }

        await renderRoute();
    }

    async function renderModule(moduleId, session = null, financeApplication = null, healthApplication = null, developmentApplication = null, lifeSystemApplication = null) {
        if (moduleId === "auth") {
            moduleContent.replaceChildren();
            openLoginModal();
            return;
        }

        if (moduleId === "finance") {
            const { renderFinance } = await getPresentation("finance");
            renderFinance(
                moduleContent,
                publicMode ? (action) => openRegistrationModal(action) : null,
                financeApplication,
                { showPresentationHeader: publicMode, userId: publicMode ? null : activeUserId }
            );
            return;
        }

        if (publicMode && (moduleId === "health" || moduleId === "development")) {
            // Public previews must not invoke authenticated presentations, which
            // require user-scoped applications. Use each module's own preview copy.
            renderPreviewModule(moduleId);
            return;
        }

        if (moduleId === "health") {
            const { renderHealth } = await getPresentation("health");
            await renderHealth(moduleContent, healthApplication, { showPresentationHeader: publicMode });
            return;
        }

        if (moduleId === "development") {
            const { renderDevelopment } = await getPresentation("development");
            await renderDevelopment(moduleContent, developmentApplication, lifeSystemApplication, { showPresentationHeader: publicMode });
            return;
        }

        if (moduleId === "profile") {
            if (publicMode) {
                moduleContent.replaceChildren();
                await openLoginModal();
                return;
            }

            const { renderProfile } = await getPresentation("profile");
            await renderProfile(moduleContent, session, {
                profileApplication: application.profile,
                onLogout: handleLogout
            });
            return;
        }

        renderPreviewModule(moduleId);
    }

    function initializeApplicationShell() {
        if (navigationInitialized) {
            return;
        }

        navigation = createNavigation(appRoot);
        navigation.setAuthenticationState(false);
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

        // Authentication is authoritative, but authenticated module hydration
        // still needs the resulting user id. Resolve the session before the
        // route render so Finance/Health never receive an authenticated shell
        // with a missing activeUserId after login or registration.
        authenticationEstablished = true;
        publicMode = false;
        sessionState = "authenticated";

        try {
            const sessionResult = await readSessionWithHydrationRetry();
            const session = sessionResult?.session ?? null;

            if (session?.user?.id) {
                activeUserId = session.user.id;
            }

            trace("web-shell", "auth.session.ready", {
                authenticated: Boolean(session),
                userIdAvailable: Boolean(session?.user?.id)
            });
        } catch (error) {
            trace("web-shell", "auth.session.resolve.error", {
                error: error?.message || "unknown"
            });
        }

        await renderRoute();

        if (typeof pendingAction === "function") {
            pendingAction();
            return;
        }

        if (getRoute() !== originRoute) {
            window.location.hash = originRoute;
        }
    }

    function renderAuthenticatedLoadingState(route) {
        const states = {
            finance: {
                label: "FINANCE",
                title: "Подготавливаем финансовую систему",
                description: "Загружаем ваши данные и проверяем актуальность показателей."
            },
            health: {
                label: "HEALTH",
                title: "Подготавливаем систему здоровья",
                description: "Загружаем ваши данные активности и прогресса."
            },
            development: {
                label: "DEVELOPMENT",
                title: "Подготавливаем систему развития",
                description: "Загружаем ваши цели и данные прогресса."
            }
        };
        const state = states[route];
        if (!state) return;

        const section = document.createElement("section");
        section.className = "finance-loading-state";
        section.setAttribute("role", "status");
        section.setAttribute("aria-live", "polite");
        section.setAttribute("aria-busy", "true");

        const brand = document.createElement("div");
        brand.className = "finance-loading-brand";
        brand.setAttribute("aria-hidden", "true");
        for (const [index, letter] of Array.from("LifeGame").entries()) {
            const glyph = document.createElement("span");
            glyph.className = "finance-loading-brand-letter";
            glyph.textContent = letter;
            glyph.style.setProperty("--letter-index", String(index));
            brand.appendChild(glyph);
        }

        const meta = document.createElement("span");
        meta.className = "finance-section-meta";
        meta.textContent = state.label;

        const heading = document.createElement("h2");
        heading.textContent = state.title;

        const description = document.createElement("p");
        description.textContent = state.description;

        const progress = document.createElement("div");
        progress.className = "finance-loading-progress";
        progress.setAttribute("aria-hidden", "true");
        for (let index = 0; index < 3; index += 1) {
            const line = document.createElement("span");
            line.className = "finance-loading-line";
            progress.appendChild(line);
        }

        section.append(brand, meta, heading, description, progress);
        moduleContent.replaceChildren(section);
    }

    async function renderApplicationShell(route, isPublic, session = null, renderId = null) {
        if (renderId !== null && renderId !== routeRenderSequence) {
            return;
        }

        publicMode = isPublic;
        sessionState = isPublic ? "unauthenticated" : "authenticated";

        if (navigation) {
            navigation.setAuthenticationState(!isPublic);
        }

        if (!isPublic && session?.user?.id) {
            activeUserId = session.user.id;
        }

        trace("web-shell", "render.shell", {
            route,
            access: isPublic ? "public" : "authenticated"
        });

        // Critical rendering rule: the visible application must be painted
        // before any Supabase/network hydration. A slow or failed database
        // request must never leave the user with only header + navigation.
        appRoot.dataset.access = isPublic ? "public" : "authenticated";
        initializeApplicationShell();
        authRoot.hidden = true;
        applicationShell.hidden = false;

        if (isPublic) {
            await renderModule(route, session);
            return;
        }

        if (!activeUserId) {
            return;
        }

        if (["finance", "health", "development"].includes(route)) {
            renderAuthenticatedLoadingState(route);
        }

        try {
            let financeApplication = null;
            let healthApplication = null;
            let developmentApplication = null;
            let lifeSystemApplication = null;

            if (route === "finance") {
                financeApplication = await application.finance.createApplicationForUser(activeUserId);
            } else if (route === "health") {
                healthApplication = await application.health.createApplicationForUser(activeUserId);
            } else if (route === "development") {
                developmentApplication = await application.development.createApplicationForUser(activeUserId);
                lifeSystemApplication = await application.lifeSystem.createApplicationForUser(activeUserId);
            }

            if (renderId !== null && renderId !== routeRenderSequence) {
                return;
            }

            await renderModule(
                route,
                session,
                financeApplication,
                healthApplication,
                developmentApplication,
                lifeSystemApplication
            );
        } catch (error) {
            trace("web-shell", "module.hydration.error", {
                route,
                error: error?.message || "unknown"
            });

            // Keep the already-painted module visible. Do not collapse the
            // application back to an empty shell because persistence failed.
        }
    }

    async function renderRoute() {
        const renderId = ++routeRenderSequence;
        const requestedRoute = getRoute();

        trace("web-shell", "route.check.begin", {
            requestedRoute,
            currentSessionState: sessionState,
            renderId
        });

        if (!application) {
            publicMode = true;
            sessionState = "unauthenticated";
            initializeApplicationShell();
            authRoot.hidden = true;
            applicationShell.hidden = false;

            const publicRoute = isPublicModule(requestedRoute)
                ? requestedRoute
                : DEFAULT_APPLICATION_ROUTE;

            await renderApplicationShell(
                publicRoute,
                true,
                null,
                renderId
            );
            return;
        }

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

                await renderApplicationShell(
                    isApplicationModule(requestedRoute)
                        ? requestedRoute
                        : DEFAULT_APPLICATION_ROUTE,
                    false,
                    null,
                    renderId
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

                await renderApplicationShell(
                    publicRoute,
                    true,
                    null,
                    renderId
                );
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

            await renderApplicationShell(
                isApplicationModule(requestedRoute)
                    ? requestedRoute
                    : DEFAULT_APPLICATION_ROUTE,
                false,
                session,
                renderId
            );
        } catch (error) {
            // Public module routes must remain available even when the
            // authentication check itself fails. Auth verification is not a
            // prerequisite for presentation-only Health/Development/Finance.
            if (!authenticationEstablished && isPublicModule(requestedRoute)) {
                sessionState = "unauthenticated";
                publicMode = true;
                trace("web-shell", "route.public-auth-check-error", {
                    requestedRoute,
                    error: error?.message || "unknown"
                });
                await renderApplicationShell(
                    requestedRoute,
                    true,
                    null,
                    renderId
                );
                return;
            }

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

                // Never leave the application shell empty when user-data
                // hydration fails. Render a safe module fallback so a database
                // or network problem cannot make the whole product disappear.
                publicMode = false;
                appRoot.dataset.access = "authenticated";
                initializeApplicationShell();
                authRoot.hidden = true;
                applicationShell.hidden = false;

                const fallbackRoute = isApplicationModule(requestedRoute)
                    ? requestedRoute
                    : DEFAULT_APPLICATION_ROUTE;

                if (fallbackRoute === "health") {
                    getPresentation("health").then(({ renderHealth }) => renderHealth(moduleContent, null, {
                        showPresentationHeader: false
                    })).catch((fallbackError) => {
                        trace("web-shell", "fallback.health.error", {
                            error: fallbackError?.message || "unknown"
                        });
                    });
                } else if (fallbackRoute === "development") {
                    getPresentation("development").then(({ renderDevelopment }) => renderDevelopment(moduleContent, null, null, {
                        showPresentationHeader: false
                    })).catch((fallbackError) => {
                        trace("web-shell", "fallback.development.error", {
                            error: fallbackError?.message || "unknown"
                        });
                    });
                } else if (fallbackRoute === "profile") {
                    getPresentation("profile").then(({ renderProfile }) => renderProfile(moduleContent, null, {
                        profileApplication: application.profile,
                        onLogout: handleLogout
                    })).catch((fallbackError) => {
                        trace("web-shell", "fallback.profile.error", {
                            error: fallbackError?.message || "unknown"
                        });
                    });
                } else {
                    getPresentation("finance").then(({ renderFinance }) => {
                        renderFinance(
                            moduleContent,
                            (action) => openRegistrationModal(action),
                            null
                        );
                    }).catch((fallbackError) => {
                        trace("web-shell", "fallback.finance.error", {
                            error: fallbackError?.message || "unknown"
                        });
                    });
                }

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

    // Public module routes use the same presentation surfaces as the authenticated
    // product; only the presentation header changes by access mode. The legacy
    // preview-subblock fallback is intentionally no longer used for Health/Development.

    // The composition root includes the Supabase infrastructure. It must not
    // be a static module dependency of the web entrypoint: if the remote SDK
    // or another infrastructure dependency fails to load, the browser would
    // execute none of this file and the static HTML shell would remain on
    // screen. Paint the public Finance surface first, then load infrastructure
    // asynchronously. This keeps the UI boot path independent from persistence.
    initializeApplicationShell();
    const { renderFinance } = await getPresentation("finance");
    renderFinance(
        moduleContent,
        (action) => openRegistrationModal(action),
        null
    );

    try {
        const { createWebApplication } = await import("./composition/root.js");
        application = createWebApplication();
        trace("web-shell", "composition.ready");
        await renderRoute();
    } catch (error) {
        trace("web-shell", "composition.error", {
            error: error?.message || "unknown"
        });
        console.error("LifeGame Web: application composition failed.", error);
        // The public Finance surface is intentionally left visible. A failure
        // in infrastructure must not collapse the product into header-only UI.
    }
}

