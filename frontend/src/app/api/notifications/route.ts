import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getApiKeyFromRequest, validateApiKey } from '@/lib/auth';
import { getNotifications, getUnreadCount, markNotificationAsRead, markAllNotificationsAsRead } from '@/lib/activity';

// GET /api/notifications - Get notifications for current user
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
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const countOnly = searchParams.get('count') === 'true';

    // Use agent.id as user_id for now
    const userId = agent.id;

    if (countOnly) {
      const count = await getUnreadCount(userId);
      return NextResponse.json({ count });
    }

    const notifications = await getNotifications(userId, { unreadOnly, limit });
    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Notifications GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/notifications - Mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const apiKey = getApiKeyFromRequest(request);
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    const agent = await validateApiKey(apiKey);
    if (!agent) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const body = await request.json();
    const userId = agent.id;

    if (body.all) {
      // Mark all as read
      const success = await markAllNotificationsAsRead(userId);
      return NextResponse.json({ success });
    } else if (body.id) {
      // Mark single notification as read
      const success = await markNotificationAsRead(body.id);
      return NextResponse.json({ success });
    }

    return NextResponse.json({ error: 'Missing id or all parameter' }, { status: 400 });
  } catch (error) {
    console.error('Notifications PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
