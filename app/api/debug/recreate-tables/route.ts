import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Server-only Supabase admin client
let supabaseAdmin: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  }
  
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { 
        auth: { persistSession: false },
      }
    );
    console.log('[DB] Supabase admin client initialized');
  }
  
  return supabaseAdmin;
}

export async function POST(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ 
        ok: false, 
        error: 'Table recreation is not available in production' 
      }, { status: 404 });
    }

    const supabase = getSupabaseAdmin();
    
    console.log('[RECREATE] Starting table recreation...');
    
    // Try to drop tables by attempting to delete all records first
    console.log('[RECREATE] Clearing existing data...');
    try {
      await supabase.from('playlists').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (error) {
      console.log('[RECREATE] Could not clear data (tables might not exist):', error);
    }
    
    // Test if we can insert into playlists
    console.log('[RECREATE] Testing playlists table...');
    const { data: playlistTest, error: playlistError } = await supabase
      .from('playlists')
      .insert([{
        user_email: 'test@example.com',
        playlist_name: 'Test Playlist',
        prompt: 'Test prompt',
        spotify_url: 'https://open.spotify.com/playlist/test',
        spotify_id: 'test123',
        track_count: 10
      }] as any)
      .select()
      .single();
    
    if (playlistError) {
      console.error('[RECREATE] Playlists table error:', playlistError);
      return NextResponse.json({
        ok: false,
        error: `Playlists table issue: ${playlistError.message}`,
        code: playlistError.code
      }, { status: 500 });
    }
    
    // Test if we can insert into payments
    console.log('[RECREATE] Testing payments table...');
    const { data: paymentTest, error: paymentError } = await supabase
      .from('payments')
      .insert([{
        user_email: 'test@example.com',
        stripe_payment_intent_id: 'pi_test123',
        stripe_customer_id: 'cus_test123',
        amount: 500, // 5€ in cents
        currency: 'eur',
        plan: 'founder',
        status: 'completed'
      }] as any)
      .select()
      .single();
    
    if (paymentError) {
      console.error('[RECREATE] Payments table error:', paymentError);
      return NextResponse.json({
        ok: false,
        error: `Payments table issue: ${paymentError.message}`,
        code: paymentError.code
      }, { status: 500 });
    }
    
    // Clean up test data
    if (playlistTest && playlistTest.id) {
      await supabase.from('playlists').delete().eq('id', playlistTest.id);
    }
    if (paymentTest && paymentTest.id) {
      await supabase.from('payments').delete().eq('id', paymentTest.id);
    }
    
    console.log('[RECREATE] Table tests completed successfully');
    
    return NextResponse.json({
      ok: true,
      message: 'Tables are working correctly',
      playlistTest: playlistTest,
      paymentTest: paymentTest,
      timestamp: new Date().toISOString()
    }, { status: 200 });

  } catch (error: any) {
    console.error('[RECREATE] Error testing tables:', error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message 
    }, { status: 500 });
  }
}
