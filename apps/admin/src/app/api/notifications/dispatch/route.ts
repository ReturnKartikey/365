import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { PushDispatcher } from '../../../../lib/pushDispatcher';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

/**
 * Endpoint to trigger daily release execution and dispatch push notifications.
 * Can be called by pg_cron, admin portal, or scheduled cloud webhooks.
 */
export async function POST(req: Request) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is acceptable
    }

    const targetDate = body?.targetDate || null;

    // 1. Execute atomic daily release stored procedure
    const { data: releaseData, error: releaseErr } = await supabase.rpc(
      'execute_daily_release',
      { p_target_date: targetDate }
    );

    if (releaseErr) {
      console.error('[API Notification Dispatch] execute_daily_release RPC error:', releaseErr);
      return NextResponse.json(
        { error: releaseErr.message || 'Failed to execute daily release RPC' },
        { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    let pushResult = {
      communityTokensSent: 0,
      submitterNotified: false,
    };

    // 2. Dispatch push notifications if release succeeded and was not previously published
    if (releaseData?.success && releaseData?.song) {
      const pushRes = await PushDispatcher.dispatchDailyRelease({
        dayNumber: releaseData.dayNumber,
        song: releaseData.song,
        submitterUsername: releaseData.submitterUsername,
      });

      pushResult = {
        communityTokensSent: pushRes.communityTokensSent,
        submitterNotified: pushRes.submitterNotified,
      };
    }

    return NextResponse.json(
      {
        success: true,
        release: releaseData,
        push: pushResult,
        message: releaseData?.alreadyPublished
          ? 'Song was already published today. Push dispatch skipped.'
          : `Release executed for Day ${releaseData?.dayNumber}. Push notifications dispatched.`,
      },
      {
        headers: { 'Access-Control-Allow-Origin': '*' },
      }
    );
  } catch (err: any) {
    console.error('[API Notification Dispatch] Exception:', err);
    return NextResponse.json(
      { error: err?.message || 'Server error dispatching notifications' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      status: 'active',
      ritualTime: '19:00 IST',
      description: '365 Daily Release & Push Notification Dispatch Endpoint',
    },
    { headers: { 'Access-Control-Allow-Origin': '*' } }
  );
}
