/* ─── Types ─── */

export type PeriodState = 'done' | 'active' | 'next' | 'later' | 'break';
export type PacingStatus = 'on-track' | 'behind' | 'ahead';
export type ChapterState = 'done' | 'active' | 'upcoming';

export interface Period {
  no: number;
  start: string;
  end: string;
  klass: string;
  subject: string;
  chapter: string;
  topic: string;
  state: PeriodState;
  status?: PacingStatus;
}

export interface Chapter {
  no: string;
  title: string;
  state: ChapterState;
  meta: string;
  progress: number;
  priority?: boolean;
}

export interface NavItem {
  label: string;
  key: string;
}

export interface LessonPlan {
  id: string;
  chapterTitle: string;
  subject: string;
  klass: string;
  duration: string;
  objectives: string[];
  phases: {
    engage: string;
    explore: string;
    explain: string;
    elaborate: string;
    evaluate: string;
  };
  resources: string[];
}

/* ─── Navigation ─── */

export const NAV: NavItem[] = [
  { label: "Today's Schedule", key: 'today' },
  { label: 'Yearly Roadmap', key: 'year' },
  { label: 'Chapter Library', key: 'chapters' },
  { label: 'Full Timetable', key: 'timetable' },
  { label: 'Admin Console', key: 'admin' },
];



/* ─── Sample: Yearly Roadmap ─── */

export const ROADMAP: Chapter[] = [
  { no: '02', title: 'Real Numbers', state: 'done', meta: 'Completed • 10 Periods', progress: 100 },
  { no: '03', title: 'Linear Equations in Two Variables', state: 'done', meta: 'Completed • 12 Periods', progress: 100 },
  { no: '04', title: 'Quadratic Equations', state: 'active', meta: 'In Progress • 9 / 15 Periods', progress: 60 },
  { no: '05', title: 'Arithmetic Progressions', state: 'upcoming', meta: 'Starts Nov 5 • 10 Periods', progress: 0, priority: true },
  { no: '06', title: 'Triangles', state: 'upcoming', meta: 'Starts Nov 18 • 12 Periods', progress: 0 },
];



/* ─── Mock Data for Scheduling Engine ─── */
import { TimetableEntry, AcademicEvent } from './scheduling';

export const MOCK_TIMETABLE: TimetableEntry[] = [
  { day: 'Monday', period: 1, periodStart: '08:30', periodEnd: '09:15', klass: '10-B', section: 'B', subject: 'Mathematics', teacher: 'Mrs. Anjali Bisht' },
  { day: 'Monday', period: 2, periodStart: '09:15', periodEnd: '10:00', klass: '10-B', section: 'B', subject: 'Mathematics', teacher: 'Mrs. Anjali Bisht' },
  { day: 'Tuesday', period: 3, periodStart: '10:45', periodEnd: '11:30', klass: '10-B', section: 'B', subject: 'Mathematics', teacher: 'Mrs. Anjali Bisht' },
  { day: 'Wednesday', period: 1, periodStart: '08:30', periodEnd: '09:15', klass: '10-B', section: 'B', subject: 'Mathematics', teacher: 'Mrs. Anjali Bisht' },
  { day: 'Thursday', period: 4, periodStart: '11:30', periodEnd: '12:15', klass: '10-B', section: 'B', subject: 'Mathematics', teacher: 'Mrs. Anjali Bisht' },
  { day: 'Friday', period: 2, periodStart: '09:15', periodEnd: '10:00', klass: '10-B', section: 'B', subject: 'Mathematics', teacher: 'Mrs. Anjali Bisht' },
  { day: 'Monday', period: 4, periodStart: '11:30', periodEnd: '12:15', klass: '9-C', section: 'C', subject: 'Science', teacher: 'Mrs. Anjali Bisht' },
  { day: 'Wednesday', period: 2, periodStart: '09:15', periodEnd: '10:00', klass: '9-C', section: 'C', subject: 'Science', teacher: 'Mrs. Anjali Bisht' },
  { day: 'Friday', period: 5, periodStart: '12:15', periodEnd: '13:00', klass: '9-C', section: 'C', subject: 'Science', teacher: 'Mrs. Anjali Bisht' },
];

