// src/lib/supabaseClient.js
// ============================================
// Supabase client — single instance used
// throughout the entire app. Import this file
// wherever you need database or auth access.
// ============================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persist session in localStorage
    persistSession: true,
    // Auto-refresh token before it expires
    autoRefreshToken: true,
    // Detect session from URL (needed for email verification links)
    detectSessionInUrl: true,
  },
});
