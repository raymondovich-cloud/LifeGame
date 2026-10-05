// subscription.limit.js — Version 1.0

function showSubscriptionLimitNotice() {
    const existing = document.querySelector(".subscription-limit-notice");
    if (existing) return true;

    const modal = document.createElement("div");
    modal.className = "subscription-limit-notice";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "subscription-limit-title");

    const dialog = document.createElement("div");
    dialog.className = "subscription-limit-notice__dialog";

    const eyebrow = document.createElement("span");
    eyebrow.className = "subscription-limit-notice__eyebrow";
    eyebrow.textContent = "PRO";

    const title = document.createElement("h2");
    title.id = "subscription-limit-title";
    title.className = "subscription-limit-notice__title";
    title.textContent = "Лимит функции";

    const message = document.createElement("p");
    message.className = "subscription-limit-notice__message";
    message.textContent = "Расширьте подписку до уровня pro пользователя";

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "subscription-limit-notice__button";
    closeButton.textContent = "Понятно";

    const close = () => {
        modal.classList.remove("is-visible");
        window.setTimeout(() => modal.remove(), 180);
    };

    closeButton.addEventListener("click", close);
    modal.addEventListener("click", (event) => {
        if (event.target === modal) close();
    });

    dialog.append(eyebrow, title, message, closeButton);
    modal.appendChild(dialog);
    document.body.appendChild(modal);

    requestAnimationFrame(() => modal.classList.add("is-visible"));
    return true;
}

export { showSubscriptionLimitNotice };
