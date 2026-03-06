import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// The Admin dashboard now relies on RLS policies (is_admin function)
// instead of the powerful service_role key snippet previously used.
// The Admin dashboard uses sessionStorage for higher security (session wiped on tab close)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: window.sessionStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
});
