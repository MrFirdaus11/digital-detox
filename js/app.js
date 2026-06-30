/**
 * app.js — Main Entry Point
 * Digital Detox App
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize all modules
  Timer.init();
  Modal.init();
  Settings.init();
  Progress.init();

  // Tab navigation
  const navItems = document.querySelectorAll('.nav-item');
  const pages    = document.querySelectorAll('.page');

  function navigateTo(pageId) {
    pages.forEach(p => {
      p.classList.toggle('active', p.id === `page-${pageId}`);
    });
    navItems.forEach(n => {
      n.classList.toggle('active', n.dataset.page === pageId);
    });

    // Re-render progress when visiting that tab
    if (pageId === 'progress') {
      Progress.render();
    }
  }

  navItems.forEach(item => {
    item.addEventListener('click', () => navigateTo(item.dataset.page));
  });

  // Start on dashboard
  navigateTo('dashboard');

  // ---- PWA Service Worker ----
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('[SW] Registered:', reg.scope))
      .catch(err => console.warn('[SW] Registration failed:', err));
  }

  // ---- PWA Install Prompt ----
  let deferredPrompt = null;
  const installBanner = document.getElementById('install-banner');
  const installBtn    = document.getElementById('install-btn');
  const installDismiss= document.getElementById('install-dismiss');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBanner.classList.add('show');
  });

  installBtn?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] Install outcome:', outcome);
    deferredPrompt = null;
    installBanner.classList.remove('show');
  });

  installDismiss?.addEventListener('click', () => {
    installBanner.classList.remove('show');
  });

  window.addEventListener('appinstalled', () => {
    installBanner.classList.remove('show');
    Timer.showToast('Aplikasi berhasil diinstal! 🎉');
  });
});
