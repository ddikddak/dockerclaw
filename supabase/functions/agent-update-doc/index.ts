// ============================================
// Edge Function: Update Document (Agent API)
// PATCH /functions/v1/agent-update-doc
// Headers: X-API-Key: dc_agent_xxx
// Body: { board_id, block_id, title?, content?, append?, tags? }
//
// Special params:
//   - append: true → Afegeix content al final (no reemplaça)
//   - tags: ["tag1", "tag2"] → Reemplaça tags (si s'envia)
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
    const { board_id, block_id, title, content, append = false, tags } = body;

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

    // Get current document
    const { data: currentBlock, error: fetchError } = await supabaseAdmin
      .from('blocks')
      .select('data, type')
      .eq('id', block_id)
      .eq('board_id', board_id)
      .eq('type', 'doc')
      .single();

    if (fetchError || !currentBlock) {
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build new data
    const newData = { ...currentBlock.data };
    
    if (title !== undefined) {
      newData.title = title;
    }
    
    if (content !== undefined) {
      if (append && newData.contentMarkdown) {
        newData.contentMarkdown = newData.contentMarkdown + '\n\n' + content;
      } else {
        newData.contentMarkdown = content;
      }
    }
    
    if (tags !== undefined) {
      newData.tags = tags;
    }

    const { data: updatedBlock, error: updateError } = await supabaseAdmin
      .from('blocks')
      .update({
        data: newData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', block_id)
      .eq('board_id', board_id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update document', details: updateError.message }),
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
        message: append ? 'Content appended successfully' : 'Document updated successfully',
        block: {
          id: updatedBlock.id,
          title: newData.title,
          contentLength: newData.contentMarkdown?.length || 0,
          tags: newData.tags,
          updated_at: updatedBlock.updated_at,
        }
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
