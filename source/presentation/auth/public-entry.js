// LifeGame 3.0 — Public Entry Presentation
// Version: 1.0
// Responsibility: render the public three-module entry point and registration gate.
//
// This layer does not know Supabase, PostgreSQL, sessions, JWTs,
// encryption, or persistence.

const MODULES = Object.freeze([
    Object.freeze({ id: "finance", number: "01", name: "Finance", localName: "Финансы" }),
    Object.freeze({ id: "health", number: "02", name: "Health", localName: "Здоровье" }),
    Object.freeze({ id: "development", number: "03", name: "Development", localName: "Развитие" })
]);

export function renderPublicEntry(container, onModuleAttempt) {
    if (!container) {
        throw new Error("Public entry container is required.");
    }

    if (typeof onModuleAttempt !== "function") {
        throw new Error("Public module action is required.");
    }

    const wrapper = document.createElement("section");
    wrapper.className = "public-entry";
    wrapper.setAttribute("aria-labelledby", "public-entry-title");

    const title = document.createElement("h1");
    title.id = "public-entry-title";
    title.className = "public-entry-title";
    title.textContent = "LIFE GAME";

    const description = document.createElement("p");
    description.className = "public-entry-description";
    description.textContent = "Your private system for managing the essential parts of life.";

    const modules = document.createElement("div");
    modules.className = "public-modules";

    MODULES.forEach((module) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "public-module card";
        button.dataset.module = module.id;
        button.setAttribute(
            "aria-label",
            module.localName + ". Registration required to make changes."
        );

        const number = document.createElement("span");
        number.className = "public-module-number";
        number.textContent = module.number;

        const name = document.createElement("span");
        name.className = "public-module-name";
        name.textContent = module.localName;

        const access = document.createElement("span");
        access.className = "public-module-access";
        access.textContent = "Registration required";

        button.append(number, name, access);
        button.addEventListener("click", () => onModuleAttempt(module.id));
        modules.append(button);
    });

    wrapper.append(title, description, modules);
    container.replaceChildren(wrapper);
}
