// entry.edit.js — Version 3.0

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

function createRowInteractionMenu(item, onEdit, onInfo, onPin, onDelete, onPinLimit) {
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

    const infoButton = document.createElement("button");
    infoButton.type = "button";
    infoButton.className = "row-interaction-menu__item";
    infoButton.textContent = "Информация";
    infoButton.setAttribute("role", "menuitem");

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

    menu.append(editButton, infoButton, pinButton, deleteButton);
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

    infoButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        cleanup();
        onInfo?.();
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

function formatEntryDate(timestamp) {
    const date = new Date(Number(timestamp));
    if (!Number.isFinite(date.getTime())) return "Неизвестно";

    return new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }).format(date);
}

function openEntryInfoModal(entry) {
    const modal = document.createElement("div");
    modal.className = "assets-edit-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "entry-info-title");

    const dialog = document.createElement("div");
    dialog.className = "assets-edit-modal__dialog row-info-modal";

    const title = document.createElement("h2");
    title.id = "entry-info-title";
    title.className = "assets-edit-modal__title";
    title.textContent = "Информация";

    const content = document.createElement("div");
    content.className = "row-info-modal__content";

    const createField = (label, value) => {
        const field = document.createElement("div");
        field.className = "row-info-modal__field";

        const fieldLabel = document.createElement("span");
        fieldLabel.className = "row-info-modal__label";
        fieldLabel.textContent = label;

        const fieldValue = document.createElement("span");
        fieldValue.className = "row-info-modal__value";
        fieldValue.textContent = value;

        field.append(fieldLabel, fieldValue);
        return field;
    };

    content.append(
        createField("Добавлено:", formatEntryDate(entry.createdAt)),
        createField("Пользователь:", entry.creatorName || "Пользователь")
    );

    const actions = document.createElement("div");
    actions.className = "assets-edit-modal__actions";

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "button-control";
    closeButton.textContent = "Закрыть";
    actions.appendChild(closeButton);

    dialog.append(title, content, actions);
    modal.appendChild(dialog);
    document.body.appendChild(modal);

    const close = () => {
        modal.classList.remove("is-visible");
        window.setTimeout(() => modal.remove(), 180);
    };

    closeButton.addEventListener("click", close);
    modal.addEventListener("click", (event) => {
        if (event.target === modal) close();
    });

    requestAnimationFrame(() => modal.classList.add("is-visible"));
}

