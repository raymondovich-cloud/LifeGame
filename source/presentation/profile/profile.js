// source/presentation/profile/profile.js — Version 1.0

function renderProfile(root, session = null) {
    root.replaceChildren();

    const section = document.createElement("section");
    section.className = "module-subblocks";

    const heading = document.createElement("div");
    heading.className = "module-subblocks-header";
    heading.innerHTML =
        '<span class="module-subblocks-label">PROFILE SYSTEM</span>' +
        "<p>Ваш аккаунт и персональные настройки LifeGame.</p>";

    const card = document.createElement("div");
    card.className = "preview-subblock-list";

    const row = document.createElement("div");
    row.className = "preview-subblock";
    row.setAttribute("aria-label", "Current account");

    const email = session?.user?.email || "Account active";

    row.innerHTML =
        '<span class="preview-subblock-index">01</span>' +
        '<span class="preview-subblock-name">' +
        email +
        "</span>" +
        '<span class="preview-subblock-action">ACCOUNT</span>';

    card.appendChild(row);
    section.append(heading, card);
    root.appendChild(section);
}

export { renderProfile };
