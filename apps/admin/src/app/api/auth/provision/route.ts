import { NextResponse } from 'next/server';
import { getAdminServiceClient } from '../../../../lib/supabase';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-secret',
    },
  });
}

/**
 * Secure Provisioning Endpoint (Dev & Seeding Only)
 * Protected by strict x-admin-secret header to prevent arbitrary account hijacking.
 */
export async function POST(req: Request) {
  try {
    const secretHeader = req.headers.get('x-admin-secret');
    const expectedSecret = process.env.ADMIN_PROVISION_SECRET || '365_admin_internal_sec_2026';

    // Gate with shared secret
    if (!secretHeader || secretHeader !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing or invalid x-admin-secret header.' },
        {
          status: 401,
          headers: { 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    const body = await req.json();
    const email = body?.email;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'A valid email address is required.' },
        {
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    const adminClient = getAdminServiceClient();
    const cleanEmail = email.trim().toLowerCase();
    const local = (cleanEmail.split('@')[0] || 'listener').trim().toLowerCase();
    let nameWithoutTrailingNumbers = local.replace(/\d+$/, '');
    if (!nameWithoutTrailingNumbers || nameWithoutTrailingNumbers.length < 2) {
      nameWithoutTrailingNumbers = local;
    }
    const cleanUsername =
      nameWithoutTrailingNumbers.replace(/[^a-z0-9_]/g, '') ||
      local.replace(/[^a-z0-9_]/g, '') ||
      'listener';
    
    // Capitalize display name
    const parts = (nameWithoutTrailingNumbers || local).replace(/[._\-+]/g, ' ').trim().split(/\s+/);
    const cleanDisplayName = parts.filter(Boolean).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ') ||
      cleanUsername.charAt(0).toUpperCase() + cleanUsername.slice(1);

    const devPassword = `365Auth!${cleanUsername}`;

    // 1. Check if user already exists
    const { data: listData } = await adminClient.auth.admin.listUsers();
    const existing = listData?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);

    let userId: string;
    if (existing) {
      userId = existing.id;
      // Do NOT overwrite existing user's password unless explicitly requested by authorized dev script
      if (body?.forceResetPassword) {
        await adminClient.auth.admin.updateUserById(userId, {
          password: devPassword,
          email_confirm: true,
        });
      }
    } else {
      // Create new user with confirmed email
      const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
        email: cleanEmail,
        password: devPassword,
        email_confirm: true,
        user_metadata: {
          display_name: cleanDisplayName,
          username: cleanUsername,
        },
      });

      if (createErr) {
        return NextResponse.json(
          { error: createErr.message },
          {
            status: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
          }
        );
      }
      userId = created.user.id;
    }

    // 2. Ensure public.users table row exists
    const { data: dbUser } = await adminClient
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!dbUser) {
      await adminClient.from('users').insert({
        id: userId,
        email: cleanEmail,
        username: cleanUsername,
        display_name: cleanDisplayName,
        is_guest: false,
        is_banned: false,
        is_admin: false,
        notification_prefs: { dailyRelease: true, songSelected: true },
        push_tokens: [],
        stats: { songs_featured: 0, listening_streak: 1, total_submissions: 0 },
      });
    } else {
      await adminClient
        .from('users')
        .update({
          username: cleanUsername,
          display_name: cleanDisplayName,
          is_guest: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: userId,
          email: cleanEmail,
          username: cleanUsername,
          displayName: cleanDisplayName,
        },
        devPassword,
      },
      {
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Internal provisioning failure' },
      {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
      }
    );
  }
}
