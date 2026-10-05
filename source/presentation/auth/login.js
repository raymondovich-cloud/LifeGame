// LifeGame 3.0 — Login Presentation
// Version: 1.2
// Responsibility: render the Login interaction through Auth Controller.
//
// This layer does not know Supabase, PostgreSQL, sessions, JWTs,
// encryption, or persistence.

import { IDENTITY_ERROR_CODE } from '../../application/identity/identity.error.js';

export function renderLogin(
    container,
    authController,
    onCreateAccount,
    onAuthenticated
) {
    if (!container) {
        throw new Error('Login container is required.');
    }

    if (!authController) {
        throw new Error('Auth controller is required.');
    }

    if (typeof onCreateAccount !== 'function') {
        throw new Error('Login registration action is required.');
    }

    if (typeof onAuthenticated !== 'function') {
        throw new Error('Login authenticated action is required.');
    }

    const wrapper = document.createElement('section');
    wrapper.className = 'form';
    wrapper.setAttribute('aria-labelledby', 'login-title');

    const title = document.createElement('h1');
    title.id = 'login-title';
    title.textContent = 'Log in';

    const form = document.createElement('form');
    form.className = 'form';

    const emailField = document.createElement('div');
    emailField.className = 'form-field';

    const emailLabel = document.createElement('label');
    emailLabel.className = 'form-label';
    emailLabel.htmlFor = 'login-email';
    emailLabel.textContent = 'Email';

    const emailInput = document.createElement('input');
    emailInput.className = 'input-control';
    emailInput.id = 'login-email';
    emailInput.name = 'email';
    emailInput.type = 'email';
    emailInput.autocomplete = 'email';
    emailInput.required = true;

    emailField.append(emailLabel, emailInput);

    const passwordField = document.createElement('div');
    passwordField.className = 'form-field';

    const passwordLabel = document.createElement('label');
    passwordLabel.className = 'form-label';
    passwordLabel.htmlFor = 'login-password';
    passwordLabel.textContent = 'Password';

    const passwordInput = document.createElement('input');
    passwordInput.className = 'input-control';
    passwordInput.id = 'login-password';
    passwordInput.name = 'password';
    passwordInput.type = 'password';
    passwordInput.autocomplete = 'current-password';
    passwordInput.required = true;

    passwordField.append(passwordLabel, passwordInput);

    const submit = document.createElement('button');
    submit.className = 'button-control button-control--accent';
    submit.type = 'submit';
    submit.textContent = 'Log in';

    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');

    const resendButton = document.createElement('button');
    resendButton.className = 'button-control';
    resendButton.type = 'button';
    resendButton.textContent = 'Resend verification email';
    resendButton.hidden = true;

    resendButton.addEventListener('click', async () => {
        resendButton.disabled = true;
        status.textContent = 'Sending verification email…';

        try {
            await authController.resendVerification({
                email: emailInput.value
            });

            status.textContent =
                'Verification email sent. Check your inbox.';
        } catch (error) {
            status.textContent =
                error?.message || 'Verification email could not be sent.';
        } finally {
            resendButton.disabled = false;
        }
    });

    const registrationPrompt = document.createElement('div');
    registrationPrompt.className = 'auth-secondary-action';

    const registrationText = document.createElement('span');
    registrationText.className = 'auth-secondary-action__text';
    registrationText.textContent = "Don't have an account?";

    const registrationButton = document.createElement('button');
    registrationButton.className = 'button-control';
    registrationButton.type = 'button';
    registrationButton.textContent = 'Create account';
    registrationButton.addEventListener('click', onCreateAccount);

    registrationPrompt.append(registrationText, registrationButton);

    form.append(
        emailField,
        passwordField,
        submit,
        status,
        resendButton
    );
    wrapper.append(title, form, registrationPrompt);
    container.append(wrapper);

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        submit.disabled = true;
        resendButton.hidden = true;
        status.textContent = 'Signing in…';

        try {
            const result = await authController.login({
                email: emailInput.value,
                password: passwordInput.value
            });

            if (!result?.authenticated) {
                throw new Error('Login could not be completed.');
            }

            form.reset();
            onAuthenticated();
        } catch (error) {
            if (error?.code === IDENTITY_ERROR_CODE.EMAIL_NOT_CONFIRMED) {
                status.textContent =
                    'Email address is not confirmed. Check your inbox or resend the verification email.';
                resendButton.hidden = false;
            } else if (error?.code === IDENTITY_ERROR_CODE.RATE_LIMITED) {
                status.textContent =
                    'Too many requests. Wait before trying again.';
            } else {
                status.textContent =
                    error?.message || 'Login could not be completed.';
            }
        } finally {
            submit.disabled = false;
        }
    });
}
