import { get, set } from 'idb-keyval';
import { TimetableEntry, parseTimetableCSV } from './scheduling';

// The Apps Script web app URL (will be set in settings by Admin)
const DEFAULT_SCRIPT_URL = ''; // Set through admin settings or Vite env when live sync is enabled.

export interface SyncStatus {
  lastSync: Date | null;
  status: 'idle' | 'syncing' | 'error' | 'success';
  message?: string;
}

/**
 * Fetches the raw CSV data from the Google Apps Script endpoint.
 * In a real scenario, the Apps Script returns the Timetable sheet as CSV text.
 */
export async function fetchTimetableFromSheets(url: string = DEFAULT_SCRIPT_URL): Promise<string> {
  // For the MVP demo, we will simulate a network fetch returning a sample CSV.
  // When the real Google Sheet is linked, we would do:
  // const res = await fetch(`${url}?action=getTimetableCSV`);
  // return await res.text();
  
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`Day,Period,Start,End,Class,Section,Subject,Teacher
Monday,1,08:30,09:15,10,B,Mathematics,Mrs. Anjali Bisht
Monday,2,09:15,10:00,10,A,Mathematics,Mrs. Anjali Bisht
Monday,3,10:45,11:30,9,C,Mathematics,Mrs. Anjali Bisht
Tuesday,1,08:30,09:15,10,B,Mathematics,Mrs. Anjali Bisht
Wednesday,4,11:30,12:15,12,A,Applied Maths,Mrs. Anjali Bisht`);
    }, 800); // simulate network delay
  });
}

/**
 * Syncs the timetable from Google Sheets and caches it in IndexedDB.
 */
export async function syncTimetable(url?: string): Promise<TimetableEntry[]> {
  const csvData = await fetchTimetableFromSheets(url);
  const entries = parseTimetableCSV(csvData);
  
  // Cache the parsed data and timestamp
  await set('sah_timetable', entries);
  await set('sah_timetable_last_sync', new Date().toISOString());
  
  return entries;
}

/**
 * Loads the timetable from IndexedDB cache if available.
 */
export async function loadCachedTimetable(): Promise<TimetableEntry[] | null> {
  const data = await get('sah_timetable');
  return data ? (data as TimetableEntry[]) : null;
}

/**
 * Gets the last sync timestamp.
 */
export async function getLastSyncTime(): Promise<Date | null> {
  const ts = await get('sah_timetable_last_sync');
  return ts ? new Date(ts as string) : null;
}
