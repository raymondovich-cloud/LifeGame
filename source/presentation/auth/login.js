// LifeGame 3.0 — Login Presentation
// Version: 1.0
// Responsibility: render the Login interaction through Auth Controller.
//
// This layer does not know Supabase, PostgreSQL, sessions, JWTs,
// encryption, or persistence.

export function renderLogin(container, authController, onBack, onAuthenticated) {
    if (!container) {
        throw new Error('Login container is required.');
    }

    if (!authController) {
        throw new Error('Auth controller is required.');
    }

    if (typeof onBack !== 'function') {
        throw new Error('Login back action is required.');
    }

    if (typeof onAuthenticated !== 'function') {
        throw new Error('Login authenticated action is required.');
    }

    const wrapper = document.createElement('section');
    wrapper.className = 'form';
    wrapper.setAttribute('aria-labelledby', 'login-title');

    const backButton = document.createElement('button');
    backButton.className = 'button-control';
    backButton.type = 'button';
    backButton.textContent = 'Back';
    backButton.addEventListener('click', onBack);

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

    form.append(emailField, passwordField, submit, status);
    wrapper.append(backButton, title, form);
    container.append(wrapper);

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        submit.disabled = true;
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
            status.textContent =
                error?.message || 'Login could not be completed.';
        } finally {
            submit.disabled = false;
        }
    });
}
