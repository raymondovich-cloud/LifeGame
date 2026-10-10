// LifeGame 3.0 — Supabase Profile Adapter
// Version: 1.2
// Responsibility: read and mutate user-scoped profile data in Supabase.
//
// RLS on public.profiles is the database authorization boundary.
// This adapter never uses service-role credentials.

function mapProfile(data) {
    return Object.freeze({
        id: data.id,
        displayName: data.display_name ?? "",
        birthDate: data.birth_date ?? ""
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
                .select("id, display_name, birth_date")
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
            const { data, error } = await supabaseClient
                .from("profiles")
                .update({
                    display_name: input.displayName,
                    birth_date: input.birthDate || null
                })
                .eq("id", userId)
                .select("id, display_name, birth_date")
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