export const MOCK_EVENTS: AcademicEvent[] = [
  { id: '1', type: 'holiday', name: 'Diwali Break', startDate: '2024-10-31', endDate: '2024-11-04' },
  { id: '2', type: 'exam_window', name: 'Mid-Term Exams', startDate: '2024-12-09', endDate: '2024-12-18' },
  { id: '3', type: 'holiday', name: 'Winter Break', startDate: '2024-12-25', endDate: '2025-01-05' },
];

export const MOCK_LESSON_PLANS: Record<string, LessonPlan> = {
  'ch4-maths-10': {
    id: 'ch4-maths-10',
    chapterTitle: 'Quadratic Equations',
    subject: 'Mathematics',
    klass: '10',
    duration: '15 Periods',
    objectives: [
      'Understand the standard form of a quadratic equation.',
      'Solve quadratic equations by factorization and quadratic formula.',
      'Determine the nature of roots using the discriminant.'
    ],
    phases: {
      engage: 'Start with a real-world problem: calculating the dimensions of a rectangular park given its area and perimeter. Show how this translates to a quadratic equation.',
      explore: 'Have students graph $y = x^2 - 4x + 4$ and observe where it crosses the x-axis. Let them experiment with changing coefficients.',
      explain: 'Formalize the standard form $ax^2 + bx + c = 0$. Introduce the quadratic formula and derive it using completing the square. Explain the role of $D = b^2 - 4ac$.',
      elaborate: 'Apply the concepts to word problems involving speed, distance, time, and work-rate. Discuss cases where discriminant is negative (no real roots).',
      evaluate: 'Conduct a 15-minute microtest focusing on root nature and basic factorization. Review common mistakes in applying the quadratic formula.'
    },
    resources: [
      'NCERT Textbook Chapter 4',
      'Desmos Graphing Calculator',
      'Worksheet: Word Problems on Quadratic Equations'
    ]
  },
  'ch3-science-9': {
    id: 'ch3-science-9',
    chapterTitle: 'Atoms and Molecules',
    subject: 'Science',
    klass: '9',
    duration: '12 Periods',
    objectives: [
      'State the laws of chemical combination.',
      'Understand Dalton\'s atomic theory.',
      'Define atomic mass and write chemical formulae.'
    ],
    phases: {
      engage: 'Show a piece of iron rusting or burn a piece of magnesium ribbon. Ask what happens to the mass. Introduce the law of conservation of mass.',
      explore: 'Give students building blocks (Lego) of different colors. Ask them to combine them in fixed ratios (e.g. 2 red, 1 blue) to simulate the law of constant proportions.',
      explain: 'Discuss Dalton\'s postulates. Explain atomic mass units. Show how symbols are assigned to elements and how ions are formed.',
      elaborate: 'Practice writing chemical formulae using the criss-cross method (valency). Calculate molecular masses of simple compounds.',
      evaluate: 'Conduct a worksheet test where students have to deduce the chemical formula of 5 compounds from their constituent valencies.'
    },
    resources: [
      'NCERT Textbook Chapter 3',
      'Molecular Model Kits',
      'Periodic Table Chart'
    ]
  },
  'ch6-maths-9': {
    id: 'ch6-maths-9',
    chapterTitle: 'Lines and Angles',
    subject: 'Mathematics',
    klass: '9',
    duration: '10 Periods',
    objectives: [
      'Identify different types of angles (acute, obtuse, reflex, complementary, supplementary).',
      'Apply axioms and theorems of intersecting lines.',
      'Solve problems involving parallel lines and transversals.'
    ],
    phases: {
      engage: 'Show pictures of architectural structures (bridges, buildings). Have students identify intersecting, parallel lines, and different angles.',
      explore: 'Use protractors to measure angles formed by two intersecting lines and observe the relationship between vertically opposite angles.',
      explain: 'State and prove the theorem for vertically opposite angles. Introduce corresponding, alternate interior, and consecutive interior angles for parallel lines.',
      elaborate: 'Solve complex problems requiring multiple angle properties. Explore angle sum property of triangles.',
      evaluate: 'A short quiz focusing on finding unknown angles given parallel lines intersected by a transversal.'
    },
    resources: [
      'NCERT Textbook Chapter 6',
      'Geometry Box (Protractor, Ruler)',
      'GeoGebra Interactive Models'
    ]
  }
};
