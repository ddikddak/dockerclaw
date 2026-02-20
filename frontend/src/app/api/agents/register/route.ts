import { NextRequest, NextResponse } from 'next/server';
import { registerAgentSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = registerAgentSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, email, webhook_url } = result.data;
    const api_key = `dk_${crypto.randomUUID().replace(/-/g, '')}`;

    // Dynamic import to avoid build-time issues
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: agent, error } = await supabase
      .from('agents')
      .insert({
        name,
        email,
        api_key,
        webhook_url: webhook_url || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Email already registered' },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json(
      {
        agent: {
          id: agent.id,
          name: agent.name,
          email: agent.email,
          webhook_url: agent.webhook_url,
          created_at: agent.created_at,
        },
        api_key,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
