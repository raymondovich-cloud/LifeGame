// source/presentation/profile/profile.js — Version 1.2
// Responsibility: render the authenticated profile block and expose profile actions.

async function renderProfile(root, session = null, options = {}) {
    root.replaceChildren();

    const { onLogout, profileApplication } = options;
    const userId = session?.user?.id;

    if (!profileApplication || !userId) {
        throw new Error("Profile application and authenticated user are required.");
    }

    const section = document.createElement("section");
    section.className = "module-subblocks";

    const heading = document.createElement("div");
    heading.className = "module-subblocks-header";
    heading.innerHTML =
        '<span class="module-subblocks-label">PROFILE SYSTEM</span>' +
        "<p>Ваш аккаунт и персональные настройки LifeGame.</p>";

    const card = document.createElement("div");
    card.className = "preview-subblock-list";

    const loadingRow = document.createElement("div");
    loadingRow.className = "preview-subblock";
    loadingRow.setAttribute("aria-live", "polite");
    loadingRow.innerHTML =
        '<span class="preview-subblock-index">01</span>' +
        '<span class="preview-subblock-name">Загрузка профиля…</span>' +
        '<span class="preview-subblock-action">PROFILE</span>';
    card.appendChild(loadingRow);
    section.append(heading, card);
    root.appendChild(section);

    let profile;

    try {
        profile = await profileApplication.getProfile(userId);
    } catch (error) {
        loadingRow.innerHTML =
            '<span class="preview-subblock-index">01</span>' +
            '<span class="preview-subblock-name">Не удалось загрузить профиль</span>' +
            '<span class="preview-subblock-action">ERROR</span>';
        console.error("LifeGame Profile: profile load failed.", error);
        return;
    }

    card.replaceChildren();

    const accountRow = document.createElement("div");
    accountRow.className = "preview-subblock";
    accountRow.setAttribute("aria-label", "Current account");

    const displayName = profile?.displayName || "Имя не указано";
    const birthDate = profile?.birthDate || "Дата рождения не указана";
    const email = session?.user?.email || "Account active";

    accountRow.innerHTML =
        '<span class="preview-subblock-index">01</span>' +
        '<span class="preview-subblock-name">' +
        displayName +
        "</span>" +
        '<span class="preview-subblock-action">NAME</span>';

    const birthDateRow = document.createElement("div");
    birthDateRow.className = "preview-subblock";
    birthDateRow.setAttribute("aria-label", "Birth date");
    birthDateRow.innerHTML =
        '<span class="preview-subblock-index">04</span>' +
        '<span class="preview-subblock-name">' +
        birthDate +
        "</span>" +
        '<span class="preview-subblock-action">BIRTH DATE</span>';

    const emailRow = document.createElement("div");
    emailRow.className = "preview-subblock";
    emailRow.setAttribute("aria-label", "Current account");
    emailRow.innerHTML =
        '<span class="preview-subblock-index">03</span>' +
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

    card.append(accountRow, birthDateRow, emailRow, logoutRow);
    section.append(heading, card);
    root.appendChild(section);
}

export { renderProfile };
