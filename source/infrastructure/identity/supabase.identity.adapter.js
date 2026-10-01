// LifeGame 3.0 — Supabase Identity Adapter
// Version: 1.0
// Responsibility: translate Supabase Auth operations into IdentityPort.
//
// This file is the ONLY Identity infrastructure boundary that may know
// about the Supabase Auth client. Domain code must never import it.
//
// Registration is intentionally not wired to the UI yet.

export function createSupabaseIdentityAdapter(supabaseAuthClient) {
    if (!supabaseAuthClient) {
        throw new Error('Supabase Auth client is required.');
    }

    return Object.freeze({
        async register({ email, password }) {
            return supabaseAuthClient.signUp({
                email,
                password
            });
        },

        async login({ email, password }) {
            return supabaseAuthClient.signInWithPassword({
                email,
                password
            });
        },

        async logout() {
            return supabaseAuthClient.signOut();
        },

        async getCurrentSession() {
            return supabaseAuthClient.getSession();
        },

        async requestPasswordReset({ email, redirectTo }) {
            return supabaseAuthClient.resetPasswordForEmail(email, {
                redirectTo
            });
        },

        async updatePassword({ password }) {
            return supabaseAuthClient.updateUser({ password });
        },

        async resendVerification({ email }) {
            return supabaseAuthClient.resend({
                type: 'signup',
                email
            });
        }
    });
}
