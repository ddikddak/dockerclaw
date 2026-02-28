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

const allowedPermissions = new Set(['read', 'write', 'delete']);

function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'dc_agent_';
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  for (let i = 0; i < bytes.length; i++) {
    key += chars[bytes[i] % chars.length];
  }
  return key;
}

function normalizePermissions(input: unknown): string[] {
  if (!Array.isArray(input) || input.length === 0) {
    return ['read', 'write'];
  }

  const normalized = Array.from(
    new Set(
      input
        .filter((permission): permission is string => typeof permission === 'string')
        .map((permission) => permission.toLowerCase().trim())
        .filter((permission) => allowedPermissions.has(permission))
    )
  );

  return normalized.length > 0 ? normalized : ['read', 'write'];
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
    const {
      board_id,
      name = 'Agent Key',
      permissions,
      agent_id = null,
      description = null,
    } = body;
    const normalizedPermissions = normalizePermissions(permissions);

    if (!board_id) {
      return new Response(
        JSON.stringify({ error: 'Missing board_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof name !== 'string' || name.trim().length === 0 || name.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Invalid name. Must be a non-empty string up to 100 chars' }),
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
    const now = new Date().toISOString();
    const { data: insertedKey, error: insertError } = await supabaseClient
      .from('agent_api_keys')
      .insert({
        board_id,
        user_id: user.id,
        name: name.trim(),
        key_hash: keyHashHex,
        key_prefix: apiKey.slice(0, 12),
        permissions: normalizedPermissions,
        agent_id: typeof agent_id === 'string' && agent_id.trim().length > 0 ? agent_id.trim() : null,
        description: typeof description === 'string' && description.trim().length > 0 ? description.trim() : null,
        updated_at: now,
      })
      .select('id, board_id, name, key_prefix, permissions, agent_id, description, created_at, is_active')
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create API key', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return the key - ONLY SHOWN ONCE
    return new Response(
      JSON.stringify({ 
        success: true,
        key_id: insertedKey.id,
        key: apiKey,
        name: insertedKey.name,
        key_prefix: insertedKey.key_prefix,
        permissions: insertedKey.permissions,
        agent_id: insertedKey.agent_id,
        description: insertedKey.description,
        created_at: insertedKey.created_at,
        is_active: insertedKey.is_active,
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
