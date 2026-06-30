/**
 * progress.js — Progress Screen: Chart.js & Stats
 * Digital Detox App
 */

const Progress = (() => {
  let chart = null;
  let currentView = 'weekly'; // 'weekly' | 'monthly'

  function init() {
    document.getElementById('toggle-weekly').addEventListener('click', () => setView('weekly'));
    document.getElementById('toggle-monthly').addEventListener('click', () => setView('monthly'));
    document.getElementById('export-chart-btn').addEventListener('click', exportChart);
    render();
  }

  function exportChart() {
    if (!chart) { Timer.showToast('Belum ada grafik untuk diekspor.'); return; }
    const link = document.createElement('a');
    link.download = `digital-detox-${currentView}-${new Date().toLocaleDateString('en-CA')}.png`;
    link.href = chart.toBase64Image();
    link.click();
    Timer.showToast('Grafik berhasil disimpan!');
  }

  function render() {
    renderStats();
    renderChart();
    renderHistory();
  }

  /* ---- Stats Cards ---- */
  function renderStats() {
    const streak   = getCurrentStreak();
    const todayMin = getTodayTotalMinutes();
    const weekly   = getWeeklySessions();

    // Average (7 days)
    const totalWeek = weekly.reduce((s, x) => s + x.durationMinutes, 0);
    const avgMin    = weekly.length > 0 ? Math.round(totalWeek / 7) : 0;

    document.getElementById('stat-streak').textContent = `${streak} hari`;
    document.getElementById('stat-today').textContent  = formatMin(todayMin);
    document.getElementById('stat-avg').textContent    = formatMin(avgMin);
  }

  /* ---- Chart ---- */
  function setView(view) {
    currentView = view;
    document.getElementById('toggle-weekly').classList.toggle('active',  view === 'weekly');
    document.getElementById('toggle-monthly').classList.toggle('active', view === 'monthly');
    renderChart();
  }

  function renderChart() {
    if (typeof Chart === 'undefined') return;
    const ctx = document.getElementById('progress-chart').getContext('2d');

    const { labels, data } = currentView === 'weekly'
      ? buildWeeklyData()
      : buildMonthlyData();

    // Destroy old chart
    if (chart) {
      chart.destroy();
      chart = null;
    }

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, 180);
    gradient.addColorStop(0, 'rgba(45, 90, 61, 0.85)');
    gradient.addColorStop(1, 'rgba(45, 90, 61, 0.25)');

    chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Menit Hadir',
          data,
          backgroundColor: data.map((v, i) => {
            // today's bar gets full opacity
            return i === labels.length - 1 ? 'rgba(26, 51, 40, 0.90)' : gradient;
          }),
          borderRadius: 6,
          borderSkipped: false,
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1a3328',
            titleColor:  '#f0ece4',
            bodyColor:   '#8fa898',
            cornerRadius: 10,
            padding: 12,
            callbacks: {
              label: (ctx) => ` ${formatMin(ctx.parsed.y)}`,
            },
          },
        },
        scales: {
          x: {
            grid:  { display: false },
            ticks: {
              color: '#8fa898',
              font:  { size: 11, family: 'Inter' },
            },
            border: { display: false },
          },
          y: {
            grid: {
              color:     'rgba(26, 51, 40, 0.07)',
              drawTicks: false,
            },
            ticks: {
              color:    '#8fa898',
              font:     { size: 10, family: 'Inter' },
              padding:  8,
              callback: (v) => formatMin(v),
              maxTicksLimit: 5,
            },
            border:    { display: false },
            beginAtZero: true,
          },
        },
      },
    });
  }

  function buildWeeklyData() {
    const sessions = getWeeklySessions();
    const labels = [];
    const data   = [];
    const days   = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('en-CA');
      const dayMin = sessions
        .filter(s => new Date(s.startTime).toLocaleDateString('en-CA') === key)
        .reduce((sum, s) => sum + s.durationMinutes, 0);

      labels.push(i === 0 ? 'Hari ini' : days[d.getDay()]);
      data.push(dayMin);
    }
    return { labels, data };
  }

  function buildMonthlyData() {
    const sessions = getMonthlySessions();
    const labels = [];
    const data   = [];

    // Group by week (last 4 weeks + current)
    for (let w = 3; w >= 0; w--) {
      const weekEnd   = new Date();
      weekEnd.setDate(weekEnd.getDate() - w * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);
      weekEnd.setHours(23, 59, 59, 999);

      const weekMin = sessions
        .filter(s => {
          const t = new Date(s.startTime);
          return t >= weekStart && t <= weekEnd;
        })
        .reduce((sum, s) => sum + s.durationMinutes, 0);

      const weekLabel = w === 0
        ? 'Minggu ini'
        : `${weekStart.getDate()}/${weekStart.getMonth() + 1}`;
      labels.push(weekLabel);
      data.push(weekMin);
    }
    return { labels, data };
  }

  /* ---- Session History ---- */
  function renderHistory() {
    const container = document.getElementById('history-list');
    const sessions  = getSessions().slice().reverse().slice(0, 15); // last 15

    if (sessions.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🌱</div>
          <p class="empty-state-text">Belum ada sesi yang tercatat.<br>Mulai sesi pertamamu di tab Beranda!</p>
        </div>`;
      return;
    }

    container.innerHTML = sessions.map((s, i) => {
      const d    = new Date(s.startTime);
      const date = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
      const time = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const dur  = formatMin(s.durationMinutes);
      const noteHtml = s.note ? `<div class="history-note">📝 ${escHtml(s.note)}</div>` : '';
      return `
        <div class="history-item" style="animation-delay: ${i * 40}ms">
          <div class="history-item-left">
            <div class="history-dot"></div>
            <div>
              <div class="history-date">${date}</div>
              <div class="history-time">${time}</div>
              ${noteHtml}
            </div>
          </div>
          <div class="history-duration">${dur}</div>
        </div>`;
    }).join('');
  }

  function formatMin(minutes) {
    if (minutes === 0) return '0 mnt';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} mnt`;
    if (m === 0) return `${h} jam`;
    return `${h}j ${m}m`;
  }

  function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { init, render };
})();
