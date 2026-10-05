// source/presentation/profile/profile.js — Version 1.3
// Responsibility: render the authenticated profile block and expose profile actions.

function createInfoRow(index, value, action, ariaLabel) {
    const row = document.createElement("div");
    row.className = "preview-subblock";
    row.setAttribute("aria-label", ariaLabel);

    const indexElement = document.createElement("span");
    indexElement.className = "preview-subblock-index";
    indexElement.textContent = index;

    const valueElement = document.createElement("span");
    valueElement.className = "preview-subblock-name";
    valueElement.textContent = value;

    const actionElement = document.createElement("span");
    actionElement.className = "preview-subblock-action";
    actionElement.textContent = action;

    row.append(indexElement, valueElement, actionElement);
    return row;
}

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

    const loadingRow = createInfoRow(
        "01",
        "Загрузка профиля…",
        "PROFILE",
        "Profile loading"
    );

    card.appendChild(loadingRow);
    section.append(heading, card);
    root.appendChild(section);

    let profile;

    try {
        profile = await profileApplication.getProfile(userId);
    } catch (error) {
        const errorRow = createInfoRow(
            "01",
            "Не удалось загрузить профиль",
            "ERROR",
            "Profile loading error"
        );
        card.replaceChildren(errorRow);
        console.error("LifeGame Profile: profile load failed.", error);
        return;
    }

    const displayName = profile?.displayName || "Имя не указано";
    const birthDate = profile?.birthDate || "Дата рождения не указана";
    const email = session?.user?.email || "Account active";

    const accountRow = createInfoRow(
        "01",
        displayName,
        "NAME",
        "Display name"
    );

    const birthDateRow = createInfoRow(
        "02",
        birthDate,
        "BIRTH DATE",
        "Birth date"
    );

    const emailRow = createInfoRow(
        "03",
        email,
        "ACCOUNT",
        "Current account"
    );

    const logoutRow = document.createElement("button");
    logoutRow.type = "button";
    logoutRow.className = "preview-subblock profile-logout";
    logoutRow.setAttribute("aria-label", "Выйти из профиля");
    logoutRow.innerHTML =
        '<span class="preview-subblock-index">04</span>' +
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
}

export { renderProfile };
