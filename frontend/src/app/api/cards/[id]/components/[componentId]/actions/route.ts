import { NextRequest, NextResponse } from 'next/server';
import { componentActionSchema } from '@/lib/validation';
import { validateApiKey, getApiKeyFromRequest } from '@/lib/auth';

// Helper to get supabase client
async function getSupabase() {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// POST /api/cards/[id]/components/[componentId]/actions - Component-level actions
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; componentId: string }> }
) {
  try {
    const apiKey = getApiKeyFromRequest(request);
    const { id, componentId } = await params;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required in X-API-Key header' },
        { status: 401 }
      );
    }

    const agent = await validateApiKey(apiKey);

    if (!agent) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    const supabase = await getSupabase();

    // Verify card exists and belongs to agent
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select('id, agent_id, data')
      .eq('id', id)
      .single();

    if (cardError || !card) {
      return NextResponse.json(
        { error: 'Card not found' },
        { status: 404 }
      );
    }

    if (card.agent_id !== agent.id) {
      return NextResponse.json(
        { error: 'Not authorized to modify this card' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const result = componentActionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { action, payload } = result.data;
    const cardData = (card.data as Record<string, any>) || {};
    let updatedData = { ...cardData };

    // Process component action
    switch (action) {
      case 'edit_text':
      case 'edit_code':
        if (payload.text !== undefined) {
          updatedData[componentId] = {
            ...updatedData[componentId],
            content: payload.text,
          };
        }
        break;

      case 'toggle_check':
        if (typeof payload.itemIndex === 'number' && payload.itemIndex >= 0) {
          const checklist = updatedData[componentId]?.items || [];
          const index = payload.itemIndex;
          if (index < checklist.length && checklist[index]) {
            checklist[index] = {
              ...checklist[index],
              checked: !checklist[index].checked,
            };
            updatedData[componentId] = {
              ...updatedData[componentId],
              items: checklist,
            };
          }
        }
        break;

      case 'add_comment':
        if (payload.comment) {
          const comments = updatedData.comments || [];
          comments.push({
            id: crypto.randomUUID(),
            text: payload.comment,
            author: payload.author || 'user',
            timestamp: new Date().toISOString(),
          });
          updatedData.comments = comments;
        }
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Update card data
    const { error: updateError } = await supabase
      .from('cards')
      .update({ data: updatedData })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    // Create action record
    const { data: actionRecord, error: actionError } = await supabase
      .from('actions')
      .insert({
        card_id: id,
        agent_id: agent.id,
        type: 'component_action',
        action,
        payload: {
          ...payload,
          componentId,
        },
        status: 'processed',
      })
      .select()
      .single();

    if (actionError) {
      throw actionError;
    }

    // Create event for agent notification
    await supabase.from('events').insert({
      agent_id: agent.id,
      type: 'component_action',
      payload: {
        card_id: id,
        component_id: componentId,
        action,
        action_id: actionRecord.id,
      },
      status: 'pending',
    });

    return NextResponse.json({
      success: true,
      action: actionRecord,
      card: {
        id,
        data: updatedData,
      },
    });
  } catch (error) {
    console.error('Component action error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
