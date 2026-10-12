// LifeGame 3.0 — Profile Update Use Case
// Version: 1.1
// Responsibility: validate provider-independent profile mutation input.

export function validateProfileUpdateInput(input) {
    if (!input || typeof input !== "object") {
        throw new Error("Profile update input is required.");
    }

    const displayName = String(input.displayName ?? "").trim();
    const birthDate = String(input.birthDate ?? "").trim();
    const gender = input.gender === undefined ? undefined : String(input.gender).trim();

    if (!displayName) {
        throw new Error("Profile display name is required.");
    }

    if (gender !== undefined && !["male", "female"].includes(gender)) {
        throw new Error("Profile gender must be male or female.");
    }

    if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
        throw new Error("Profile birth date must use YYYY-MM-DD format.");
    }

    return Object.freeze({
        displayName,
        birthDate,
        ...(gender !== undefined ? { gender } : {})
    });
}
