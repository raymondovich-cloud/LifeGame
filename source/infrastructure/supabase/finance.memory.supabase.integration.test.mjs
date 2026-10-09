// finance.memory.supabase.integration.test.mjs — Version 1.7
// Responsibility: verify real Finance persistence, hydration, user isolation, and RLS through local Supabase.

import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseFinanceMemory } from "./finance.memory.supabase.js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.API_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Real Supabase integration test requires Supabase URL and publishable key.");
}

function createClientForTest() {
    return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
}

function withoutPersistenceMetadata(entries) {
    return entries.map(({ createdAt, createdBy, ...entry }) => entry);
}

async function createTestSession(label) {
    const client = createClientForTest();
    const email = "lifegame-" + label + "-" + Date.now() + "-" + Math.random().toString(36).slice(2) + "@example.test";
    const password = "LifeGameTest-12345";

    const { data, error } = await client.auth.signUp({ email, password });

    if (error) throw error;
    if (!data.user || !data.session) {
        throw new Error("Local Supabase test user did not receive an authenticated session.");
    }

    return { client, userId: data.user.id };
}

test("Finance Supabase persistence survives memory recreation and isolates users", async () => {
    const sessionA = await createTestSession("a");
    const sessionB = await createTestSession("b");

    const memoryA = createSupabaseFinanceMemory({
        client: sessionA.client,
        userContext: { userId: sessionA.userId }
    });
    const memoryB = createSupabaseFinanceMemory({
        client: sessionB.client,
        userContext: { userId: sessionB.userId }
    });

    const createdA = await memoryA.saveActualEarning({
        label: "Persistence test A",
        amount: 12345
    });

    assert.equal(createdA.amount, 12345);
    assert.equal(memoryB.listActualEarnings().length, 0);

    const createdCredit = await memoryA.saveFinancialBurden({
        label: "Credit persistence",
        debt: 30000,
        payment: 3000,
        isCreditProduct: true,
        interestRate: 25
    });

    assert.equal(createdCredit.debt, 30000);
    assert.equal(createdCredit.payment, 3000);
    assert.equal(createdCredit.isCreditProduct, true);
    assert.equal(createdCredit.interestRate, 25);

    const recreatedMemory = createSupabaseFinanceMemory({
        client: sessionA.client,
        userContext: { userId: sessionA.userId }
    });

    assert.equal(recreatedMemory.listActualEarnings().length, 0);
    await recreatedMemory.hydrate();

    assert.deepEqual(withoutPersistenceMetadata(recreatedMemory.listActualEarnings()), [
        { id: createdA.id, label: "Persistence test A", amount: 12345 }
    ]);
    assert.deepEqual(withoutPersistenceMetadata(recreatedMemory.listFinancialBurden()), [
        {
            id: createdCredit.id,
            label: "Credit persistence",
            debt: 30000,
            payment: 3000,
            isCreditProduct: true,
            interestRate: 25
        }
    ]);

    const createdB = await memoryB.saveActualEarning({
        label: "Persistence test B",
        amount: 54321
    });

    const finalMemoryA = createSupabaseFinanceMemory({
        client: sessionA.client,
        userContext: { userId: sessionA.userId }
    });
    const finalMemoryB = createSupabaseFinanceMemory({
        client: sessionB.client,
        userContext: { userId: sessionB.userId }
    });

    await Promise.all([finalMemoryA.hydrate(), finalMemoryB.hydrate()]);

    assert.deepEqual(withoutPersistenceMetadata(finalMemoryA.listActualEarnings()), [
        { id: createdA.id, label: "Persistence test A", amount: 12345 }
    ]);
    assert.deepEqual(withoutPersistenceMetadata(finalMemoryB.listActualEarnings()), [
        { id: createdB.id, label: "Persistence test B", amount: 54321 }
    ]);

    const { data: crossUserRows, error: crossUserError } = await sessionA.client
        .from("finance_actual_earnings")
        .select("*")
        .eq("user_id", sessionB.userId);

    if (crossUserError) throw crossUserError;
    assert.deepEqual(crossUserRows, []);
});
