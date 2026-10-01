// LifeGame 3.0 — Identity Application Port
// Version: 1.0
// Responsibility: provider-independent authentication contract.
//
// Infrastructure implements this port.
// Application and Domain must not know the concrete provider.

export const IdentityPort = Object.freeze({
    register: 'register',
    login: 'login',
    logout: 'logout',
    getCurrentSession: 'getCurrentSession',
    requestPasswordReset: 'requestPasswordReset',
    updatePassword: 'updatePassword',
    resendVerification: 'resendVerification'
});
