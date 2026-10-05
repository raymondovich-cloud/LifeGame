// source/presentation/profile/profile.js — Version 1.4
// Responsibility: render authenticated profile and connect profile editing to Application.

function createInfoRow(index, value, action, ariaLabel, onClick = null) {
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

    if (typeof onClick === "function") {
        row.classList.add("profile-editable-row");
        row.tabIndex = 0;
        row.setAttribute("role", "button");
        row.addEventListener("click", onClick);
        row.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
            }
        });
    }
    return row;
}

function createEditRow(values, onSave, onCancel) {
    const row = document.createElement("div");
    row.className = "preview-subblock profile-edit-row";
    row.setAttribute("aria-label", "Редактирование профиля");

    const index = document.createElement("span");
    index.className = "preview-subblock-index";
    index.textContent = "01";

    const form = document.createElement("form");
    form.className = "profile-edit-form";

    const name = document.createElement("input");
    name.className = "input-control";
    name.type = "text";
    name.value = values.displayName;
    name.placeholder = "Имя";
    name.autocomplete = "name";
    name.setAttribute("aria-label", "Имя");

    const birthDate = document.createElement("input");
    birthDate.className = "input-control";
    birthDate.type = "date";
    birthDate.value = values.birthDate;
    birthDate.autocomplete = "bday";
    birthDate.setAttribute("aria-label", "Дата рождения");

    const fields = document.createElement("div");
    fields.className = "profile-edit-fields";
    fields.append(name, birthDate);

    const message = document.createElement("p");
    message.className = "profile-edit-message";
    message.setAttribute("aria-live", "polite");

    const actions = document.createElement("div");
    actions.className = "profile-edit-actions";

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "button-control";
    cancel.textContent = "Отмена";

    const save = document.createElement("button");
    save.type = "submit";
    save.className = "button-control button-control--accent";
    save.textContent = "Сохранить";

    actions.append(cancel, save);
    form.append(fields, message, actions);
    row.append(index, form);

    cancel.addEventListener("click", onCancel);
    form.addEventListener("submit", async event => {
        event.preventDefault();
        if (save.disabled) return;

        save.disabled = true;
        cancel.disabled = true;
        message.textContent = "Сохранение…";

        try {
            await onSave({
                displayName: name.value,
                birthDate: birthDate.value
            });
        } catch (error) {
            save.disabled = false;
            cancel.disabled = false;
            message.textContent =
                error?.message || "Не удалось сохранить изменения.";
        }
    });

    return { row, focus: () => name.focus() };
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
    card.appendChild(createInfoRow("01", "Загрузка профиля…", "PROFILE", "Profile loading"));
    section.append(heading, card);
    root.appendChild(section);

    let profile;
    try {
        profile = await profileApplication.getProfile(userId);
    } catch (error) {
        card.replaceChildren(createInfoRow("01", "Не удалось загрузить профиль", "ERROR", "Profile loading error"));
        console.error("LifeGame Profile: profile load failed.", error);
        return;
    }

    let currentProfile = {
        displayName: profile?.displayName || "",
        birthDate: profile?.birthDate || ""
    };
    const email = session?.user?.email || "Account active";

    function renderRows() {
        const nameRow = createInfoRow(
            "01",
            currentProfile.displayName || "Имя не указано",
            "EDIT",
            "Display name",
            startEdit
        );
        const dateRow = createInfoRow(
            "02",
            currentProfile.birthDate || "Дата рождения не указана",
            "EDIT",
            "Birth date",
            startEdit
        );
        const emailRow = createInfoRow("03", email, "ACCOUNT", "Current account");

        const logout = document.createElement("button");
        logout.type = "button";
        logout.className = "preview-subblock profile-logout";
        logout.setAttribute("aria-label", "Выйти из профиля");
        logout.innerHTML =
            '<span class="preview-subblock-index">04</span>' +
            '<span class="preview-subblock-name">Выйти из профиля</span>' +
            '<span class="preview-subblock-action">LOG OUT</span>';

        logout.addEventListener("click", async () => {
            if (typeof onLogout !== "function" || logout.disabled) return;
            logout.disabled = true;
            try {
                await onLogout();
            } catch (error) {
                logout.disabled = false;
                throw error;
            }
        });

        card.replaceChildren(nameRow, dateRow, emailRow, logout);
    }

    function startEdit() {
        if (card.querySelector(".profile-edit-row")) return;

        const edit = createEditRow(
            currentProfile,
            async input => {
                const updated = await profileApplication.updateProfile(userId, input);
                currentProfile = {
                    displayName: updated.displayName,
                    birthDate: updated.birthDate
                };
                renderRows();
            },
            renderRows
        );

        card.replaceChildren(
            edit.row,
            createInfoRow("03", email, "ACCOUNT", "Current account")
        );
        edit.focus();
    }

    renderRows();
}

export { renderProfile };
