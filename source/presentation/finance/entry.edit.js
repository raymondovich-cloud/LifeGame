// entry.edit.js — Version 1.6

import { updateFinanceEntry } from "../../application/finance/finance.js";

function triggerHaptic() {
    const telegramWebApp = typeof window !== "undefined"
        ? window.Telegram?.WebApp
        : null;

    if (telegramWebApp?.HapticFeedback?.impactOccurred) {
        try {
            telegramWebApp.HapticFeedback.impactOccurred("medium");
            return;
        } catch {
            // Fall through to the browser vibration fallback.
        }
    }

    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        try {
            navigator.vibrate([12, 18, 12]);
        } catch {
            // Haptics are optional and must never interrupt the interaction.
        }
    }
}

function createRowInteractionMenu(item, onEdit, onPin, onDelete, onPinLimit) {
    const backdrop = document.createElement("div");
    backdrop.className = "row-interaction-backdrop";
    backdrop.setAttribute("role", "presentation");

    const menu = document.createElement("div");
    menu.className = "row-interaction-menu";
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", "Действия со строкой");

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "row-interaction-menu__item";
    editButton.textContent = "Редактировать";
    editButton.setAttribute("role", "menuitem");

    const pinButton = document.createElement("button");
    pinButton.type = "button";
    pinButton.className = "row-interaction-menu__item";
    pinButton.textContent = item.classList.contains("is-pinned") ? "Открепить" : "Закрепить";
    pinButton.setAttribute("role", "menuitem");

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "row-interaction-menu__item row-interaction-menu__item--danger";
    deleteButton.textContent = "Удалить";
    deleteButton.setAttribute("role", "menuitem");

    menu.append(editButton, pinButton, deleteButton);
    backdrop.appendChild(menu);
    document.body.appendChild(backdrop);

    let closing = false;

    const cleanup = () => {
        if (closing) return;
        closing = true;

        backdrop.classList.remove("is-visible");

        window.setTimeout(() => {
            backdrop.remove();
            item.classList.remove("is-editing-target");
        }, 220);
    };

    editButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        cleanup();
        onEdit();
    });

    pinButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (!item.classList.contains("is-pinned") && typeof onPinLimit === "function" && onPinLimit()) {
            cleanup();
            return;
        }

        cleanup();
        onPin?.();
    });

    pinButton.addEventListener("contextmenu", (event) => event.preventDefault());

    deleteButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        cleanup();
        onDelete?.();
    });

    backdrop.addEventListener("click", (event) => {
        if (event.target === backdrop) cleanup();
    });

    requestAnimationFrame(() => backdrop.classList.add("is-visible"));
}

