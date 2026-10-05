// assets.edit.js — Version 1.3

import { updateFinanceEntry } from "../../application/finance/finance.js";

function triggerHaptic() {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(10);
    }
}

function animateEntryListReflow(entryList, mutate, onDone = null) {
    if (!entryList) {
        mutate();
        onDone?.();
        return;
    }

    const rows = [...entryList.querySelectorAll(".swipe-delete-item")];
    const before = new Map(rows.map((row) => [row, row.getBoundingClientRect().top]));

    mutate();

    const after = new Map(rows.map((row) => [row, row.getBoundingClientRect().top]));

    rows.forEach((row) => {
        const previousTop = before.get(row);
        const nextTop = after.get(row);
        if (previousTop === undefined || nextTop === undefined) return;

        row.style.setProperty(
            "--context-reflow-y",
            (previousTop - nextTop) + "px"
        );
    });

    requestAnimationFrame(() => {
        rows.forEach((row) => {
            row.style.setProperty("--context-reflow-y", "0px");
        });
    });

    window.setTimeout(() => {
        rows.forEach((row) => {
            row.style.removeProperty("--context-reflow-y");
        });
        onDone?.();
    }, 250);
}

function createContextMenu(item, onEdit) {
    const entryList = item.closest(".finance-entry-list");
    const menu = document.createElement("div");
    menu.className = "assets-context-menu";
    menu.setAttribute("role", "menu");

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "assets-context-menu__item";
    editButton.textContent = "Редактировать";
    editButton.setAttribute("role", "menuitem");

    menu.appendChild(editButton);

    const cleanup = () => {
        if (!menu.isConnected) return;

        animateEntryListReflow(
            entryList,
            () => {
                menu.remove();
            },
            () => {
                item.classList.remove("is-editing-target");
                entryList?.classList.remove("is-context-editing");
            }
        );
    };

    editButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        cleanup();
        onEdit();
    });

    const insertMenu = () => {
        if (entryList) {
            entryList.insertBefore(menu, item.nextSibling);
            entryList.classList.add("is-context-editing");
        } else {
            document.body.appendChild(menu);
        }
    };

    animateEntryListReflow(entryList, insertMenu);

    requestAnimationFrame(() => {
        menu.classList.add("is-visible");
    });

    const close = (event) => {
        if (!menu.contains(event.target)) {
            cleanup();
            document.removeEventListener("pointerdown", close, true);
        }
    };

    window.setTimeout(() => {
        document.addEventListener("pointerdown", close, true);
    }, 0);

    return menu;
}

function openAssetEditModal(entry, onSaved) {
    const modal = document.createElement("div");
    modal.className = "assets-edit-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "assets-edit-title");

    const dialog = document.createElement("div");
    dialog.className = "assets-edit-modal__dialog";

    const title = document.createElement("h2");
    title.id = "assets-edit-title";
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
    labelInput.setAttribute("aria-label", "Название актива");

    const amountInput = document.createElement("input");
    amountInput.className = "input-control";
    amountInput.name = "amount";
    amountInput.type = "number";
    amountInput.inputMode = "decimal";
    amountInput.min = "0.01";
    amountInput.step = "0.01";
    amountInput.value = String(entry.amount);
    amountInput.required = true;
    amountInput.setAttribute("aria-label", "Сумма актива");

    const liquidityField = document.createElement("div");
    liquidityField.className = "assets-edit-modal__liquidity";

    const liquidityLabel = document.createElement("span");
    liquidityLabel.textContent = "Ликвидность";

    const liquidityState = document.createElement("span");
    liquidityState.className = "liquidity-switch-state";

    const liquiditySwitch = document.createElement("button");
    liquiditySwitch.type = "button";
    liquiditySwitch.className = "liquidity-switch";
    liquiditySwitch.setAttribute("role", "switch");

    let liquidity = entry.liquidity === "illiquid" ? "illiquid" : "liquid";

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
    form.append(labelInput, amountInput, liquidityField, error, actions);
    dialog.append(title, form);
    modal.appendChild(dialog);
    document.body.appendChild(modal);

    const close = () => {
        modal.classList.remove("is-visible");
        window.setTimeout(() => modal.remove(), 180);
    };

    cancelButton.addEventListener("click", close);

    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            close();
        }
    });

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        error.hidden = true;

        try {
            const updated = updateFinanceEntry(
                "assets",
                entry.id,
                labelInput.value,
                amountInput.value,
                liquidity
            );

            if (!updated) {
                throw new Error("Актив не найден.");
            }

            close();
            onSaved(updated);
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

function attachAssetEdit(item, entry, onWriteAttempt = null, onSaved = null) {
    if (!item || !entry) return;

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

    const openEdit = () => {
        const showEditor = () => {
            openAssetEditModal(entry, (updated) => {
                const label = item.querySelector(".finance-entry-label");
                const amount = item.querySelector(".finance-entry-amount");

                if (label) label.textContent = updated.label;
                if (amount) amount.textContent =
                    new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 })
                        .format(updated.amount);

                onSaved?.(updated);
            });
        };

        if (typeof onWriteAttempt === "function") {
            onWriteAttempt(showEditor);
            return;
        }

        showEditor();
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
            item.classList.remove("is-long-pressing");
            item.classList.add("is-editing-target");
            createContextMenu(item, openEdit);
        }, 500);
    });

    item.addEventListener("pointermove", (event) => {
        if (activePointerId !== event.pointerId) return;

        if (
            Math.abs(event.clientX - startX) > 10 ||
            Math.abs(event.clientY - startY) > 10
        ) {
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

    item.addEventListener("contextmenu", (event) => {
        event.preventDefault();
    });
}

export { attachAssetEdit };
