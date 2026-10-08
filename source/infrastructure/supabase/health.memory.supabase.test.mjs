// source/infrastructure/supabase/health.memory.supabase.test.mjs — Version 1.0

import test from "node:test";
import assert from "node:assert/strict";

import { createSupabaseHealthMemory } from "./health.memory.supabase.js";

function createMockClient() {
    const rows = [];
    return {
        from() {
            return {
                select() {
                    return {
                        eq() {
                            return {
                                eq() {
                                    return {
                                        order: async () => ({ data: rows, error: null })
                                    };
                                },
                                order: async () => ({ data: rows, error: null })
                            };
                        }
                    };
                },
                insert(payload) {
                    const row = {
                        id: payload.id || crypto.randomUUID(),
                        ...payload,
                        created_at: new Date().toISOString()
                    };
                    rows.push(row);
                    return {
                        select() {
                            return {
                                single: async () => ({ data: row, error: null })
                            };
                        }
                    };
                },
                delete() {
                    return {
                        eq() {
                            return {
                                eq: async () => ({ data: null, error: null })
                            };
                        }
                    };
                }
            };
        }
    };
}

test("Supabase Health Memory persists normalized facts through its adapter contract", async () => {
    const memory = createSupabaseHealthMemory({
        client: createMockClient(),
        userContext: { userId: "user-a" }
    });

    await memory.saveFact("body", {
        recordedAt: 1000,
        weightKg: 70
    });

    const facts = memory.listFacts("body");
    assert.equal(facts.length, 1);
    assert.equal(facts[0].userId, "user-a");
    assert.equal(facts[0].weightKg, 70);
});
