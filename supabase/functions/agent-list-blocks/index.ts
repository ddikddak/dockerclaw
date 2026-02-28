// ============================================
// Edge Function: List Blocks (Agent API)
// GET /functions/v1/agent-list-blocks?board_id=xxx
// Headers: X-API-Key: dc_agent_xxx
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, x-api-key, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing X-API-Key header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const boardId = url.searchParams.get('board_id');

    if (!boardId) {
      return new Response(
        JSON.stringify({ error: 'Missing board_id query parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate API key
    const keyHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(apiKey));
    const keyHashHex = Array.from(new Uint8Array(keyHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const { data: keyData, error: keyError } = await supabaseAdmin
      .from('agent_api_keys')
      .select('permissions, is_active')
      .eq('key_hash', keyHashHex)
      .eq('board_id', boardId)
      .single();

    if (keyError || !keyData || !keyData.is_active) {
      return new Response(
        JSON.stringify({ error: 'Invalid or inactive API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check read permission
    if (!keyData.permissions.includes('read')) {
      return new Response(
        JSON.stringify({ error: 'API key does not have read permission' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch blocks
    const { data: blocks, error: fetchError } = await supabaseAdmin
      .from('blocks')
      .select('id, type, x, y, w, h, z, data, created_at, updated_at')
      .eq('board_id', boardId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch blocks' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last_used_at
    await supabaseAdmin
      .from('agent_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('key_hash', keyHashHex);

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: blocks?.length || 0,
        blocks: blocks || []
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
