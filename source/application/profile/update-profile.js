// LifeGame 3.0 — Profile Update Use Case
// Version: 1.0
// Responsibility: validate provider-independent profile mutation input.

export function validateProfileUpdateInput(input) {
    if (!input || typeof input !== "object") {
        throw new Error("Profile update input is required.");
    }

    const displayName = String(input.displayName ?? "").trim();
    const birthDate = String(input.birthDate ?? "").trim();

    if (!displayName) {
        throw new Error("Profile display name is required.");
    }

    if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
        throw new Error("Profile birth date must use YYYY-MM-DD format.");
    }

    return Object.freeze({
        displayName,
        birthDate
    });
}
