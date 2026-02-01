"use client";

import { createBrowserClient } from "@supabase/ssr";

function getSupabase(): ReturnType<typeof createBrowserClient> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return createBrowserClient(url, anon);
}

const NOT_CONFIGURED = { message: "Supabase not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local." };

export async function signInWithPassword(email: string, password: string) {
  const supabase = getSupabase();
  if (!supabase) return { error: { message: NOT_CONFIGURED.message } as Error };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error };
}

export async function signUpWithPassword(email: string, password: string) {
  const supabase = getSupabase();
  if (!supabase) return { error: { message: NOT_CONFIGURED.message } as Error };
  const { error } = await supabase.auth.signUp({ email, password });
  return { error };
}

export async function signInWithOtp(email: string) {
  const supabase = getSupabase();
  if (!supabase) return { error: { message: NOT_CONFIGURED.message } as Error };
  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : "";
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });
  return { error };
}
