// LifeGame 3.0 — Web Composition Root
// Version: 1.0
// Responsibility: compose concrete Infrastructure with Application and Presentation.
//
// This is the only Web entry point that knows which concrete provider is used.
// UI modules must receive already-composed capabilities instead of constructing
// Supabase clients themselves.

import { createIdentityApplication } from "../../../source/application/identity/identity.js";
import { createSupabaseIdentityAdapter } from "../../../source/infrastructure/identity/supabase.identity.adapter.js";
import { createLifeGameSupabaseClient } from "../../../source/infrastructure/supabase/supabase.client.js";
import { createAuthController } from "../../../source/presentation/auth/auth.controller.js";

export function createWebApplication() {
    const supabaseClient = createLifeGameSupabaseClient();
    const identityPort = createSupabaseIdentityAdapter(supabaseClient);
    const identityApplication = createIdentityApplication(identityPort);
    const authController = createAuthController(identityApplication);

    return Object.freeze({
        auth: authController
    });
}
