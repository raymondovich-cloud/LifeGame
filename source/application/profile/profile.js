// LifeGame 3.0 — Profile Application
// Version: 1.1
// Responsibility: coordinate authenticated profile reads and mutations.

import { validateProfileUpdateInput } from "./update-profile.js";

export function createProfileApplication(profilePort) {
    if (
        !profilePort ||
        typeof profilePort.getProfile !== "function" ||
        typeof profilePort.updateProfile !== "function"
    ) {
        throw new Error("Profile port is required.");
    }

    return Object.freeze({
        async getProfile(userId) {
            const normalizedUserId = String(userId ?? "").trim();

            if (!normalizedUserId) {
                throw new Error("Profile user id is required.");
            }

            return profilePort.getProfile(normalizedUserId);
        },

        async updateProfile(userId, input) {
            const normalizedUserId = String(userId ?? "").trim();

            if (!normalizedUserId) {
                throw new Error("Profile user id is required.");
            }

            return profilePort.updateProfile(
                normalizedUserId,
                validateProfileUpdateInput(input)
            );
        }
    });
}
