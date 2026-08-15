/** Supabase client — auth + writes (feedback, prefs, refresh commands),
 *  same as the current app. Reads increasingly go through the FastAPI layer.
 *  Without env config the app runs in fixture/demo mode: no login, writes
 *  become no-ops so previews stay interactive. */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON as string | undefined;

export const sb: SupabaseClient | null = url && anon ? createClient(url, anon) : null;
export const demoMode = !sb;
