import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const { userEmail, action, meta } = await request.json();

    if (!userEmail || !action) {
      return NextResponse.json({ error: 'Missing userEmail or action' }, { status: 400 });
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE,
      { auth: { persistSession: false } }
    );

    console.log(`[METRICS] ${action} - ${userEmail}`, meta);

    // Try to insert into usage_events table
    const { data: usageData, error: usageError } = await supabase
      .from('usage_events')
      .insert([{
        user_email: userEmail,
        action: action,
        meta: meta || {}
      }])
      .select()
      .single();

    if (usageError) {
      console.error('[METRICS] Error inserting usage_event:', usageError);
      
      // If table doesn't exist, try to create it
      if (usageError.code === 'PGRST204') {
        console.log('[METRICS] Table usage_events does not exist, creating...');
        
        // Create the table using raw SQL
        const { error: createError } = await supabase.rpc('exec_sql', {
          sql: `
            CREATE TABLE IF NOT EXISTS public.usage_events (
              id BIGSERIAL PRIMARY KEY,
              created_at TIMESTAMPTZ DEFAULT NOW(),
              user_email TEXT NOT NULL,
              action TEXT NOT NULL,
              meta JSONB DEFAULT '{}'
            );
          `
        });

        if (createError) {
          console.error('[METRICS] Error creating table:', createError);
          return NextResponse.json({ 
            ok: false, 
            error: 'Failed to create table',
            details: createError 
          }, { status: 500 });
        }

        console.log('[METRICS] Table created successfully, retrying insert...');
        
        // Retry the insert
        const { data: retryData, error: retryError } = await supabase
          .from('usage_events')
          .insert([{
            user_email: userEmail,
            action: action,
            meta: meta || {}
          }])
          .select()
          .single();

        if (retryError) {
          console.error('[METRICS] Error on retry:', retryError);
          return NextResponse.json({ 
            ok: false, 
            error: 'Failed to insert after table creation',
            details: retryError 
          }, { status: 500 });
        }

        console.log(`[METRICS] Successfully logged ${action} for ${userEmail}, event id: ${retryData.id}`);
        return NextResponse.json({ 
          ok: true, 
          eventId: retryData.id,
          message: 'Metrics logged successfully after table creation'
        }, { status: 200 });
      }

      return NextResponse.json({ 
        ok: false, 
        error: 'Failed to insert usage event',
        details: usageError 
      }, { status: 500 });
    }

    console.log(`[METRICS] Successfully logged ${action} for ${userEmail}, event id: ${usageData.id}`);
    return NextResponse.json({ 
      ok: true, 
      eventId: usageData.id,
      message: 'Metrics logged successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('[METRICS] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}