import { NextRequest, NextResponse } from 'next/server';
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

const VALID_EMOJIS = ['👍', '❤️', '🎉', '🚀', '👀'];

// GET /api/cards/[id]/reactions - Get all reactions for a card
export async function GET(
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
      .select('id, agent_id')
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
        { error: 'Not authorized to access this card' },
        { status: 403 }
      );
    }

    // Fetch reactions
    const { data: reactions, error: reactionsError } = await supabase
      .from('reactions')
      .select('*')
      .eq('card_id', id)
      .order('created_at', { ascending: true });

    if (reactionsError) {
      throw reactionsError;
    }

    return NextResponse.json({ reactions: reactions || [] });
  } catch (error) {
    console.error('Get reactions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/cards/[id]/reactions - Toggle a reaction (add/remove)
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
      .select('id, agent_id')
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
    const { emoji, author_type = 'agent', author_id, author_name } = body;

    // Validate emoji
    if (!emoji || !VALID_EMOJIS.includes(emoji)) {
      return NextResponse.json(
        { error: `Invalid emoji. Valid emojis: ${VALID_EMOJIS.join(', ')}` },
        { status: 400 }
      );
    }

    const authorId = author_id || agent.id;
    const reactionAuthorType = author_type === 'human' ? 'human' : 'agent';

    // Check if reaction already exists
    const { data: existingReaction, error: checkError } = await supabase
      .from('reactions')
      .select('id')
      .eq('card_id', id)
      .eq('author_id', authorId)
      .eq('emoji', emoji)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is expected
      throw checkError;
    }

    if (existingReaction) {
      // Remove reaction (toggle off)
      const { error: deleteError } = await supabase
        .from('reactions')
        .delete()
        .eq('id', existingReaction.id);

      if (deleteError) {
        throw deleteError;
      }

      // Create event for agent notification
      await supabase.from('events').insert({
        agent_id: agent.id,
        type: 'card_reaction_removed',
        payload: {
          card_id: id,
          emoji,
          author: author_name || agent.name,
        },
        status: 'pending',
      });

      return NextResponse.json({
        success: true,
        action: 'removed',
        reaction: { id: existingReaction.id, emoji },
      });
    } else {
      // Add reaction (toggle on)
      const { data: reaction, error: reactionError } = await supabase
        .from('reactions')
        .insert({
          card_id: id,
          author_type: reactionAuthorType,
          author_id: authorId,
          emoji,
        })
        .select()
        .single();

      if (reactionError) {
        throw reactionError;
      }

      // Create event for agent notification
      await supabase.from('events').insert({
        agent_id: agent.id,
        type: 'card_reaction',
        payload: {
          card_id: id,
          reaction_id: reaction.id,
          emoji,
          author: author_name || agent.name,
        },
        status: 'pending',
      });

      return NextResponse.json({
        success: true,
        action: 'added',
        reaction,
      });
    }
  } catch (error) {
    console.error('Toggle reaction error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
