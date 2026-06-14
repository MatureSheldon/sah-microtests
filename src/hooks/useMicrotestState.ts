import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { BankData, clearQuestionBankCache, fetchQuestionBank, getStoredBankSettings, saveStoredBankSettings, Question } from '../lib/bank';
import { generatePaper, replaceQuestion } from '../lib/generator';

export function useMicrotestState() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialClass = searchParams.get('class') || '9';
  const normalizeSubject = (value: string) => /^(maths|math)$/i.test(String(value || '').trim()) ? 'Mathematics' : String(value || '').trim();
  const initialSubject = normalizeSubject(searchParams.get('subject') || 'Mathematics');
  const initialChapter = searchParams.get('chapter') || '';
  const initialChapterNumber = Number(initialChapter.match(/\d+/)?.[0] || 1);
  const initialTopic = searchParams.get('topic') || '';

  const [bank, setBank] = useState<BankData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadStartedAt] = useState(() => Date.now());
  const [settings, setSettings] = useState(() => getStoredBankSettings());
  const [settingsOpen, setSettingsOpen] = useState(() => !getStoredBankSettings().url && !import.meta.env.VITE_GOOGLE_SHEETS_URL);
  const [bankStatus, setBankStatus] = useState('Connecting...');

  // Document Profile State
  const [klass, setKlass] = useState(initialClass);
  const [subject, setSubject] = useState(initialSubject);
  const [testNumber, setTestNumber] = useState(1);
  const [totalMarks, setTotalMarks] = useState(20);
  const [duration, setDuration] = useState(30);

  // Blueprint State
  const [chapters, setChapters] = useState<{ id: string; num: number; target: number }[]>([
    { id: 'c1', num: initialChapterNumber, target: 100 }
  ]);

  // Parameters State
  const [easyPct, setEasyPct] = useState(40);
  const [mediumPct, setMediumPct] = useState(40);
  const [hardPct, setHardPct] = useState(20);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [demoMode, setDemoMode] = useState(false);

  // Preview State
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set());
  const [topicModal, setTopicModal] = useState<{ sourceId: string; selectedType: string | null } | null>(null);
  const [exporting, setExporting] = useState(false);

  const loadBank = (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    setBankStatus(forceRefresh ? 'Refreshing...' : 'Connecting...');
    if (forceRefresh) clearQuestionBankCache();

    fetchQuestionBank().then((data) => {
      setBank(data);
      const types = Array.from(new Set(data.questions.map(q => q.questionType))).filter(Boolean);
      setSelectedTypes(types);
      const sourceLabel = data.connection?.source === 'google-sheets'
        ? 'Google Sheets connected'
        : data.connection?.source === 'cached-google-sheets'
          ? 'Google Sheets cached'
          : 'Local fallback file';
      setBankStatus(sourceLabel);
      setLoading(false);
    }).catch((err) => {
      console.error(err);
      setError(err.message || String(err));
      setBankStatus('Connection failed');
      setLoading(false);
    });
  };

  useEffect(() => {
    loadBank();
  }, []);

  const handleSaveSettings = () => {
    saveStoredBankSettings(settings.url, settings.passcode);
    setSettingsOpen(false);
    loadBank(true);
  };

  return {
    initialClass,
    initialSubject,
    initialTopic,
    
    bank,
    loading,
    error,
    loadStartedAt,
    settings,
    setSettings,
    settingsOpen,
    setSettingsOpen,
    bankStatus,
    loadBank,
    handleSaveSettings,

    klass, setKlass,
    subject, setSubject,
    testNumber, setTestNumber,
    totalMarks, setTotalMarks,
    duration, setDuration,

    chapters, setChapters,

    easyPct, setEasyPct,
    mediumPct, setMediumPct,
    hardPct, setHardPct,
    selectedTypes, setSelectedTypes,
    demoMode, setDemoMode,

    selectedQuestions, setSelectedQuestions,
    lockedIds, setLockedIds,
    topicModal, setTopicModal,
    exporting, setExporting,
  };
}
