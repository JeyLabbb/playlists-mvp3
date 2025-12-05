import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    console.log('[DEBUG] Starting Supabase connection test...');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        ok: false,
        error: 'Missing Supabase credentials',
        supabaseUrl: !!supabaseUrl,
        supabaseServiceKey: !!supabaseServiceKey
      }, { status: 500 });
    }
    
    console.log('[DEBUG] Creating Supabase client...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });
    
    console.log('[DEBUG] Testing payments table insert...');
    
    // Test insert into payments table
    const { data, error } = await supabase
      .from('payments')
      .insert([{
        user_email: 'debug@test.com',
        user_id: null, // Allow null
        stripe_payment_intent_id: 'pi_debug_test',
        stripe_customer_id: 'cus_debug_test',
        amount: 100,
        currency: 'eur',
        plan: 'debug',
        status: 'completed'
      }])
      .select()
      .single();
    
    if (error) {
      console.error('[DEBUG] Payments insert error:', error);
      return NextResponse.json({
        ok: false,
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      }, { status: 500 });
    }
    
    console.log('[DEBUG] Success! Payment inserted:', data);
    
    // Clean up test data
    await supabase
      .from('payments')
      .delete()
      .eq('id', data.id);
    
    return NextResponse.json({
      ok: true,
      message: 'Supabase connection and insert working',
      testData: data
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('[DEBUG] Unexpected error:', error);
    return NextResponse.json({
      ok: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
