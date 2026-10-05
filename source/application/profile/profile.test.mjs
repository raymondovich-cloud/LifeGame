// LifeGame 3.0 — Profile Application Tests
// Version: 1.0
// Responsibility: verify the Profile read and mutation application boundary.

import test from "node:test";
import assert from "node:assert/strict";

import { createProfileApplication } from "./profile.js";

test("profile application requires read and mutation operations", () => {
    assert.throws(
        () => createProfileApplication({ getProfile: async () => null }),
        /Profile port is required/
    );
});

test("updateProfile validates and delegates normalized profile data", async () => {
    let received = null;

    const profilePort = {
        async getProfile() {
            return null;
        },
        async updateProfile(userId, input) {
            received = { userId, input };
            return {
                id: userId,
                displayName: input.displayName,
                birthDate: input.birthDate
            };
        }
    };

    const application = createProfileApplication(profilePort);

    const result = await application.updateProfile(" user-1 ", {
        displayName: "  Bogdan  ",
        birthDate: "1997-04-12"
    });

    assert.deepEqual(received, {
        userId: "user-1",
        input: {
            displayName: "Bogdan",
            birthDate: "1997-04-12"
        }
    });

    assert.deepEqual(result, {
        id: "user-1",
        displayName: "Bogdan",
        birthDate: "1997-04-12"
    });
});

test("updateProfile rejects an empty display name before reaching the port", async () => {
    let called = false;

    const profilePort = {
        async getProfile() {
            return null;
        },
        async updateProfile() {
            called = true;
        }
    };

    const application = createProfileApplication(profilePort);

    await assert.rejects(
        () =>
            application.updateProfile("user-1", {
                displayName: "   ",
                birthDate: ""
            }),
        /Profile display name is required/
    );

    assert.equal(called, false);
});

test("updateProfile rejects an invalid birth date before reaching the port", async () => {
    let called = false;

    const profilePort = {
        async getProfile() {
            return null;
        },
        async updateProfile() {
            called = true;
        }
    };

    const application = createProfileApplication(profilePort);

    await assert.rejects(
        () =>
            application.updateProfile("user-1", {
                displayName: "Bogdan",
                birthDate: "12.04.1997"
            }),
        /Profile birth date must use YYYY-MM-DD format/
    );

    assert.equal(called, false);
});

test("updateProfile requires a user id", async () => {
    const profilePort = {
        async getProfile() {
            return null;
        },
        async updateProfile() {
            throw new Error("must not be called");
        }
    };

    const application = createProfileApplication(profilePort);

    await assert.rejects(
        () =>
            application.updateProfile("  ", {
                displayName: "Bogdan",
                birthDate: ""
            }),
        /Profile user id is required/
    );
});

// LifeGame 3.0 — Profile Application Lifecycle Tests
// Version: 1.1
// Responsibility: verify the complete Profile read/update/read lifecycle at the Application boundary.

test("profile lifecycle reads, updates, and reads the persisted user profile", async () => {
    const profiles = new Map([
        [
            "user-1",
            {
                id: "user-1",
                displayName: "Before Update",
                birthDate: "1997-04-12"
            }
        ]
    ]);

    const profilePort = {
        async getProfile(userId) {
            return structuredClone(profiles.get(userId) ?? null);
        },

        async updateProfile(userId, input) {
            const current = profiles.get(userId);

            if (!current) {
                throw new Error("Profile not found.");
            }

            const updated = {
                id: userId,
                displayName: input.displayName,
                birthDate: input.birthDate
            };

            profiles.set(userId, updated);

            return structuredClone(updated);
        }
    };

    const application = createProfileApplication(profilePort);

    const before = await application.getProfile("user-1");

    assert.deepEqual(before, {
        id: "user-1",
        displayName: "Before Update",
        birthDate: "1997-04-12"
    });

    const updated = await application.updateProfile("user-1", {
        displayName: "After Update",
        birthDate: "1998-08-15"
    });

    assert.deepEqual(updated, {
        id: "user-1",
        displayName: "After Update",
        birthDate: "1998-08-15"
    });

    const after = await application.getProfile("user-1");

    assert.deepEqual(after, {
        id: "user-1",
        displayName: "After Update",
        birthDate: "1998-08-15"
    });
});

test("profile lifecycle remains user-scoped", async () => {
    const profiles = new Map([
        [
            "user-a",
            {
                id: "user-a",
                displayName: "User A",
                birthDate: "1997-04-12"
            }
        ],
        [
            "user-b",
            {
                id: "user-b",
                displayName: "User B",
                birthDate: "1998-08-15"
            }
        ]
    ]);

    const profilePort = {
        async getProfile(userId) {
            return structuredClone(profiles.get(userId) ?? null);
        },

        async updateProfile(userId, input) {
            const current = profiles.get(userId);

            if (!current) {
                throw new Error("Profile not found.");
            }

            const updated = {
                id: userId,
                displayName: input.displayName,
                birthDate: input.birthDate
            };

            profiles.set(userId, updated);

            return structuredClone(updated);
        }
    };

    const application = createProfileApplication(profilePort);

    await application.updateProfile("user-a", {
        displayName: "User A Updated",
        birthDate: "2000-01-01"
    });

    assert.deepEqual(await application.getProfile("user-a"), {
        id: "user-a",
        displayName: "User A Updated",
        birthDate: "2000-01-01"
    });

    assert.deepEqual(await application.getProfile("user-b"), {
        id: "user-b",
        displayName: "User B",
        birthDate: "1998-08-15"
    });
});