function openEntryEditModal(subblockId, entry, onSaved, financeApplication) {
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
    const interestRateInput = subblockId === "financial-burden" ? document.createElement("input") : null;
    const creditProductField = subblockId === "financial-burden" ? document.createElement("div") : null;
    let isCreditProduct = subblockId === "financial-burden" ? Boolean(entry.isCreditProduct) : false;

    if (paymentInput) {
        paymentInput.className = "input-control";
        paymentInput.name = "payment";
        paymentInput.type = "number";
        paymentInput.inputMode = "decimal";
        paymentInput.min = "0";
        paymentInput.step = "0.01";
        paymentInput.value = String(entry.payment ?? 0);
        paymentInput.required = isCreditProduct;
        paymentInput.setAttribute("aria-label", "Регулярный платёж");
    }

    if (interestRateInput) {
        interestRateInput.className = "input-control";
        interestRateInput.name = "interestRate";
        interestRateInput.type = "number";
        interestRateInput.inputMode = "decimal";
        interestRateInput.min = "0";
        interestRateInput.step = "0.01";
        interestRateInput.value = entry.interestRate === null || entry.interestRate === undefined ? "" : String(entry.interestRate);
        interestRateInput.required = isCreditProduct;
        interestRateInput.setAttribute("aria-label", "Процентная ставка, % годовых");
    }

    if (creditProductField) {
        creditProductField.className = "liquidity-switch-field";

        const creditLabel = document.createElement("span");
        creditLabel.className = "liquidity-switch-label";
        creditLabel.textContent = "Кредитный продукт";

        const creditState = document.createElement("span");
        creditState.className = "liquidity-switch-state";

        const creditSwitch = document.createElement("button");
        creditSwitch.type = "button";
        creditSwitch.className = "liquidity-switch";
        creditSwitch.setAttribute("role", "switch");

        const updateCreditProduct = () => {
            creditSwitch.setAttribute("aria-checked", String(isCreditProduct));
            creditSwitch.classList.toggle("is-on", isCreditProduct);
            creditState.textContent = isCreditProduct ? "Включён" : "Выключен";
            paymentInput.hidden = !isCreditProduct;
            interestRateInput.hidden = !isCreditProduct;
            paymentInput.required = isCreditProduct;
            interestRateInput.required = isCreditProduct;
        };

        creditSwitch.addEventListener("click", () => {
            isCreditProduct = !isCreditProduct;
            updateCreditProduct();
        });

        creditProductField.append(creditLabel, creditState, creditSwitch);
        updateCreditProduct();
    }

    const liquidityField = subblockId === "assets" ? document.createElement("div") : null;
    let liquidity = entry.liquidity === "illiquid" ? "illiquid" : "liquid";

    let assetType = entry.assetType || "cash";
    let isReserve = Boolean(entry.isReserve);
    let incomeEnabled = Boolean(entry.incomeEnabled);
    let annualYieldRateInput = null;
    let compoundingSelect = null;
    let reserveField = null;
    let incomeField = null;
    let assetTypeSelect = null;

    if (subblockId === "assets") {
        assetTypeSelect = document.createElement("select");
        assetTypeSelect.className = "input-control";
        [
            ["cash", "Денежные средства"],
            ["bank-account", "Банковский счёт"],
            ["real-estate", "Недвижимость"],
            ["vehicle", "Транспорт"],
            ["bank-deposit", "Банковский вклад"],
            ["bond", "Облигации"],
            ["investment", "Инвестиции"],
            ["other", "Другое"]
        ].forEach(([value, label]) => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = label;
            if (value === assetType) option.selected = true;
            assetTypeSelect.appendChild(option);
        });
        assetTypeSelect.addEventListener("change", () => {
            assetType = assetTypeSelect.value;
        });

        reserveField = document.createElement("div");
        reserveField.className = "liquidity-switch-field";
        const reserveLabel = document.createElement("span");
        reserveLabel.className = "liquidity-switch-label";
        reserveLabel.textContent = "Финансовый резерв";
        const reserveState = document.createElement("span");
        reserveState.className = "liquidity-switch-state";
        const reserveToggle = document.createElement("button");
        reserveToggle.type = "button";
        reserveToggle.className = "liquidity-switch";
        reserveToggle.setAttribute("role", "switch");
        const updateReserve = () => {
            reserveToggle.setAttribute("aria-checked", String(isReserve));
            reserveToggle.classList.toggle("is-on", isReserve);
            reserveState.textContent = isReserve ? "Да" : "Нет";
        };
        reserveToggle.addEventListener("click", () => {
            isReserve = !isReserve;
            updateReserve();
        });
        reserveField.append(reserveLabel, reserveState, reserveToggle);
        updateReserve();

        incomeField = document.createElement("div");
        incomeField.className = "liquidity-switch-field";
        const incomeLabel = document.createElement("span");
        incomeLabel.className = "liquidity-switch-label";
        incomeLabel.textContent = "Доходный актив";
        const incomeState = document.createElement("span");
        incomeState.className = "liquidity-switch-state";
        const incomeToggle = document.createElement("button");
        incomeToggle.type = "button";
        incomeToggle.className = "liquidity-switch";
        incomeToggle.setAttribute("role", "switch");

        annualYieldRateInput = document.createElement("input");
        annualYieldRateInput.className = "input-control";
        annualYieldRateInput.name = "annualYieldRate";
        annualYieldRateInput.type = "number";
        annualYieldRateInput.inputMode = "decimal";
        annualYieldRateInput.min = "0";
        annualYieldRateInput.step = "0.01";
        annualYieldRateInput.value = entry.annualYieldRate ?? "";
        annualYieldRateInput.placeholder = "Доходность, % годовых";

        compoundingSelect = document.createElement("select");
        compoundingSelect.className = "input-control";
        [
            ["none", "Без капитализации"],
            ["monthly", "Капитализация ежемесячно"],
            ["quarterly", "Капитализация ежеквартально"],
            ["annual", "Капитализация ежегодно"]
        ].forEach(([value, label]) => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = label;
            if (value === (entry.compoundingFrequency || "none")) option.selected = true;
            compoundingSelect.appendChild(option);
        });

        const updateIncome = () => {
            incomeToggle.setAttribute("aria-checked", String(incomeEnabled));
            incomeToggle.classList.toggle("is-on", incomeEnabled);
            incomeState.textContent = incomeEnabled ? "Включён" : "Выключен";
            annualYieldRateInput.hidden = !incomeEnabled;
            compoundingSelect.hidden = !incomeEnabled;
            annualYieldRateInput.required = incomeEnabled;
        };
        incomeToggle.addEventListener("click", () => {
            incomeEnabled = !incomeEnabled;
            updateIncome();
        });
        incomeField.append(incomeLabel, incomeState, incomeToggle);
        updateIncome();
    }

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
    if (assetTypeSelect) form.appendChild(assetTypeSelect);
    if (liquidityField) form.appendChild(liquidityField);
    if (reserveField) form.appendChild(reserveField);
    if (incomeField) form.appendChild(incomeField);
    if (annualYieldRateInput) form.appendChild(annualYieldRateInput);
    if (compoundingSelect) form.appendChild(compoundingSelect);
    if (creditProductField) form.appendChild(creditProductField);
    if (paymentInput) form.appendChild(paymentInput);
    if (interestRateInput) form.appendChild(interestRateInput);
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
            const updated = await financeApplication.updateFinanceEntry(
                subblockId,
                entry.id,
                labelInput.value,
                amountInput.value,
                liquidity,
                paymentInput?.value ?? null,
                isCreditProduct,
                interestRateInput?.value ?? null,
                subblockId === "assets"
                    ? {
                        assetType,
                        isReserve,
                        incomeEnabled,
                        annualYieldRate: incomeEnabled ? annualYieldRateInput.value : null,
                        compoundingFrequency: incomeEnabled ? compoundingSelect.value : "none"
                    }
                    : null
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

function attachEntryEdit(item, subblockId, entry, onWriteAttempt = null, financeApplication = null, onSaved = null, onPin = null, onDelete = null, onPinLimit = null) {
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
        const open = () => openEntryEditModal(subblockId, entry, onSaved, financeApplication);
        typeof onWriteAttempt === "function" ? onWriteAttempt(open) : open();
    };

    const showInfo = () => {
        openEntryInfoModal(entry);
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
            createRowInteractionMenu(item, showEditor, showInfo, onPin, onDelete, onPinLimit);
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
