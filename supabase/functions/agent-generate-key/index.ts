// ============================================
// Edge Function: Generate API Key (for UI usage)
// POST /functions/v1/agent-generate-key
// Headers: Authorization: Bearer <user_jwt>
// Body: { board_id, name?, permissions? }
// Response: { key: "dc_agent_xxx" } <-- ONLY SHOWN ONCE
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'dc_agent_';
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { board_id, name = 'Agent Key', permissions = ['read', 'write'] } = body;

    if (!board_id) {
      return new Response(
        JSON.stringify({ error: 'Missing board_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user owns the board
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: board, error: boardError } = await supabaseClient
      .from('boards')
      .select('id')
      .eq('id', board_id)
      .eq('user_id', user.id)
      .single();

    if (boardError || !board) {
      return new Response(
        JSON.stringify({ error: 'Board not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate key
    const apiKey = generateApiKey();
    const keyHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(apiKey));
    const keyHashHex = Array.from(new Uint8Array(keyHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Store hashed key
    const { error: insertError } = await supabaseClient
      .from('agent_api_keys')
      .insert({
        board_id,
        user_id: user.id,
        name,
        key_hash: keyHashHex,
        key_prefix: apiKey.slice(0, 12),
        permissions,
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create API key' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return the key - ONLY SHOWN ONCE
    return new Response(
      JSON.stringify({ 
        success: true,
        key: apiKey,
        name,
        permissions,
        warning: 'This key will only be shown once. Store it securely!'
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
