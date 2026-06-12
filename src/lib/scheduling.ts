export interface TimetableEntry {
  day: string; // 'Monday', 'Tuesday', etc.
  period: number;
  periodStart: string; // e.g. '08:30'
  periodEnd: string; // e.g. '09:15'
  klass: string; // e.g. '9'
  section: string; // e.g. 'A'
  subject: string; // e.g. 'Science'
  teacher: string;
}

export type EventType = 'holiday' | 'exam_window';

export interface AcademicEvent {
  id: string;
  type: EventType;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface ChapterInput {
  no: string;
  title: string;
  priority: number; // 1-5 scale
}

export interface ChapterAllocation extends ChapterInput {
  allocatedPeriods: number;
}

/**
 * Parses a basic CSV string into TimetableEntries.
 * Expects header: Day,Period,Start,End,Class,Section,Subject,Teacher
 */
export function parseTimetableCSV(csvContent: string): TimetableEntry[] {
  const lines = csvContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return [];

  // Skip header, assuming standard format
  const entries: TimetableEntry[] = [];
  for (let i = 1; i < lines.length; i++) {
    // Basic CSV split by comma (ignoring quotes for this MVP)
    const cols = lines[i].split(',').map(c => c.trim());
    if (cols.length >= 8) {
      entries.push({
        day: cols[0],
        period: parseInt(cols[1], 10),
        periodStart: cols[2] === '' ? '00:00' : cols[2], // User requested 00:00 default
        periodEnd: cols[3] === '' ? '00:00' : cols[3],
        klass: cols[4],
        section: cols[5],
        subject: cols[6],
        teacher: cols[7],
      });
    }
  }
  return entries;
}

/**
 * Calculates total available teaching periods for a specific class/subject
 * between two dates, subtracting holidays and exams.
 */
export function calculateAvailablePeriods(
  timetable: TimetableEntry[],
  events: AcademicEvent[],
  termStart: Date,
  termEnd: Date,
  targetClass: string,
  targetSection: string,
  targetSubject: string
): number {
  // 1. Find the weekly schedule for this specific target
  const weeklySchedule = timetable.filter(
    (e) => e.klass === targetClass && e.section === targetSection && e.subject === targetSubject
  );

  // Map of Day -> count of periods
  const periodsPerDay: Record<string, number> = {
    Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0, Sunday: 0
  };
  
  weeklySchedule.forEach(e => {
    if (periodsPerDay[e.day] !== undefined) {
      periodsPerDay[e.day]++;
    }
  });

  let totalAvailable = 0;

  // 2. Iterate through every day in the term
  let currentDate = new Date(termStart);
  
  // Helper to check if a date falls in any holiday/exam event
  const isDateBlocked = (d: Date) => {
    const dStr = d.toISOString().split('T')[0];
    return events.some(ev => dStr >= ev.startDate && dStr <= ev.endDate);
  };

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  while (currentDate <= termEnd) {
    if (!isDateBlocked(currentDate)) {
      const dayName = daysOfWeek[currentDate.getDay()];
      totalAvailable += periodsPerDay[dayName] || 0;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return totalAvailable;
}

/**
 * Allocates available periods to chapters based on priority and importance.
 * High priority gets ~+50% weight.
 * Low priority gets ~-30% weight.
 */
export function allocatePeriods(
  chapters: ChapterInput[],
  totalAvailablePeriods: number,
  bufferPercentage: number = 0.10 // 10% buffer
): ChapterAllocation[] {
  const periodsToAllocate = Math.floor(totalAvailablePeriods * (1 - bufferPercentage));
  
  // Calculate weights
  let totalWeight = 0;
  const chapterWeights = chapters.map(ch => {
    // priority 1 = 0.6x weight, priority 3 = 1.0x weight, priority 5 = 1.4x weight
    const weight = 1 + (ch.priority - 3) * 0.2;
    totalWeight += weight;
    return { ...ch, weight };
  });

  // Distribute periods proportionally
  let allocatedSum = 0;
  const allocations: ChapterAllocation[] = chapterWeights.map((ch, idx) => {
    // Last chapter gets the remainder to avoid rounding leaks
    if (idx === chapterWeights.length - 1) {
      return {
        ...ch,
        allocatedPeriods: periodsToAllocate - allocatedSum
      };
    }
    
    const allocated = Math.round((ch.weight / totalWeight) * periodsToAllocate);
    allocatedSum += allocated;
    return {
      ...ch,
      allocatedPeriods: allocated
    };
  });

  return allocations;
}
