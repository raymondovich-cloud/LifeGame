// LifeGame 3.0 — Identity Login Use Case
// Version: 1.0
// Responsibility: validate login input and execute authentication through IdentityPort.

export function validateLoginInput(input) {
    if (!input || typeof input !== 'object') {
        throw new Error('Login input is required.');
    }

    if (typeof input.email !== 'string' || input.email.trim().length === 0) {
        throw new Error('Login email is required.');
    }

    if (typeof input.password !== 'string' || input.password.length === 0) {
        throw new Error('Login password is required.');
    }

    return Object.freeze({
        email: input.email.trim(),
        password: input.password
    });
}

export function createLoginUseCase(identityPort) {
    if (!identityPort) {
        throw new Error('Identity port is required.');
    }

    return Object.freeze({
        async execute(input) {
            return identityPort.login(validateLoginInput(input));
        }
    });
}
