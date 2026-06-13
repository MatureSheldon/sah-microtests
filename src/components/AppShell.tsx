import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useState } from 'react';

import { Suspense } from 'react';

function RouteFallback() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm font-medium text-slate-500 shadow-sm animate-pulse flex items-center justify-center min-h-[400px]">
      Loading workspace...
    </div>
  );
}

export function AppShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-surface-bg font-sans text-brand-primary overflow-hidden">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-20 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      <div className={`print:hidden fixed md:static inset-y-0 left-0 z-30 transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out bg-surface-card`}>
        <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
      </div>
      
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <div className="print:hidden sticky top-0 z-10">
          <TopBar onMenuClick={() => setMobileMenuOpen(true)} />
        </div>
        <div className="p-4 md:p-8 space-y-10 max-w-[1400px] w-full print:p-0 print:space-y-0 print:block mx-auto">
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
