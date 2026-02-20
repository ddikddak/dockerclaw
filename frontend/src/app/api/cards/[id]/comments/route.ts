import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, getApiKeyFromRequest } from '@/lib/auth';
import { logCommentAdded } from '@/lib/activity';

// Helper to get supabase client
async function getSupabase() {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// GET /api/cards/[id]/comments - Get all comments for a card
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

    // Fetch comments
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('*')
      .eq('card_id', id)
      .order('created_at', { ascending: true });

    if (commentsError) {
      throw commentsError;
    }

    return NextResponse.json({ comments: comments || [] });
  } catch (error) {
    console.error('Get comments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/cards/[id]/comments - Add a comment to a card
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
    const { content, author_type = 'agent', author_id, author_name } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Create comment
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .insert({
        card_id: id,
        author_type: author_type === 'human' ? 'human' : 'agent',
        author_id: author_id || agent.id,
        author_name: author_name || agent.name,
        content: content.trim(),
      })
      .select()
      .single();

    if (commentError) {
      throw commentError;
    }

    // Create event for agent notification
    await supabase.from('events').insert({
      agent_id: agent.id,
      type: 'card_comment',
      payload: {
        card_id: id,
        comment_id: comment.id,
        content: comment.content,
        author: comment.author_name,
      },
      status: 'pending',
    });

    // Log activity
    await logCommentAdded(
      comment.id,
      id,
      author_type === 'human' ? 'human' : 'agent',
      author_id || agent.id,
      author_name || agent.name,
      content.trim()
    );

    return NextResponse.json({
      success: true,
      comment,
    });
  } catch (error) {
    console.error('Create comment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
