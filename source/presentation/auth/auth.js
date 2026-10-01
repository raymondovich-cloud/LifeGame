// LifeGame 3.0 — Authentication Entry Presentation
// Version: 1.0
// Responsibility: render the unauthenticated entry point for Identity.
//
// This layer does not know Supabase, PostgreSQL, sessions, JWTs,
// encryption, or persistence.

export function renderAuthEntry(container, onRegister) {
    if (!container) {
        throw new Error("Authentication container is required.");
    }

    if (typeof onRegister !== "function") {
        throw new Error("Registration action is required.");
    }

    const wrapper = document.createElement("section");
    wrapper.className = "form";
    wrapper.setAttribute("aria-labelledby", "auth-title");

    const title = document.createElement("h1");
    title.id = "auth-title";
    title.textContent = "LIFE GAME";

    const description = document.createElement("p");
    description.textContent =
        "A private system for managing the essential parts of your life.";

    const registerButton = document.createElement("button");
    registerButton.className = "button-control button-control--accent";
    registerButton.type = "button";
    registerButton.textContent = "Create account";

    registerButton.addEventListener("click", onRegister);

    wrapper.append(title, description, registerButton);
    container.append(wrapper);
}
