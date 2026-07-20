import { useState, useEffect } from 'react';
import { getWorkbookRegistry, linkWorkbook, testWorkbookConnection, getAllClasses, getAllSubjects } from '../../lib/gateway';

export function SystemTab() {
  const [registry, setRegistry] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isLinking, setIsLinking] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [testingId, setTestingId] = useState<string | null>(null);

  // Link form state
  const [linkClass, setLinkClass] = useState('');
  const [linkSubject, setLinkSubject] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      getWorkbookRegistry(), getAllClasses(), getAllSubjects()
    ]).then(([regRes, classRes, subRes]) => {
      setRegistry(regRes.registry || []);
      setClasses(classRes || []);
      setSubjects(subRes || []);
      setLoading(false);
    });
  };

  useEffect(() => { loadAll(); }, []);

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkClass || !linkSubject || !linkUrl) return;

    let spreadsheet_id = linkUrl;
    if (linkUrl.includes('/d/')) {
      const parts = linkUrl.split('/d/');
      if (parts.length > 1) {
        spreadsheet_id = parts[1].split('/')[0];
      }
    }

    setIsLinking(true);
    await linkWorkbook({
      class_id: linkClass,
      subject_id: linkSubject,
      spreadsheet_id,
      status: 'active',
      last_synced: new Date().toISOString()
    });
    
    // Auto-test it immediately
    await handleTest(linkClass, linkSubject);

    setIsLinking(false);
    setLinkClass('');
    setLinkSubject('');
    setLinkUrl('');
    loadAll();
  };

  const handleTest = async (class_id: string, subject_id: string) => {
    const key = `${class_id}_${subject_id}`;
    setTestingId(key);
    
    try {
      const result = await testWorkbookConnection(class_id, subject_id);
      setTestResults(prev => ({ ...prev, [key]: result }));
    } catch (e: any) {
      setTestResults(prev => ({ ...prev, [key]: { ok: false, error: e.message } }));
    }
    
    setTestingId(null);
  };

  const getHealthBadge = (reg: any) => {
    const key = `${reg.class_id}_${reg.subject_id}`;
    const res = testResults[key];
    
    if (testingId === key) return <span className="text-slate-400 text-xs font-medium animate-pulse">Testing...</span>;
    if (!res) return <span className="text-slate-400 text-xs font-medium border border-slate-200 px-2 py-0.5 rounded">Untested</span>;
    if (!res.ok) return <span className="text-red-700 bg-red-100 text-xs font-medium px-2 py-0.5 rounded">❌ Error</span>;
    if (res.sheets_found === res.sheets_total) return <span className="text-green-800 bg-green-100 text-xs font-medium px-2 py-0.5 rounded">🟢 Healthy</span>;
    return <span className="text-yellow-800 bg-yellow-100 text-xs font-medium px-2 py-0.5 rounded">🟡 Missing Sheets</span>;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 mb-1">System & Workbooks</h1>
        <p className="text-slate-500">Connect and manage the underlying Google Sheets data sources.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><span>🔗</span> Link New Subject Workbook</h2>
        <form onSubmit={handleLinkSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Class *</label>
            <select required className="w-full px-3 py-2 border rounded-lg outline-none" 
              value={linkClass} onChange={e => setLinkClass(e.target.value)}>
              <option value="">Select...</option>
              {classes.map(c => <option key={c.class_id} value={c.class_id}>{c.class_label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Subject *</label>
            <select required className="w-full px-3 py-2 border rounded-lg outline-none" 
              value={linkSubject} onChange={e => setLinkSubject(e.target.value)}>
              <option value="">Select...</option>
              {subjects.map(s => <option key={s.subject_id} value={s.subject_id}>{s.subject_name}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Google Sheets URL or ID *</label>
            <div className="flex gap-2">
              <input required type="text" className="flex-1 px-3 py-2 border rounded-lg outline-none placeholder:text-slate-300" 
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={linkUrl} onChange={e => setLinkUrl(e.target.value)} />
              <button type="submit" disabled={isLinking} className="px-4 py-2 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-900 disabled:opacity-50 whitespace-nowrap">
                {isLinking ? 'Linking...' : 'Link Workbook'}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h2 className="font-bold text-slate-800">Connected Workbooks</h2>
          <div className="text-sm text-slate-500 font-medium">{registry.length} linked</div>
        </div>
        
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading registry...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Class</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Spreadsheet ID</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Health</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {registry.map((reg, idx) => {
                  const key = `${reg.class_id}_${reg.subject_id}`;
                  const res = testResults[key];
                  
                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
                        {classes.find(c=>c.class_id===reg.class_id)?.class_label || reg.class_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-semibold">
                        {subjects.find(s=>s.subject_id===reg.subject_id)?.subject_name || reg.subject_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-400 truncate max-w-[200px]">
                        <a href={`https://docs.google.com/spreadsheets/d/${reg.spreadsheet_id}`} target="_blank" rel="noreferrer" className="hover:text-brand-accent hover:underline">
                          {reg.spreadsheet_id}
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap flex flex-col gap-1 items-start">
                        {getHealthBadge(reg)}
                        {res && !res.ok && <span className="text-[10px] text-red-500 max-w-[200px] truncate">{res.error}</span>}
                        {res && res.ok && res.sheets_found < res.sheets_total && (
                          <span className="text-[10px] text-yellow-600">Missing: {res.details.missing.join(', ')}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          onClick={() => handleTest(reg.class_id, reg.subject_id)} 
                          disabled={testingId === key}
                          className="px-3 py-1.5 text-xs border border-slate-200 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-50"
                        >
                          Test Connection
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {registry.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No workbooks connected yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
