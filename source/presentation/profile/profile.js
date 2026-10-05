// source/presentation/profile/profile.js — Version 1.1
// Responsibility: render the authenticated profile block and expose profile actions.

function renderProfile(root, session = null, options = {}) {
    root.replaceChildren();

    const { onLogout } = options;

    const section = document.createElement("section");
    section.className = "module-subblocks";

    const heading = document.createElement("div");
    heading.className = "module-subblocks-header";
    heading.innerHTML =
        '<span class="module-subblocks-label">PROFILE SYSTEM</span>' +
        "<p>Ваш аккаунт и персональные настройки LifeGame.</p>";

    const card = document.createElement("div");
    card.className = "preview-subblock-list";

    const accountRow = document.createElement("div");
    accountRow.className = "preview-subblock";
    accountRow.setAttribute("aria-label", "Current account");

    const email = session?.user?.email || "Account active";

    accountRow.innerHTML =
        '<span class="preview-subblock-index">01</span>' +
        '<span class="preview-subblock-name">' +
        email +
        "</span>" +
        '<span class="preview-subblock-action">ACCOUNT</span>';

    const logoutRow = document.createElement("button");
    logoutRow.type = "button";
    logoutRow.className = "preview-subblock profile-logout";
    logoutRow.setAttribute("aria-label", "Выйти из профиля");

    logoutRow.innerHTML =
        '<span class="preview-subblock-index">02</span>' +
        '<span class="preview-subblock-name">Выйти из профиля</span>' +
        '<span class="preview-subblock-action">LOG OUT</span>';

    logoutRow.addEventListener("click", async () => {
        if (typeof onLogout !== "function" || logoutRow.disabled) {
            return;
        }

        logoutRow.disabled = true;

        try {
            await onLogout();
        } catch (error) {
            logoutRow.disabled = false;
            throw error;
        }
    });

    card.append(accountRow, logoutRow);
    section.append(heading, card);
    root.appendChild(section);
}

export { renderProfile };
