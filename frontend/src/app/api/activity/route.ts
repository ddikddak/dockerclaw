import { NextRequest, NextResponse } from 'next/server';
import { getApiKeyFromRequest, validateApiKey } from '@/lib/auth';
import { getActivityLog, ActivityAction, TargetType } from '@/lib/activity';

// GET /api/activity - Get activity log
export async function GET(request: NextRequest) {
  try {
    const apiKey = getApiKeyFromRequest(request);
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    const agent = await validateApiKey(apiKey);
    if (!agent) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    const options = {
      targetId: searchParams.get('targetId') || undefined,
      targetType: (searchParams.get('targetType') as TargetType) || undefined,
      actorId: searchParams.get('actorId') || undefined,
      action: (searchParams.get('action') as ActivityAction) || undefined,
      limit: parseInt(searchParams.get('limit') || '50', 10),
      offset: parseInt(searchParams.get('offset') || '0', 10),
    };

    const activities = await getActivityLog(options);
    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Activity GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
