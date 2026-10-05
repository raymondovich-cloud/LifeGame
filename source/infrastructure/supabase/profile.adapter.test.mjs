// LifeGame 3.0 — Supabase Profile Adapter Tests
// Version: 1.0
// Responsibility: verify the Profile persistence boundary without contacting Supabase.

import test from "node:test";
import assert from "node:assert/strict";

import { createSupabaseProfileAdapter } from "./profile.adapter.js";

test("updateProfile updates only canonical profile fields and returns mapped data", async () => {
    const calls = [];
    const response = {
        id: "user-1",
        display_name: "Bogdan",
        birth_date: "1997-04-12"
    };

    const supabaseClient = {
        from(table) {
            calls.push(["from", table]);

            return {
                update(values) {
                    calls.push(["update", values]);

                    return {
                        eq(column, value) {
                            calls.push(["eq", column, value]);

                            return {
                                select(columns) {
                                    calls.push(["select", columns]);

                                    return {
                                        async maybeSingle() {
                                            calls.push(["maybeSingle"]);
                                            return {
                                                data: response,
                                                error: null
                                            };
                                        }
                                    };
                                }
                            };
                        }
                    };
                }
            };
        }
    };

    const adapter = createSupabaseProfileAdapter(supabaseClient);

    const result = await adapter.updateProfile("user-1", {
        displayName: "Bogdan",
        birthDate: "1997-04-12"
    });

    assert.deepEqual(calls, [
        ["from", "profiles"],
        [
            "update",
            {
                display_name: "Bogdan",
                birth_date: "1997-04-12"
            }
        ],
        ["eq", "id", "user-1"],
        ["select", "id, display_name, birth_date"],
        ["maybeSingle"]
    ]);

    assert.deepEqual(result, {
        id: "user-1",
        displayName: "Bogdan",
        birthDate: "1997-04-12"
    });
});

test("updateProfile stores an empty birth date as null", async () => {
    let updatedValues = null;

    const supabaseClient = {
        from() {
            return {
                update(values) {
                    updatedValues = values;

                    return {
                        eq() {
                            return {
                                select() {
                                    return {
                                        async maybeSingle() {
                                            return {
                                                data: {
                                                    id: "user-1",
                                                    display_name: "Bogdan",
                                                    birth_date: null
                                                },
                                                error: null
                                            };
                                        }
                                    };
                                }
                            };
                        }
                    };
                }
            };
        }
    };

    const adapter = createSupabaseProfileAdapter(supabaseClient);

    await adapter.updateProfile("user-1", {
        displayName: "Bogdan",
        birthDate: ""
    });

    assert.deepEqual(updatedValues, {
        display_name: "Bogdan",
        birth_date: null
    });
});

test("updateProfile normalizes Supabase errors", async () => {
    const supabaseClient = {
        from() {
            return {
                update() {
                    return {
                        eq() {
                            return {
                                select() {
                                    return {
                                        async maybeSingle() {
                                            return {
                                                data: null,
                                                error: {
                                                    message: "provider-specific secret"
                                                }
                                            };
                                        }
                                    };
                                }
                            };
                        }
                    };
                }
            };
        }
    };

    const adapter = createSupabaseProfileAdapter(supabaseClient);

    await assert.rejects(
        () =>
            adapter.updateProfile("user-1", {
                displayName: "Bogdan",
                birthDate: ""
            }),
        /provider-specific secret/
    );
});

test("adapter requires a Supabase client", () => {
    assert.throws(
        () => createSupabaseProfileAdapter(),
        /Supabase client is required/
    );
});
