import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getAdminServiceClient } from '../../../../lib/supabase';

/**
 * Privileged Admin Mutation Handler
 * Executes moderation, queue pruning, user banning, and scheduling
 * using server-side elevated Service Role privileges.
 * Gated by strict session validation (user.app_metadata.is_admin === true).
 */
export async function POST(req: NextRequest) {
  // 1. Authenticate curator session via SSR cookies
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yhecwvbxhrpnzxxzsgbm.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user || !user.app_metadata?.is_admin) {
    return NextResponse.json(
      { error: 'Unauthorized: Verified curator credentials required.' },
      { status: 401 }
    );
  }

  const adminClient = getAdminServiceClient();
  const body = await req.json();
  const { action } = body;

  try {
    switch (action) {
      case 'remove_submission': {
        const { submissionId, reason } = body;
        const { error } = await adminClient
          .from('submissions')
          .update({
            status: 'removed',
            rejection_reason: reason || 'Removed by moderator',
          })
          .eq('id', submissionId);

        if (error) throw error;
        return NextResponse.json({ success: true });
      }

      case 'resolve_report': {
        const { reportId, status, notes } = body;
        const { error } = await adminClient
          .from('reports')
          .update({
            status,
            notes: notes || null,
          })
          .eq('id', reportId);

        if (error) throw error;
        return NextResponse.json({ success: true });
      }

      case 'ban_user': {
        const { userId } = body;
        const { error: banErr } = await adminClient
          .from('users')
          .update({ is_banned: true })
          .eq('id', userId);

        if (banErr) throw banErr;

        await adminClient
          .from('submissions')
          .update({
            status: 'rejected',
            rejection_reason: 'User account suspended for policy violation',
          })
          .eq('user_id', userId)
          .eq('status', 'queued');

        return NextResponse.json({ success: true });
      }

      case 'schedule_song': {
        const { date, dayNumber, song } = body;
        const { error: schedErr } = await adminClient.from('daily_songs').upsert({
          id: date,
          date,
          day_number: dayNumber,
          song_id: song.id,
          song,
          submitter_id: null,
          submitter_username: '365editorial',
          submitter_display_name: '365 Editorial',
          status: 'scheduled',
          published_at: new Date().toISOString(),
          like_count: 0,
        });

        if (schedErr) throw schedErr;

        await adminClient
          .from('submissions')
          .update({ status: 'selected', selected_date: date })
          .eq('song_id', song.id)
          .eq('status', 'queued');

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    console.error(`[Admin Mutate API Error] action=${action}:`, err);
    return NextResponse.json(
      { error: err?.message || 'Operation failed' },
      { status: 500 }
    );
  }
}
