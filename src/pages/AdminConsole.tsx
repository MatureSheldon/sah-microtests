export function AdminConsole() {
  return (
    <div className="max-w-[1200px] w-full p-4 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Admin Console</h1>
        <p className="text-slate-500 mt-1">Manage school metadata, timetables, and academic calendar.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col items-start">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl mb-4">
            📅
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">School Timetable</h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Manage the master timetable for all classes and teachers. This data is synced directly from the central Google Sheet.
          </p>
          <button 
            className="mt-auto px-4 py-2 bg-slate-50 border border-slate-200 text-brand-primary text-sm font-semibold rounded-lg hover:bg-slate-100 transition-colors w-full sm:w-auto"
            onClick={() => window.open('https://docs.google.com/spreadsheets/', '_blank')}
          >
            Open Timetable Sheet ↗
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col items-start">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-xl mb-4">
            🗓️
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Academic Calendar</h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Update holidays, exam windows, and major events. The scheduling engine uses this to calculate available teaching days.
          </p>
          <button 
            className="mt-auto px-4 py-2 bg-slate-50 border border-slate-200 text-brand-primary text-sm font-semibold rounded-lg hover:bg-slate-100 transition-colors w-full sm:w-auto"
            onClick={() => window.open('https://docs.google.com/spreadsheets/', '_blank')}
          >
            Open Calendar Sheet ↗
          </button>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col items-start md:col-span-2">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center text-xl mb-4">
            ⚙️
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">System Sync</h2>
          <p className="text-sm text-slate-500 mb-6 max-w-2xl leading-relaxed">
            Force a manual sync to pull the latest changes from Google Sheets into the Command Center. 
            (Note: The system automatically syncs every 24 hours).
          </p>
          <div className="flex gap-3 mt-auto">
            <button 
              className="px-4 py-2 bg-brand-primary text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors"
              onClick={() => alert('Syncing data from Google Sheets...')}
            >
              Sync Now
            </button>
            <p className="text-xs text-slate-400 self-center ml-2">Last synced: Today, 08:30 AM</p>
          </div>
        </div>
      </div>
    </div>
  );
}
