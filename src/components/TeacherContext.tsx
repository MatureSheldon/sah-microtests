/* ═══════════════════════════════════════════════════════════════════════════
 *  Teacher Context — stores the currently selected teacher in localStorage
 *  and provides it to all components via React context.
 * ═══════════════════════════════════════════════════════════════════════════ */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Teacher } from '../lib/models';
import { getTeachers } from '../lib/gateway';

const STORAGE_KEY = 'sah-selected-teacher-id';

interface TeacherCtx {
  teacher: Teacher | null;
  teachers: Teacher[];
  loading: boolean;
  error: string | null;
  setTeacherId: (id: string) => void;
}

const TeacherContext = createContext<TeacherCtx>({
  teacher: null,
  teachers: [],
  loading: true,
  error: null,
  setTeacherId: () => {},
});

export function useTeacher() {
  return useContext(TeacherContext);
}

export function TeacherProvider({ children }: { children: ReactNode }) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedId, setSelectedId] = useState<string>(() =>
    typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) || '' : ''
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTeachers()
      .then((list) => {
        setTeachers(list);
        setError(null);
        // If stored ID doesn't match any teacher, clear it
        if (selectedId && !list.some(t => t.teacher_id === selectedId)) {
          setSelectedId('');
          localStorage.removeItem(STORAGE_KEY);
        }
      })
      .catch(err => {
        console.error(err);
        setError(err.message || 'Failed to connect to gateway');
      })
      .finally(() => setLoading(false));
  }, []);

  const setTeacherId = (id: string) => {
    setSelectedId(id);
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  };

  const teacher = teachers.find(t => t.teacher_id === selectedId) || null;

  return (
    <TeacherContext.Provider value={{ teacher, teachers, loading, error, setTeacherId }}>
      {children}
    </TeacherContext.Provider>
  );
}
