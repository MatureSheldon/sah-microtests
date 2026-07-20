import { useState, useEffect } from 'react';
import { OverviewTab } from '../components/admin/OverviewTab';
import { PacingTab } from '../components/admin/PacingTab';
import { ActivityTab } from '../components/admin/ActivityTab';
import { TeachersTab } from '../components/admin/TeachersTab';
import { SchoolSetupTab } from '../components/admin/SchoolSetupTab';
import { AssignmentsTab } from '../components/admin/AssignmentsTab';
import { CalendarTab } from '../components/admin/CalendarTab';
import { TimetableTab } from '../components/admin/TimetableTab';
import { SystemTab } from '../components/admin/SystemTab';

const ADMIN_PIN = '2026';

type TabId = 'overview' | 'pacing' | 'activity' | 'teachers' | 'school' | 'assignments' | 'calendar' | 'timetable' | 'system';

export function AdminConsole() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  useEffect(() => {
    const authStatus = sessionStorage.getItem('adminAuth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === ADMIN_PIN) {
      sessionStorage.setItem('adminAuth', 'true');
      setIsAuthenticated(true);
      setPinError(false);
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] w-full animate-in fade-in duration-500">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-sm w-full shadow-sm">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-3xl">
              🔒
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">Admin Console</h1>
          <p className="text-center text-slate-500 text-sm mb-6">Enter PIN to access school settings</p>
          
          <form onSubmit={handlePinSubmit} className="flex flex-col gap-4">
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent/50 transition-all"
              placeholder="••••"
              autoFocus
            />
            {pinError && (
              <p className="text-red-500 text-sm text-center font-medium animate-in slide-in-from-top-1">
                Incorrect PIN
              </p>
            )}
            <button
              type="submit"
              className="w-full py-3 bg-brand-primary text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors"
            >
              Enter Console
            </button>
          </form>
        </div>
      </div>
    );
  }

  const tabs: { id: TabId, label: string, icon: string, group: 'monitor' | 'manage' }[] = [
    { id: 'overview', label: 'Overview', icon: '📊', group: 'monitor' },
    { id: 'pacing', label: 'Pacing', icon: '📈', group: 'monitor' },
    { id: 'activity', label: 'Activity', icon: '📝', group: 'monitor' },
    { id: 'teachers', label: 'Teachers', icon: '👩‍🏫', group: 'manage' },
    { id: 'school', label: 'School', icon: '🏢', group: 'manage' },
    { id: 'assignments', label: 'Assignments', icon: '🔗', group: 'manage' },
    { id: 'calendar', label: 'Calendar', icon: '📅', group: 'manage' },
    { id: 'timetable', label: 'Timetable', icon: '⏱️', group: 'manage' },
    { id: 'system', label: 'System', icon: '⚙️', group: 'manage' },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full bg-slate-50/50">
      {/* Desktop Sidebar / Mobile Topbar */}
      <div className="md:w-64 border-b md:border-b-0 md:border-r border-slate-200 bg-white/50 backdrop-blur flex-shrink-0">
        <div className="p-6 pb-2">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span>🔒</span> Command Center
          </h2>
        </div>
        
        <div className="md:p-4 space-y-2 md:space-y-6 flex overflow-x-auto md:flex-col p-3 no-scrollbar border-b md:border-0 border-slate-200">
          <div className="flex md:flex-col md:space-y-1 gap-2 flex-shrink-0">
            <h3 className="hidden md:block px-3 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Monitor</h3>
            {tabs.filter(t => t.group === 'monitor').map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-brand-primary text-white shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 bg-white md:bg-transparent border border-slate-200 md:border-none'
                }`}
              >
                <span className={activeTab === tab.id ? 'opacity-100' : 'opacity-70'}>{tab.icon}</span>
                <span className="md:inline">{tab.label}</span>
              </button>
            ))}
          </div>
          
          <div className="flex md:flex-col md:space-y-1 gap-2 flex-shrink-0 border-l md:border-0 border-slate-200 pl-2 md:pl-0">
            <h3 className="hidden md:block px-3 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Manage</h3>
            {tabs.filter(t => t.group === 'manage').map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-brand-primary text-white shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 bg-white md:bg-transparent border border-slate-200 md:border-none'
                }`}
              >
                <span className={activeTab === tab.id ? 'opacity-100' : 'opacity-70'}>{tab.icon}</span>
                <span className="md:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-4 md:p-8 animate-in fade-in duration-300">
        {activeTab === 'overview' && <OverviewTab onNavigate={setActiveTab} />}
        {activeTab === 'pacing' && <PacingTab />}
        {activeTab === 'activity' && <ActivityTab onNavigate={setActiveTab} />}
        {activeTab === 'teachers' && <TeachersTab />}
        {activeTab === 'school' && <SchoolSetupTab />}
        {activeTab === 'assignments' && <AssignmentsTab />}
        {activeTab === 'calendar' && <CalendarTab />}
        {activeTab === 'timetable' && <TimetableTab />}
        {activeTab === 'system' && <SystemTab />}
      </div>
    </div>
  );
}
