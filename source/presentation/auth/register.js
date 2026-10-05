// LifeGame 3.0 — Registration Presentation
// Version: 1.4
// Responsibility: render the registration interaction and call Auth Controller.
//
// This layer does not know Supabase, PostgreSQL, sessions, JWTs,
// encryption, or persistence.

import { IDENTITY_ERROR_CODE } from '../../application/identity/identity.error.js';

export function renderRegistration(
    container,
    authController,
    onAuthenticated,
    onLogin
) {
    if (!container) {
        throw new Error("Registration container is required.");
    }

    if (!authController) {
        throw new Error("Auth controller is required.");
    }

    if (typeof onAuthenticated !== "function") {
        throw new Error("Registration authenticated action is required.");
    }

    if (typeof onLogin !== "function") {
        throw new Error("Registration login action is required.");
    }

    const wrapper = document.createElement("section");
    wrapper.className = "form";
    wrapper.setAttribute("aria-labelledby", "registration-title");

    const title = document.createElement("h1");
    title.id = "registration-title";
    title.textContent = "Create account";

    const description = document.createElement("p");
    description.textContent =
        "Create your LifeGame account to protect and synchronize your private data.";

    const form = document.createElement("form");
    form.className = "form";

    const displayNameField = document.createElement("div");
    displayNameField.className = "form-field";

    const displayNameLabel = document.createElement("label");
    displayNameLabel.className = "form-label";
    displayNameLabel.htmlFor = "registration-display-name";
    displayNameLabel.textContent = "Как к вам обращаться?";

    const displayNameInput = document.createElement("input");
    displayNameInput.className = "input-control";
    displayNameInput.id = "registration-display-name";
    displayNameInput.name = "displayName";
    displayNameInput.type = "text";
    displayNameInput.autocomplete = "name";
    displayNameInput.required = true;

    displayNameField.append(displayNameLabel, displayNameInput);

    const birthDateField = document.createElement("div");
    birthDateField.className = "form-field";

    const birthDateLabel = document.createElement("label");
    birthDateLabel.className = "form-label";
    birthDateLabel.htmlFor = "registration-birth-date";
    birthDateLabel.textContent = "Дата рождения";

    const birthDateInput = document.createElement("input");
    birthDateInput.className = "input-control";
    birthDateInput.id = "registration-birth-date";
    birthDateInput.name = "birthDate";
    birthDateInput.type = "date";
    birthDateInput.autocomplete = "bday";
    birthDateInput.required = true;

    const today = new Date();
    birthDateInput.max =
        today.getFullYear() +
        "-" +
        String(today.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(today.getDate()).padStart(2, "0");

    birthDateField.append(birthDateLabel, birthDateInput);

    const emailField = document.createElement("div");
    emailField.className = "form-field";

    const emailLabel = document.createElement("label");
    emailLabel.className = "form-label";
    emailLabel.htmlFor = "registration-email";
    emailLabel.textContent = "Email";

    const emailInput = document.createElement("input");
    emailInput.className = "input-control";
    emailInput.id = "registration-email";
    emailInput.name = "email";
    emailInput.type = "email";
    emailInput.autocomplete = "email";
    emailInput.required = true;

    emailField.append(emailLabel, emailInput);

    const passwordField = document.createElement("div");
    passwordField.className = "form-field";

    const passwordLabel = document.createElement("label");
    passwordLabel.className = "form-label";
    passwordLabel.htmlFor = "registration-password";
    passwordLabel.textContent = "Password";

    const passwordInput = document.createElement("input");
    passwordInput.className = "input-control";
    passwordInput.id = "registration-password";
    passwordInput.name = "password";
    passwordInput.type = "password";
    passwordInput.autocomplete = "new-password";
    passwordInput.required = true;

    passwordField.append(passwordLabel, passwordInput);

    const submit = document.createElement("button");
    submit.className = "button-control button-control--accent";
    submit.type = "submit";
    submit.textContent = "Create account";

    const status = document.createElement("p");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");

    const resendButton = document.createElement("button");
    resendButton.className = "button-control";
    resendButton.type = "button";
    resendButton.textContent = "Resend verification email";
    resendButton.hidden = true;

    resendButton.addEventListener("click", async () => {
        resendButton.disabled = true;
        status.textContent = "Sending verification email…";

        try {
            await authController.resendVerification({
                email: emailInput.value
            });

            status.textContent =
                "Verification email sent. Check your inbox.";
        } catch (error) {
            status.textContent =
                error?.message || "Verification email could not be sent.";
        } finally {
            resendButton.disabled = false;
        }
    });

    const loginButton = document.createElement("button");
    loginButton.className = "button-control";
    loginButton.type = "button";
    loginButton.textContent = "Log in";
    loginButton.addEventListener("click", onLogin);

    form.append(
        displayNameField,
        birthDateField,
        emailField,
        passwordField,
        submit,
        status,
        resendButton
    );
    wrapper.append(title, description, form, loginButton);
    container.append(wrapper);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        submit.disabled = true;
        resendButton.hidden = true;
        status.textContent = "Creating account…";

        try {
            const result = await authController.register({
                displayName: displayNameInput.value,
                birthDate: birthDateInput.value,
                email: emailInput.value,
                password: passwordInput.value
            });

            if (result.status === "PENDING_EMAIL_VERIFICATION") {
                status.textContent =
                    "Account created. Check your email to verify your address.";
                resendButton.hidden = false;
            } else {
                status.textContent = "Account created successfully.";
                form.reset();
                onAuthenticated();
            }
        } catch (error) {
            if (error?.code === IDENTITY_ERROR_CODE.RATE_LIMITED) {
                status.textContent =
                    "Email service rate limit reached. Wait before requesting another message.";
                resendButton.hidden = true;
            } else {
                status.textContent =
                    error?.message || "Registration could not be completed.";
            }
        } finally {
            submit.disabled = false;
        }
    });
}
