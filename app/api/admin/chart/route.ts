import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('[CHART] Starting chart data fetch...');
    
    const { searchParams } = new URL(request.url);
    const table = searchParams.get('table');
    const days = parseInt(searchParams.get('days') || '30');
    const period = searchParams.get('period') || 'day'; // día, semana, mes, año

    console.log(`[CHART] Requested table: ${table}, days: ${days}, period: ${period}`);

    if (!table || !['prompts', 'usage_events', 'playlists', 'payments'].includes(table)) {
      console.log(`[CHART] Invalid table: ${table}`);
      return NextResponse.json({ 
        ok: false, 
        error: 'Invalid table. Must be prompts, usage_events, playlists, or payments' 
      }, { status: 400 });
    }

    if (!['day', 'week', 'month', 'year'].includes(period)) {
      console.log(`[CHART] Invalid period: ${period}`);
      return NextResponse.json({ 
        ok: false, 
        error: 'Invalid period. Must be day, week, month, or year' 
      }, { status: 400 });
    }

    // Durante el build, siempre devolver datos mock para evitar errores
    console.warn('[CHART] Build time - returning mock data');
    
    const mockData = [];
    const today = new Date();
    
    // Solo generar datos para el período actual
    let dateStr: string;
    switch (period) {
      case 'day':
        dateStr = today.toISOString().split('T')[0];
        break;
      case 'week':
        dateStr = today.toISOString().split('T')[0];
        break;
      case 'month':
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        dateStr = `${year}-${month}-01`;
        break;
      case 'year':
        dateStr = String(today.getFullYear());
        break;
      default:
        dateStr = today.toISOString().split('T')[0];
    }
    
    mockData.push({
      date: dateStr,
      count: 0
    });
    
    return NextResponse.json({
      ok: true,
      data: mockData,
      table,
      days,
      period,
      totalRecords: 0,
      mockData: true
    }, { status: 200 });

  } catch (error) {
    console.error('[CHART] Unexpected error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}
