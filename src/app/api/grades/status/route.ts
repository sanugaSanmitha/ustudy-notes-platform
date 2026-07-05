import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';

const MAX_UPLOADS_PER_DAY = 50;
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const now = new Date();
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();

    const { count: uploadsTodayCount, error: countError } = await adminClient
      .from('grade_verifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', dayStart);

    if (countError) {
      console.error('Grade status count error:', countError);
      return NextResponse.json(
        { error: { code: 'STATUS_ERROR', message: 'Failed to fetch grade status' } },
        { status: 500 }
      );
    }

    const { data: latest, error: latestError } = await adminClient
      .from('grade_verifications')
      .select(
        'id, status, submission_type, parsed_courses, manual_courses, reviewer_note, notes, screenshot_url, risk_score, risk_level, risk_reasons, verification_decision, created_at, reviewed_at'
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestError) {
      console.error('Grade status latest fetch error:', latestError);
      return NextResponse.json(
        { error: { code: 'STATUS_ERROR', message: 'Failed to fetch grade status' } },
        { status: 500 }
      );
    }

    let latestQueue: {
      id: string;
      status: string;
      queue_tier: string;
      confidence_score: number | null;
      assigned_to: string | null;
      reviewed_at: string | null;
      updated_at: string;
    } | null = null;

    if (latest?.id) {
      const { data: queueData, error: queueError } = await adminClient
        .from('grade_parse_queue')
        .select('id, status, queue_tier, confidence_score, assigned_to, reviewed_at, updated_at')
        .eq('verification_id', latest.id)
        .maybeSingle();

      if (queueError) {
        console.error('Grade status queue fetch error:', queueError);
      } else {
        latestQueue = queueData;
      }
    }

    return NextResponse.json(
      {
        data: {
          latestVerification: latest || null,
          latestQueue,
          uploadsToday: uploadsTodayCount || 0,
          remainingUploadsToday: Math.max(0, MAX_UPLOADS_PER_DAY - (uploadsTodayCount || 0)),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Grade status error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch grade status' } },
      { status: 500 }
    );
  }
}
