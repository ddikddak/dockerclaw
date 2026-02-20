import { createClient } from '@supabase/supabase-js';

// Helper per crear un client fresc per a cada request (API routes)
export function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Client singleton per a ús client-side - lazy initialization
let supabaseInstance: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
    }
    
    supabaseInstance = createClient(supabaseUrl, supabaseKey || '', {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabaseInstance;
}

// Exporta un proxy que lazy-loada el client
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_, prop) {
    const client = getSupabaseClient();
    return client[prop as keyof typeof client];
  },
});
