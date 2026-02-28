// ============================================
// Edge Function: Create Block (Agent API)
// POST /functions/v1/agent-create-block
// Headers: X-API-Key: dc_agent_xxx
// Body: { board_id, type, x?, y?, w?, h?, data?, title? }
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, x-api-key, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
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
    const { board_id, type, x = 100, y = 100, w, h, data = {}, title } = body;

    if (!board_id || !type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: board_id, type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate block type
    const validTypes = ['doc', 'text', 'kanban', 'checklist', 'table', 'inbox', 'folder', 'heading', 'image'];
    if (!validTypes.includes(type)) {
      return new Response(
        JSON.stringify({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase admin client ( bypasses RLS )
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate API key and get permissions
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

    // Check write permission
    if (!keyData.permissions.includes('write')) {
      return new Response(
        JSON.stringify({ error: 'API key does not have write permission' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default sizes per block type
    const defaultSizes: Record<string, { w: number; h: number }> = {
      doc: { w: 400, h: 500 },
      text: { w: 300, h: 150 },
      kanban: { w: 800, h: 500 },
      checklist: { w: 350, h: 400 },
      table: { w: 600, h: 400 },
      inbox: { w: 400, h: 500 },
      folder: { w: 400, h: 400 },
      heading: { w: 400, h: 80 },
      image: { w: 400, h: 300 },
    };

    const size = defaultSizes[type];
    const finalW = w || size.w;
    const finalH = h || size.h;

    // Get max z-index for this board
    const { data: maxZData } = await supabaseAdmin
      .from('blocks')
      .select('z')
      .eq('board_id', board_id)
      .order('z', { ascending: false })
      .limit(1)
      .single();

    const newZ = (maxZData?.z || 0) + 1;

    // Build block data with title if provided
    const blockData = { ...data };
    if (title) {
      if (type === 'doc') {
        blockData.title = title;
      } else if (type === 'heading') {
        blockData.content = title;
      } else if (type === 'text') {
        blockData.content = title;
      } else {
        blockData.title = title;
      }
    }

    // Create the block
    const { data: block, error: insertError } = await supabaseAdmin
      .from('blocks')
      .insert({
        id: crypto.randomUUID(),
        user_id: keyData.user_id,
        board_id,
        type,
        x,
        y,
        w: finalW,
        h: finalH,
        z: newZ,
        data: blockData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create block', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last_used_at for the API key
    await supabaseAdmin
      .from('agent_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('key_hash', keyHashHex);

    return new Response(
      JSON.stringify({ 
        success: true, 
        block: {
          id: block.id,
          type: block.type,
          x: block.x,
          y: block.y,
          w: block.w,
          h: block.h,
          z: block.z,
          data: block.data,
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
