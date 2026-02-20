export interface Agent {
  id: string;
  name: string;
  email: string;
  api_key: string;
  webhook_url: string | null;
  created_at: string;
}

export async function validateApiKey(apiKey: string): Promise<Agent | null> {
  try {
    // Dynamic import to avoid build-time issues
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('api_key', apiKey)
      .single();

    if (error || !data) {
      return null;
    }

    return data as Agent;
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

export function getApiKeyFromRequest(request: Request): string | null {
  const apiKey = request.headers.get('x-api-key');
  return apiKey;
}
