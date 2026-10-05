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
