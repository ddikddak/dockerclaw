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

// DELETE /api/comments/[id] - Delete a comment
export async function DELETE(
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

    // Get the comment to verify ownership
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('id, card_id, author_id, author_type')
      .eq('id', id)
      .single();

    if (commentError || !comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    // Verify card belongs to agent
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select('id, agent_id')
      .eq('id', comment.card_id)
      .single();

    if (cardError || !card) {
      return NextResponse.json(
        { error: 'Card not found' },
        { status: 404 }
      );
    }

    if (card.agent_id !== agent.id) {
      return NextResponse.json(
        { error: 'Not authorized to delete this comment' },
        { status: 403 }
      );
    }

    // Delete the comment
    const { error: deleteError } = await supabase
      .from('comments')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: 'Comment deleted',
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
