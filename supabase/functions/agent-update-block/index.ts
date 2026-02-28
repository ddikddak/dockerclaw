// ============================================
// Edge Function: Update Block (Agent API)
// PATCH /functions/v1/agent-update-block
// Headers: X-API-Key: dc_agent_xxx
// Body: { board_id, block_id, x?, y?, w?, h?, z?, data?, title?, content? }
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
    const { board_id, block_id, x, y, w, h, z, data, title, content, locked } = body;

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

    if (!keyData.permissions.includes('write')) {
      return new Response(
        JSON.stringify({ error: 'API key does not have write permission' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current block to merge data
    const { data: currentBlock, error: fetchError } = await supabaseAdmin
      .from('blocks')
      .select('data, type')
      .eq('id', block_id)
      .eq('board_id', board_id)
      .single();

    if (fetchError || !currentBlock) {
      return new Response(
        JSON.stringify({ error: 'Block not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build update object
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (x !== undefined) updateData.x = x;
    if (y !== undefined) updateData.y = y;
    if (w !== undefined) updateData.w = w;
    if (h !== undefined) updateData.h = h;
    if (z !== undefined) updateData.z = z;
    if (locked !== undefined) updateData.locked = locked;

    // Handle data updates with smart merging
    const newData = { ...currentBlock.data };
    
    if (data) {
      Object.assign(newData, data);
    }
    
    // Special fields for common block types
    if (title !== undefined) {
      if (currentBlock.type === 'doc') {
        newData.title = title;
      } else if (currentBlock.type === 'heading') {
        newData.content = title;
      } else {
        newData.title = title;
      }
    }
    
    if (content !== undefined) {
      if (currentBlock.type === 'doc') {
        newData.contentMarkdown = content;
      } else if (currentBlock.type === 'text') {
        newData.content = content;
      } else if (currentBlock.type === 'heading') {
        newData.content = content;
      } else {
        newData.content = content;
      }
    }

    updateData.data = newData;

    const { data: updatedBlock, error: updateError } = await supabaseAdmin
      .from('blocks')
      .update(updateData)
      .eq('id', block_id)
      .eq('board_id', board_id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update block', details: updateError.message }),
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
        message: 'Block updated successfully',
        block: updatedBlock
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