function openEntryEditModal(subblockId, entry, onSaved) {
    const modal = document.createElement("div");
    modal.className = "assets-edit-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "entry-edit-title");

    const dialog = document.createElement("div");
    dialog.className = "assets-edit-modal__dialog";

    const title = document.createElement("h2");
    title.id = "entry-edit-title";
    title.className = "assets-edit-modal__title";
    title.textContent = "Редактировать";

    const form = document.createElement("form");
    form.className = "assets-edit-modal__form";

    const labelInput = document.createElement("input");
    labelInput.className = "input-control";
    labelInput.name = "label";
    labelInput.type = "text";
    labelInput.value = entry.label;
    labelInput.autocomplete = "off";
    labelInput.required = true;
    labelInput.setAttribute("aria-label", "Название записи");

    const amountInput = document.createElement("input");
    amountInput.className = "input-control";
    amountInput.name = "amount";
    amountInput.type = "number";
    amountInput.inputMode = "decimal";
    amountInput.min = "0.01";
    amountInput.step = "0.01";
    amountInput.value = String(subblockId === "financial-burden" ? entry.debt : entry.amount);
    amountInput.required = true;
    amountInput.setAttribute("aria-label", subblockId === "financial-burden" ? "Сумма долга" : "Сумма");

    const paymentInput = subblockId === "financial-burden" ? document.createElement("input") : null;
    if (paymentInput) {
        paymentInput.className = "input-control";
        paymentInput.name = "payment";
        paymentInput.type = "number";
        paymentInput.inputMode = "decimal";
        paymentInput.min = "0";
        paymentInput.step = "0.01";
        paymentInput.value = String(entry.payment ?? 0);
        paymentInput.required = true;
        paymentInput.setAttribute("aria-label", "Регулярный платёж");
    }

    const liquidityField = subblockId === "assets" ? document.createElement("div") : null;
    let liquidity = entry.liquidity === "illiquid" ? "illiquid" : "liquid";

    if (liquidityField) {
        liquidityField.className = "assets-edit-modal__liquidity";

        const liquidityLabel = document.createElement("span");
        liquidityLabel.textContent = "Ликвидность";

        const liquidityState = document.createElement("span");
        liquidityState.className = "liquidity-switch-state";

        const liquiditySwitch = document.createElement("button");
        liquiditySwitch.type = "button";
        liquiditySwitch.className = "liquidity-switch";
        liquiditySwitch.setAttribute("role", "switch");

        const updateLiquidity = () => {
            const isLiquid = liquidity === "liquid";
            liquiditySwitch.setAttribute("aria-checked", String(isLiquid));
            liquiditySwitch.classList.toggle("is-on", isLiquid);
            liquidityState.textContent = isLiquid ? "Ликвидный" : "Неликвидный";
        };

        liquiditySwitch.addEventListener("click", () => {
            liquidity = liquidity === "liquid" ? "illiquid" : "liquid";
            updateLiquidity();
        });

        liquidityField.append(liquidityLabel, liquidityState, liquiditySwitch);
        updateLiquidity();
    }

    const error = document.createElement("p");
    error.className = "finance-form-error";
    error.hidden = true;

    const actions = document.createElement("div");
    actions.className = "assets-edit-modal__actions";

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "button-control assets-edit-modal__cancel";
    cancelButton.textContent = "Отмена";

    const saveButton = document.createElement("button");
    saveButton.type = "submit";
    saveButton.className = "button-control";
    saveButton.textContent = "Сохранить";

    actions.append(cancelButton, saveButton);
    form.append(labelInput, amountInput);
    if (liquidityField) form.appendChild(liquidityField);
    if (paymentInput) form.appendChild(paymentInput);
    form.append(error, actions);
    dialog.append(title, form);
    modal.appendChild(dialog);
    document.body.appendChild(modal);

    const close = () => {
        modal.classList.remove("is-visible");
        window.setTimeout(() => modal.remove(), 180);
    };

    cancelButton.addEventListener("click", close);
    modal.addEventListener("click", (event) => {
        if (event.target === modal) close();
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        error.hidden = true;

        try {
            const updated = await updateFinanceEntry(
                subblockId,
                entry.id,
                labelInput.value,
                amountInput.value,
                liquidity,
                paymentInput?.value ?? null
            );

            if (!updated) throw new Error("Запись не найдена.");

            close();
            onSaved?.(updated);
        } catch (saveError) {
            error.textContent = saveError.message;
            error.hidden = false;
        }
    });

    requestAnimationFrame(() => {
        modal.classList.add("is-visible");
        labelInput.focus();
        labelInput.select();
    });
}

function attachEntryEdit(item, subblockId, entry, onWriteAttempt = null, onSaved = null, onPin = null, onDelete = null, onPinLimit = null) {
    if (!item || !entry || subblockId === "financial-stability-index") return;

    let pressTimer = null;
    let longPressTriggered = false;
    let startX = 0;
    let startY = 0;
    let activePointerId = null;

    const clearPressTimer = () => {
        if (pressTimer !== null) {
            window.clearTimeout(pressTimer);
            pressTimer = null;
        }
    };

    const showEditor = () => {
        const open = () => openEntryEditModal(subblockId, entry, onSaved);
        typeof onWriteAttempt === "function" ? onWriteAttempt(open) : open();
    };

    const cancelPress = () => {
        clearPressTimer();
        item.classList.remove("is-long-pressing");
    };

    item.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;

        startX = event.clientX;
        startY = event.clientY;
        activePointerId = event.pointerId;
        longPressTriggered = false;
        clearPressTimer();
        item.classList.add("is-long-pressing");

        pressTimer = window.setTimeout(() => {
            longPressTriggered = true;
            pressTimer = null;
            item.classList.remove("is-long-pressing");
            triggerHaptic();
            item.classList.add("is-editing-target");
            createRowInteractionMenu(item, showEditor, onPin, onDelete, onPinLimit);
        }, 500);
    });

    item.addEventListener("pointermove", (event) => {
        if (activePointerId !== event.pointerId) return;

        if (Math.abs(event.clientX - startX) > 10 || Math.abs(event.clientY - startY) > 10) {
            cancelPress();
        }
    });

    item.addEventListener("pointerup", (event) => {
        if (activePointerId !== event.pointerId) return;

        clearPressTimer();
        item.classList.remove("is-long-pressing");
        activePointerId = null;

        if (longPressTriggered) {
            event.preventDefault();
            event.stopPropagation();
        }
    });

    item.addEventListener("pointercancel", cancelPress);
    item.addEventListener("contextmenu", (event) => event.preventDefault());
}

export { attachEntryEdit };
