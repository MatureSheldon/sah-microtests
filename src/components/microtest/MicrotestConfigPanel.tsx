import React from 'react';
import { BankData } from '../../lib/bank';

interface Props {
  state: any;
  filtering: any;
  bank: BankData;
}

export function MicrotestConfigPanel({ state, filtering, bank }: Props) {
  const {
    bankStatus, loadBank,
    settings, setSettings,
    settingsOpen, setSettingsOpen,
    handleSaveSettings,
    klass, setKlass,
    subject, setSubject,
    testNumber, setTestNumber,
    totalMarks, setTotalMarks,
    duration, setDuration,
    easyPct, setEasyPct,
    mediumPct, setMediumPct,
    hardPct, setHardPct,
    selectedTypes, setSelectedTypes,
    demoMode, setDemoMode,
    handleGenerate,
    initialTopic
  } = state;

  const {
    activeQuestions,
    hasTopicQuestions,
    showTopicFallbackWarning,
    availableClasses,
    availableSubjects,
    totalUsableQuestions,
    totalDatasets,
    activeChapterCount,
    hasQuestions
  } = filtering;

  return (
    <>
      <section className="bg-white border border-border-subtle rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center gap-3">
          <div>
            <h2 className="text-[13px] font-semibold text-brand-primary uppercase tracking-wider">Document Profile</h2>
            <p className="mt-1 text-[11px] text-slate-500">
              {bankStatus} · {totalUsableQuestions} usable questions · {totalDatasets} dataset{totalDatasets === 1 ? '' : 's'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => loadBank(true)} className="px-2 py-1 text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50">Refresh</button>
            <button onClick={() => setSettingsOpen(!settingsOpen)} className="px-2 py-1 text-[11px] font-semibold text-brand-accent bg-brand-accent/10 rounded hover:bg-brand-accent/20">Settings</button>
          </div>
        </div>
        <div className="p-6">
          {settingsOpen && (
            <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
              <div className="grid gap-3">
                <label className="flex flex-col gap-1.5 text-[12px] font-medium text-slate-700">
                  Google Apps Script URL
                  <input value={settings.url} onChange={e => setSettings({ ...settings, url: e.target.value })} placeholder="https://script.google.com/macros/s/.../exec" className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-[12px] outline-none" />
                </label>
                <label className="flex flex-col gap-1.5 text-[12px] font-medium text-slate-700">
                  Passcode optional
                  <input value={settings.passcode} onChange={e => setSettings({ ...settings, passcode: e.target.value })} placeholder="Leave blank if not configured" className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-[12px] outline-none" />
                </label>
                <div className="flex items-center gap-2">
                  <button onClick={handleSaveSettings} className="px-3 py-2 bg-brand-accent text-white text-[12px] font-semibold rounded-lg">Save & reconnect</button>
                  <button onClick={() => setSettingsOpen(false)} className="px-3 py-2 bg-white border border-slate-200 text-slate-600 text-[12px] font-semibold rounded-lg">Close</button>
                </div>
              </div>
            </div>
          )}
          <div className="mb-4 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-[12px] text-slate-600 flex flex-col gap-2">
            <div>Active bank: <strong>{activeQuestions.length}</strong> usable questions · <strong>{activeChapterCount}</strong> chapter{activeChapterCount === 1 ? '' : 's'}</div>
            {hasTopicQuestions && (
              <div className="text-brand-accent font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
                Filtered to exact topic: {initialTopic}
              </div>
            )}
            {showTopicFallbackWarning && (
              <div className="text-amber-600 font-semibold flex items-center gap-1.5 p-2 bg-amber-50 border border-amber-200 rounded">
                <span className="text-amber-500">⚠️</span>
                Topic "{initialTopic}" not found in bank. Falling back to entire chapter.
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <label className="flex flex-col gap-1.5 text-[12px] font-medium text-slate-700">
              Class
              <select 
                value={klass} 
                onChange={e => setKlass(e.target.value)}
                className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] outline-none"
              >
                {availableClasses.map((c: string) => <option key={c} value={c}>Class {c}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-[12px] font-medium text-slate-700">
              Subject
              <select 
                value={subject} 
                onChange={e => setSubject(e.target.value)}
                className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] outline-none"
              >
                {availableSubjects.map((s: string) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <label className="flex flex-col gap-1.5 text-[12px] font-medium text-slate-700">
              Test No.
              <input type="number" value={testNumber} onChange={e => setTestNumber(Number(e.target.value))} className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] outline-none" />
            </label>
            <label className="flex flex-col gap-1.5 text-[12px] font-medium text-slate-700">
              Total Marks
              <input type="number" value={totalMarks} onChange={e => setTotalMarks(Number(e.target.value))} className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] outline-none" />
            </label>
            <label className="flex flex-col gap-1.5 text-[12px] font-medium text-slate-700">
              Duration (m)
              <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] outline-none" />
            </label>
          </div>
        </div>
      </section>

      <section className="bg-white border border-border-subtle rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-[13px] font-semibold text-brand-primary uppercase tracking-wider">Parameters</h2>
        </div>
        <div className="p-6">
          <span className="block text-[12px] font-medium text-slate-700 mb-3">Difficulty Weights</span>
          <div className="grid grid-cols-3 gap-3 mb-8">
            <label className="flex flex-col gap-1.5 text-[12px] font-medium text-slate-600">
              Easy
              <input type="number" value={easyPct} onChange={e=>setEasyPct(Number(e.target.value))} className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-emerald-600 font-bold outline-none focus:border-emerald-400" />
            </label>
            <label className="flex flex-col gap-1.5 text-[12px] font-medium text-slate-600">
              Medium
              <input type="number" value={mediumPct} onChange={e=>setMediumPct(Number(e.target.value))} className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-amber-600 font-bold outline-none focus:border-amber-400" />
            </label>
            <label className="flex flex-col gap-1.5 text-[12px] font-medium text-slate-600">
              Hard
              <input type="number" value={hardPct} onChange={e=>setHardPct(Number(e.target.value))} className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-rose-600 font-bold outline-none focus:border-rose-400" />
            </label>
          </div>

          <span className="block text-[12px] font-medium text-slate-700 mb-3">Allowed Question Types</span>
          <div className="flex flex-wrap gap-2 mb-6">
            {Array.from(new Set(bank.questions.map(q => q.questionType))).sort().map(type => (
              <label key={type} className="inline-flex items-center gap-1.5 text-[12px] text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200 cursor-pointer hover:bg-slate-100">
                <input 
                  type="checkbox" 
                  checked={selectedTypes.includes(type)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedTypes([...selectedTypes, type]);
                    else setSelectedTypes(selectedTypes.filter((t: string) => t !== type));
                  }}
                  className="accent-brand-accent"
                />
                {type}
              </label>
            ))}
          </div>

          <label className="inline-flex items-center gap-2 cursor-pointer text-[12px] font-medium text-slate-600">
            <input type="checkbox" checked={demoMode} onChange={e => setDemoMode(e.target.checked)} className="accent-brand-accent" />
            Demo export
          </label>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <button 
              onClick={handleGenerate} 
              disabled={!hasQuestions}
              className="w-full py-2.5 bg-brand-accent text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Generate Paper
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
