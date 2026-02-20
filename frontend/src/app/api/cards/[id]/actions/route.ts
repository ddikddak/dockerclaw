import { NextRequest, NextResponse } from 'next/server';
import { cardActionSchema } from '@/lib/validation';
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

// POST /api/cards/[id]/actions - Card-level actions
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const apiKey = getApiKeyFromRequest(request);
    const { id } = await params;

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
      .select('id, agent_id, status')
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
    const result = cardActionSchema.safeParse(body);

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
    let newStatus = card.status;
    let actionPayload = { ...payload };

    // Process action
    switch (action) {
      case 'approve':
        newStatus = 'approved';
        break;
      case 'reject':
        newStatus = 'rejected';
        break;
      case 'delete':
        newStatus = 'deleted';
        break;
      case 'archive':
        newStatus = 'archived';
        break;
      case 'move':
        if (payload.column) {
          actionPayload = { ...payload, previous_status: card.status };
          newStatus = payload.column;
        }
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Update card status
    const { error: updateError } = await supabase
      .from('cards')
      .update({ status: newStatus })
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
        type: 'card_action',
        action,
        payload: actionPayload,
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
      type: 'card_action',
      payload: {
        card_id: id,
        action,
        status: newStatus,
        action_id: actionRecord.id,
      },
      status: 'pending',
    });

    return NextResponse.json({
      success: true,
      action: actionRecord,
      card: {
        id,
        status: newStatus,
      },
    });
  } catch (error) {
    console.error('Card action error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
