// LifeGame 3.0 — Auth Presentation Boundary
// Version: 1.0
// Responsibility: expose authentication actions to a future UI.
//
// No Supabase calls, database access, token handling, or cryptography.

export function createAuthController(identityApplication) {
    if (!identityApplication) {
        throw new Error('Identity application is required.');
    }

    return Object.freeze({
        register(input) {
            return identityApplication.register(input);
        },

        login(input) {
            return identityApplication.login(input);
        },

        logout() {
            return identityApplication.logout();
        },

        getCurrentSession() {
            return identityApplication.getCurrentSession();
        },

        requestPasswordReset(input) {
            return identityApplication.requestPasswordReset(input);
        },

        updatePassword(input) {
            return identityApplication.updatePassword(input);
        },

        resendVerification(input) {
            return identityApplication.resendVerification(input);
        }
    });
}
