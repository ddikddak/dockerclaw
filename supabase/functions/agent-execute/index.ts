// ============================================
// Edge Function: Agent Execute (Unified Agent API)
// POST /functions/v1/agent-execute
// Headers: X-API-Key: dc_agent_xxx
// Body: { action, board_id?, params? }
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, x-api-key, content-type',
};

type AgentPermission = 'read' | 'write' | 'delete';
type BlockType = 'doc' | 'text' | 'kanban' | 'checklist' | 'table' | 'inbox' | 'folder' | 'heading' | 'image';
type ExecuteAction = 'list_boards' | 'list_blocks' | 'get_block' | 'create_block' | 'update_block' | 'delete_block' | 'clear_board' | 'move_to_folder' | 'move_from_folder';

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  createdAt: string;
}

const actionPermissions: Record<ExecuteAction, AgentPermission> = {
  list_boards: 'read',
  list_blocks: 'read',
  get_block: 'read',
  create_block: 'write',
  update_block: 'write',
  delete_block: 'delete',
  clear_board: 'write',
  move_to_folder: 'write',
  move_from_folder: 'write',
};

const defaultSizes: Record<BlockType, { w: number; h: number }> = {
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

async function hashApiKey(apiKey: string): Promise<string> {
  const keyHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(apiKey));
  return Array.from(new Uint8Array(keyHash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isBlockType(value: unknown): value is BlockType {
  return typeof value === 'string' && value in defaultSizes;
}

const defaultTitles: Record<string, string> = {
  doc: 'Untitled Document',
  text: 'Text Note',
  kanban: 'Kanban Board',
  checklist: 'Checklist',
  table: 'Table',
  inbox: 'Inbox',
  folder: 'Folder',
  heading: 'Heading',
  image: 'Image',
};

function getBlockTitle(type: string, data: Record<string, unknown>): string {
  if (typeof data.title === 'string' && data.title.length > 0) return data.title;
  if (typeof data.content === 'string' && data.content.length > 0) return data.content.slice(0, 60);
  return defaultTitles[type] || 'Untitled';
}

function getBlockPreview(type: string, data: Record<string, unknown>): string {
  switch (type) {
    case 'doc': return typeof data.contentMarkdown === 'string' ? data.contentMarkdown.slice(0, 100) : 'Empty document';
    case 'text': return typeof data.content === 'string' ? data.content.slice(0, 100) : 'Empty note';
    case 'kanban': return `${Array.isArray(data.cards) ? data.cards.length : 0} cards`;
    case 'checklist': return `${Array.isArray(data.items) ? data.items.length : 0} items`;
    case 'table': return `${Array.isArray(data.rows) ? data.rows.length : 0} rows`;
    case 'inbox': return `${Array.isArray(data.items) ? data.items.length : 0} items`;
    case 'image': return typeof data.fileName === 'string' ? data.fileName : 'Image';
    case 'heading': return typeof data.content === 'string' ? data.content.slice(0, 100) : 'Empty heading';
    default: return '';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed. Use POST.' }, 405);
  }

  try {
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return jsonResponse({ error: 'Missing X-API-Key header' }, 401);
    }

    const body = await req.json();
    const boardId = body?.board_id as string | undefined;
    const action = body?.action as ExecuteAction | undefined;
    const params = (body?.params ?? {}) as Record<string, unknown>;

    const validActions: ExecuteAction[] = ['list_boards', 'list_blocks', 'get_block', 'create_block', 'update_block', 'delete_block', 'clear_board', 'move_to_folder', 'move_from_folder'];
    if (!action || !validActions.includes(action)) {
      return jsonResponse({ error: `Invalid action. Must be one of: ${validActions.join(', ')}` }, 400);
    }

    // board_id is required for all block operations
    if (action !== 'list_boards' && (typeof boardId !== 'string' || boardId.length === 0)) {
      return jsonResponse({ error: 'Missing required field: board_id' }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate API key by hash only (user-level key)
    const keyHashHex = await hashApiKey(apiKey);
    const { data: keyData, error: keyError } = await supabaseAdmin
      .from('agent_api_keys')
      .select('id, user_id, board_id, permissions, is_active')
      .eq('key_hash', keyHashHex)
      .eq('is_active', true)
      .single();

    if (keyError || !keyData) {
      return jsonResponse({ error: 'Invalid or inactive API key' }, 401);
    }

    const requiredPermission = actionPermissions[action];
    if (!Array.isArray(keyData.permissions) || !keyData.permissions.includes(requiredPermission)) {
      return jsonResponse({ error: `API key does not have ${requiredPermission} permission` }, 403);
    }

    const nowIso = new Date().toISOString();
    const touchKeyUsage = () =>
      supabaseAdmin
        .from('agent_api_keys')
        .update({ last_used_at: nowIso, updated_at: nowIso })
        .eq('id', keyData.id);

    // ---- list_boards: return all boards owned by the user ----
    if (action === 'list_boards') {
      const { data: boards, error: boardsError } = await supabaseAdmin
        .from('boards')
        .select('id, name, created_at, updated_at, settings')
        .eq('user_id', keyData.user_id)
        .order('updated_at', { ascending: false });

      if (boardsError) {
        return jsonResponse({ error: 'Failed to list boards', details: boardsError.message }, 500);
      }

      await touchKeyUsage();
      return jsonResponse({ success: true, action, count: boards?.length ?? 0, boards: boards ?? [] });
    }

    // ---- clear_board: soft-delete all blocks on a board ----
    if (action === 'clear_board') {
      const permanent = Boolean(params?.permanent);

      if (permanent) {
        const { data: deleted, error: clearError } = await supabaseAdmin
          .from('blocks')
          .delete()
          .eq('board_id', boardId!)
          .select('id');

        if (clearError) {
          return jsonResponse({ error: 'Failed to clear board', details: clearError.message }, 500);
        }

        await touchKeyUsage();
        return jsonResponse({ success: true, action, deleted_count: deleted?.length ?? 0, permanent: true });
      } else {
        // Soft-delete so realtime sync propagates deletedAt to local clients
        const { data: deleted, error: clearError } = await supabaseAdmin
          .from('blocks')
          .update({ deleted_at: nowIso, updated_at: nowIso })
          .eq('board_id', boardId!)
          .is('deleted_at', null)
          .select('id');

        if (clearError) {
          return jsonResponse({ error: 'Failed to clear board', details: clearError.message }, 500);
        }

        await touchKeyUsage();
        return jsonResponse({ success: true, action, deleted_count: deleted?.length ?? 0, permanent: false });
      }
    }

    // ---- Block operations below — boardId is guaranteed non-empty ----

    if (action === 'list_blocks') {
      const includeDeleted = Boolean(params?.include_deleted);
      const typeFilter = params?.type;

      let query = supabaseAdmin
        .from('blocks')
        .select('id, type, x, y, w, h, z, locked, agent_access, data, created_at, updated_at, deleted_at')
        .eq('board_id', boardId!)
        .order('created_at', { ascending: false });

      if (!includeDeleted) {
        query = query.is('deleted_at', null);
      }
      if (typeof typeFilter === 'string') {
        query = query.eq('type', typeFilter);
      }

      const { data: blocks, error: listError } = await query;
      if (listError) {
        return jsonResponse({ error: 'Failed to list blocks', details: listError.message }, 500);
      }

      await touchKeyUsage();
      return jsonResponse({ success: true, action, count: blocks?.length ?? 0, blocks: blocks ?? [] });
    }

    if (action === 'get_block') {
      const blockId = params?.block_id;
      if (typeof blockId !== 'string' || blockId.length === 0) {
        return jsonResponse({ error: 'params.block_id is required for get_block' }, 400);
      }

      const { data: block, error: getError } = await supabaseAdmin
        .from('blocks')
        .select('*')
        .eq('id', blockId)
        .eq('board_id', boardId!)
        .single();

      if (getError || !block) {
        return jsonResponse({ error: 'Block not found' }, 404);
      }

      await touchKeyUsage();
      return jsonResponse({ success: true, action, block });
    }

    if (action === 'create_block') {
      const type = params?.type;
      if (!isBlockType(type)) {
        return jsonResponse({ error: `params.type is required and must be one of: ${Object.keys(defaultSizes).join(', ')}` }, 400);
      }

      const x = typeof params?.x === 'number' ? params.x : 100;
      const y = typeof params?.y === 'number' ? params.y : 100;
      const w = typeof params?.w === 'number' ? params.w : defaultSizes[type].w;
      const h = typeof params?.h === 'number' ? params.h : defaultSizes[type].h;
      const title = params?.title;
      const content = params?.content;
      const tags = params?.tags;
      const providedData = typeof params?.data === 'object' && params?.data !== null ? params.data as Record<string, unknown> : {};

      const { data: maxZData } = await supabaseAdmin
        .from('blocks')
        .select('z')
        .eq('board_id', boardId!)
        .order('z', { ascending: false })
        .limit(1)
        .single();
      const newZ = (maxZData?.z || 0) + 1;

      const blockData: Record<string, unknown> = { ...providedData };
      if (typeof title === 'string' && title.length > 0) {
        if (type === 'doc') {
          blockData.title = title;
        } else if (type === 'heading' || type === 'text') {
          blockData.content = title;
        } else {
          blockData.title = title;
        }
      }
      if (typeof content === 'string') {
        blockData[type === 'doc' ? 'contentMarkdown' : 'content'] = content;
      }
      if (type === 'doc' && Array.isArray(tags)) {
        blockData.tags = tags;
      }

      const { data: block, error: createError } = await supabaseAdmin
        .from('blocks')
        .insert({
          id: crypto.randomUUID(),
          user_id: keyData.user_id,
          board_id: boardId!,
          type,
          x,
          y,
          w,
          h,
          z: newZ,
          data: blockData,
          created_at: nowIso,
          updated_at: nowIso,
        })
        .select()
        .single();

      if (createError) {
        return jsonResponse({ error: 'Failed to create block', details: createError.message }, 500);
      }

      await touchKeyUsage();
      return jsonResponse({ success: true, action, block }, 201);
    }

    if (action === 'update_block') {
      const blockId = params?.block_id;
      if (typeof blockId !== 'string' || blockId.length === 0) {
        return jsonResponse({ error: 'params.block_id is required for update_block' }, 400);
      }

      const { data: currentBlock, error: fetchError } = await supabaseAdmin
        .from('blocks')
        .select('id, type, data, deleted_at')
        .eq('id', blockId)
        .eq('board_id', boardId!)
        .single();

      if (fetchError || !currentBlock) {
        return jsonResponse({ error: 'Block not found' }, 404);
      }
      if (currentBlock.deleted_at) {
        return jsonResponse({ error: 'Block is deleted. Restore before updating.' }, 409);
      }

      const updatePayload: Record<string, unknown> = { updated_at: nowIso };
      const numericFields: Array<keyof typeof params> = ['x', 'y', 'w', 'h', 'z'];
      for (const field of numericFields) {
        if (typeof params[field] === 'number') {
          updatePayload[field] = params[field];
        }
      }
      if (typeof params?.locked === 'boolean') {
        updatePayload.locked = params.locked;
      }

      const currentData = (currentBlock.data ?? {}) as Record<string, unknown>;
      const mergedData: Record<string, unknown> = { ...currentData };
      if (typeof params?.data === 'object' && params?.data !== null) {
        Object.assign(mergedData, params.data as Record<string, unknown>);
      }

      if (typeof params?.title === 'string') {
        if (currentBlock.type === 'doc') {
          mergedData.title = params.title;
        } else if (currentBlock.type === 'heading') {
          mergedData.content = params.title;
        } else {
          mergedData.title = params.title;
        }
      }

      if (typeof params?.content === 'string') {
        if (currentBlock.type === 'doc') {
          const append = Boolean(params?.append);
          const currentMarkdown = typeof mergedData.contentMarkdown === 'string' ? mergedData.contentMarkdown : '';
          mergedData.contentMarkdown = append && currentMarkdown
            ? `${currentMarkdown}\n\n${params.content}`
            : params.content;
        } else {
          mergedData.content = params.content;
        }
      }

      if (currentBlock.type === 'doc' && Array.isArray(params?.tags)) {
        mergedData.tags = params.tags;
      }

      if (currentBlock.type === 'checklist' && typeof params?.checklist_action === 'string') {
        const actionType = params.checklist_action;
        const validChecklistActions = new Set(['add', 'check', 'uncheck', 'toggle', 'remove', 'rename']);
        if (!validChecklistActions.has(actionType)) {
          return jsonResponse({ error: 'Invalid checklist_action' }, 400);
        }

        const items = Array.isArray(mergedData.items) ? [...(mergedData.items as ChecklistItem[])] : [];
        const itemId = params?.item_id;
        const text = params?.text;
        const newText = params?.new_text;

        const findItemIndex = () => {
          if (typeof itemId === 'string') {
            return items.findIndex((item) => item.id === itemId);
          }
          if (typeof text === 'string') {
            return items.findIndex((item) => item.text.toLowerCase() === text.toLowerCase());
          }
          return -1;
        };

        if (actionType === 'add') {
          if (typeof text !== 'string' || text.length === 0) {
            return jsonResponse({ error: 'params.text is required for checklist_action=add' }, 400);
          }
          items.push({
            id: crypto.randomUUID(),
            text,
            checked: Boolean(params?.checked),
            createdAt: nowIso,
          });
        } else {
          const index = findItemIndex();
          if (index === -1) {
            return jsonResponse({ error: 'Checklist item not found' }, 404);
          }

          if (actionType === 'remove') {
            items.splice(index, 1);
          } else if (actionType === 'rename') {
            if (typeof newText !== 'string' || newText.length === 0) {
              return jsonResponse({ error: 'params.new_text is required for checklist_action=rename' }, 400);
            }
            items[index] = { ...items[index], text: newText };
          } else if (actionType === 'check') {
            items[index] = { ...items[index], checked: true };
          } else if (actionType === 'uncheck') {
            items[index] = { ...items[index], checked: false };
          } else if (actionType === 'toggle') {
            items[index] = { ...items[index], checked: !items[index].checked };
          }
        }

        mergedData.items = items;
      }

      updatePayload.data = mergedData;

      const { data: updatedBlock, error: updateError } = await supabaseAdmin
        .from('blocks')
        .update(updatePayload)
        .eq('id', blockId)
        .eq('board_id', boardId!)
        .select()
        .single();

      if (updateError) {
        return jsonResponse({ error: 'Failed to update block', details: updateError.message }, 500);
      }

      await touchKeyUsage();
      return jsonResponse({ success: true, action, block: updatedBlock });
    }

    if (action === 'move_to_folder') {
      const blockId = params?.block_id;
      const folderId = params?.folder_id;
      if (typeof blockId !== 'string' || blockId.length === 0) {
        return jsonResponse({ error: 'params.block_id is required for move_to_folder' }, 400);
      }
      if (typeof folderId !== 'string' || folderId.length === 0) {
        return jsonResponse({ error: 'params.folder_id is required for move_to_folder' }, 400);
      }
      if (blockId === folderId) {
        return jsonResponse({ error: 'Cannot move a block into itself' }, 400);
      }

      // Fetch both blocks
      const { data: sourceBlock, error: srcErr } = await supabaseAdmin
        .from('blocks')
        .select('*')
        .eq('id', blockId)
        .eq('board_id', boardId!)
        .is('deleted_at', null)
        .single();
      if (srcErr || !sourceBlock) {
        return jsonResponse({ error: 'Source block not found' }, 404);
      }

      const { data: folderBlock, error: folderErr } = await supabaseAdmin
        .from('blocks')
        .select('*')
        .eq('id', folderId)
        .eq('board_id', boardId!)
        .is('deleted_at', null)
        .single();
      if (folderErr || !folderBlock) {
        return jsonResponse({ error: 'Folder block not found' }, 404);
      }
      if (folderBlock.type !== 'folder') {
        return jsonResponse({ error: 'Target block is not a folder' }, 400);
      }

      // Transform block → FolderItem (server-side, matching Canvas.tsx blockToFolderItem)
      const blockData = (sourceBlock.data ?? {}) as Record<string, unknown>;
      const folderItem = {
        id: crypto.randomUUID(),
        type: sourceBlock.type,
        title: getBlockTitle(sourceBlock.type, blockData),
        preview: getBlockPreview(sourceBlock.type, blockData),
        data: sourceBlock.data,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      // Append to folder items
      const folderData = (folderBlock.data ?? {}) as Record<string, unknown>;
      const existingItems = Array.isArray(folderData.items) ? folderData.items : [];
      const updatedFolderData = { ...folderData, items: [...existingItems, folderItem] };

      // Update folder + soft-delete source block
      const { error: updateErr } = await supabaseAdmin
        .from('blocks')
        .update({ data: updatedFolderData, updated_at: nowIso })
        .eq('id', folderId)
        .eq('board_id', boardId!);
      if (updateErr) {
        return jsonResponse({ error: 'Failed to update folder', details: updateErr.message }, 500);
      }

      const { error: deleteErr } = await supabaseAdmin
        .from('blocks')
        .update({ deleted_at: nowIso, updated_at: nowIso })
        .eq('id', blockId)
        .eq('board_id', boardId!);
      if (deleteErr) {
        return jsonResponse({ error: 'Failed to remove source block', details: deleteErr.message }, 500);
      }

      await touchKeyUsage();
      return jsonResponse({
        success: true,
        action,
        folder_id: folderId,
        moved_block_id: blockId,
        folder_item_id: folderItem.id,
        message: `Block moved into folder "${folderData.title || 'Untitled'}"`,
      });
    }

    if (action === 'move_from_folder') {
      const folderId = params?.folder_id;
      const itemId = params?.item_id;
      if (typeof folderId !== 'string' || folderId.length === 0) {
        return jsonResponse({ error: 'params.folder_id is required for move_from_folder' }, 400);
      }
      if (typeof itemId !== 'string' || itemId.length === 0) {
        return jsonResponse({ error: 'params.item_id is required for move_from_folder' }, 400);
      }

      // Fetch folder
      const { data: folderBlock, error: folderErr } = await supabaseAdmin
        .from('blocks')
        .select('*')
        .eq('id', folderId)
        .eq('board_id', boardId!)
        .is('deleted_at', null)
        .single();
      if (folderErr || !folderBlock) {
        return jsonResponse({ error: 'Folder block not found' }, 404);
      }
      if (folderBlock.type !== 'folder') {
        return jsonResponse({ error: 'Target block is not a folder' }, 400);
      }

      const folderData = (folderBlock.data ?? {}) as Record<string, unknown>;
      const items = Array.isArray(folderData.items) ? folderData.items as Array<Record<string, unknown>> : [];
      const itemIndex = items.findIndex((i) => i.id === itemId);
      if (itemIndex === -1) {
        return jsonResponse({ error: 'Item not found in folder' }, 404);
      }

      const item = items[itemIndex];
      const itemType = typeof item.type === 'string' ? item.type : 'text';

      // Position: next to the folder, or use provided coords
      const x = typeof params?.x === 'number' ? params.x : (folderBlock.x + folderBlock.w + 40);
      const y = typeof params?.y === 'number' ? params.y : folderBlock.y;
      const size = defaultSizes[itemType as BlockType] || { w: 300, h: 200 };
      const w = typeof params?.w === 'number' ? params.w : size.w;
      const h = typeof params?.h === 'number' ? params.h : size.h;

      // Get max z
      const { data: maxZData } = await supabaseAdmin
        .from('blocks')
        .select('z')
        .eq('board_id', boardId!)
        .order('z', { ascending: false })
        .limit(1)
        .single();
      const newZ = (maxZData?.z || 0) + 1;

      // Create new block from folder item data
      const { data: newBlock, error: createErr } = await supabaseAdmin
        .from('blocks')
        .insert({
          id: crypto.randomUUID(),
          user_id: keyData.user_id,
          board_id: boardId!,
          type: itemType,
          x,
          y,
          w,
          h,
          z: newZ,
          data: item.data ?? {},
          created_at: nowIso,
          updated_at: nowIso,
        })
        .select()
        .single();

      if (createErr) {
        return jsonResponse({ error: 'Failed to create block from folder item', details: createErr.message }, 500);
      }

      // Remove item from folder
      const updatedItems = items.filter((_, idx) => idx !== itemIndex);
      const updatedFolderData = { ...folderData, items: updatedItems };
      const { error: updateErr } = await supabaseAdmin
        .from('blocks')
        .update({ data: updatedFolderData, updated_at: nowIso })
        .eq('id', folderId)
        .eq('board_id', boardId!);
      if (updateErr) {
        return jsonResponse({ error: 'Failed to update folder', details: updateErr.message }, 500);
      }

      await touchKeyUsage();
      return jsonResponse({
        success: true,
        action,
        folder_id: folderId,
        removed_item_id: itemId,
        block: newBlock,
        message: `Item extracted from folder as new ${itemType} block`,
      });
    }

    if (action === 'delete_block') {
      const blockId = params?.block_id;
      if (typeof blockId !== 'string' || blockId.length === 0) {
        return jsonResponse({ error: 'params.block_id is required for delete_block' }, 400);
      }

      const permanent = Boolean(params?.permanent);
      if (permanent) {
        const { error } = await supabaseAdmin
          .from('blocks')
          .delete()
          .eq('id', blockId)
          .eq('board_id', boardId!);
        if (error) {
          return jsonResponse({ error: 'Failed to permanently delete block', details: error.message }, 500);
        }
      } else {
        const { error } = await supabaseAdmin
          .from('blocks')
          .update({ deleted_at: nowIso, updated_at: nowIso })
          .eq('id', blockId)
          .eq('board_id', boardId!);
        if (error) {
          return jsonResponse({ error: 'Failed to soft delete block', details: error.message }, 500);
        }
      }

      await touchKeyUsage();
      return jsonResponse({
        success: true,
        action,
        block_id: blockId,
        permanent,
        message: permanent ? 'Block permanently deleted' : 'Block moved to trash',
      });
    }

    return jsonResponse({ error: 'Unsupported action' }, 400);
  } catch (err) {
    console.error('agent-execute error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return jsonResponse({ error: 'Internal server error', details: message }, 500);
  }
});
