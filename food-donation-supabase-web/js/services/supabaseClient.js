import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { env } from "../config.js";

if (!env.supabaseUrl || !env.supabaseAnonKey) {
  console.warn("Supabase keys missing. Update js/_env.js before use.");
}

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey);
