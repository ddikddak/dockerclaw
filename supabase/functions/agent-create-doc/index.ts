// ============================================
// Edge Function: Create Document (Agent API)
// POST /functions/v1/agent-create-doc
// Headers: X-API-Key: dc_agent_xxx
// Body: { board_id, title, content, tags?, x?, y? }
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
    const { board_id, title, content, tags = [], x = 100, y = 100 } = body;

    if (!board_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: board_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!title && !content) {
      return new Response(
        JSON.stringify({ error: 'At least one of title or content is required' }),
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
      .select('user_id, permissions, is_active')
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

    // Get max z-index
    const { data: maxZData } = await supabaseAdmin
      .from('blocks')
      .select('z')
      .eq('board_id', board_id)
      .order('z', { ascending: false })
      .limit(1)
      .single();

    const newZ = (maxZData?.z || 0) + 1;

    // Create doc block
    const { data: block, error: insertError } = await supabaseAdmin
      .from('blocks')
      .insert({
        id: crypto.randomUUID(),
        user_id: keyData.user_id,
        board_id,
        type: 'doc',
        x,
        y,
        w: 400,
        h: 500,
        z: newZ,
        data: {
          title: title || 'Untitled Document',
          contentMarkdown: content || '',
          tags: tags,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create document', details: insertError.message }),
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
        message: 'Document created successfully',
        block: {
          id: block.id,
          type: block.type,
          title: title || 'Untitled Document',
          x: block.x,
          y: block.y,
          created_at: block.created_at,
        }
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
