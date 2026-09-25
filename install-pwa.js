let inspireInstallPrompt = null;

window.addEventListener('beforeinstallprompt', function (event) {
  event.preventDefault();
  inspireInstallPrompt = event;

  const btn = document.getElementById('installInspireBtn');
  const status = document.getElementById('installPwaStatus');

  if (btn) btn.hidden = false;
  if (status) {
    status.textContent = 'INSPIRE is ready to install.';
    status.dataset.state = 'ready';
  }
});

window.addEventListener('appinstalled', function () {
  inspireInstallPrompt = null;
  const btn = document.getElementById('installInspireBtn');
  const status = document.getElementById('installPwaStatus');

  if (btn) btn.hidden = true;
  if (status) {
    status.textContent = 'INSPIRE installed successfully.';
    status.dataset.state = 'installed';
  }
});

async function installInspirePwa() {
  if (!inspireInstallPrompt) return;

  inspireInstallPrompt.prompt();
  await inspireInstallPrompt.userChoice;
  inspireInstallPrompt = null;

  const btn = document.getElementById('installInspireBtn');
  if (btn) btn.hidden = true;
}

if (window.matchMedia('(display-mode: standalone)').matches) {
  window.addEventListener('DOMContentLoaded', function () {
    const btn = document.getElementById('installInspireBtn');
    if (btn) btn.hidden = true;
  });
}
