import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, getApiKeyFromRequest } from '@/lib/auth';

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

    if (agent.id !== id) {
      return NextResponse.json(
        { error: "Not authorized to access this agent's events" },
        { status: 403 }
      );
    }

    // Dynamic import to avoid build-time issues
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get pending events
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .eq('agent_id', id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    // Mark events as delivered
    if (events && events.length > 0) {
      const eventIds = events.map((e: { id: string }) => e.id);
      await supabase
        .from('events')
        .update({ status: 'delivered' })
        .in('id', eventIds);
    }

    return NextResponse.json({ events: events || [] });
  } catch (error) {
    console.error('Events error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
