const Modal = (() => {
  let overlayEl, titleEl, badgeEl, durationEl, subtitleEl, noteRecapEl,
      goalLabelEl, goalValueEl, goalFillEl, closeBtn;

  function init() {
    overlayEl   = document.getElementById('modal-overlay');
    titleEl     = document.getElementById('modal-title');
    badgeEl     = document.getElementById('modal-badge');
    durationEl  = document.getElementById('modal-duration');
    subtitleEl  = document.getElementById('modal-subtitle');
    noteRecapEl = document.getElementById('modal-note-recap');
    goalLabelEl = document.getElementById('modal-goal-label');
    goalValueEl = document.getElementById('modal-goal-value');
    goalFillEl  = document.getElementById('modal-goal-fill');
    closeBtn    = document.getElementById('modal-close-btn');

    closeBtn.addEventListener('click', close);
    overlayEl.addEventListener('click', (e) => {
      if (e.target === overlayEl) close();
    });
  }

  function show({ durationMinutes, durationSeconds, startTime, note }) {
    // Streak badge
    const streak = getCurrentStreak();
    const milestone = [7, 14, 21, 30, 60, 90, 180, 365].find(m => streak >= m && streak % m === 0);
    if (streak > 0 && milestone) {
      badgeEl.style.display = 'inline-flex';
      badgeEl.textContent = `🔥 ${streak} hari berturut-turut!`;
      titleEl.textContent = `🎉 ${streak} Hari Streak!`;
    } else if (streak > 0 && streak === 1) {
      badgeEl.style.display = 'inline-flex';
      badgeEl.textContent = '🔥 Streak 1 hari!';
    } else {
      badgeEl.style.display = 'none';
    }

    // Duration
    const h = Math.floor(durationMinutes / 60);
    const m = durationMinutes % 60;
    let durStr = '';
    if (h > 0) durStr += `${h} jam `;
    if (m > 0 || h === 0) durStr += `${m} menit`;
    durationEl.textContent = durStr.trim();

    // Time range
    const endTime = new Date();
    const start = formatTime(new Date(startTime));
    const end   = formatTime(endTime);
    subtitleEl.textContent = `Hadir penuh dari ${start} hingga ${end}`;

    // Note recap
    if (note) {
      noteRecapEl.style.display = 'block';
      noteRecapEl.textContent = `📝 "${note}"`;
    } else {
      noteRecapEl.style.display = 'none';
    }

    // Goal progress
    const settings  = getSettings();
    const targetMin = settings.dailyTargetMinutes;
    const todayMin  = getTodayTotalMinutes();
    const progress  = Math.min(todayMin / targetMin, 1);

    goalLabelEl.textContent = 'Target Harian';
    goalValueEl.textContent = `${formatDurationLabel(todayMin)} / ${formatDurationLabel(targetMin)}`;
    goalFillEl.style.width  = `${progress * 100}%`;

    overlayEl.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    overlayEl.classList.remove('open');
    document.body.style.overflow = '';
    badgeEl.style.display = 'none';
    titleEl.textContent = 'Sesi Selesai! 🌿';
  }

  function formatTime(date) {
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDurationLabel(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} mnt`;
    if (m === 0) return `${h} jam`;
    return `${h}j ${m}m`;
  }

  return { init, show, close };
})();