'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// Componente Chart simplificado inline
function SimpleChart({ data, title, color = '#3b82f6' }: { data: ChartData[]; title: string; color?: string }) {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [chartData, setChartData] = useState<ChartData[]>(data);
  const [loading, setLoading] = useState(false);
  
  const maxCount = Math.max(...chartData.map(d => d.count), 1);

  // Función para obtener datos según el período
  const fetchDataForPeriod = useCallback(async (period: 'day' | 'week' | 'month' | 'year') => {
    setLoading(true);
    try {
      const tableName = title.toLowerCase().includes('prompt') ? 'prompts' :
                      title.toLowerCase().includes('uso') ? 'usage_events' :
                      title.toLowerCase().includes('playlist') ? 'playlists' :
                      title.toLowerCase().includes('pago') ? 'payments' : 'prompts';
      
      const response = await fetch(`/api/admin/chart?table=${tableName}&days=30&period=${period}`);
      const result = await response.json();
      
      if (result.ok) {
        setChartData(result.data);
        console.log(`[CHART] Loaded ${result.periodsToShow} ${period} periods for ${title}`);
      }
    } catch (error) {
      console.error(`[CHART] Error loading ${period} data:`, error);
    } finally {
      setLoading(false);
    }
  }, [title]);

  // Actualizar datos cuando cambia el período
  useEffect(() => {
    fetchDataForPeriod(timeRange);
  }, [timeRange, fetchDataForPeriod]);

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <div className="flex space-x-1 bg-gray-700 rounded-lg p-1">
          {(['day', 'week', 'month', 'year'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              disabled={loading}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-600'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {range === 'day' ? 'Día' : 
               range === 'week' ? 'Semana' : 
               range === 'month' ? 'Mes' : 'Año'}
            </button>
          ))}
        </div>
      </div>
      
      {loading ? (
        <div className="h-32 flex items-center justify-center">
          <div className="text-gray-400 text-sm">Cargando datos...</div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative h-32">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Línea muy fina y elegante */}
              <polyline
                fill="none"
                stroke={color}
                strokeWidth="0.15"
                points={chartData.map((item, index) => {
                  const x = (index / (chartData.length - 1)) * 100;
                  const y = 100 - (item.count / maxCount) * 100;
                  return `${x},${y}`;
                }).join(' ')}
              />
              
              {/* Puntitos pequeños y redondos para tocar */}
              {chartData.map((item, index) => {
                const x = (index / (chartData.length - 1)) * 100;
                const y = 100 - (item.count / maxCount) * 100;
                return (
                  <circle
                    key={index}
                    cx={x}
                    cy={y}
                    r="0.15"
                    fill={color}
                    className="hover:r-0.3 transition-all cursor-pointer"
                  />
                );
              })}
            </svg>
            
            {/* Solo mostrar número del período actual (último período) */}
            <div className="absolute top-0 left-0 right-0 flex justify-between">
              {chartData.map((item, index) => {
                const x = (index / (chartData.length - 1)) * 100;
                const isLastPeriod = index === chartData.length - 1; // Solo el último período
                return (
                  <div
                    key={index}
                    className="text-xs font-semibold text-white bg-gray-800 bg-opacity-80 px-1 py-0.5 rounded"
                    style={{ 
                      left: `${x}%`, 
                      transform: 'translateX(-50%)',
                      display: (isLastPeriod && item.count > 0) ? 'block' : 'none'
                    }}
                  >
                    {item.count}
                  </div>
                );
              })}
            </div>
            
            {/* Tooltip hover solo en los puntos exactos */}
            <div className="absolute inset-0">
              {chartData.map((item, index) => {
                const x = (index / (chartData.length - 1)) * 100;
                const y = 100 - (item.count / maxCount) * 100;
                const date = new Date(item.date);
                
                let dayName = '';
                let dayNumber = '';
                
                switch (timeRange) {
                  case 'day':
                    dayName = date.toLocaleDateString('es-ES', { weekday: 'long' });
                    dayNumber = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
                    break;
                  case 'week':
                    dayName = `Semana del ${date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;
                    dayNumber = date.toLocaleDateString('es-ES', { year: 'numeric' });
                    break;
                  case 'month':
                    dayName = date.toLocaleDateString('es-ES', { month: 'long' });
                    dayNumber = date.toLocaleDateString('es-ES', { year: 'numeric' });
                    break;
                  case 'year':
                    dayName = date.toLocaleDateString('es-ES', { year: 'numeric' });
                    dayNumber = '';
                    break;
                }
                
                return (
                  <div
                    key={index}
                    className="absolute group"
                    style={{ 
                      left: `${x}%`, 
                      top: `${y}%`,
                      transform: 'translate(-50%, -50%)',
                      width: '3px',
                      height: '3px'
                    }}
                  >
                    {/* Tooltip personalizado */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                      <div className="font-semibold">{dayName}</div>
                      {dayNumber && <div className="text-gray-300">{dayNumber}</div>}
                      <div className="text-gray-300">{item.count} {title.toLowerCase()}</div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fechas */}
          <div className="flex justify-between">
            {chartData.map((item, index) => (
              <div key={index} className="text-xs text-gray-400 text-center" style={{ width: `${100 / chartData.length}%` }}>
                {(index % Math.max(1, Math.floor(chartData.length / 5)) === 0 || index === chartData.length - 1) ? 
                  (() => {
                    const date = new Date(item.date);
                    switch (timeRange) {
                      case 'day':
                        return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
                      case 'week':
                        return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
                      case 'month':
                        return date.toLocaleDateString('es-ES', { month: 'short' });
                      case 'year':
                        return date.toLocaleDateString('es-ES', { year: '2-digit' });
                      default:
                        return '';
                    }
                  })() : 
                  ''
                }
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-700">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {chartData.reduce((sum, item) => sum + item.count, 0)}
              </div>
              <div className="text-xs text-gray-400">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {Math.round(chartData.reduce((sum, item) => sum + item.count, 0) / chartData.length) || 0}
              </div>
              <div className="text-xs text-gray-400">Promedio</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {Math.max(...chartData.map(d => d.count), 0)}
              </div>
              <div className="text-xs text-gray-400">Máximo</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ChartData {
  date: string;
  count: number;
}

interface DebugData {
  counts: {
    prompts: number;
    usage_events: number;
    profiles: number;
    playlists: number;
    payments: number;
  };
  recentPrompts: any[];
  recentUsageEvents: any[];
  recentPlaylists: any[];
  recentPayments: any[];
}

export default function AdminDebugDB() {
  const [data, setData] = useState<DebugData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'prompts' | 'usage' | 'playlists' | 'payments'>('overview');
  const [chartData, setChartData] = useState<{
    prompts: ChartData[];
    usage: ChartData[];
    playlists: ChartData[];
    payments: ChartData[];
  }>({
    prompts: [],
    usage: [],
    playlists: [],
    payments: []
  });
  const router = useRouter();

  const generateLast30Days = () => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toISOString().split('T')[0]);
    }
    return days;
  };

  const fillMissingDays = (data: ChartData[], days: string[]) => {
    const dataMap = new Map(data.map(item => [item.date, item.count]));
    return days.map(date => ({
      date,
      count: dataMap.get(date) || 0
    }));
  };

  const fetchChartData = async () => {
    try {
      const [promptsRes, usageRes, playlistsRes, paymentsRes] = await Promise.all([
        fetch('/api/admin/chart?table=prompts&days=30&period=day'),
        fetch('/api/admin/chart?table=usage_events&days=30&period=day'),
        fetch('/api/admin/chart?table=playlists&days=30&period=day'),
        fetch('/api/admin/chart?table=payments&days=30&period=day')
      ]);

      const [promptsData, usageData, playlistsData, paymentsData] = await Promise.all([
        promptsRes.json(),
        usageRes.json(),
        usageRes.json(),
        paymentsRes.json()
      ]);

      console.log('[CHART] Fetched data:', {
        prompts: promptsData,
        usage: usageData,
        playlists: playlistsData,
        payments: paymentsData
      });

      console.log('[CHART] Current counts:', {
        prompts: data?.counts.prompts || 0,
        usage: data?.counts.usage_events || 0,
        playlists: data?.counts.playlists || 0,
        payments: data?.counts.payments || 0
      });

      const last30Days = generateLast30Days();
      const today = new Date().toISOString().split('T')[0];

      // Combinar datos históricos con datos actuales de los contadores
      const combineWithCurrentData = (historicalData: ChartData[], currentCount: number) => {
        // Si hay datos históricos, úsalos
        if (historicalData && historicalData.length > 0) {
          return historicalData;
        }
        // Si no hay datos históricos, usar el contador actual para hoy
        return [{ date: today, count: currentCount }];
      };

      const finalChartData = {
        prompts: fillMissingDays(combineWithCurrentData(promptsData.ok ? promptsData.data : [], data?.counts.prompts || 0), last30Days),
        usage: fillMissingDays(combineWithCurrentData(usageData.ok ? usageData.data : [], data?.counts.usage_events || 0), last30Days),
        playlists: fillMissingDays(combineWithCurrentData(playlistsData.ok ? playlistsData.data : [], data?.counts.playlists || 0), last30Days),
        payments: fillMissingDays(combineWithCurrentData(paymentsData.ok ? paymentsData.data : [], data?.counts.payments || 0), last30Days)
      };

      console.log('[CHART] Final chart data:', finalChartData);
      setChartData(finalChartData);
    } catch (error) {
      console.error('Error fetching chart data:', error);
      // Fallback to using only current day's data if API fails
      const last30Days = generateLast30Days();
      const today = new Date().toISOString().split('T')[0];
      
      const realData = {
        prompts: [{ date: today, count: data?.counts.prompts || 0 }],
        usage: [{ date: today, count: data?.counts.usage_events || 0 }],
        playlists: [{ date: today, count: data?.counts.playlists || 0 }],
        payments: [{ date: today, count: data?.counts.payments || 0 }]
      };
      
      setChartData({
        prompts: fillMissingDays(realData.prompts, last30Days),
        usage: fillMissingDays(realData.usage, last30Days),
        playlists: fillMissingDays(realData.playlists, last30Days),
        payments: fillMissingDays(realData.payments, last30Days)
      });
    }
  };

  const fetchData = async () => {
    try {
      const response = await fetch('/api/admin/debug/db');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Allow admin page in production for debugging
    // if (process.env.NODE_ENV === 'production') {
    //   setError('Debug page is not available in production');
    //   setLoading(false);
    //   return;
    // }

    fetchData();

    // Actualizar datos cada 30 segundos
    const interval = setInterval(() => {
      fetchData();
    }, 30000);

    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (data) {
      fetchChartData();
    }
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-800 flex items-center justify-center">
          <div className="text-center">
            <div className="w-28 h-28 bg-gray-900 rounded-full flex items-center justify-center mb-4 mx-auto animate-pulse">
              <img 
                src="/logo-pleia.png" 
                alt="PLEIA" 
                className="w-20 h-20 object-contain"
                onError={(e) => {
                  // Fallback si no carga el logo
                  e.currentTarget.style.display = 'none';
                  const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                  if (nextElement?.style) {
                    nextElement.style.display = 'block';
                  }
                }}
              />
              <span className="text-white font-bold text-5xl hidden">★</span>
            </div>
            <p className="text-lg font-medium text-white">Cargando datos del panel de administración...</p>
            <div className="mt-4 w-32 h-1 bg-gray-700 rounded-full mx-auto overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">❌ Error</div>
          <div className="text-gray-300">{error}</div>
          <button 
            onClick={() => router.push('/admin/login')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Volver al Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gray-900 rounded-md flex items-center justify-center">
                <img 
                  src="/logo-pleia.png" 
                  alt="PLEIA" 
                  className="w-11 h-11 object-contain"
                  onError={(e) => {
                    // Fallback si no carga el logo
                    e.currentTarget.style.display = 'none';
                    const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                  if (nextElement?.style) {
                    nextElement.style.display = 'block';
                  }
                  }}
                />
                <span className="text-white font-semibold text-3xl hidden">★</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">PLEIA Admin</h1>
                <p className="text-gray-300 text-sm">Analytics Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-400">
                Última actualización: {new Date().toLocaleTimeString('es-ES')}
              </div>
              <button 
                onClick={() => router.push('/admin/login')}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Welcome Message */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-6">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-2xl font-bold mb-2">¡Bienvenido al Panel de Administración!</h2>
          <p className="text-blue-100">Monitorea el rendimiento y actividad de PLEIA en tiempo real</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
            {[
              { key: 'overview', label: 'Resumen', icon: '📊' },
              { key: 'prompts', label: 'Prompts', icon: '💬' },
              { key: 'usage', label: 'Uso', icon: '⚡' },
              { key: 'playlists', label: 'Playlists', icon: '🎵' },
              { key: 'payments', label: 'Pagos', icon: '💳' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Gráficas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SimpleChart 
                data={chartData.prompts} 
                title="Prompts Generados" 
                color="#3b82f6" 
              />
              <SimpleChart 
                data={chartData.usage} 
                title="Eventos de Uso" 
                color="#8b5cf6" 
              />
              <SimpleChart 
                data={chartData.playlists} 
                title="Playlists Creadas" 
                color="#f97316" 
              />
              <SimpleChart 
                data={chartData.payments} 
                title="Pagos Registrados" 
                color="#eab308" 
              />
            </div>

            {/* Métricas principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {[
                { key: 'prompts', label: 'Prompts', icon: '💬', color: 'bg-blue-50 border-blue-200', textColor: 'text-blue-600' },
                { key: 'usage_events', label: 'Eventos de Uso', icon: '⚡', color: 'bg-purple-50 border-purple-200', textColor: 'text-purple-600' },
                { key: 'profiles', label: 'Perfiles', icon: '👤', color: 'bg-green-50 border-green-200', textColor: 'text-green-600' },
                { key: 'playlists', label: 'Playlists', icon: '🎵', color: 'bg-orange-50 border-orange-200', textColor: 'text-orange-600' },
                { key: 'payments', label: 'Pagos', icon: '💳', color: 'bg-yellow-50 border-yellow-200', textColor: 'text-yellow-600' }
              ].map((metric) => (
                <div key={metric.key} className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <div className={`w-10 h-10 ${metric.color} rounded-lg flex items-center justify-center mb-4 border`}>
                    <span className="text-lg">{metric.icon}</span>
                  </div>
                  <h3 className="text-gray-300 text-sm font-medium mb-2">{metric.label}</h3>
                  <p className="text-2xl font-bold text-white">{data?.counts[metric.key as keyof typeof data.counts] || 0}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resto de tabs... */}
        {activeTab !== 'overview' && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              {activeTab === 'prompts' && '💬 Prompts Recientes'}
              {activeTab === 'usage' && '⚡ Eventos de Uso Recientes'}
              {activeTab === 'playlists' && '🎵 Playlists Recientes'}
              {activeTab === 'payments' && '💳 Pagos Recientes'}
            </h3>
            <div className="text-gray-400">
              Contenido de {activeTab} - Implementar según necesidad
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
