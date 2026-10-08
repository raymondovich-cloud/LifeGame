// platforms/web/web.js — Version 5.0
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

function boot() {
    const appRoot = document.getElementById(APP_ROOT_ID);
    const shell = appRoot?.querySelector("#application-shell");
    const container = shell?.querySelector("#module-content");

    if (!appRoot || !shell || !container) {
        return;
    }

    shell.hidden = false;
    appRoot.dataset.access = "public";

    renderBootstrapFinance(container);

    if (!window.location.hash) {
        window.location.hash = DEFAULT_ROUTE;
    }

    import("./web.runtime.js")
        .then(({ startWeb }) => startWeb())
        .catch((error) => {
            console.error("LifeGame Web runtime failed to load.", error);

            const status = container.querySelector(".finance-section-meta:last-child");
            if (status) {
                status.textContent = "SYSTEM ONLINE";
            }
        });
}

boot();
