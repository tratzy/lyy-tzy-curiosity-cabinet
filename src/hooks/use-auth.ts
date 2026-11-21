import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

type AuthState = { user: User | null; isAdmin: boolean; loading: boolean };

/** Client-side session + admin flag. UI hint only — the database rules enforce admin access. */
export function useAuth(): AuthState & { username: string | null } {
  const [state, setState] = useState<AuthState>({ user: null, isAdmin: false, loading: true });

  useEffect(() => {
    let active = true;

    const load = async (user: User | null) => {
      if (!user) {
        if (active) setState({ user: null, isAdmin: false, loading: false });
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (active) setState({ user, isAdmin: Boolean(data), loading: false });
    };

    supabase.auth.getUser().then(({ data }) => load(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        void load(session?.user ?? null);
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const meta = state.user?.user_metadata as { username?: string } | undefined;
  return { ...state, username: meta?.username ?? state.user?.email?.split("@")[0] ?? null };
}
