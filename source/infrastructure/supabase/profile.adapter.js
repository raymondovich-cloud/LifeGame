// LifeGame 3.0 — Supabase Profile Adapter
// Version: 1.3
// Responsibility: read and mutate user-scoped profile data in Supabase.
//
// RLS on public.profiles is the database authorization boundary.
// This adapter never uses service-role credentials.

function mapProfile(data) {
    return Object.freeze({
        id: data.id,
        displayName: data.display_name ?? "",
        birthDate: data.birth_date ?? "",
        ...(Object.prototype.hasOwnProperty.call(data, "gender")
            ? { gender: ["male", "female"].includes(data.gender) ? data.gender : "" }
            : {})
    });
}

export function createSupabaseProfileAdapter(supabaseClient) {
    if (!supabaseClient) {
        throw new Error("Supabase client is required.");
    }

    return Object.freeze({
        async getUserRole(userId) {
            const { data, error } = await supabaseClient
                .from("user_profiles")
                .select("role")
                .eq("user_id", userId)
                .maybeSingle();

            if (error) {
                throw new Error(
                    error.message || "User status could not be loaded."
                );
            }

            const role = data?.role;
            return ["creator", "admin", "user"].includes(role)
                ? role
                : "user";
        },

        async getProfile(userId) {
            const { data, error } = await supabaseClient
                .from("profiles")
                .select("id, display_name, birth_date, gender")
                .eq("id", userId)
                .maybeSingle();

            if (error) {
                throw new Error(
                    error.message || "Profile could not be loaded."
                );
            }

            if (!data) {
                return null;
            }

            return mapProfile(data);
        },

        async updateProfile(userId, input) {
            const updateValues = {
                display_name: input.displayName,
                birth_date: input.birthDate || null
            };
            if (["male", "female"].includes(input.gender)) {
                updateValues.gender = input.gender;
            }

            const { data, error } = await supabaseClient
                .from("profiles")
                .update(updateValues)
                .eq("id", userId)
                .select("id, display_name, birth_date, gender")
                .maybeSingle();

            if (error) {
                throw new Error(
                    error.message || "Profile could not be updated."
                );
            }

            if (!data) {
                throw new Error("Profile could not be updated.");
            }

            return mapProfile(data);
        }
    });
}
