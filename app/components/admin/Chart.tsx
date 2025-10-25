'use client';

import { useState, useEffect } from 'react';

interface ChartData {
  date: string;
  count: number;
}

interface ChartProps {
  data: ChartData[];
  title: string;
  color?: string;
}

type TimeRange = 'day' | 'week' | 'month' | 'year';

export default function Chart({ data, title, color = '#3b82f6' }: ChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('day');
  const [chartData, setChartData] = useState<ChartData[]>([]);

  useEffect(() => {
    if (!data || data.length === 0) {
      setChartData([]);
      return;
    }

    const grouped = groupDataByTimeRange(data, timeRange);
    setChartData(grouped);
  }, [data, timeRange]);

  const groupDataByTimeRange = (data: ChartData[], range: TimeRange): ChartData[] => {
    const groups: { [key: string]: number } = {};

    data.forEach(item => {
      const date = new Date(item.date);
      let key: string;

      switch (range) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'year':
          key = String(date.getFullYear());
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      groups[key] = (groups[key] || 0) + item.count;
    });

    return Object.entries(groups)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const formatDate = (dateStr: string, range: TimeRange): string => {
    const date = new Date(dateStr);
    
    switch (range) {
      case 'day':
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
      case 'week':
        return `Sem ${date.toLocaleDateString('es-ES', { week: 'numeric', month: '2-digit' })}`;
      case 'month':
        return date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
      case 'year':
        return date.getFullYear().toString();
      default:
        return dateStr;
    }
  };

  const maxCount = Math.max(...chartData.map(d => d.count), 1);

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <div className="flex space-x-1 bg-gray-700 rounded-lg p-1">
          {(['day', 'week', 'month', 'year'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-600'
              }`}
            >
              {range === 'day' ? 'Día' : 
               range === 'week' ? 'Semana' : 
               range === 'month' ? 'Mes' : 'Año'}
            </button>
          ))}
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          No hay datos disponibles
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-end space-x-1 h-32">
            {chartData.map((item, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full rounded-t-sm transition-all duration-300 hover:opacity-80"
                  style={{
                    height: `${(item.count / maxCount) * 100}%`,
                    backgroundColor: color,
                    minHeight: item.count > 0 ? '4px' : '0px'
                  }}
                  title={`${formatDate(item.date, timeRange)}: ${item.count}`}
                />
                <div className="text-xs text-gray-400 mt-2 text-center">
                  {formatDate(item.date, timeRange)}
                </div>
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
