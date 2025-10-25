import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE;
    
    return NextResponse.json({
      ok: true,
      supabaseUrl: supabaseUrl ? 'SET' : 'MISSING',
      supabaseServiceKey: supabaseServiceKey ? 'SET' : 'MISSING',
      supabaseUrlValue: supabaseUrl,
      supabaseServiceKeyValue: supabaseServiceKey ? `${supabaseServiceKey.substring(0, 10)}...` : 'MISSING',
      message: supabaseUrl && supabaseServiceKey ? 'Supabase configured' : 'Supabase NOT configured - using example values'
    }, { status: 200 });
    
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      error: error.message
    }, { status: 500 });
  }
}
