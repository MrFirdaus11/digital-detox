const Settings = (() => {
  let sliderEl, targetDisplayEl, reminderToggle, darkmodeToggle, soundToggle,
      modeUpBtn, modeDownBtn, countdownRow, presetBtns;

  function init() {
    sliderEl        = document.getElementById('target-slider');
    targetDisplayEl = document.getElementById('target-display');
    reminderToggle  = document.getElementById('reminder-toggle');
    darkmodeToggle  = document.getElementById('darkmode-toggle');
    soundToggle     = document.getElementById('sound-toggle');
    modeUpBtn       = document.getElementById('mode-countup');
    modeDownBtn     = document.getElementById('mode-countdown');
    countdownRow    = document.getElementById('countdown-preset-row');
    presetBtns      = document.querySelectorAll('.preset-btn');

    const settings = getSettings();

    sliderEl.value = settings.dailyTargetMinutes;
    updateTargetDisplay(settings.dailyTargetMinutes);
    reminderToggle.checked = settings.reminderEnabled;
    darkmodeToggle.checked = settings.darkMode;
    soundToggle.checked    = settings.soundEnabled;

    applyDarkMode(settings.darkMode);

    // Timer mode
    setMode(settings.timerMode);
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => setMode(btn.dataset.mode));
    });

    // Countdown presets
    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        presetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const s = getSettings();
        s.countdownMinutes = parseInt(btn.dataset.minutes, 10);
        saveSettings(s);
        Timer.showToast(`Durasi countdown: ${s.countdownMinutes} menit`);
      });
    });
    // mark active preset
    presetBtns.forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.minutes, 10) === settings.countdownMinutes);
    });

    // Slider live
    sliderEl.addEventListener('input', () => {
      updateTargetDisplay(parseInt(sliderEl.value, 10));
    });
    sliderEl.addEventListener('change', () => {
      const s = getSettings();
      s.dailyTargetMinutes = parseInt(sliderEl.value, 10);
      saveSettings(s);
      Timer.updateGoalDisplay();
      Timer.showToast(`Target diubah ke ${formatTargetDisplay(s.dailyTargetMinutes)}`);
    });

    // Reminder
    reminderToggle.addEventListener('change', () => {
      const s = getSettings();
      s.reminderEnabled = reminderToggle.checked;
      saveSettings(s);
      reminderToggle.checked ? (requestNotificationPermission(), startReminderCheck()) : stopReminderCheck();
    });
    if (reminderToggle.checked) { requestNotificationPermission(); startReminderCheck(); }

    // Dark mode
    darkmodeToggle.addEventListener('change', () => {
      const s = getSettings();
      s.darkMode = darkmodeToggle.checked;
      saveSettings(s);
      applyDarkMode(s.darkMode);
    });

    // Sound
    soundToggle.addEventListener('change', () => {
      const s = getSettings();
      s.soundEnabled = soundToggle.checked;
      saveSettings(s);
    });

    document.getElementById('reset-data-btn').addEventListener('click', handleReset);

    document.getElementById('export-data-btn').addEventListener('click', () => {
      exportDataAsJSON();
      Timer.showToast('Data berhasil diekspor!');
    });

    const importBtn = document.getElementById('import-data-btn');
    const fileInput = document.getElementById('import-file-input');
    importBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleImport);
  }

  function setMode(mode) {
    const s = getSettings();
    s.timerMode = mode;
    saveSettings(s);
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    countdownRow.style.display = mode === 'countdown' ? 'flex' : 'none';
  }

  function applyDarkMode(enabled) {
    document.documentElement.setAttribute('data-theme', enabled ? 'dark' : 'light');
  }

  function updateTargetDisplay(minutes) {
    targetDisplayEl.textContent = formatTargetDisplay(minutes);
    const max  = parseInt(sliderEl.max, 10);
    const min  = parseInt(sliderEl.min, 10);
    const pct  = ((minutes - min) / (max - min)) * 100;
    sliderEl.style.background = `linear-gradient(to right, #1a3328 ${pct}%, #ddd9d0 ${pct}%)`;
  }

  function formatTargetDisplay(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} menit / hari`;
    if (m === 0) return `${h} jam / hari`;
    return `${h} jam ${m} mnt / hari`;
  }

  function handleReset() {
    if (!window.confirm('⚠️ Reset semua data?\n\nSeluruh riwayat sesi dan pengaturan akan dihapus. Tindakan ini tidak dapat dibatalkan.')) return;
    clearAllData();
    Timer.updateGoalDisplay();
    Progress.render();
    const defaults = getSettings();
    sliderEl.value = defaults.dailyTargetMinutes;
    updateTargetDisplay(defaults.dailyTargetMinutes);
    reminderToggle.checked = defaults.reminderEnabled;
    darkmodeToggle.checked = defaults.darkMode;
    soundToggle.checked    = defaults.soundEnabled;
    applyDarkMode(defaults.darkMode);
    setMode(defaults.timerMode);
    Timer.showToast('Semua data telah direset.');
    stopReminderCheck();
  }

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (!window.confirm(`Impor data? Data saat ini akan ditimpa (${(data.sessions || []).length} sesi).`)) return;
        if (data.sessions) saveSessions(data.sessions);
        if (data.settings) saveSettings(data.settings);
        Timer.updateGoalDisplay();
        Progress.render();
        syncUI();
        Timer.showToast('Data berhasil diimpor!');
      } catch { Timer.showToast('Gagal mengimpor: file JSON tidak valid.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function syncUI() {
    const s = getSettings();
    sliderEl.value = s.dailyTargetMinutes;
    updateTargetDisplay(s.dailyTargetMinutes);
    reminderToggle.checked = s.reminderEnabled;
    darkmodeToggle.checked = s.darkMode;
    soundToggle.checked    = s.soundEnabled;
    applyDarkMode(s.darkMode);
    setMode(s.timerMode);
    presetBtns.forEach(b => b.classList.toggle('active', parseInt(b.dataset.minutes, 10) === s.countdownMinutes));
    if (s.reminderEnabled) { requestNotificationPermission(); startReminderCheck(); }
    else { stopReminderCheck(); }
  }

  let reminderInterval = null;

  function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  }

  function startReminderCheck() {
    stopReminderCheck();
    reminderInterval = setInterval(checkReminder, 60000);
    checkReminder();
  }

  function stopReminderCheck() {
    if (reminderInterval) { clearInterval(reminderInterval); reminderInterval = null; }
  }

  function checkReminder() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const settings = getSettings();
    if (!settings.reminderEnabled) return;
    if (getTodayTotalMinutes() >= settings.dailyTargetMinutes) return;
    const now = new Date();
    const currentMin = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    if (currentMin === settings.reminderTime) {
      new Notification('DigitalDetox — Waktu Fokus!', {
        body: `Sudah ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}. Saatnya memulai sesi kehadiran! 🌿`,
        icon: '/assets/icons/icon-192.png',
      });
    }
  }

  return { init };
})();