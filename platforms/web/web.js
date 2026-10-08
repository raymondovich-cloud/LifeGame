// platforms/web/web.js — Version 5.3
// Responsibility: boot the browser shell before loading the application runtime.
//
// This file intentionally has no static application imports. A failure in a
// presentation, infrastructure, or remote ESM dependency must never prevent
// the first usable LifeGame surface from appearing.

const APP_ROOT_ID = "app";
const DEFAULT_ROUTE = "finance";

function renderBootstrapFinance(container) {
    container.replaceChildren();

    const page = document.createElement("section");
    page.className = "finance-workspace";

    const meta = document.createElement("span");
    meta.className = "finance-section-meta";
    meta.textContent = "FINANCE";

    const title = document.createElement("h1");
    title.textContent = "Финансовая система";

    const description = document.createElement("p");
    description.textContent =
        "Одна панель для капитала, доходов, обязательств и резерва.";

    const status = document.createElement("p");
    status.className = "finance-section-meta";
    status.textContent = "SYSTEM READY";

    page.append(meta, title, description, status);
    container.appendChild(page);
}

function renderBootstrapModule(container, route) {
    container.replaceChildren();

    if (route === "finance") {
        renderBootstrapFinance(container);
        return;
    }

    const modules = {
        health: {
            label: "HEALTH SYSTEM",
            title: "Здоровье",
            description: "Энергия, восстановление, тренировки и привычки.",
            items: ["Физическое состояние", "Тренировки", "Привычки"]
        },
        development: {
            label: "DEVELOPMENT SYSTEM",
            title: "Развитие",
            description: "Цели, навыки, знания и личный прогресс.",
            items: ["Цели", "Навыки", "Прогресс"]
        },
        profile: {
            label: "PROFILE",
            title: "Профиль",
            description: "Аккаунт и настройки LifeGame.",
            items: ["Аккаунт", "Настройки", "Безопасность"]
        }
    };

    const module = modules[route] ?? modules.finance;

    const page = document.createElement("section");
    page.className = "finance-workspace";

    const meta = document.createElement("span");
    meta.className = "finance-section-meta";
    meta.textContent = module.label;

    const title = document.createElement("h1");
    title.textContent = module.title;

    const description = document.createElement("p");
    description.textContent = module.description;

    const list = document.createElement("div");
    list.className = "preview-subblock-list";

    module.items.forEach((item, index) => {
        const row = document.createElement("div");
        row.className = "preview-subblock";
        row.innerHTML =
            '<span class="preview-subblock-index">' +
            String(index + 1).padStart(2, "0") +
            "</span>" +
            '<span class="preview-subblock-name">' +
            item +
            "</span>" +
            '<span class="preview-subblock-action">OPEN</span>';
        list.appendChild(row);
    });

    page.append(meta, title, description, list);
    container.appendChild(page);
}

function boot() {
    const appRoot = document.getElementById(APP_ROOT_ID);
    const shell = appRoot?.querySelector("#application-shell");
    const container = shell?.querySelector("#module-content");

    if (!appRoot || !shell || !container) {
        return;
    }

    shell.hidden = false;
    appRoot.dataset.access = "public";

    const renderCurrentRoute = () => {
        const route = window.location.hash.slice(1) || DEFAULT_ROUTE;
        renderBootstrapModule(container, route);
    };

    document.querySelectorAll(".navigation-item").forEach((item) => {
        item.addEventListener("click", () => {
            window.setTimeout(renderCurrentRoute, 0);
        });
    });

    window.addEventListener("hashchange", renderCurrentRoute);

    renderCurrentRoute();

    import("./web.runtime.js?v=20261008-2025")
        .then(({ startWeb }) => startWeb())
        .catch((error) => {
            console.error("LifeGame Web runtime failed to load.", error);
            renderCurrentRoute();
        });
}

boot();
