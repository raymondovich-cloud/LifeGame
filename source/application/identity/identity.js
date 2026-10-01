// LifeGame 3.0 — Identity Application Service
// Version: 1.1
// Responsibility: expose Identity use cases through injected ports.

import { createRegistrationUseCase } from './registration.js';

export function createIdentityApplication(identityPort) {
    if (!identityPort) {
        throw new Error('Identity port is required.');
    }

    const register = createRegistrationUseCase(identityPort);

    return Object.freeze({
        async register(input) {
            return register.execute(input);
        },

        async login(input) {
            return identityPort.login(input);
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
