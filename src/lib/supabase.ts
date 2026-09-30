/// <reference types="vite/client" />
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const validSupabaseUrl = (() => {
  if (!supabaseUrl) return false;
  try {
    const parsed = new URL(supabaseUrl);
    return parsed.protocol === 'https:' || parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  } catch {
    return false;
  }
})();

export const isSupabaseConfigured = Boolean(validSupabaseUrl && supabaseAnonKey?.trim());

const unavailableClient = new Proxy({} as SupabaseClient, {
  get() {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable account and data features.');
  },
});

// Public pages remain viewable if deployment configuration is missing. Auth and
// data actions are disabled by AuthContext; no service-role key is ever used here.
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : unavailableClient;
