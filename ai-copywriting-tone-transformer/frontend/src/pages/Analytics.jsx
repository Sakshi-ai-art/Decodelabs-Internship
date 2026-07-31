import React, { useState, useEffect } from 'react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { 
  BarChart3, 
  TrendingUp, 
  Compass, 
  Flame, 
  AlertCircle
} from 'lucide-react';
import { apiService } from '../services/api';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const stats = await apiService.getAnalytics();
        setData(stats);
      } catch (err) {
        setError("Failed to fetch analytics datasets: " + (err.response?.data?.detail || err.message));
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* KPI Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 h-28 animate-pulse space-y-3">
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
              <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
            </div>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {[...Array(2)].map((_, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 h-80 animate-pulse space-y-4">
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
              <div className="h-full bg-slate-100 dark:bg-slate-800 rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3 text-red-500 dark:text-red-400 text-xs animate-fadeIn">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <p className="leading-relaxed">{error}</p>
      </div>
    );
  }

  const { summary, charts } = data || {
    summary: { total_generations: 0, most_used_platform: 'None', most_used_tone: 'None', avg_temperature: 0.0 },
    charts: { platform_distribution: [], tone_distribution: [], generations_timeline: [], temperature_by_platform: [] }
  };

  const COLORS = ['#6366f1', '#a855f7', '#10b981', '#06b6d4', '#f43f5e', '#f59e0b'];

  return (
    <div className="space-y-8">
      
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Generations */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-450 dark:text-slate-400 uppercase tracking-wider">Total Generations</p>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white font-mono">{summary.total_generations}</h4>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
            <BarChart3 className="w-6 h-6" />
          </div>
        </div>

        {/* Most Used Platform */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-450 dark:text-slate-400 uppercase tracking-wider">Top Platform</p>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{summary.most_used_platform}</h4>
          </div>
          <div className="p-3 bg-violet-500/10 text-violet-500 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Most Used Tone */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-450 dark:text-slate-400 uppercase tracking-wider">Top Tone</p>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{summary.most_used_tone}</h4>
          </div>
          <div className="p-3 bg-cyan-500/10 text-cyan-500 rounded-xl">
            <Compass className="w-6 h-6" />
          </div>
        </div>

        {/* Avg Temperature */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-450 dark:text-slate-400 uppercase tracking-wider">Avg Temperature</p>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white font-mono">{summary.avg_temperature}</h4>
          </div>
          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
            <Flame className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Generations over Time */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-6 uppercase tracking-wider">Generations Timeline</h3>
          <div className="h-64">
            {charts.generations_timeline.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No timeline data available. Save more copy logs!</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.generations_timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.15)" />
                  <XAxis dataKey="date" stroke="rgba(156, 163, 175, 0.5)" fontSize={10} tickLine={false} />
                  <YAxis stroke="rgba(156, 163, 175, 0.5)" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      borderColor: '#e2e8f0', 
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: '#0f172a'
                    }} 
                  />
                  <Area type="monotone" dataKey="count" name="Generations" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Platform Distribution */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-6 uppercase tracking-wider">Platform Share</h3>
          <div className="h-64 flex flex-col md:flex-row items-center justify-center">
            {charts.platform_distribution.length === 0 ? (
              <div className="text-xs text-slate-400">No platform distribution data.</div>
            ) : (
              <>
                <div className="w-full md:w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={charts.platform_distribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="count"
                        nameKey="platform"
                      >
                        {charts.platform_distribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full md:w-1/2 grid grid-cols-2 gap-2.5 px-4">
                  {charts.platform_distribution.map((entry, index) => (
                    <div key={entry.platform} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-md shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{entry.platform}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{entry.count} saved</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tone Distribution */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-6 uppercase tracking-wider">Tone Usage</h3>
          <div className="h-64">
            {charts.tone_distribution.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No tone data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.tone_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.15)" />
                  <XAxis dataKey="tone" stroke="rgba(156, 163, 175, 0.5)" fontSize={10} tickLine={false} />
                  <YAxis stroke="rgba(156, 163, 175, 0.5)" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      borderColor: '#e2e8f0', 
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: '#0f172a'
                    }} 
                  />
                  <Bar dataKey="count" name="Generations" fill="#a855f7" radius={[6, 6, 0, 0]} maxBarSize={35} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Avg Temperature by Platform */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-6 uppercase tracking-wider">Avg Temperature per Platform</h3>
          <div className="h-64">
            {charts.temperature_by_platform.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No parameter data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.temperature_by_platform} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.15)" />
                  <XAxis dataKey="platform" stroke="rgba(156, 163, 175, 0.5)" fontSize={10} tickLine={false} />
                  <YAxis stroke="rgba(156, 163, 175, 0.5)" fontSize={10} tickLine={false} domain={[0, 1.5]} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      borderColor: '#e2e8f0', 
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: '#0f172a'
                    }} 
                  />
                  <Bar dataKey="avg_temp" name="Avg Temperature" fill="#06b6d4" radius={[6, 6, 0, 0]} maxBarSize={35} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
