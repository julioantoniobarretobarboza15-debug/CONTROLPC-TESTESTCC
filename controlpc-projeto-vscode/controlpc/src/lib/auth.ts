import { supabase } from "@/integrations/supabase/client";

const DOMAIN = "controlpc.local";

export function normalizeUsername(username: string) {
  return username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");
}

export function usernameToEmail(username: string) {
  return `${normalizeUsername(username)}@${DOMAIN}`;
}

export async function signIn(username: string, password: string) {
  return supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  });
}

export async function signUp(username: string, password: string, fullName: string) {
  const normalized = normalizeUsername(username);
  return supabase.auth.signUp({
    email: usernameToEmail(normalized),
    password,
    options: {
      emailRedirectTo: window.location.origin,
      data: { username: normalized, full_name: fullName || normalized },
    },
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}
