// source/presentation/profile/profile.js — Version 1.5
// Responsibility: render the Profile Life Quality placeholder and profile settings.

function createSettingsRow(label, value, action = null) {
    const row = document.createElement("div");
    row.className = "profile-settings-row";

    const labelElement = document.createElement("span");
    labelElement.className = "profile-settings-label";
    labelElement.textContent = label;

    const valueElement = document.createElement("span");
    valueElement.className = "profile-settings-value";
    valueElement.textContent = value;

    row.append(labelElement, valueElement);

    if (typeof action === "function") {
        row.classList.add("profile-settings-row--editable");
        row.tabIndex = 0;
        row.setAttribute("role", "button");
        row.addEventListener("click", action);
        row.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                action();
            }
        });
    }

    return row;
}

function createEditRow(values, onSave, onCancel) {
    const row = document.createElement("div");
    row.className = "profile-settings-edit";

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
    row.appendChild(form);

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

    return {
        row,
        focus: () => name.focus()
    };
}

function createLifeQualityVisual() {
    const visual = document.createElement("div");
    visual.className = "life-quality-visual";
    visual.setAttribute("role", "img");
    visual.setAttribute(
        "aria-label",
        "Life Quality Index: 760 из 1000"
    );

    visual.innerHTML = `
        <svg
            class="life-quality-gauge"
            viewBox="0 0 320 190"
            aria-hidden="true"
            focusable="false"
        >
            <defs>
                <linearGradient id="life-quality-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#f28a2e"></stop>
                    <stop offset="100%" stop-color="#ffd08a"></stop>
                </linearGradient>
            </defs>

            <path
                class="life-quality-gauge-track"
                d="M 45 150 A 115 115 0 0 1 275 150"
            ></path>

            <path
                class="life-quality-gauge-value"
                d="M 45 150 A 115 115 0 0 1 275 150"
                pathLength="100"
                stroke-dasharray="76 100"
            ></path>

            <line x1="45" y1="150" x2="45" y2="141" class="life-quality-gauge-tick"></line>
            <line x1="102" y1="67" x2="108" y2="74" class="life-quality-gauge-tick"></line>
            <line x1="160" y1="35" x2="160" y2="45" class="life-quality-gauge-tick"></line>
            <line x1="218" y1="67" x2="212" y2="74" class="life-quality-gauge-tick"></line>
            <line x1="275" y1="150" x2="275" y2="141" class="life-quality-gauge-tick"></line>

            <text x="160" y="122" text-anchor="middle" class="life-quality-gauge-score">760</text>
            <text x="160" y="148" text-anchor="middle" class="life-quality-gauge-max">/ 1000</text>
        </svg>
    `;

    return visual;
}

function createSettingsModal(profile, email, profileApplication, userId, onLogout) {
    const modal = document.createElement("div");
    modal.className = "profile-settings-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "profile-settings-title");

    const dialog = document.createElement("div");
    dialog.className = "profile-settings-dialog";

    const header = document.createElement("div");
    header.className = "profile-settings-header";

    const title = document.createElement("h2");
    title.id = "profile-settings-title";
    title.className = "profile-settings-title";
    title.textContent = "Настройки";

    const close = document.createElement("button");
    close.type = "button";
    close.className = "profile-settings-close";
    close.setAttribute("aria-label", "Закрыть настройки");
    close.textContent = "×";

    header.append(title, close);

    const content = document.createElement("div");
    content.className = "profile-settings-content";

    const personal = document.createElement("section");
    personal.className = "profile-settings-section";

    const personalTitle = document.createElement("h3");
    personalTitle.className = "profile-settings-section-title";
    personalTitle.textContent = "Профиль";

    const rows = document.createElement("div");
    rows.className = "profile-settings-rows";

    let currentProfile = {
        displayName: profile.displayName || "",
        birthDate: profile.birthDate || ""
    };

    function renderRows() {
        const nameRow = createSettingsRow(
            "Имя",
            currentProfile.displayName || "Не указано",
            startEdit
        );

        const dateRow = createSettingsRow(
            "Дата рождения",
            currentProfile.birthDate || "Не указана",
            startEdit
        );

        const emailRow = createSettingsRow(
            "Email",
            email || "Account active"
        );

        rows.replaceChildren(nameRow, dateRow, emailRow);
    }

    function startEdit() {
        if (rows.querySelector(".profile-settings-edit")) return;

        const edit = createEditRow(
            currentProfile,
            async input => {
                const updated = await profileApplication.updateProfile(
                    userId,
                    input
                );

                currentProfile = {
                    displayName: updated.displayName,
                    birthDate: updated.birthDate
                };

                renderRows();
            },
            renderRows
        );

        rows.replaceChildren(edit.row);
        edit.focus();
    }

    personal.append(personalTitle, rows);

    const account = document.createElement("section");
    account.className = "profile-settings-section";

    const accountTitle = document.createElement("h3");
    accountTitle.className = "profile-settings-section-title";
    accountTitle.textContent = "Аккаунт";

    const logout = document.createElement("button");
    logout.type = "button";
    logout.className = "profile-settings-logout";
    logout.textContent = "Выйти из профиля";

    logout.addEventListener("click", async () => {
        if (logout.disabled || typeof onLogout !== "function") return;

        logout.disabled = true;

        try {
            await onLogout();
            modal.remove();
        } catch (error) {
            logout.disabled = false;
            throw error;
        }
    });

    account.append(accountTitle, logout);

    content.append(personal, account);
    dialog.append(header, content);
    modal.appendChild(dialog);

    function closeModal() {
        modal.remove();
    }

    close.addEventListener("click", closeModal);

    modal.addEventListener("click", event => {
        if (event.target === modal) {
            closeModal();
        }
    });

    modal.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeModal();
        }
    });

    renderRows();

    return {
        modal,
        focusClose: () => close.focus()
    };
}

async function renderProfile(root, session = null, options = {}) {
    root.replaceChildren();

    const { onLogout, profileApplication } = options;
    const userId = session?.user?.id;

    if (!profileApplication || !userId) {
        throw new Error("Profile application and authenticated user are required.");
    }

    const profile = await profileApplication.getProfile(userId);
    const email = session?.user?.email || "Account active";

    const section = document.createElement("section");
    section.className = "profile-dashboard";

    const heading = document.createElement("div");
    heading.className = "profile-dashboard-header";

    const headingCopy = document.createElement("div");
    headingCopy.className = "profile-dashboard-copy";

    const title = document.createElement("h1");
    title.className = "profile-dashboard-title";
    title.textContent = "Life Quality Index";

    const subtitle = document.createElement("p");
    subtitle.className = "profile-dashboard-subtitle";
    subtitle.textContent = "Оценка качества вашей жизни";

    headingCopy.append(title, subtitle);

    const settings = document.createElement("button");
    settings.type = "button";
    settings.className = "profile-settings-button";
    settings.setAttribute("aria-label", "Открыть настройки");
    settings.setAttribute("title", "Настройки");
    settings.textContent = "⚙";

    settings.addEventListener("click", () => {
        if (section.querySelector(".profile-settings-modal")) return;

        const settingsView = createSettingsModal(
            profile,
            email,
            profileApplication,
            userId,
            onLogout
        );

        section.appendChild(settingsView.modal);
        settingsView.focusClose();
    });

    heading.append(headingCopy, settings);

    const score = createLifeQualityVisual();

    section.append(heading, score);
    root.appendChild(section);
}

export { renderProfile };
