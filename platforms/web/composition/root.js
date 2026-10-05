// LifeGame 3.0 — Web Composition Root
// Version: 1.3
// Responsibility: compose concrete Infrastructure with Application and Presentation.

import { createIdentityApplication } from "../../../source/application/identity/identity.js";
import { createSupabaseIdentityAdapter } from "../../../source/infrastructure/identity/supabase.identity.adapter.js";
import { createLifeGameSupabaseClient } from "../../../source/infrastructure/supabase/supabase.client.js";
import { createAuthController } from "../../../source/presentation/auth/auth.controller.js";
import { createUserContext } from "../../../source/application/user/user.context.js";
import { createFinanceMemory } from "../../../source/memory/finance/finance.memory.js";
import { createFinanceMemoryPort } from "../../../source/application/finance/finance.memory.port.js";

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

    function createFinanceMemoryForUser(userId) {
        const userContext = createUserContext(userId);
        const memory = createFinanceMemory(userContext);
        return createFinanceMemoryPort(memory);
    }

    return Object.freeze({
        auth: authController,
        finance: Object.freeze({
            createMemoryForUser: createFinanceMemoryForUser
        })
    });
}
