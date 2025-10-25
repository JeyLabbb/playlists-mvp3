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

    // Verificar variables de entorno
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('[CHART] Missing Supabase environment variables - using mock data for build');
      console.warn(`[CHART] URL: ${!!supabaseUrl}, Service Key: ${!!supabaseServiceKey}`);
      
      // Durante el build, usar datos mock para evitar errores
      const currentCount = 0; // Mock count for build time
      
      // Generar datos mock simples para el build
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
        count: currentCount
      });
      
      return NextResponse.json({
        ok: true,
        data: mockData,
        table,
        days,
        period,
        totalRecords: currentCount,
        mockData: true
      }, { status: 200 });
    }

    console.log('[CHART] Supabase config OK, initializing client...');
    const supabase = getSupabaseAdmin();
    
    // Obtener datos de los últimos N días
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const dateField = table === 'usage_events' ? 'occurred_at' : 'created_at';
    
    console.log(`[CHART] Querying ${table} from ${startDate.toISOString()}`);
    
    const { data, error } = await supabase
      .from(table)
      .select(dateField)
      .gte(dateField, startDate.toISOString())
      .order(dateField, { ascending: true });

    if (error) {
      console.error(`[CHART] Error fetching ${table} data:`, error);
      return NextResponse.json({ 
        ok: false, 
        error: `Failed to fetch ${table} data: ${error.message}` 
      }, { status: 500 });
    }

    console.log(`[CHART] Fetched ${data?.length || 0} records from ${table}`);

    // Agrupar por día
    const dailyData: { [key: string]: number } = {};
    
    data?.forEach(item => {
      const date = new Date(item[dateField]);
      const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      dailyData[dayKey] = (dailyData[dayKey] || 0) + 1;
    });

    // Convertir a formato requerido por el gráfico
    const chartData = Object.entries(dailyData)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    console.log(`[CHART] Processed ${chartData.length} data points for ${table}`);

    return NextResponse.json({
      ok: true,
      data: chartData,
      table,
      days,
      totalRecords: data?.length || 0
    }, { status: 200 });

  } catch (error) {
    console.error('[CHART] Unexpected error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}
