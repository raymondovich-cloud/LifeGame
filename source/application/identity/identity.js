// LifeGame 3.0 — Identity Application Service
// Version: 1.0
// Responsibility: orchestrate Identity use cases through an injected port.

export function createIdentityApplication(identityPort) {
    if (!identityPort) {
        throw new Error('Identity port is required.');
    }

    return Object.freeze({
        async register(input) {
            return identityPort.register(input);
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
