import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // Lempar error yang akan ditangkap ErrorBoundary agar tidak blank hitam
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Tambahkan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di Vercel Environment Variables.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
