function isAppleMobileDevice() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches
    || navigator.standalone === true;
}

export function createPwaManager({
  installButton,
  iosInstallDialog,
  statusElement,
  notice,
  noticeCopy,
  noticeAction,
}) {
  const abortController = new AbortController();
  const { signal } = abortController;
  let deferredInstallPrompt = null;
  let reloadForUpdate = false;
  const appleInstallAvailable = isAppleMobileDevice() && !isStandalone();

  if (appleInstallAvailable) {
    installButton.textContent = '설치 안내';
    installButton.hidden = false;
  }

  function setOnlineStatus() {
    const online = navigator.onLine;
    statusElement.innerHTML = `<span class="dot"></span>SYSTEM ${online ? 'ONLINE' : 'OFFLINE'}`;
    statusElement.classList.toggle('offline', !online);
    if (!online) showNotice('오프라인 모드입니다. 저장된 게임은 계속 즐길 수 있어요.');
    else if (!noticeAction.dataset.update) notice.hidden = true;
  }

  function showNotice(copy, action = null) {
    noticeCopy.textContent = copy;
    noticeAction.hidden = !action;
    noticeAction.textContent = action?.label ?? '';
    noticeAction.onclick = action?.handler ?? null;
    noticeAction.dataset.update = action ? 'true' : '';
    notice.hidden = false;
  }

  window.addEventListener('online', setOnlineStatus, { signal });
  window.addEventListener('offline', setOnlineStatus, { signal });
  window.addEventListener(
    'beforeinstallprompt',
    (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      installButton.hidden = false;
    },
    { signal },
  );
  installButton.addEventListener(
    'click',
    async () => {
      if (!deferredInstallPrompt) {
        if (appleInstallAvailable) iosInstallDialog.showModal();
        return;
      }
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      installButton.hidden = true;
    },
    { signal },
  );
  window.addEventListener('appinstalled', () => { installButton.hidden = true; }, { signal });
  navigator.serviceWorker?.addEventListener(
    'controllerchange',
    () => {
      if (!reloadForUpdate) return;
      reloadForUpdate = false;
      window.location.reload();
    },
    { signal },
  );

  async function register() {
    if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
    try {
      const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
        scope: import.meta.env.BASE_URL,
      });
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state !== 'installed' || !navigator.serviceWorker.controller) return;
          showNotice('새 버전이 준비됐어요.', {
            label: '지금 업데이트',
            handler: () => {
              reloadForUpdate = true;
              worker.postMessage({ type: 'SKIP_WAITING' });
            },
          });
        });
      });
    } catch {
      showNotice('오프라인 준비를 완료하지 못했어요. 온라인 플레이는 가능합니다.');
    }
  }

  setOnlineStatus();
  window.addEventListener('load', register, { once: true, signal });

  return { destroy: () => abortController.abort() };
}
