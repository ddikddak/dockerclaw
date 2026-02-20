import { NextRequest, NextResponse } from 'next/server';
import { createCardSchema } from '@/lib/validation';
import { validateApiKey, getApiKeyFromRequest } from '@/lib/auth';
import { logCardCreated } from '@/lib/activity';

// Helper to get supabase client
async function getSupabase() {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// GET /api/cards - List cards
export async function GET(request: NextRequest) {
  try {
    const apiKey = getApiKeyFromRequest(request);

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
    const { data: cards, error } = await supabase
      .from('cards')
      .select(`
        *,
        templates(name)
      `)
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ cards: cards || [] });
  } catch (error) {
    console.error('List cards error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/cards - Create card
export async function POST(request: NextRequest) {
  try {
    const apiKey = getApiKeyFromRequest(request);

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

    const body = await request.json();
    const result = createCardSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { template_id, data } = result.data;
    const supabase = await getSupabase();

    // Verify template belongs to agent
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('id')
      .eq('id', template_id)
      .eq('agent_id', agent.id)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Template not found or not owned by this agent' },
        { status: 404 }
      );
    }

    const { data: card, error } = await supabase
      .from('cards')
      .insert({
        template_id,
        agent_id: agent.id,
        data,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Log activity
    await logCardCreated(
      card.id,
      'agent',
      agent.id,
      agent.name,
      { template_id, title: data.title }
    );

    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    console.error('Create card error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
