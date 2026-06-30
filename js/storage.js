/**
 * storage.js — LocalStorage abstraction layer
 * Digital Detox App
 */

const STORAGE_KEYS = {
  SESSIONS: 'dd_sessions',
  SETTINGS: 'dd_settings',
};

const DEFAULT_SETTINGS = {
  dailyTargetMinutes: 240,
  reminderEnabled: false,
  reminderTime: '08:00',
  timerMode: 'countup',
  countdownMinutes: 25,
  darkMode: false,
  soundEnabled: true,
};

/* ---- Sessions ---- */

function getSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions) {
  localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
}

function addSession(session) {
  const sessions = getSessions();
  sessions.push(session);
  saveSessions(sessions);
}

/* ---- Settings ---- */

function getSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const saved = raw ? JSON.parse(raw) : {};
    return { ...DEFAULT_SETTINGS, ...saved };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

/* ---- Filtered Queries ---- */

function getTodaySessions() {
  const today = new Date();
  return getSessions().filter(s => {
    const d = new Date(s.startTime);
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth()    === today.getMonth()    &&
      d.getDate()     === today.getDate()
    );
  });
}

function getWeeklySessions() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 6);
  cutoff.setHours(0, 0, 0, 0);
  return getSessions().filter(s => new Date(s.startTime) >= cutoff);
}

function getMonthlySessions() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 29);
  cutoff.setHours(0, 0, 0, 0);
  return getSessions().filter(s => new Date(s.startTime) >= cutoff);
}

function getTodayTotalMinutes() {
  return getTodaySessions().reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
}

/* ---- Streak Calculation ---- */

function getCurrentStreak() {
  const sessions = getSessions();
  if (sessions.length === 0) return 0;

  const settings = getSettings();
  const targetMin = settings.dailyTargetMinutes;

  // Build a map: date-string -> total minutes
  const dailyMap = {};
  sessions.forEach(s => {
    const dateStr = new Date(s.startTime).toLocaleDateString('en-CA'); // YYYY-MM-DD
    dailyMap[dateStr] = (dailyMap[dateStr] || 0) + (s.durationMinutes || 0);
  });

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toLocaleDateString('en-CA');
    if (dailyMap[key] !== undefined && dailyMap[key] >= targetMin) {
      streak++;
    } else if (i === 0) {
      // today not yet done — skip and check yesterday
      continue;
    } else {
      break;
    }
  }
  return streak;
}

/* ---- Clear ---- */

function clearAllData() {
  localStorage.removeItem(STORAGE_KEYS.SESSIONS);
  localStorage.removeItem(STORAGE_KEYS.SETTINGS);
}

/* ---- Export JSON ---- */

function exportDataAsJSON() {
  const data = {
    sessions: getSessions(),
    settings: getSettings(),
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `digital-detox-data-${new Date().toLocaleDateString('en-CA')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
