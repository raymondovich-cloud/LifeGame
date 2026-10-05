// LifeGame 3.0 — Supabase Profile Adapter
// Version: 1.0
// Responsibility: read user-scoped profile data from Supabase.
//
// RLS on public.profiles is the database authorization boundary.
// This adapter never uses service-role credentials.

export function createSupabaseProfileAdapter(supabaseClient) {
    if (!supabaseClient) {
        throw new Error("Supabase client is required.");
    }

    return Object.freeze({
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

            return Object.freeze({
                id: data.id,
                displayName: data.display_name ?? "",
                birthDate: data.birth_date ?? ""
            });
        }
    });
}
