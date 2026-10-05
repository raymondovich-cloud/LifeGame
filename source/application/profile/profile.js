// LifeGame 3.0 — Profile Application
// Version: 1.0
// Responsibility: coordinate authenticated profile reads.

export function createProfileApplication(profilePort) {
    if (!profilePort || typeof profilePort.getProfile !== "function") {
        throw new Error("Profile port is required.");
    }

    return Object.freeze({
        async getProfile(userId) {
            const normalizedUserId = String(userId ?? "").trim();

            if (!normalizedUserId) {
                throw new Error("Profile user id is required.");
            }

            return profilePort.getProfile(normalizedUserId);
        }
    });
}
