import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTeacher } from '../components/TeacherContext';
import { ConceptViewerModal } from '../components/ConceptViewerModal';
import { HomeworkViewer } from '../components/HomeworkViewer';
import { getTeacherAssignments, getSubjectOutline, resolveTopicStruggle } from '../lib/gateway';
import type { TeacherAssignment, SubjectOutlineChapter, SubjectOutlineTopic } from '../lib/models';

// ── Helpers ──────────────────────────────────────────────────────────────────

const SUBJECT_LABELS: Record<string, string> = {
  MATH: 'Mathematics',
  SCI: 'Science',
  ENG: 'English',
  SST: 'Social Science',
  HINDI: 'Hindi',
};

function subjectLabel(id: string) {
  return SUBJECT_LABELS[id] || id;
}

// ── Topic row ─────────────────────────────────────────────────────────────────

function TopicRow({
  topic,
  classId,
  subjectId,
  setViewerHomeworkTopic,
}: {
  topic: SubjectOutlineTopic;
  classId: string;
  subjectId: string;
}) {
  const navigate = useNavigate();
  const classLabel = classId.replace('CLASS_', '');
  const [resolving, setResolving] = useState(false);
  const [localStruggle, setLocalStruggle] = useState(topic.struggle_status);

  useEffect(() => {
    setLocalStruggle(topic.struggle_status);
  }, [topic.struggle_status]);

  const handleResolve = async () => {
    if (!confirm('Have students understood this now? This will mark it as resolved.')) return;
    setResolving(true);
    try {
      await resolveTopicStruggle(classId, subjectId, topic.topic_id);
      setLocalStruggle('resolved');
    } catch (err) {
      console.error(err);
      alert('Failed to resolve topic struggle state.');
    } finally {
      setResolving(false);
    }
  };

  const pills = [
    {
      label: '📋 Lesson Plan',
      available: topic.has_lesson_plan,
      onClick: () => navigate(`/chapters/${topic.topic_id}?classId=${classId}&subjectId=${subjectId}`),
    },
    {
      label: '📚 Homework',
      available: topic.has_homework,
      onClick: () => {
        if (setViewerHomeworkTopic) {
          setViewerHomeworkTopic({ id: topic.topic_id, title: topic.topic_title || `Topic ${topic.sequence_no}` });
        }
      },
    },
    {
      label: '📊 Microtest',
      available: topic.has_microtest,
      onClick: () =>
        navigate(
          `/microtests?class=${classLabel}&subject=${encodeURIComponent(subjectLabel(subjectId))}&topic=${topic.topic_id}`
        ),
    },
  ];

  const anyAvailable = pills.some((p) => p.available);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 border-b border-slate-100 last:border-0 group">
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-medium text-slate-800 truncate">{topic.topic_title || `Topic ${topic.sequence_no}`}</p>
          {localStruggle === 'active' && (
            <button 
              onClick={handleResolve}
              disabled={resolving}
              title="Students struggled. Click to resolve."
              className="shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors border border-rose-200 shadow-sm"
            >
              ⚠️ Class Struggled
            </button>
          )}
          {localStruggle === 'resolved' && (
            <span 
              title="Students previously struggled but it is resolved."
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200"
            >
              🩹 Previously difficult
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-0.5">{topic.planned_periods} period{topic.planned_periods !== 1 ? 's' : ''}</p>
      </div>
      <div className="flex flex-wrap gap-1.5 shrink-0 mt-2 sm:mt-0">
        {pills.map((pill) => (
          <button
            key={pill.label}
            onClick={pill.available ? pill.onClick : undefined}
            title={pill.available ? undefined : 'Not available yet'}
            className={
              pill.available
                ? 'px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all hover:scale-105 active:scale-95 cursor-pointer border-brand-accent/30 bg-brand-accent/5 text-brand-accent hover:bg-brand-accent hover:text-white'
                : 'px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
            }
          >
            {pill.label}
          </button>
        ))}
        {!anyAvailable && (
          <span className="text-[11px] text-slate-400 italic self-center">No content yet</span>
        )}
      </div>

    </div>
  );
}

// ── Chapter accordion card ────────────────────────────────────────────────────

function ChapterCard({
  chapter,
  classId,
  subjectId,
  defaultOpen,
  setViewerChapter,
  setViewerHomeworkTopic,
}: {
  chapter: SubjectOutlineChapter;
  classId: string;
  subjectId: string;
  defaultOpen: boolean;
  setViewerChapter: (v: { id: string; title: string }) => void;
  setViewerHomeworkTopic: (v: { id: string; title: string }) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const available = chapter.topics.filter((t) => t.has_lesson_plan || t.has_concept || t.has_homework).length;
  const total = chapter.topics.length;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <button
        className="w-full flex flex-col sm:flex-row sm:items-center gap-4 px-4 sm:px-6 py-4 text-left hover:bg-slate-50 transition-colors"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="flex items-center justify-between w-full sm:w-auto sm:flex-1 min-w-0 gap-3">
          <span className="size-9 shrink-0 flex items-center justify-center rounded-xl bg-brand-accent/10 text-brand-accent font-bold text-sm">
            {chapter.chapter_no}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 truncate" title={chapter.chapter_title}>{chapter.chapter_title}</p>
            <p className="text-xs text-slate-400 mt-0.5 sm:truncate">
              {total} topic{total !== 1 ? 's' : ''} · {chapter.total_periods || '?'} periods
              {available > 0 && (
                <span className="ml-1.5 text-emerald-600 font-semibold">
                  · {available} with content
                </span>
              )}
            </p>
          </div>
          <span
            className={`text-slate-400 transition-transform duration-200 text-lg sm:hidden ${open ? 'rotate-90' : ''}`}
          >
            ›
          </span>
        </div>
        
        <div className="flex items-center justify-between w-full sm:w-auto sm:shrink-0 gap-4 pl-12 sm:pl-0">
          <button 
            onClick={(e) => { e.stopPropagation(); setViewerChapter({ id: chapter.chapter_id, title: chapter.chapter_title }) }}
            className="w-full sm:w-auto px-4 sm:px-3 py-2 sm:py-1.5 text-sm sm:text-xs font-bold text-brand-accent bg-brand-accent/10 rounded-lg hover:bg-brand-accent/20 transition-colors"
          >
            🧠 Concept Map
          </button>
          <span
            className={`hidden sm:block text-slate-400 transition-transform duration-200 text-lg ${open ? 'rotate-90' : ''}`}
          >
            ›
          </span>
        </div>
      </button>

      {open && (
        <div className="px-6 pb-4 border-t border-slate-100">
          {total === 0 ? (
            <p className="text-sm text-slate-400 italic py-4">No topics found in Topic_Map for this chapter.</p>
          ) : (
            chapter.topics.map((t) => (
              <TopicRow 
                key={t.topic_id} 
                topic={t} 
                classId={classId} 
                subjectId={subjectId} 
                setViewerHomeworkTopic={setViewerHomeworkTopic}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ChapterLibrary() {
  const { teacher } = useTeacher();
  const [searchParams, setSearchParams] = useSearchParams();

  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);

  // Selected class/subject (from URL params or first assignment)
  const [selectedClassId, setSelectedClassId] = useState(searchParams.get('class') || '');
  const [selectedSubjectId, setSelectedSubjectId] = useState(searchParams.get('subject') || '');

  const [outline, setOutline] = useState<SubjectOutlineChapter[]>([]);
  const [loadingOutline, setLoadingOutline] = useState(false);
  const [outlineError, setOutlineError] = useState<string | null>(null);

  // Modals State
  const [viewerChapter, setViewerChapter] = useState<{ id: string, title: string } | null>(null);
  const [viewerHomeworkTopic, setViewerHomeworkTopic] = useState<{ id: string, title: string } | null>(null);

  // Load teacher assignments
  useEffect(() => {
    if (!teacher) return;
    setLoadingAssignments(true);
    getTeacherAssignments(teacher.teacher_id)
      .then((data) => {
        setAssignments(data);
        // Set defaults if not in URL
        if (data.length > 0) {
          const urlClass = searchParams.get('class');
          const urlSubject = searchParams.get('subject');
          if (!urlClass || !data.find((a) => a.class_id === urlClass)) {
            setSelectedClassId(data[0].class_id);
          }
          if (!urlSubject || !data.find((a) => a.subject_id === urlSubject && a.class_id === (urlClass || data[0].class_id))) {
            setSelectedSubjectId(data[0].subject_id);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoadingAssignments(false));
  }, [teacher?.teacher_id]);

  // Unique class IDs for the class selector
  const classes = Array.from(new Set(assignments.map((a) => a.class_id))).sort(
    (a, b) => Number(a.replace('CLASS_', '')) - Number(b.replace('CLASS_', ''))
  );

  // Subjects for the selected class
  const subjectsForClass = assignments
    .filter((a) => a.class_id === selectedClassId)
    .map((a) => a.subject_id);

  // Auto-pick first subject when class changes
  useEffect(() => {
    if (subjectsForClass.length > 0 && !subjectsForClass.includes(selectedSubjectId)) {
      setSelectedSubjectId(subjectsForClass[0]);
    }
  }, [selectedClassId]);

  // Sync to URL
  useEffect(() => {
    if (selectedClassId && selectedSubjectId) {
      setSearchParams({ class: selectedClassId, subject: selectedSubjectId }, { replace: true });
    }
  }, [selectedClassId, selectedSubjectId]);

  // Load outline when class+subject changes
  const loadOutline = useCallback(() => {
    if (!selectedClassId || !selectedSubjectId) return;
    setLoadingOutline(true);
    setOutlineError(null);
    getSubjectOutline(selectedClassId, selectedSubjectId)
      .then((data) => {
        setOutline(data.chapters);
        if (data.warnings?.length) console.warn('Outline warnings:', data.warnings);
      })
      .catch((err) => setOutlineError(err.message || 'Failed to load outline'))
      .finally(() => setLoadingOutline(false));
  }, [selectedClassId, selectedSubjectId]);

  useEffect(() => {
    loadOutline();
  }, [loadOutline]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (!teacher) {
    return (
      <div className="max-w-[1200px] w-full p-4 lg:p-8">
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
          <p className="text-slate-500">Please select a teacher to view the library.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] w-full p-4 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">My Library</h1>
        <p className="text-slate-500 mt-1">
          Browse lesson plans, concepts, homework and microtests for all your classes.
        </p>
      </header>

      {/* Class + Subject selectors */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {loadingAssignments ? (
          <div className="h-10 w-48 bg-slate-100 rounded-xl animate-pulse" />
        ) : classes.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No classes assigned for the current academic year.</p>
        ) : (
          <>
            {/* Class pills */}
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1.5 shadow-sm">
              {classes.map((cid) => (
                <button
                  key={cid}
                  onClick={() => setSelectedClassId(cid)}
                  className={
                    selectedClassId === cid
                      ? 'px-4 py-1.5 rounded-lg bg-brand-accent text-white text-sm font-semibold transition-all'
                      : 'px-4 py-1.5 rounded-lg text-slate-500 text-sm font-medium hover:bg-slate-50 transition-colors'
                  }
                >
                  Class {cid.replace('CLASS_', '')}
                </button>
              ))}
            </div>

            {/* Subject tabs */}
            {subjectsForClass.length > 0 && (
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1.5 shadow-sm">
                {subjectsForClass.map((sid) => (
                  <button
                    key={sid}
                    onClick={() => setSelectedSubjectId(sid)}
                    className={
                      selectedSubjectId === sid
                        ? 'px-4 py-1.5 rounded-lg bg-brand-accent text-white text-sm font-semibold transition-all'
                        : 'px-4 py-1.5 rounded-lg text-slate-500 text-sm font-medium hover:bg-slate-50 transition-colors'
                    }
                  >
                    {subjectLabel(sid)}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Outline content */}
      {loadingOutline ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-white border border-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : outlineError ? (
        <div className="p-10 text-center bg-rose-50 border border-rose-100 rounded-2xl">
          <div className="text-3xl mb-3">⚠️</div>
          <h3 className="font-bold text-rose-800 mb-1">Could not load outline</h3>
          <p className="text-sm text-rose-600">{outlineError}</p>
          <button
            onClick={loadOutline}
            className="mt-4 px-4 py-2 bg-rose-600 text-white text-sm font-semibold rounded-lg hover:bg-rose-700 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : outline.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="text-4xl mb-4">📚</div>
          <h3 className="font-bold text-slate-700 mb-2">No chapters found</h3>
          <p className="text-sm text-slate-500">
            The subject workbook for{' '}
            <strong>
              Class {selectedClassId.replace('CLASS_', '')} · {subjectLabel(selectedSubjectId)}
            </strong>{' '}
            either isn't connected yet or has an empty <code>Chapter_Map</code> sheet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {outline.map((ch, i) => (
            <ChapterCard
              key={ch.chapter_id}
              chapter={ch}
              classId={selectedClassId}
              subjectId={selectedSubjectId}
              defaultOpen={i === 0}
              setViewerChapter={setViewerChapter}
              setViewerHomeworkTopic={setViewerHomeworkTopic}
            />
          ))}
        </div>
      )}

      {viewerChapter && (
        <ConceptViewerModal
          classId={selectedClassId}
          subjectId={selectedSubjectId}
          chapterId={viewerChapter.id}
          chapterTitle={viewerChapter.title}
          onClose={() => setViewerChapter(null)}
        />
      )}

      {viewerHomeworkTopic && (
        <HomeworkViewer
          classId={selectedClassId}
          subjectId={selectedSubjectId}
          topicId={viewerHomeworkTopic.id}
          topicTitle={viewerHomeworkTopic.title}
          onClose={() => setViewerHomeworkTopic(null)}
        />
      )}
    </div>
  );
}
