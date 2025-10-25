import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabase/server';

// Define types locally
interface UsageEvent {
  user_email: string;
  action: string;
  meta: any;
}

interface Prompt {
  user_email: string;
  text: string;
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production' && !process.env.SUPABASE_ENABLED) {
    return NextResponse.json({ message: 'Supabase metrics disabled in production' }, { status: 200 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  try {
    const { userEmail, action, meta } = await request.json();

    if (!userEmail || !action) {
      return NextResponse.json({ error: 'Missing userEmail or action' }, { status: 400 });
    }

    let eventId = null;

    // Log usage_event
    const usageEvent: UsageEvent = {
      user_email: userEmail,
      action: action,
      meta: meta || {}
    };
    const { data: usageData, error: usageError } = await supabase
      .from('usage_events')
      .insert([usageEvent])
      .select()
      .single();

    if (usageError) {
      console.error('[DB] Error inserting usage_event:', usageError);
      throw new Error(usageError.message);
    }
    eventId = usageData.id;
    console.log(`[DB] inserted usage_event id: ${usageData.id} for ${userEmail}`);

    // Log prompt if action is 'generate_playlist'
    if (action === 'generate_playlist' && meta?.prompt) {
      const promptData: Prompt = {
        user_email: userEmail,
        text: meta.prompt
      };
      const { data: promptResult, error: promptError } = await supabase
        .from('prompts')
        .insert([promptData])
        .select()
        .single();

      if (promptError) {
        console.error('[DB] Error inserting prompt:', promptError);
        // Do not throw, as usage_event is already logged
      } else {
        console.log(`[DB] inserted prompt id: ${promptResult.id} for ${userEmail}`);
      }
    }

    // Update or create user profile (last_active_at)
    const profileData = {
      user_email: userEmail,
      last_active_at: new Date().toISOString()
    };
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'user_email' });

    if (profileError) {
      console.error('[DB] Error upserting profile:', profileError);
      // Do not throw
    } else {
      console.log(`[DB] upserted profile for ${userEmail}`);
    }

    return NextResponse.json({ ok: true, eventId }, { status: 200 });
  } catch (error: any) {
    console.error('[DB] Supabase metrics API error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
