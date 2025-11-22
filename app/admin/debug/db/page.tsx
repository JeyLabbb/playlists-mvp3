'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';

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
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-2 sm:space-y-0">
        <h3 className="text-base sm:text-lg font-semibold text-white">{title}</h3>
        <div className="flex space-x-1 bg-gray-700 rounded-lg p-1 overflow-x-auto">
          {(['day', 'week', 'month', 'year'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              disabled={loading}
              className={`px-2 sm:px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
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
            <div className="relative h-24 sm:h-32">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Renderizar como barras para meses y años, línea para días y semanas */}
              {timeRange === 'month' || timeRange === 'year' ? (
                // Barras para meses y años
                chartData.map((item, index) => {
                  const barWidth = chartData.length > 1 ? 100 / chartData.length : 100;
                  const barHeight = (item.count / maxCount) * 100;
                  const x = chartData.length > 1 ? (index / chartData.length) * 100 : 0;
                  const y = 100 - barHeight;
                  
                  return (
                    <rect
                      key={index}
                      x={x}
                      y={y}
                      width={barWidth * 0.8}
                      height={barHeight}
                      fill={color}
                      opacity="0.7"
                      className="hover:opacity-100 transition-all cursor-pointer"
                    />
                  );
                })
              ) : (
                <>
                  {/* Línea muy fina y elegante para días y semanas */}
                  <polyline
                    fill="none"
                    stroke={color}
                    strokeWidth="0.15"
                    points={chartData.map((item, index) => {
                      const x = chartData.length > 1 ? (index / (chartData.length - 1)) * 100 : 50;
                      const y = 100 - (item.count / maxCount) * 100;
                      return `${x},${y}`;
                    }).join(' ')}
                  />
                  
                  {/* Puntitos pequeños pero con área de hover grande */}
                  {chartData.map((item, index) => {
                    const x = chartData.length > 1 ? (index / (chartData.length - 1)) * 100 : 50;
                    const y = 100 - (item.count / maxCount) * 100;
                    return (
                      <circle
                        key={index}
                        cx={x}
                        cy={y}
                        r="0.3"
                        fill={color}
                        className="hover:r-0.4 transition-all cursor-pointer"
                      />
                    );
                  })}
                </>
              )}
            </svg>
            
            {/* Solo mostrar número del período actual (último período) */}
            <div className="absolute top-0 left-0 right-0 flex justify-between">
              {chartData.map((item, index) => {
                const x = chartData.length > 1 ? (index / (chartData.length - 1)) * 100 : 50;
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
                    {item.count} hoy
                  </div>
                );
              })}
            </div>
            
            {/* Tooltip hover para barras y puntos */}
            <div className="absolute inset-0">
              {chartData.map((item, index) => {
                const x = timeRange === 'month' || timeRange === 'year' 
                  ? (chartData.length > 1 ? (index / chartData.length) * 100 : 0) + (chartData.length > 1 ? 100 / chartData.length : 100) * 0.4
                  : chartData.length > 1 ? (index / (chartData.length - 1)) * 100 : 50;
                const y = timeRange === 'month' || timeRange === 'year'
                  ? 50 // Centrado verticalmente para barras
                  : 100 - (item.count / maxCount) * 100;
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
                      width: '16px',
                      height: '16px'
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

          <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-4 border-t border-gray-700">
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-white">
                {chartData.reduce((sum, item) => sum + item.count, 0)}
              </div>
              <div className="text-xs text-gray-400">Total</div>
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-white">
                {Math.round(chartData.reduce((sum, item) => sum + item.count, 0) / chartData.length) || 0}
              </div>
              <div className="text-xs text-gray-400">Promedio</div>
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-white">
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

// Componente para listar usuarios
function UsersList() {
  const fetcher = (url: string) => fetch(url).then(res => res.json());
  const { data, error, isLoading } = useSWR('/api/admin/debug/users', fetcher);
  
  // 🚨 NEW: Estados para filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [filterNewsletter, setFilterNewsletter] = useState<'all' | 'yes' | 'no'>('all');
  const [filterFounder, setFilterFounder] = useState<'all' | 'founder' | 'not_founder'>('all');
  const [filterEarly, setFilterEarly] = useState<'all' | 'yes' | 'no'>('all');
  const [filterFounderSource, setFilterFounderSource] = useState<'all' | 'purchase' | 'referral'>('all');

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto"></div>
        <p className="text-gray-400 mt-2">Cargando usuarios...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400">Error al cargar usuarios: {error.message}</p>
      </div>
    );
  }

  const allUsers = data?.users || [];
  const hasData = data?.ok === true;

  // 🚨 NEW: Aplicar filtros
  const filteredUsers = allUsers.filter((user: any) => {
    // Búsqueda por email o username
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesEmail = user.email?.toLowerCase().includes(query);
      const matchesUsername = user.username?.toLowerCase().includes(query);
      if (!matchesEmail && !matchesUsername) return false;
    }
    
    // Filtro de newsletter (marketing_opt_in)
    if (filterNewsletter !== 'all') {
      if (filterNewsletter === 'yes' && !user.marketing_opt_in) return false;
      if (filterNewsletter === 'no' && user.marketing_opt_in) return false;
    }
    
    // Filtro de founder
    if (filterFounder !== 'all') {
      if (filterFounder === 'founder' && user.plan !== 'founder') return false;
      if (filterFounder === 'not_founder' && user.plan === 'founder') return false;
    }
    
    // Filtro de primeros 1000
    if (filterEarly !== 'all') {
      if (filterEarly === 'yes' && !user.is_early_founder_candidate) return false;
      if (filterEarly === 'no' && user.is_early_founder_candidate) return false;
    }
    
    // Filtro de founder_source
    if (filterFounderSource !== 'all' && user.plan === 'founder') {
      if (filterFounderSource === 'purchase' && user.founder_source !== 'purchase') return false;
      if (filterFounderSource === 'referral' && user.founder_source !== 'referral') return false;
    }
    
    return true;
  });

  return (
    <div className="space-y-3">
      {/* 🚨 NEW: Filtros */}
      <div className="bg-gray-800 rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Búsqueda */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Buscar usuario</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Email o username..."
              className="w-full px-3 py-2 bg-gray-700 text-white rounded text-sm border border-gray-600 focus:border-cyan-500 focus:outline-none"
            />
          </div>
          
          {/* Newsletter */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Newsletter (Marketing)</label>
            <select
              value={filterNewsletter}
              onChange={(e) => setFilterNewsletter(e.target.value as 'all' | 'yes' | 'no')}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded text-sm border border-gray-600 focus:border-cyan-500 focus:outline-none"
            >
              <option value="all">Todos</option>
              <option value="yes">Sí</option>
              <option value="no">No</option>
            </select>
          </div>
          
          {/* Founder */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Founder</label>
            <select
              value={filterFounder}
              onChange={(e) => setFilterFounder(e.target.value as 'all' | 'founder' | 'not_founder')}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded text-sm border border-gray-600 focus:border-cyan-500 focus:outline-none"
            >
              <option value="all">Todos</option>
              <option value="founder">Founder</option>
              <option value="not_founder">No Founder</option>
            </select>
          </div>
          
          {/* Primeros 1000 */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Primeros 1000</label>
            <select
              value={filterEarly}
              onChange={(e) => setFilterEarly(e.target.value as 'all' | 'yes' | 'no')}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded text-sm border border-gray-600 focus:border-cyan-500 focus:outline-none"
            >
              <option value="all">Todos</option>
              <option value="yes">Sí</option>
              <option value="no">No</option>
            </select>
          </div>
          
          {/* Founder Source */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Founder obtenido por</label>
            <select
              value={filterFounderSource}
              onChange={(e) => setFilterFounderSource(e.target.value as 'all' | 'purchase' | 'referral')}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded text-sm border border-gray-600 focus:border-cyan-500 focus:outline-none"
            >
              <option value="all">Todos</option>
              <option value="purchase">Compra</option>
              <option value="referral">Referidos (3 invitados)</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="text-sm text-gray-400 mb-4">
        Mostrando: {filteredUsers.length} de {allUsers.length} usuarios {!hasData && data?.error && `(Error: ${data.error})`}
      </div>
      {filteredUsers.length > 0 ? (
        <div className="space-y-2 max-h-[800px] overflow-y-auto" style={{ scrollBehavior: 'smooth' }}>
          {filteredUsers.map((user: any, index: number) => (
            <div key={user.id || index} className="bg-gray-700 rounded-lg p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-white font-medium text-sm sm:text-base">{user.email || 'Sin email'}</span>
                    {user.is_early_founder_candidate && (
                      <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-300 text-xs rounded">Primeros 1000</span>
                    )}
                    {user.plan === 'founder' && (
                      <>
                        <span className="px-2 py-0.5 bg-gradient-to-r from-yellow-600 to-orange-600 text-white text-xs rounded">Founder</span>
                        {user.founder_source && (
                          <span className={`px-2 py-0.5 text-white text-xs rounded ${
                            user.founder_source === 'purchase' 
                              ? 'bg-green-600' 
                              : 'bg-blue-600'
                          }`}>
                            {user.founder_source === 'purchase' ? '💰 Comprado' : '🎁 Referidos'}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                    {user.username && <span>@{user.username}</span>}
                    {user.plan && <span>Plan: {user.plan}</span>}
                    {user.created_at && (
                      <span>Registrado: {new Date(user.created_at).toLocaleDateString('es-ES')}</span>
                    )}
                    {user.marketing_opt_in !== undefined && (
                      <span className={user.marketing_opt_in ? 'text-green-400' : 'text-gray-500'}>
                        Marketing: {user.marketing_opt_in ? 'Sí' : 'No'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-gray-400 text-center py-8">
          No hay usuarios que coincidan con los filtros
        </div>
      )}
    </div>
  );
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
  const [activeTab, setActiveTab] = useState<'overview' | 'prompts' | 'usage' | 'playlists' | 'users' | 'payments'>('overview');
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
  
  // Estados para filtros de fecha
  const [dateFilters, setDateFilters] = useState<{
    prompts: { type: 'exact' | 'range', exactDate: string, startDate: string, endDate: string };
    usage: { type: 'exact' | 'range', exactDate: string, startDate: string, endDate: string };
    playlists: { type: 'exact' | 'range', exactDate: string, startDate: string, endDate: string };
    payments: { type: 'exact' | 'range', exactDate: string, startDate: string, endDate: string };
  }>({
    prompts: { type: 'exact', exactDate: '', startDate: '', endDate: '' },
    usage: { type: 'exact', exactDate: '', startDate: '', endDate: '' },
    playlists: { type: 'exact', exactDate: '', startDate: '', endDate: '' },
    payments: { type: 'exact', exactDate: '', startDate: '', endDate: '' }
  });
  
  // Estados para datos filtrados
  const [filteredData, setFilteredData] = useState<{
    prompts: any[];
    usage: any[];
    playlists: any[];
    payments: any[];
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
        playlistsRes.json(),
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
      
      // 🚨 CRITICAL: Inicializar datos filtrados con los datos originales (ordenados desde los últimos hasta los primeros)
      // Asegurar que todos los arrays estén ordenados descendente (más recientes primero)
      const sortByDateDesc = (arr: any[], dateField: string) => {
        return [...arr].sort((a, b) => {
          const dateA = new Date(a[dateField] || 0).getTime();
          const dateB = new Date(b[dateField] || 0).getTime();
          return dateB - dateA; // Descendente
        });
      };
      
      setFilteredData({
        prompts: sortByDateDesc(result.recentPrompts || [], 'created_at'),
        usage: sortByDateDesc(result.recentUsageEvents || [], 'occurred_at'),
        playlists: sortByDateDesc(result.recentPlaylists || [], 'created_at'),
        payments: sortByDateDesc(result.recentPayments || [], 'created_at')
      });
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  // Función para aplicar filtros de fecha
  const applyDateFilter = (tab: 'prompts' | 'usage' | 'playlists' | 'payments') => {
    if (!data) return;
    
    const filter = dateFilters[tab];
    let filteredItems: any[] = [];
    
    switch (tab) {
      case 'prompts':
        filteredItems = data.recentPrompts || [];
        break;
      case 'usage':
        filteredItems = data.recentUsageEvents || [];
        break;
      case 'playlists':
        filteredItems = data.recentPlaylists || [];
        break;
      case 'payments':
        filteredItems = data.recentPayments || [];
        break;
    }
    
    // 🚨 CRITICAL: Filtrar por fecha exacta o rango (mejorado)
    if (filter.type === 'exact' && filter.exactDate) {
      filteredItems = filteredItems.filter(item => {
        const itemDate = new Date(item.created_at || item.occurred_at);
        const filterDate = new Date(filter.exactDate);
        // Comparar solo la fecha (sin hora)
        return itemDate.toISOString().split('T')[0] === filterDate.toISOString().split('T')[0];
      });
    } else if (filter.type === 'range' && filter.startDate && filter.endDate) {
      filteredItems = filteredItems.filter(item => {
        const itemDate = new Date(item.created_at || item.occurred_at);
        const startDate = new Date(filter.startDate);
        const endDate = new Date(filter.endDate);
        // Incluir todo el día de inicio y fin
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        return itemDate >= startDate && itemDate <= endDate;
      });
    }
    
    // 🚨 CRITICAL: Mantener orden descendente (más recientes primero) después del filtro
    filteredItems.sort((a, b) => {
      const dateA = new Date(a.created_at || a.occurred_at).getTime();
      const dateB = new Date(b.created_at || b.occurred_at).getTime();
      return dateB - dateA; // Descendente (más recientes primero)
    });
    
    setFilteredData(prev => ({
      ...prev,
      [tab]: filteredItems
    }));
  };

  // 🚨 CRITICAL: Función mejorada para limpiar filtros y restaurar datos originales
  const clearDateFilter = (tab: 'prompts' | 'usage' | 'playlists' | 'payments') => {
    setDateFilters(prev => ({
      ...prev,
      [tab]: { type: 'exact', exactDate: '', startDate: '', endDate: '' }
    }));
    
    // Restaurar datos originales (ordenados desde los últimos hasta los primeros)
    if (data) {
      let originalData: any[] = [];
      switch (tab) {
        case 'prompts':
          originalData = data.recentPrompts || [];
          break;
        case 'usage':
          originalData = data.recentUsageEvents || [];
          break;
        case 'playlists':
          originalData = data.recentPlaylists || [];
          break;
        case 'payments':
          originalData = data.recentPayments || [];
          break;
      }
      
      // 🚨 CRITICAL: Asegurar orden descendente (más recientes primero)
      originalData.sort((a, b) => {
        const dateA = new Date(a.created_at || a.occurred_at).getTime();
        const dateB = new Date(b.created_at || b.occurred_at).getTime();
        return dateB - dateA; // Descendente
      });
      
      setFilteredData(prev => ({
        ...prev,
        [tab]: originalData
      }));
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
            <div className="w-32 h-32 bg-gray-900 rounded-full flex items-center justify-center mb-4 mx-auto animate-pulse">
              <img 
                src="/logo-pleia.png" 
                alt="PLEIA" 
                className="w-24 h-24 object-contain"
                onError={(e) => {
                  // Fallback si no carga el logo
                  e.currentTarget.style.display = 'none';
                  const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                  if (nextElement?.style) {
                    nextElement.style.display = 'block';
                  }
                }}
              />
              <span className="text-white font-bold text-6xl hidden">★</span>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-900 rounded-md flex items-center justify-center">
                <img 
                  src="/logo-pleia.png" 
                  alt="PLEIA" 
                  className="w-10 h-10 sm:w-13 sm:h-13 object-contain"
                  onError={(e) => {
                    // Fallback si no carga el logo
                    e.currentTarget.style.display = 'none';
                    const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                  if (nextElement?.style) {
                    nextElement.style.display = 'block';
                  }
                  }}
                />
                <span className="text-white font-semibold text-3xl sm:text-4xl hidden">★</span>
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-semibold text-white">PLEIA Admin</h1>
                <p className="text-gray-300 text-xs sm:text-sm">Analytics Dashboard</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="text-xs sm:text-sm text-gray-400">
                Última actualización: {new Date().toLocaleTimeString('es-ES')}
              </div>
              <button 
                onClick={() => router.push('/admin/newsletter')}
                className="px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition-colors text-sm sm:text-base"
              >
                📧 Newsletter HQ
              </button>
              <button 
                onClick={() => router.push('/admin/login')}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm sm:text-base"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Welcome Message */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-base sm:text-lg font-semibold mb-1">¡Bienvenido al Panel de Administración!</h2>
          <p className="text-blue-100 text-xs sm:text-sm">Monitorea el rendimiento y actividad de PLEIA en tiempo real</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Tabs */}
        <div className="mb-6 sm:mb-8">
          <div className="flex space-x-1 bg-gray-800 rounded-lg p-1 overflow-x-auto">
            {[
              { key: 'overview', label: 'Resumen', icon: '📊' },
              { key: 'prompts', label: 'Prompts', icon: '💬' },
              { key: 'usage', label: 'Uso', icon: '⚡' },
              { key: 'playlists', label: 'Playlists', icon: '🎵' },
              { key: 'users', label: 'Usuarios', icon: '👥' },
              { key: 'payments', label: 'Pagos', icon: '💳' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
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
          <div className="space-y-6 sm:space-y-8">
            {/* 🚨 NEW: Pagos arriba del todo, ocupando ancho completo */}
            {(() => {
                const allPayments = data?.recentPayments || [];
                // 🚨 CRITICAL: Solo contar pagos completed con amount > 0 para cálculos de dinero
                const completedPayments = allPayments.filter((p: any) => 
                  p.status === 'completed' && p.amount && p.amount > 0
                );
              
              // Calcular totales: cada pago es 5€, Stripe quita ~0.33€ (entonces neto = 4.67€)
              const GROSS_PER_PAYMENT = 5.00; // €
              const STRIPE_FEE = 0.33; // €
              const NET_PER_PAYMENT = GROSS_PER_PAYMENT - STRIPE_FEE; // 4.67€
              
              const totalNet = completedPayments.length * NET_PER_PAYMENT;
              
              // Calcular por período
              const now = new Date();
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const thisWeek = new Date(today);
              thisWeek.setDate(today.getDate() - today.getDay()); // Lunes de esta semana
              const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
              
              const paymentsToday = completedPayments.filter((p: any) => {
                const paymentDate = new Date(p.created_at);
                return paymentDate >= today;
              });
              
              const paymentsThisWeek = completedPayments.filter((p: any) => {
                const paymentDate = new Date(p.created_at);
                return paymentDate >= thisWeek;
              });
              
              const paymentsThisMonth = completedPayments.filter((p: any) => {
                const paymentDate = new Date(p.created_at);
                return paymentDate >= thisMonth;
              });
              
              const netToday = paymentsToday.length * NET_PER_PAYMENT;
              const netThisWeek = paymentsThisWeek.length * NET_PER_PAYMENT;
              const netThisMonth = paymentsThisMonth.length * NET_PER_PAYMENT;
              
              return (
                <div className="bg-gray-900 rounded-lg border border-gray-700 p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-800">
                    <h3 className="text-gray-300 text-base sm:text-lg font-semibold uppercase tracking-wider">💳 Pagos e Ingresos</h3>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-blue-500/30 transition-colors">
                      <div className="text-gray-400 text-xs mb-2 font-medium uppercase tracking-wider">Total Neto</div>
                      <div className="text-white text-2xl font-bold mb-1">{totalNet.toFixed(2)} €</div>
                      <div className="text-gray-500 text-xs">{completedPayments.length} pagos</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-blue-500/30 transition-colors">
                      <div className="text-gray-400 text-xs mb-2 font-medium uppercase tracking-wider">Este Mes</div>
                      <div className="text-white text-2xl font-bold mb-1">{netThisMonth.toFixed(2)} €</div>
                      <div className="text-gray-500 text-xs">{paymentsThisMonth.length} pagos</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-blue-500/30 transition-colors">
                      <div className="text-gray-400 text-xs mb-2 font-medium uppercase tracking-wider">Esta Semana</div>
                      <div className="text-white text-2xl font-bold mb-1">{netThisWeek.toFixed(2)} €</div>
                      <div className="text-gray-500 text-xs">{paymentsThisWeek.length} pagos</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-blue-500/30 transition-colors">
                      <div className="text-gray-400 text-xs mb-2 font-medium uppercase tracking-wider">Hoy</div>
                      <div className="text-white text-2xl font-bold mb-1">{netToday.toFixed(2)} €</div>
                      <div className="text-gray-500 text-xs">{paymentsToday.length} pagos</div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <SimpleChart 
                      data={chartData.payments} 
                      title="Pagos Registrados" 
                      color="#60a5fa" 
                    />
                  </div>
                </div>
              );
            })()}
            
            {/* Gráficas */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
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
            </div>

            {/* Métricas principales */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6">
              {[
                { key: 'prompts', label: 'Prompts', icon: '💬', color: 'bg-blue-50 border-blue-200', textColor: 'text-blue-600' },
                { key: 'usage_events', label: 'Eventos de Uso', icon: '⚡', color: 'bg-purple-50 border-purple-200', textColor: 'text-purple-600' },
                { key: 'profiles', label: 'Perfiles', icon: '👤', color: 'bg-green-50 border-green-200', textColor: 'text-green-600' },
                { key: 'playlists', label: 'Playlists', icon: '🎵', color: 'bg-orange-50 border-orange-200', textColor: 'text-orange-600' },
                { key: 'payments', label: 'Pagos', icon: '💳', color: 'bg-yellow-50 border-yellow-200', textColor: 'text-yellow-600' }
              ].map((metric) => (
                <div key={metric.key} className="bg-gray-800 rounded-lg border border-gray-700 p-4 sm:p-6">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 ${metric.color} rounded-lg flex items-center justify-center mb-3 sm:mb-4 border`}>
                    <span className="text-sm sm:text-lg">{metric.icon}</span>
                  </div>
                  <h3 className="text-gray-300 text-xs sm:text-sm font-medium mb-2">{metric.label}</h3>
                  <p className="text-lg sm:text-2xl font-bold text-white">{data?.counts[metric.key as keyof typeof data.counts] || 0}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Apartados específicos */}
        {activeTab === 'prompts' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Gráfica específica */}
            <SimpleChart 
              data={chartData.prompts} 
              title="Prompts Generados" 
              color="#3b82f6" 
            />
            
            {/* Datos concretos */}
            <div className="bg-gray-900 rounded-lg border border-gray-700 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-3 sm:space-y-0 pb-4 border-b border-gray-800">
                <h3 className="text-base sm:text-lg font-semibold text-gray-300 uppercase tracking-wider">💬 Prompts Recientes</h3>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                  <div className="flex items-center space-x-2">
                    <label className="text-xs sm:text-sm text-gray-400">Tipo:</label>
                    <select 
                      value={dateFilters.prompts.type}
                      onChange={(e) => setDateFilters(prev => ({
                        ...prev,
                        prompts: { ...prev.prompts, type: e.target.value as 'exact' | 'range' }
                      }))}
                      className="px-2 py-1 bg-gray-800 text-white rounded text-xs sm:text-sm border border-gray-700 hover:border-blue-500/50 transition-colors"
                    >
                      <option value="exact">Día exacto</option>
                      <option value="range">Rango</option>
                    </select>
                  </div>
                  
                  {dateFilters.prompts.type === 'exact' ? (
                    <input
                      type="date"
                      value={dateFilters.prompts.exactDate}
                      onChange={(e) => setDateFilters(prev => ({
                        ...prev,
                        prompts: { ...prev.prompts, exactDate: e.target.value }
                      }))}
                      className="px-2 sm:px-3 py-1 bg-gray-800 text-white rounded text-xs sm:text-sm border border-gray-700 hover:border-blue-500/50 transition-colors"
                    />
                  ) : (
                    <div className="flex space-x-2">
                      <input
                        type="date"
                        value={dateFilters.prompts.startDate}
                        onChange={(e) => setDateFilters(prev => ({
                          ...prev,
                          prompts: { ...prev.prompts, startDate: e.target.value }
                        }))}
                        className="px-2 sm:px-3 py-1 bg-gray-800 text-white rounded text-xs sm:text-sm border border-gray-700 hover:border-blue-500/50 transition-colors"
                        placeholder="Desde"
                      />
                      <input
                        type="date"
                        value={dateFilters.prompts.endDate}
                        onChange={(e) => setDateFilters(prev => ({
                          ...prev,
                          prompts: { ...prev.prompts, endDate: e.target.value }
                        }))}
                        className="px-2 sm:px-3 py-1 bg-gray-800 text-white rounded text-xs sm:text-sm border border-gray-700 hover:border-blue-500/50 transition-colors"
                        placeholder="Hasta"
                      />
                    </div>
                  )}
                  
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => applyDateFilter('prompts')}
                      className="px-2 sm:px-3 py-1 bg-blue-600/80 text-white rounded text-xs sm:text-sm hover:bg-blue-600 border border-blue-500/30 transition-all"
                    >
                      Filtrar
                    </button>
                    <button 
                      onClick={() => clearDateFilter('prompts')}
                      className="px-2 sm:px-3 py-1 bg-gray-700 text-white rounded text-xs sm:text-sm hover:bg-gray-600 border border-gray-600 transition-all"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                {filteredData.prompts?.map((prompt, index) => (
                  <div key={prompt.id || index} className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700 hover:border-gray-600 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-1 sm:space-y-0">
                      <span className="text-xs sm:text-sm text-gray-400">
                        {new Date(prompt.created_at).toLocaleString('es-ES')}
                      </span>
                      <span className="text-xs text-gray-500">{prompt.user_email}</span>
                    </div>
                    <p className="text-white text-xs sm:text-sm break-words">{prompt.text}</p>
                  </div>
                )) || (
                  <div className="text-gray-400 text-center py-8">
                    No hay prompts disponibles
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'usage' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Gráfica específica */}
            <SimpleChart 
              data={chartData.usage} 
              title="Eventos de Uso" 
              color="#8b5cf6" 
            />
            
            {/* Datos concretos */}
            <div className="bg-gray-900 rounded-lg border border-gray-700 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-3 sm:space-y-0 pb-4 border-b border-gray-800">
                <h3 className="text-base sm:text-lg font-semibold text-gray-300 uppercase tracking-wider">⚡ Eventos de Uso Recientes</h3>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                  <div className="flex items-center space-x-2">
                    <label className="text-xs sm:text-sm text-gray-400">Tipo:</label>
                    <select 
                      value={dateFilters.usage.type}
                      onChange={(e) => setDateFilters(prev => ({
                        ...prev,
                        usage: { ...prev.usage, type: e.target.value as 'exact' | 'range' }
                      }))}
                      className="px-2 py-1 bg-gray-800 text-white rounded text-xs sm:text-sm border border-gray-700 hover:border-blue-500/50 transition-colors"
                    >
                      <option value="exact">Día exacto</option>
                      <option value="range">Rango</option>
                    </select>
                  </div>
                  
                  {dateFilters.usage.type === 'exact' ? (
                    <input
                      type="date"
                      value={dateFilters.usage.exactDate}
                      onChange={(e) => setDateFilters(prev => ({
                        ...prev,
                        usage: { ...prev.usage, exactDate: e.target.value }
                      }))}
                      className="px-2 sm:px-3 py-1 bg-gray-800 text-white rounded text-xs sm:text-sm border border-gray-700 hover:border-blue-500/50 transition-colors"
                    />
                  ) : (
                    <div className="flex space-x-2">
                      <input
                        type="date"
                        value={dateFilters.usage.startDate}
                        onChange={(e) => setDateFilters(prev => ({
                          ...prev,
                          usage: { ...prev.usage, startDate: e.target.value }
                        }))}
                        className="px-2 sm:px-3 py-1 bg-gray-800 text-white rounded text-xs sm:text-sm border border-gray-700 hover:border-blue-500/50 transition-colors"
                        placeholder="Desde"
                      />
                      <input
                        type="date"
                        value={dateFilters.usage.endDate}
                        onChange={(e) => setDateFilters(prev => ({
                          ...prev,
                          usage: { ...prev.usage, endDate: e.target.value }
                        }))}
                        className="px-2 sm:px-3 py-1 bg-gray-800 text-white rounded text-xs sm:text-sm border border-gray-700 hover:border-blue-500/50 transition-colors"
                        placeholder="Hasta"
                      />
                    </div>
                  )}
                  
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => applyDateFilter('usage')}
                      className="px-2 sm:px-3 py-1 bg-purple-600/80 text-white rounded text-xs sm:text-sm hover:bg-purple-600 border border-purple-500/30 transition-all"
                    >
                      Filtrar
                    </button>
                    <button 
                      onClick={() => clearDateFilter('usage')}
                      className="px-2 sm:px-3 py-1 bg-gray-700 text-white rounded text-xs sm:text-sm hover:bg-gray-600 border border-gray-600 transition-all"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3 max-h-[800px] overflow-y-auto" style={{ scrollBehavior: 'smooth' }}>
                {filteredData.usage?.map((event, index) => (
                  <div key={event.id || index} className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700 hover:border-gray-600 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-1 sm:space-y-0">
                      <span className="text-xs sm:text-sm text-gray-400">
                        {new Date(event.occurred_at).toLocaleString('es-ES')}
                      </span>
                      <span className="text-xs text-gray-500">{event.user_email}</span>
                    </div>
                    <p className="text-white text-xs sm:text-sm">
                      <span className="text-purple-400 font-medium">{event.action}</span>
                    </p>
                  </div>
                )) || (
                  <div className="text-gray-400 text-center py-8">
                    No hay eventos de uso disponibles
                  </div>
          )}
        </div>
            </div>
          </div>
        )}

        {activeTab === 'playlists' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Gráfica específica */}
            <SimpleChart 
              data={chartData.playlists} 
              title="Playlists Creadas" 
              color="#f97316" 
            />
            
            {/* Datos concretos */}
            <div className="bg-gray-900 rounded-lg border border-gray-700 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-3 sm:space-y-0 pb-4 border-b border-gray-800">
                <h3 className="text-base sm:text-lg font-semibold text-gray-300 uppercase tracking-wider">🎵 Playlists Recientes</h3>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                  <div className="flex items-center space-x-2">
                    <label className="text-xs sm:text-sm text-gray-400">Tipo:</label>
                    <select 
                      value={dateFilters.playlists.type}
                      onChange={(e) => setDateFilters(prev => ({
                        ...prev,
                        playlists: { ...prev.playlists, type: e.target.value as 'exact' | 'range' }
                      }))}
                      className="px-2 py-1 bg-gray-800 text-white rounded text-xs sm:text-sm border border-gray-700 hover:border-blue-500/50 transition-colors"
                    >
                      <option value="exact">Día exacto</option>
                      <option value="range">Rango</option>
                    </select>
                  </div>
                  
                  {dateFilters.playlists.type === 'exact' ? (
                    <input
                      type="date"
                      value={dateFilters.playlists.exactDate}
                      onChange={(e) => setDateFilters(prev => ({
                        ...prev,
                        playlists: { ...prev.playlists, exactDate: e.target.value }
                      }))}
                      className="px-2 sm:px-3 py-1 bg-gray-800 text-white rounded text-xs sm:text-sm border border-gray-700 hover:border-blue-500/50 transition-colors"
                    />
                  ) : (
                    <div className="flex space-x-2">
                      <input
                        type="date"
                        value={dateFilters.playlists.startDate}
                        onChange={(e) => setDateFilters(prev => ({
                          ...prev,
                          playlists: { ...prev.playlists, startDate: e.target.value }
                        }))}
                        className="px-2 sm:px-3 py-1 bg-gray-800 text-white rounded text-xs sm:text-sm border border-gray-700 hover:border-blue-500/50 transition-colors"
                        placeholder="Desde"
                      />
                      <input
                        type="date"
                        value={dateFilters.playlists.endDate}
                        onChange={(e) => setDateFilters(prev => ({
                          ...prev,
                          playlists: { ...prev.playlists, endDate: e.target.value }
                        }))}
                        className="px-2 sm:px-3 py-1 bg-gray-800 text-white rounded text-xs sm:text-sm border border-gray-700 hover:border-blue-500/50 transition-colors"
                        placeholder="Hasta"
                      />
                    </div>
                  )}
                  
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => applyDateFilter('playlists')}
                      className="px-2 sm:px-3 py-1 bg-orange-600/80 text-white rounded text-xs sm:text-sm hover:bg-orange-600 border border-orange-500/30 transition-all"
                    >
                      Filtrar
                    </button>
                    <button 
                      onClick={() => clearDateFilter('playlists')}
                      className="px-2 sm:px-3 py-1 bg-gray-700 text-white rounded text-xs sm:text-sm hover:bg-gray-600 border border-gray-600 transition-all"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3 max-h-[800px] overflow-y-auto" style={{ scrollBehavior: 'smooth' }}>
                {filteredData.playlists?.map((playlist, index) => (
                  <div key={playlist.id || index} className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700 hover:border-gray-600 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-1 sm:space-y-0">
                      <span className="text-xs sm:text-sm text-gray-400">
                        {new Date(playlist.created_at).toLocaleString('es-ES')}
                      </span>
                      <span className="text-xs text-gray-500">{playlist.user_email}</span>
                    </div>
                    <h4 className="text-white font-medium mb-1 text-sm sm:text-base">{playlist.playlist_name}</h4>
                    <p className="text-gray-300 text-xs sm:text-sm mb-2 break-words">{playlist.prompt}</p>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-400 space-y-1 sm:space-y-0">
                      <span>{playlist.track_count} canciones</span>
                      {playlist.spotify_url && (
                        <a href={playlist.spotify_url} target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300">
                          Ver en Spotify
                        </a>
                      )}
                    </div>
                  </div>
                )) || (
                  <div className="text-gray-400 text-center py-8">
                    No hay playlists disponibles
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-white mb-4">👥 Todos los Usuarios</h3>
              <UsersList />
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="space-y-4 sm:space-y-6">
            {/* 🚨 NEW: Contadores de dinero */}
            {(() => {
              // 🚨 CRITICAL: Usar data?.recentPayments directamente (todos los pagos de Supabase)
              // filteredData.payments puede estar vacío si no se ha aplicado filtro
              const allPayments = data?.recentPayments || [];
              // 🚨 CRITICAL: Solo contar pagos completed con amount > 0 para cálculos de dinero
              const completedPayments = allPayments.filter((p: any) => 
                p.status === 'completed' && p.amount && p.amount > 0
              );
              
              console.log('[PAYMENTS] Total payments from Supabase:', allPayments.length);
              console.log('[PAYMENTS] Completed payments:', completedPayments.length);
              
              // Calcular totales: cada pago es 5€, Stripe quita ~0.33€ (entonces neto = 4.67€)
              const GROSS_PER_PAYMENT = 5.00; // €
              const STRIPE_FEE = 0.33; // €
              const NET_PER_PAYMENT = GROSS_PER_PAYMENT - STRIPE_FEE; // 4.67€
              
              const totalGross = completedPayments.length * GROSS_PER_PAYMENT;
              const totalFees = completedPayments.length * STRIPE_FEE;
              const totalNet = completedPayments.length * NET_PER_PAYMENT;
              
              // Calcular por período
              const now = new Date();
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const thisWeek = new Date(today);
              thisWeek.setDate(today.getDate() - today.getDay()); // Lunes de esta semana
              const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
              
              const paymentsToday = completedPayments.filter((p: any) => {
                const paymentDate = new Date(p.created_at);
                return paymentDate >= today;
              });
              
              const paymentsThisWeek = completedPayments.filter((p: any) => {
                const paymentDate = new Date(p.created_at);
                return paymentDate >= thisWeek;
              });
              
              const paymentsThisMonth = completedPayments.filter((p: any) => {
                const paymentDate = new Date(p.created_at);
                return paymentDate >= thisMonth;
              });
              
              const netToday = paymentsToday.length * NET_PER_PAYMENT;
              const netThisWeek = paymentsThisWeek.length * NET_PER_PAYMENT;
              const netThisMonth = paymentsThisMonth.length * NET_PER_PAYMENT;
              
              return (
                <div className="space-y-6">
                  {/* Contadores principales con estilo tech */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-900 rounded-lg p-5 border border-gray-700 hover:border-blue-500/50 transition-all relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all"></div>
                      <div className="relative">
                        <div className="text-gray-400 text-xs mb-2 font-medium uppercase tracking-wider">Total Neto</div>
                        <div className="text-white text-3xl font-bold mb-1">{totalNet.toFixed(2)} €</div>
                        <div className="text-gray-500 text-xs">
                          {completedPayments.length} pagos × {NET_PER_PAYMENT.toFixed(2)}€
                        </div>
                        <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-blue-500/0 via-blue-500/30 to-blue-500/0"></div>
                      </div>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-5 border border-gray-700 hover:border-blue-500/50 transition-all relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all"></div>
                      <div className="relative">
                        <div className="text-gray-400 text-xs mb-2 font-medium uppercase tracking-wider">Este Mes</div>
                        <div className="text-white text-3xl font-bold mb-1">{netThisMonth.toFixed(2)} €</div>
                        <div className="text-gray-500 text-xs">{paymentsThisMonth.length} pagos</div>
                        <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-blue-500/0 via-blue-500/30 to-blue-500/0"></div>
                      </div>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-5 border border-gray-700 hover:border-blue-500/50 transition-all relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all"></div>
                      <div className="relative">
                        <div className="text-gray-400 text-xs mb-2 font-medium uppercase tracking-wider">Esta Semana</div>
                        <div className="text-white text-3xl font-bold mb-1">{netThisWeek.toFixed(2)} €</div>
                        <div className="text-gray-500 text-xs">{paymentsThisWeek.length} pagos</div>
                        <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-blue-500/0 via-blue-500/30 to-blue-500/0"></div>
                      </div>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-5 border border-gray-700 hover:border-blue-500/50 transition-all relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all"></div>
                      <div className="relative">
                        <div className="text-gray-400 text-xs mb-2 font-medium uppercase tracking-wider">Hoy</div>
                        <div className="text-white text-3xl font-bold mb-1">{netToday.toFixed(2)} €</div>
                        <div className="text-gray-500 text-xs">{paymentsToday.length} pagos</div>
                        <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-blue-500/0 via-blue-500/30 to-blue-500/0"></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Gráfica y desglose técnico */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Gráfica */}
                    <div className="lg:col-span-2 bg-gray-900 rounded-lg border border-gray-700 p-6">
                      <SimpleChart 
                        data={chartData.payments} 
                        title="Pagos Registrados" 
                        color="#60a5fa" 
                      />
                    </div>
                    
                    {/* Desglose técnico */}
                    <div className="bg-gray-900 rounded-lg border border-gray-700 p-6 space-y-4">
                      <div className="text-gray-300 text-sm font-semibold mb-4 uppercase tracking-wider border-b border-gray-700 pb-2">
                        Desglose Financiero
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center pb-3 border-b border-gray-800">
                          <div>
                            <div className="text-gray-400 text-xs mb-1">Total Bruto</div>
                            <div className="text-gray-300 text-lg font-semibold">{totalGross.toFixed(2)} €</div>
                          </div>
                          <div className="w-2 h-2 rounded-full bg-blue-500/30"></div>
                        </div>
                        <div className="flex justify-between items-center pb-3 border-b border-gray-800">
                          <div>
                            <div className="text-gray-400 text-xs mb-1">Comisiones</div>
                            <div className="text-gray-400 text-lg font-semibold">-{totalFees.toFixed(2)} €</div>
                          </div>
                          <div className="w-2 h-2 rounded-full bg-red-500/30"></div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-gray-400 text-xs mb-1">Total Neto</div>
                            <div className="text-white text-xl font-bold">{totalNet.toFixed(2)} €</div>
                          </div>
                          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
            
            {/* Datos concretos */}
            <div className="bg-gray-900 rounded-lg border border-gray-700 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-3 sm:space-y-0 pb-4 border-b border-gray-800">
                <h3 className="text-base sm:text-lg font-semibold text-gray-300 uppercase tracking-wider">💳 Pagos Recientes</h3>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                  <div className="flex items-center space-x-2">
                    <label className="text-xs sm:text-sm text-gray-400">Tipo:</label>
                    <select 
                      value={dateFilters.payments.type}
                      onChange={(e) => setDateFilters(prev => ({
                        ...prev,
                        payments: { ...prev.payments, type: e.target.value as 'exact' | 'range' }
                      }))}
                      className="px-2 py-1 bg-gray-800 text-white rounded text-xs sm:text-sm border border-gray-700 hover:border-blue-500/50 transition-colors"
                    >
                      <option value="exact">Día exacto</option>
                      <option value="range">Rango</option>
                    </select>
                  </div>
                  
                  {dateFilters.payments.type === 'exact' ? (
                    <input
                      type="date"
                      value={dateFilters.payments.exactDate}
                      onChange={(e) => setDateFilters(prev => ({
                        ...prev,
                        payments: { ...prev.payments, exactDate: e.target.value }
                      }))}
                      className="px-2 sm:px-3 py-1 bg-gray-800 text-white rounded text-xs sm:text-sm border border-gray-700 hover:border-blue-500/50 transition-colors"
                    />
                  ) : (
                    <div className="flex space-x-2">
                      <input
                        type="date"
                        value={dateFilters.payments.startDate}
                        onChange={(e) => setDateFilters(prev => ({
                          ...prev,
                          payments: { ...prev.payments, startDate: e.target.value }
                        }))}
                        className="px-2 sm:px-3 py-1 bg-gray-800 text-white rounded text-xs sm:text-sm border border-gray-700 hover:border-blue-500/50 transition-colors"
                        placeholder="Desde"
                      />
                      <input
                        type="date"
                        value={dateFilters.payments.endDate}
                        onChange={(e) => setDateFilters(prev => ({
                          ...prev,
                          payments: { ...prev.payments, endDate: e.target.value }
                        }))}
                        className="px-2 sm:px-3 py-1 bg-gray-800 text-white rounded text-xs sm:text-sm border border-gray-700 hover:border-blue-500/50 transition-colors"
                        placeholder="Hasta"
                      />
                    </div>
                  )}
                  
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => applyDateFilter('payments')}
                      className="px-2 sm:px-3 py-1 bg-blue-600/80 text-white rounded text-xs sm:text-sm hover:bg-blue-600 border border-blue-500/30 transition-all"
                    >
                      Filtrar
                    </button>
                    <button 
                      onClick={() => clearDateFilter('payments')}
                      className="px-2 sm:px-3 py-1 bg-gray-700 text-white rounded text-xs sm:text-sm hover:bg-gray-600 border border-gray-600 transition-all"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3 max-h-[800px] overflow-y-auto" style={{ scrollBehavior: 'smooth' }}>
                {(filteredData.payments && filteredData.payments.length > 0 ? filteredData.payments : data?.recentPayments || []).map((payment, index) => (
                  <div key={payment.id || index} className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700 hover:border-blue-500/30 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-1 sm:space-y-0">
                      <span className="text-xs sm:text-sm text-gray-400">
                        {payment.created_at ? new Date(payment.created_at).toLocaleString('es-ES') : 'Sin fecha'}
                      </span>
                      <span className="text-xs text-gray-500">{payment.user_email || 'Sin email'}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                      <div>
                        <p className="text-white font-medium text-sm sm:text-base">{payment.plan || 'N/A'}</p>
                        <p className="text-gray-300 text-xs sm:text-sm">
                          {payment.amount && payment.amount > 0 
                            ? (payment.amount / 100).toFixed(2) 
                            : '0.00'} {payment.currency?.toUpperCase() || 'EUR'}
                          {payment.amount === 0 && (
                            <span className="ml-2 text-gray-500 text-xs">(manual/granted)</span>
                          )}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        payment.status === 'completed' ? 'bg-green-600/80 text-white border border-green-500/30' :
                        payment.status === 'granted' ? 'bg-blue-600/80 text-white border border-blue-500/30' :
                        payment.status === 'pending' ? 'bg-yellow-600/80 text-white border border-yellow-500/30' :
                        'bg-gray-600/80 text-white border border-gray-500/30'
                      }`}>
                        {payment.status || 'unknown'}
                      </span>
                    </div>
                  </div>
                )) || (
                  <div className="text-gray-400 text-center py-8">
                    No hay pagos disponibles
                  </div>
                )}
              </div>
            </div>
          </div>
          )}
        </div>
    </div>
  );
}
