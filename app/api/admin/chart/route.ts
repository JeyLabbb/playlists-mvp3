import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase/server';

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

    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      console.warn('[CHART] Supabase not configured - returning mock data');
      
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
    }
    
    // Obtener datos reales de Supabase
    console.log(`[CHART] Fetching real data from Supabase for table: ${table}`);
    
    const { data, error } = await supabase
      .from(table)
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      console.error(`[CHART] Supabase error for table ${table}:`, error);
      return NextResponse.json({ 
        ok: false, 
        error: `Database error: ${error.message}` 
      }, { status: 500 });
    }

    console.log(`[CHART] Retrieved ${data?.length || 0} records from ${table}`);

    // Procesar datos según el período
    const chartData = processChartData(data || [], period, days);
    
    return NextResponse.json({
      ok: true,
      data: chartData,
      table,
      days,
      period,
      totalRecords: data?.length || 0,
      mockData: false
    }, { status: 200 });

  } catch (error) {
    console.error('[CHART] Error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

function processChartData(data: any[], period: string, days: number) {
  const chartData: { date: string; count: number }[] = [];
  const today = new Date();
  
  // Crear mapa de fechas
  const dateMap = new Map<string, number>();
  
  data.forEach(record => {
    if (record.created_at) {
      const date = new Date(record.created_at);
      let key: string;
      
      switch (period) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
          break;
        case 'year':
          key = String(date.getFullYear());
          break;
        default:
          key = date.toISOString().split('T')[0];
      }
      
      dateMap.set(key, (dateMap.get(key) || 0) + 1);
    }
  });
  
  // Generar datos para el rango solicitado
  const periodsToShow = period === 'month' ? 12 : period === 'year' ? 5 : days;
  
  for (let i = 0; i < periodsToShow; i++) {
    let dateStr: string;
    let date: Date;
    
    switch (period) {
      case 'day':
        date = new Date(today);
        date.setDate(today.getDate() - i);
        dateStr = date.toISOString().split('T')[0];
        break;
      case 'week':
        date = new Date(today);
        date.setDate(today.getDate() - (i * 7));
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        dateStr = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        dateStr = `${year}-${month}-01`;
        break;
      case 'year':
        date = new Date(today.getFullYear() - i, 0, 1);
        dateStr = String(date.getFullYear());
        break;
      default:
        date = new Date(today);
        date.setDate(today.getDate() - i);
        dateStr = date.toISOString().split('T')[0];
    }
    
    chartData.unshift({
      date: dateStr,
      count: dateMap.get(dateStr) || 0
    });
  }
  
  return chartData;
}