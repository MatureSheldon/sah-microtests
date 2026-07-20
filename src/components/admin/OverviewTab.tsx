import { useState, useEffect } from 'react';
import { getAdminOverview } from '../../lib/gateway';

export function OverviewTab({ onNavigate }: { onNavigate?: (tab: any) => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getAdminOverview()
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <span className="animate-pulse flex items-center gap-2">
          <span className="text-xl">↻</span> Loading overview...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100">
        <h3 className="font-bold">Error loading overview</h3>
        <p>{error}</p>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const attentionItems = data?.attention_items || [];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 mb-1">Morning Overview</h1>
        <p className="text-slate-500">Here's what's happening across the school today.</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-1">
          <div className="flex items-center gap-2 text-slate-500 font-medium mb-1">
            <span>👩‍🏫</span> Teachers
          </div>
          <div className="text-3xl font-bold text-slate-800">{kpis.active_teachers || 0}</div>
          <div className="text-xs text-slate-400">Active profiles</div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-1">
          <div className="flex items-center gap-2 text-slate-500 font-medium mb-1">
            <span>📚</span> Subjects
          </div>
          <div className="text-3xl font-bold text-slate-800">{kpis.active_subjects || 0}</div>
          <div className="text-xs text-slate-400">Being taught</div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-1">
          <div className="flex items-center gap-2 text-slate-500 font-medium mb-1">
            <span>✅</span> Periods
          </div>
          <div className="text-3xl font-bold text-slate-800">{kpis.periods_logged || 0}</div>
          <div className="text-xs text-slate-400">Logged this week</div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-1">
          <div className="flex items-center gap-2 text-slate-500 font-medium mb-1">
            <span>⚠️</span> Attention
          </div>
          <div className="text-3xl font-bold text-orange-600">{attentionItems.length}</div>
          <div className="text-xs text-slate-400">Items need review</div>
        </div>
      </div>

      {/* Attention Feed */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span>🔔</span> Attention Feed
        </h2>
        
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {attentionItems.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <div className="text-4xl mb-3">🎉</div>
              <p className="font-medium text-slate-700">All clear!</p>
              <p className="text-sm">No urgent items require your attention right now.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {attentionItems.map((item: any, idx: number) => (
                <div 
                  key={idx} 
                  className="p-4 hover:bg-slate-50 transition-colors flex items-start gap-4 cursor-pointer"
                  onClick={() => onNavigate && onNavigate(item.target_tab || 'overview')}
                >
                  <div className="flex-shrink-0 mt-1">
                    {item.severity === 'high' ? '🔴' : item.severity === 'medium' ? '🟠' : '🟡'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">{item.message}</p>
                    <p className="text-xs text-slate-500 mt-1">{item.details}</p>
                  </div>
                  <div className="text-slate-400 text-sm">
                    {item.target_tab === 'pacing' ? 'View Pacing ↗' : 
                     item.target_tab === 'teachers' ? 'View Teachers ↗' : 
                     item.target_tab === 'assignments' ? 'View Assignments ↗' : 'View ↗'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
