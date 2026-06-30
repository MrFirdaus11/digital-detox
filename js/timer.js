const Timer = (() => {
  let displayEl, labelEl, ringProgress, ringBg, dotsEl;
  let startBtnEl, btnIconEl, btnTextEl;
  let goalFillEl, goalTextEl, goalMessageEl, goalCardEl;
  let noteSection, noteInput;

  let sessionActive = false;
  let sessionStartTime = null;
  let intervalId = null;
  let isCountdown = false;
  let countdownTotal = 0;

  const CIRCUMFERENCE = 678.58;
  const DAILY_MAX_SECONDS = 8 * 60 * 60;

  function init() {
    displayEl    = document.getElementById('timer-display');
    labelEl      = document.getElementById('timer-label');
    ringProgress = document.getElementById('timer-ring-progress');
    ringBg       = document.getElementById('timer-ring-bg');
    dotsEl       = document.getElementById('timer-dots');
    startBtnEl   = document.getElementById('session-btn');
    btnIconEl    = document.getElementById('btn-icon');
    btnTextEl    = document.getElementById('btn-text');
    goalFillEl   = document.getElementById('goal-fill');
    goalTextEl   = document.getElementById('goal-text');
    goalMessageEl= document.getElementById('goal-message');
    goalCardEl   = document.getElementById('daily-goal-card');
    noteSection  = document.getElementById('note-section');
    noteInput    = document.getElementById('session-note');

    startBtnEl.addEventListener('click', toggleSession);
    updateGoalDisplay();
  }

  function toggleSession() {
    sessionActive ? endSession() : startSession();
  }

  function startSession() {
    const settings = getSettings();
    isCountdown = settings.timerMode === 'countdown';
    countdownTotal = isCountdown ? settings.countdownMinutes * 60 : 0;

    sessionActive = true;
    sessionStartTime = new Date();

    displayEl.classList.add('active');
    ringProgress.classList.add('active');
    ringBg.classList.add('pulsing');
    dotsEl.classList.add('visible');

    startBtnEl.classList.add('session-active');
    btnTextEl.textContent = 'Akhiri Sesi';
    setBtnIcon('stop');

    if (isCountdown) {
      labelEl.textContent = 'Sisa Waktu';
      updateTimerDisplay(countdownTotal);
      updateRingProgress(0);
    }

    noteSection.style.display = 'block';
    noteInput.value = '';
    noteInput.focus();

    intervalId = setInterval(tick, 1000);
    tick();

    showToast('Sesi dimulai — selamat hadir!');
  }

  function getElapsedSeconds() {
    return Math.floor((new Date() - sessionStartTime) / 1000);
  }

  function tick() {
    if (isCountdown) {
      const remaining = Math.max(countdownTotal - getElapsedSeconds(), 0);
      updateTimerDisplay(remaining);
      updateRingProgress(1 - remaining / countdownTotal);
      if (remaining <= 0) endSession();
    } else {
      const secs = getElapsedSeconds();
      updateTimerDisplay(secs);
      updateRingProgress(secs);
    }
  }

  function endSession() {
    clearInterval(intervalId);
    intervalId = null;

    const elapsed = isCountdown
      ? countdownTotal - Math.max(countdownTotal - getElapsedSeconds(), 0)
      : getElapsedSeconds();
    const durationSeconds = Math.round(elapsed);
    const durationMinutes = Math.round(durationSeconds / 60);
    const endTime = new Date();
    const note = noteInput.value.trim();

    sessionActive = false;
    displayEl.classList.remove('active');
    ringProgress.classList.remove('active');
    ringBg.classList.remove('pulsing');
    dotsEl.classList.remove('visible');

    startBtnEl.classList.remove('session-active');
    btnTextEl.textContent = 'Mulai Sesi';
    setBtnIcon('leaf');

    updateTimerDisplay(0);
    updateRingProgress(0);

    labelEl.textContent = 'Waktu Kehadiran';
    noteSection.style.display = 'none';

    if (durationMinutes >= 1) {
      const sessionData = {
        startTime:       sessionStartTime.toISOString(),
        endTime:         endTime.toISOString(),
        durationMinutes: durationMinutes,
        durationSeconds: durationSeconds,
        note:            note || '',
      };
      addSession(sessionData);
      updateGoalDisplay();

      goalCardEl.classList.remove('just-updated');
      void goalCardEl.offsetWidth;
      goalCardEl.classList.add('just-updated');

      playSound();

      Modal.show({
        durationMinutes,
        durationSeconds,
        startTime: sessionStartTime,
        note,
      });
    } else {
      showToast('Sesi terlalu singkat — minimal 1 menit.');
    }
  }

  function playSound() {
    const settings = getSettings();
    if (!settings.soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);

      // second chime
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 1100;
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0.25, ctx.currentTime + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
      osc2.start(ctx.currentTime + 0.2);
      osc2.stop(ctx.currentTime + 0.8);
    } catch {}
  }

  function updateTimerDisplay(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    displayEl.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  function updateRingProgress(seconds) {
    const progress = Math.min(seconds / DAILY_MAX_SECONDS, 1);
    const offset = CIRCUMFERENCE * (1 - progress);
    ringProgress.style.strokeDashoffset = offset;
  }

  function updateGoalDisplay() {
    const settings   = getSettings();
    const targetMin  = settings.dailyTargetMinutes;
    const todayMin   = getTodayTotalMinutes();
    const progress   = Math.min(todayMin / targetMin, 1);

    goalFillEl.style.width = `${progress * 100}%`;
    const todayStr  = formatDurationShort(todayMin);
    const targetStr = formatDurationShort(targetMin);
    goalTextEl.textContent = `${todayStr} / ${targetStr}`;
    goalMessageEl.textContent = getGoalMessage(progress);
  }

  function getGoalMessage(progress) {
    if (progress === 0)    return 'Mulai hari ini dengan satu sesi! 🌱';
    if (progress < 0.25)   return 'Langkah pertama yang bagus, terus lanjutkan!';
    if (progress < 0.5)    return 'Kamu sedang dalam jalur yang benar.';
    if (progress < 0.75)   return 'Hampir setengah jalan — kamu melakukannya!';
    if (progress < 1)      return 'Kamu hampir mencapai target hari ini! 🔥';
    return 'Luar biasa! Target hari ini telah tercapai! ✨';
  }

  function formatDurationShort(minutes) {
    if (minutes < 60) return `${minutes} mnt`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}j ${m}m` : `${h} jam`;
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  function setBtnIcon(type) {
    btnIconEl.innerHTML = type === 'leaf'
      ? '<path d="M12 2C12 2 4 6 4 13a8 8 0 0016 0C20 6 12 2 12 2z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 22V12M12 12C10 10 7 9 4 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'
      : '<rect x="6" y="6" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.8"/>';
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  return { init, updateGoalDisplay, showToast };
})();