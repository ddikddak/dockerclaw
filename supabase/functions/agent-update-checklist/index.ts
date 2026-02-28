// ============================================
// Edge Function: Update Checklist (Agent API)
// PATCH /functions/v1/agent-update-checklist
// Headers: X-API-Key: dc_agent_xxx
// Body: { 
//   board_id, block_id,
//   action: "add" | "check" | "uncheck" | "remove" | "rename",
//   item_id?,          // required for check/uncheck/remove/rename
//   text?,             // required for add/rename
//   checked?           // optional, forces checked state
// }
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, x-api-key, content-type',
};

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  createdAt: string;
}

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
    const { board_id, block_id, action, item_id, text, checked } = body;

    if (!board_id || !block_id || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: board_id, block_id, action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validActions = ['add', 'check', 'uncheck', 'remove', 'rename', 'toggle'];
    if (!validActions.includes(action)) {
      return new Response(
        JSON.stringify({ error: `Invalid action. Must be one of: ${validActions.join(', ')}` }),
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

    // Get current checklist
    const { data: currentBlock, error: fetchError } = await supabaseAdmin
      .from('blocks')
      .select('data, type')
      .eq('id', block_id)
      .eq('board_id', board_id)
      .eq('type', 'checklist')
      .single();

    if (fetchError || !currentBlock) {
      return new Response(
        JSON.stringify({ error: 'Checklist not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentData = currentBlock.data || {};
    const items: ChecklistItem[] = currentData.items || [];
    let updatedItems = [...items];
    let actionResult = '';

    switch (action) {
      case 'add':
        if (!text) {
          return new Response(
            JSON.stringify({ error: 'text is required for add action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const newItem: ChecklistItem = {
          id: crypto.randomUUID(),
          text,
          checked: checked ?? false,
          createdAt: new Date().toISOString(),
        };
        updatedItems.push(newItem);
        actionResult = `Added item: "${text}"`;
        break;

      case 'check':
      case 'uncheck':
      case 'toggle':
        if (!item_id && !text) {
          return new Response(
            JSON.stringify({ error: 'item_id or text is required for check/uncheck/toggle actions' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const itemIndex = item_id 
          ? items.findIndex(i => i.id === item_id)
          : items.findIndex(i => i.text.toLowerCase() === text!.toLowerCase());
        
        if (itemIndex === -1) {
          return new Response(
            JSON.stringify({ error: 'Item not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const targetItem = updatedItems[itemIndex];
        const newCheckedState = action === 'check' ? true 
          : action === 'uncheck' ? false 
          : !targetItem.checked;
        
        updatedItems[itemIndex] = { ...targetItem, checked: newCheckedState };
        actionResult = `${newCheckedState ? 'Checked' : 'Unchecked'}: "${targetItem.text}"`;
        break;

      case 'remove':
        if (!item_id && !text) {
          return new Response(
            JSON.stringify({ error: 'item_id or text is required for remove action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const removeIndex = item_id
          ? items.findIndex(i => i.id === item_id)
          : items.findIndex(i => i.text.toLowerCase() === text!.toLowerCase());
        
        if (removeIndex === -1) {
          return new Response(
            JSON.stringify({ error: 'Item not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const removedItem = updatedItems[removeIndex];
        updatedItems.splice(removeIndex, 1);
        actionResult = `Removed: "${removedItem.text}"`;
        break;

      case 'rename':
        if (!item_id && !text) {
          return new Response(
            JSON.stringify({ error: 'item_id or current text is required for rename action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (!body.new_text) {
          return new Response(
            JSON.stringify({ error: 'new_text is required for rename action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const renameIndex = item_id
          ? items.findIndex(i => i.id === item_id)
          : items.findIndex(i => i.text.toLowerCase() === text!.toLowerCase());
        
        if (renameIndex === -1) {
          return new Response(
            JSON.stringify({ error: 'Item not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const oldText = updatedItems[renameIndex].text;
        updatedItems[renameIndex] = { ...updatedItems[renameIndex], text: body.new_text };
        actionResult = `Renamed: "${oldText}" → "${body.new_text}"`;
        break;
    }

    const { data: updatedBlock, error: updateError } = await supabaseAdmin
      .from('blocks')
      .update({
        data: { ...currentData, items: updatedItems },
        updated_at: new Date().toISOString(),
      })
      .eq('id', block_id)
      .eq('board_id', board_id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update checklist', details: updateError.message }),
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
        message: actionResult,
        checklist: {
          id: updatedBlock.id,
          items: updatedItems,
          total: updatedItems.length,
          completed: updatedItems.filter(i => i.checked).length,
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
