// LifeGame 3.0 — Web Composition Root
// Version: 1.2
// Responsibility: compose concrete Infrastructure with Application and Presentation.
//
// This is the only Web entry point that knows which concrete provider is used.
// The authentication redirect is selected here because it is a platform concern.

import { createIdentityApplication } from "../../../source/application/identity/identity.js";
import { createSupabaseIdentityAdapter } from "../../../source/infrastructure/identity/supabase.identity.adapter.js";
import { createLifeGameSupabaseClient } from "../../../source/infrastructure/supabase/supabase.client.js";
import { createAuthController } from "../../../source/presentation/auth/auth.controller.js";

function getAuthenticationRedirectUrl() {
    const { origin, pathname } = window.location;

    return origin + pathname;
}

export function createWebApplication() {
    const supabaseClient = createLifeGameSupabaseClient();
    const identityPort = createSupabaseIdentityAdapter(
        supabaseClient.auth,
        {
            emailRedirectTo: getAuthenticationRedirectUrl()
        }
    );
    const identityApplication = createIdentityApplication(identityPort);
    const authController = createAuthController(identityApplication);

    return Object.freeze({
        auth: authController
    });
}
