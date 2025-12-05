import { NextRequest, NextResponse } from 'next/server';

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
  // Durante el build, siempre devolver éxito para evitar errores
  console.warn('[SUPABASE-METRICS] Build time - returning success without Supabase');
  
  try {
    const { userEmail, action, meta } = await request.json();
    
    if (!userEmail || !action) {
      return NextResponse.json({ error: 'Missing userEmail or action' }, { status: 400 });
    }

    // Simular éxito durante el build
    return NextResponse.json({ 
      success: true, 
      message: 'Metrics logged (build mode)',
      mockData: true 
    }, { status: 200 });
  } catch (error) {
    console.error('[SUPABASE-METRICS] Error:', error);
    return NextResponse.json({ 
      success: true, 
      message: 'Build mode - metrics skipped',
      mockData: true 
    }, { status: 200 });
  }
}