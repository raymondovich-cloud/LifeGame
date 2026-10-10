// financial-burden-close-confirmation.js — Version 1.1
// Responsibility: present a clear, accessible confirmation before closing a financial burden.

const ORGANIZATION_DEBT_PATTERN = /(?:банк|банку|банка|банковск|ооо|ао(?![а-яё])|ип(?![а-яё])|фнс|гибдд|налог|мфо|микрофинанс|коллект|судеб|штраф|коммуналь|арендодатель|компания|организац|государствен|служба|фонд|страхов)/iu;

function getConfirmationCopy(entry) {
    const label = String(entry?.label || "Обязательство").trim() || "Обязательство";

    if (entry?.isCreditProduct) {
        return {
            title: "Хотите закрыть кредит «" + label + "»?",
            description: "Запись останется в истории, но кредит перестанет учитываться среди активных обязательств и при расчёте текущего FSI.",
            confirmLabel: "Закрыть кредит"
        };
    }

    const personalDebtMatch = label.match(/^долг(?:\s+|\s*[:—-]\s*)(.+)$/iu);
    if (personalDebtMatch && !ORGANIZATION_DEBT_PATTERN.test(personalDebtMatch[1])) {
        return {
            title: "Вы погасили долг " + personalDebtMatch[1].trim() + "?",
            description: "Запись останется в истории, но больше не будет учитываться среди активных обязательств и при расчёте текущего FSI.",
            confirmLabel: "Да, погасил"
        };
    }

    if (ORGANIZATION_DEBT_PATTERN.test(label)) {
        return {
            title: "Закрыть обязательство «" + label + "»?",
            description: "Запись останется в истории, но перестанет учитываться среди активных обязательств и при расчёте текущего FSI.",
            confirmLabel: "Закрыть обязательство"
        };
    }

    return {
        title: "Вы погасили долг «" + label + "»?",
        description: "Запись останется в истории, но больше не будет учитываться среди активных обязательств и при расчёте текущего FSI.",
        confirmLabel: "Да, погасил"
    };
}

function confirmFinancialBurdenClosure(entry) {
    return new Promise((resolve) => {
        const copy = getConfirmationCopy(entry);
        const dialog = document.createElement("dialog");
        dialog.className = "financial-burden-confirmation";
        dialog.setAttribute("aria-labelledby", "financial-burden-confirmation-title");
        dialog.setAttribute("aria-describedby", "financial-burden-confirmation-description");

        const panel = document.createElement("div");
        panel.className = "financial-burden-confirmation__panel";

        const eyebrow = document.createElement("p");
        eyebrow.className = "financial-burden-confirmation__eyebrow";
        eyebrow.textContent = "ФИНАНСОВАЯ СИСТЕМА";

        const title = document.createElement("h2");
        title.className = "financial-burden-confirmation__title";
        title.id = "financial-burden-confirmation-title";
        title.textContent = copy.title;

        const description = document.createElement("p");
        description.className = "financial-burden-confirmation__description";
        description.id = "financial-burden-confirmation-description";
        description.textContent = copy.description;

        const actions = document.createElement("div");
        actions.className = "financial-burden-confirmation__actions";

        const cancelButton = document.createElement("button");
        cancelButton.className = "button-control financial-burden-confirmation__cancel";
        cancelButton.type = "button";
        cancelButton.textContent = "Отмена";
        cancelButton.addEventListener("click", () => dialog.close("cancel"));

        const confirmButton = document.createElement("button");
        confirmButton.className = "button-control button-control--accent financial-burden-confirmation__confirm";
        confirmButton.type = "button";
        confirmButton.textContent = copy.confirmLabel;
        confirmButton.addEventListener("click", () => dialog.close("confirm"));

        actions.append(cancelButton, confirmButton);
        panel.append(eyebrow, title, description, actions);
        dialog.appendChild(panel);

        dialog.addEventListener("click", (event) => {
            if (event.target === dialog) dialog.close("cancel");
        });

        dialog.addEventListener("close", () => {
            const confirmed = dialog.returnValue === "confirm";
            dialog.remove();
            resolve(confirmed);
        }, { once: true });

        document.body.appendChild(dialog);
        dialog.showModal();
        cancelButton.focus();
    });
}

export { confirmFinancialBurdenClosure };
