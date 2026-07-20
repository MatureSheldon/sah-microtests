import { useState, useEffect } from 'react';
import { getCalendarEvents, upsertCalendarEvent, deleteCalendarEvent } from '../../lib/gateway';

export function CalendarTab() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 1)); // July 2026 default
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<any>({
    event_type: 'holiday',
    scope: 'school',
    is_working_day: false,
    is_instructional_day: false
  });

  const loadEvents = () => {
    setLoading(true);
    getCalendarEvents().then(res => {
      setEvents(res.events || []);
      setLoading(false);
    });
  };

  useEffect(() => { loadEvents(); }, []);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
    let day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Make Monday=0, Sunday=6
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.event_name || !formData.start_date || !formData.end_date) return;
    setIsSubmitting(true);
    await upsertCalendarEvent(formData);
    setIsSubmitting(false);
    setIsFormOpen(false);
    loadEvents();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this event?')) {
      await deleteCalendarEvent(id);
      loadEvents();
    }
  };

  // Generate Calendar Grid
  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const renderGrid = () => {
    const grid = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    // Header
    const headerRow = dayNames.map(d => (
      <div key={d} className="text-center font-bold text-slate-500 text-xs py-2 bg-slate-50 border-b border-slate-200">
        {d}
      </div>
    ));
    grid.push(...headerRow);

    // Empty cells before 1st
    for (let i = 0; i < firstDay; i++) {
      grid.push(<div key={`empty-${i}`} className="min-h-[80px] p-2 bg-slate-50/30 border-b border-r border-slate-100"></div>);
    }

    // Days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      
      // Find events that overlap with this date
      const dayEvents = events.filter(e => {
        if (e.status === 'inactive') return false;
        return dateStr >= e.start_date && dateStr <= e.end_date;
      });

      grid.push(
        <div key={d} className={`min-h-[80px] p-2 border-b border-r border-slate-100 flex flex-col gap-1 ${dayEvents.some(e=>e.event_type==='holiday') ? 'bg-red-50/50' : 'bg-white'}`}>
          <span className={`text-sm font-semibold ${dayEvents.some(e=>e.event_type==='holiday') ? 'text-red-700' : 'text-slate-700'}`}>
            {d}
          </span>
          <div className="flex flex-col gap-1">
            {dayEvents.map(e => (
              <div key={e.event_id} className={`text-[10px] px-1.5 py-0.5 rounded leading-tight truncate font-medium
                ${e.event_type === 'holiday' ? 'bg-red-100 text-red-800' : 
                  e.event_type === 'exam' ? 'bg-purple-100 text-purple-800' : 
                  e.event_type === 'ptm' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                {e.event_name}
              </div>
            ))}
          </div>
        </div>
      );
    }
    return grid;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 mb-1">Academic Calendar</h1>
          <p className="text-slate-500">Manage holidays, exams, and school events.</p>
        </div>
        <button 
          onClick={() => { setFormData({event_type: 'holiday', scope: 'school'}); setIsFormOpen(true); }}
          disabled={isFormOpen}
          className="px-4 py-2 bg-brand-primary text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50"
        >
          + Add Event
        </button>
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-in slide-in-from-top-2">
          <h2 className="text-lg font-bold mb-4">New Event</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Event Name *</label>
              <input required type="text" className="w-full px-3 py-2 border rounded-lg outline-none" 
                value={formData.event_name || ''} onChange={e => setFormData({...formData, event_name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
              <select required className="w-full px-3 py-2 border rounded-lg outline-none"
                value={formData.event_type} onChange={e => setFormData({...formData, event_type: e.target.value})}>
                <option value="holiday">🔴 Holiday</option>
                <option value="exam">🟣 Exam Window</option>
                <option value="ptm">🟡 PTM</option>
                <option value="event">🔵 General Event</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Scope</label>
              <select className="w-full px-3 py-2 border rounded-lg outline-none"
                value={formData.scope} onChange={e => setFormData({...formData, scope: e.target.value})}>
                <option value="school">Entire School</option>
                <option value="classes">Specific Classes (advanced)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
              <input required type="date" className="w-full px-3 py-2 border rounded-lg outline-none" 
                value={formData.start_date || ''} onChange={e => setFormData({...formData, start_date: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date *</label>
              <input required type="date" className="w-full px-3 py-2 border rounded-lg outline-none" 
                value={formData.end_date || ''} onChange={e => setFormData({...formData, end_date: e.target.value})} />
            </div>
            
            <div className="lg:col-span-3 flex justify-end gap-3 mt-2">
              <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-brand-primary text-white rounded-lg font-medium hover:bg-slate-800 flex items-center gap-2">
                {isSubmitting ? 'Saving...' : '💾 Save Event'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
            <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 font-bold">◀</button>
            <h2 className="text-lg font-bold text-slate-800">{monthName}</h2>
            <button onClick={handleNextMonth} className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 font-bold">▶</button>
          </div>
          <div className="grid grid-cols-7 border-l border-slate-100 bg-white">
            {renderGrid()}
          </div>
        </div>

        {/* Event List */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col h-[600px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
            <h2 className="font-bold text-slate-800">All Events (Active)</h2>
          </div>
          <div className="flex-1 overflow-auto p-2">
            {loading ? <div className="p-4 text-center text-slate-400">Loading...</div> : (
              <ul className="space-y-2">
                {events.filter(e => e.status !== 'inactive').sort((a,b) => a.start_date.localeCompare(b.start_date)).map(e => (
                  <li key={e.event_id} className="p-3 border border-slate-100 rounded-xl hover:shadow-sm transition-shadow">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-slate-800 text-sm">{e.event_name}</span>
                      <button onClick={() => handleDelete(e.event_id)} className="text-slate-400 hover:text-red-500 text-xs">🗑️</button>
                    </div>
                    <div className="text-xs text-slate-500 mb-2">
                      {e.start_date} {e.start_date !== e.end_date ? `to ${e.end_date}` : ''}
                    </div>
                    <div className="flex gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize
                        ${e.event_type === 'holiday' ? 'bg-red-100 text-red-800' : 
                          e.event_type === 'exam' ? 'bg-purple-100 text-purple-800' : 
                          e.event_type === 'ptm' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                        {e.event_type}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium capitalize">
                        {e.scope}
                      </span>
                    </div>
                  </li>
                ))}
                {events.filter(e => e.status !== 'inactive').length === 0 && (
                  <div className="text-center p-8 text-slate-500">No events found.</div>
                )}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
