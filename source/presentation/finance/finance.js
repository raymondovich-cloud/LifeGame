// source/presentation/finance/finance.js — Version 1.0

const FINANCE_SUBBLOCKS = Object.freeze([
    {
        id: "liquid-funds",
        number: "01",
        title: "Ликвидные средства",
        description: "Деньги, которыми пользователь может распоряжаться сейчас."
    },
    {
        id: "actual-earnings",
        number: "02",
        title: "Фактически заработанно",
        description: "Фактически полученный доход за выбранный период."
    },
    {
        id: "financial-burden",
        number: "03",
        title: "Финансовая нагрузка",
        description: "Обязательства и финансовые нагрузки, влияющие на устойчивость."
    },
    {
        id: "mandatory-expenses",
        number: "04",
        title: "Обязательные траты",
        description: "Регулярные расходы, которые необходимо учитывать в первую очередь."
    },
    {
        id: "financial-cushion",
        number: "05",
        title: "Финансовая подушка",
        description: "Резерв, предназначенный для защиты финансовой устойчивости."
    }
]);

function createSubblock(subblock) {
    const wrapper = document.createElement("article");
    wrapper.className = "accordion-item finance-subblock";
    wrapper.dataset.subblock = subblock.id;

    const button = document.createElement("button");
    button.className = "accordion-trigger";
    button.type = "button";
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", subblock.id + "-content");

    button.innerHTML =
        '<span class="accordion-index">' + subblock.number + "</span>" +
        '<span class="accordion-title-group">' +
            '<span class="accordion-title">' + subblock.title + "</span>" +
            '<span class="accordion-description">' + subblock.description + "</span>" +
        "</span>" +
        '<span class="accordion-icon" aria-hidden="true">+</span>';

    const content = document.createElement("div");
    content.className = "accordion-content";
    content.id = subblock.id + "-content";
    content.hidden = true;

    const emptyState = document.createElement("div");
    emptyState.className = "list-empty";
    emptyState.innerHTML =
        '<span class="list-empty-label">ДАННЫЕ</span>' +
        "<p>Записей пока нет.</p>";

    content.appendChild(emptyState);
    wrapper.append(button, content);

    button.addEventListener("click", () => {
        const isOpen = button.getAttribute("aria-expanded") === "true";
        button.setAttribute("aria-expanded", String(!isOpen));
        content.hidden = isOpen;
        wrapper.classList.toggle("is-open", !isOpen);
        button.querySelector(".accordion-icon").textContent = isOpen ? "+" : "−";
    });

    return wrapper;
}

function attachSwipeDelete(root) {
    const items = [...root.querySelectorAll(".swipe-delete-item")];

    items.forEach((item) => {
        let startX = 0;
        let currentX = 0;
        let tracking = false;

        item.addEventListener("pointerdown", (event) => {
            startX = event.clientX;
            currentX = startX;
            tracking = true;
            item.classList.add("is-swiping");
            item.setPointerCapture?.(event.pointerId);
        });

        item.addEventListener("pointermove", (event) => {
            if (!tracking) return;
            currentX = event.clientX;

            const distance = Math.min(0, currentX - startX);
            item.style.setProperty("--swipe-offset", Math.max(distance, -96) + "px");
        });

        const finishSwipe = () => {
            if (!tracking) return;
            tracking = false;

            const distance = currentX - startX;
            item.classList.remove("is-swiping");

            if (distance <= -72) {
                item.classList.add("is-delete-ready");
                item.style.setProperty("--swipe-offset", "-96px");
            } else {
                item.style.setProperty("--swipe-offset", "0px");
                item.classList.remove("is-delete-ready");
            }
        };

        item.addEventListener("pointerup", finishSwipe);
        item.addEventListener("pointercancel", finishSwipe);
    });
}

function renderFinance(root) {
    if (!root) {
        throw new Error("LifeGame Finance: presentation root was not found.");
    }

    root.replaceChildren();

    const section = document.createElement("section");
    section.className = "module-subblocks";
    section.setAttribute("aria-label", "Finance subblocks");

    const heading = document.createElement("div");
    heading.className = "module-subblocks-header";
    heading.innerHTML =
        '<span class="module-subblocks-label">FINANCE SYSTEM</span>' +
        "<p>Финансовая система разделена на независимые блоки.</p>";

    const list = document.createElement("div");
    list.className = "accordion-list";

    FINANCE_SUBBLOCKS.forEach((subblock, index) => {
        const item = createSubblock(subblock);
        list.appendChild(item);

        if (index === 0) {
            const button = item.querySelector(".accordion-trigger");
            const content = item.querySelector(".accordion-content");
            button.setAttribute("aria-expanded", "true");
            content.hidden = false;
            item.classList.add("is-open");
            button.querySelector(".accordion-icon").textContent = "−";
        }
    });

    section.append(heading, list);
    root.appendChild(section);
    attachSwipeDelete(root);
}

export { renderFinance, attachSwipeDelete };
