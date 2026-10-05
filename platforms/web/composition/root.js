// root.js — Version 1.6
// LifeGame 3.0 — Web Composition Root
// Responsibility: compose concrete Infrastructure with Application and Presentation.

import { createIdentityApplication } from "../../../source/application/identity/identity.js";
import { createSupabaseIdentityAdapter } from "../../../source/infrastructure/identity/supabase.identity.adapter.js";
import { createLifeGameSupabaseClient } from "../../../source/infrastructure/supabase/supabase.client.js";
import { createAuthController } from "../../../source/presentation/auth/auth.controller.js";
import { createUserContext } from "../../../source/application/user/user.context.js";
import { createSupabaseFinanceMemory } from "../../../source/infrastructure/supabase/finance.memory.supabase.js";
import { createFinanceMemoryPort } from "../../../source/application/finance/finance.memory.port.js";
import { createProfileApplication } from "../../../source/application/profile/profile.js";
import { createSupabaseProfileAdapter } from "../../../source/infrastructure/supabase/profile.adapter.js";

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
    const profileAdapter = createSupabaseProfileAdapter(supabaseClient);
    const profileApplication = createProfileApplication(profileAdapter);
    const financeMemoryByUser = new Map();

    async function createFinanceMemoryForUser(userId) {
        const normalizedUserId = String(userId ?? "").trim();

        if (!normalizedUserId) {
            throw new Error("LifeGame Web: authenticated user id is required.");
        }

        if (!financeMemoryByUser.has(normalizedUserId)) {
            const userContext = createUserContext(normalizedUserId);
            const memory = createSupabaseFinanceMemory({
                client: supabaseClient,
                userContext
            });
            await memory.hydrate();
            financeMemoryByUser.set(
                normalizedUserId,
                createFinanceMemoryPort(memory)
            );
        }

        return financeMemoryByUser.get(normalizedUserId);
    }

    return Object.freeze({
        auth: authController,
        profile: profileApplication,
        finance: Object.freeze({
            createMemoryForUser: createFinanceMemoryForUser
        })
    });
}
