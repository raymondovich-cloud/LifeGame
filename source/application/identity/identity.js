// LifeGame 3.0 — Identity Application Service
// Version: 1.2
// Responsibility: expose Identity use cases through injected ports.

import { createRegistrationUseCase } from './registration.js';
import { createLoginUseCase } from './login.js';

export function createIdentityApplication(identityPort) {
    if (!identityPort) {
        throw new Error('Identity port is required.');
    }

    const register = createRegistrationUseCase(identityPort);
    const login = createLoginUseCase(identityPort);

    return Object.freeze({
        async register(input) {
            return register.execute(input);
        },

        async login(input) {
            return login.execute(input);
        },

        async logout() {
            return identityPort.logout();
        },

        async getCurrentSession() {
            return identityPort.getCurrentSession();
        },

        async requestPasswordReset(input) {
            return identityPort.requestPasswordReset(input);
        },

        async updatePassword(input) {
            return identityPort.updatePassword(input);
        },

        async resendVerification(input) {
            return identityPort.resendVerification(input);
        }
    });
}
