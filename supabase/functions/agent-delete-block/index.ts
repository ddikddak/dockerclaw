// ============================================
// Edge Function: Delete Block (Agent API)
// DELETE /functions/v1/agent-delete-block
// Headers: X-API-Key: dc_agent_xxx
// Body: { board_id, block_id, permanent? }
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

    const body = await req.json();
    const { board_id, block_id, permanent = false } = body;

    if (!board_id || !block_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: board_id, block_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      .eq('board_id', board_id)
      .single();

    if (keyError || !keyData || !keyData.is_active) {
      return new Response(
        JSON.stringify({ error: 'Invalid or inactive API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!keyData.permissions.includes('delete')) {
      return new Response(
        JSON.stringify({ error: 'API key does not have delete permission' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (permanent) {
      // Hard delete
      const { error: deleteError } = await supabaseAdmin
        .from('blocks')
        .delete()
        .eq('id', block_id)
        .eq('board_id', board_id);

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: 'Failed to delete block', details: deleteError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Soft delete (mark as deleted)
      const { error: updateError } = await supabaseAdmin
        .from('blocks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', block_id)
        .eq('board_id', board_id);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: 'Failed to soft-delete block', details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update last_used_at
    await supabaseAdmin
      .from('agent_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('key_hash', keyHashHex);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: permanent ? 'Block permanently deleted' : 'Block moved to trash',
        block_id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
