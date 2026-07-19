import React, { lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TeacherProvider } from './components/TeacherContext';
import { TeacherSelector } from './components/TeacherSelector';
import 'katex/dist/katex.min.css';
import './styles.css';

import { registerSW } from 'virtual:pwa-register';

if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
} else if ('serviceWorker' in navigator) {
  // Automatically register and update service worker in production
  registerSW({
    immediate: true,
    onRegistered(r) {
      r && setInterval(() => {
        r.update();
      }, 60 * 60 * 1000); // Check for SW updates every hour
    },
    onNeedRefresh() {
      // With autoUpdate, this usually won't fire unless skipWaiting is false.
      // But if it does, we force reload to get the latest version.
      window.location.reload();
    }
  });
}

const Dashboard = lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })));
const YearlyRoadmap = lazy(() => import('./pages/Roadmap').then((module) => ({ default: module.YearlyRoadmap })));
const MicrotestBuilder = lazy(() => import('./pages/MicrotestBuilder').then((module) => ({ default: module.MicrotestBuilder })));
const ChapterLibrary = lazy(() => import('./pages/ChapterLibrary').then((module) => ({ default: module.ChapterLibrary })));
const LessonPlanDetail = lazy(() => import('./pages/LessonPlanDetail').then((module) => ({ default: module.LessonPlanDetail })));
const ConceptDetail = null; // Removed in favor of ConceptViewerModal
const AdminConsole = lazy(() => import('./pages/AdminConsole').then((module) => ({ default: module.AdminConsole })));
const FullTimetable = lazy(() => import('./pages/FullTimetable').then((module) => ({ default: module.FullTimetable })));



ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <TeacherProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <TeacherSelector />
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<Dashboard />} />
              <Route path="year" element={<YearlyRoadmap />} />
              <Route path="microtests" element={<MicrotestBuilder />} />
              <Route path="chapters" element={<ChapterLibrary />} />
              <Route path="chapters/:planId" element={<LessonPlanDetail />} />

              <Route path="admin" element={<AdminConsole />} />
              <Route path="timetable" element={<FullTimetable />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TeacherProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
