/**
 * The Lab Indonesia - Production Auto-Reload & Live Code Synchronization Daemon
 * Listens to Server-Sent Events (SSE) and polls the server build fingerprint.
 * Automatically force-refreshes the browser when new code is deployed to VPS or server restarts.
 */
(function () {
    let currentVersion = null;
    let isReloading = false;
    let sseSource = null;
    let pollInterval = null;
    const POLL_INTERVAL_MS = 6000; // Lightweight 6-second heartbeat fallback

    // Create a discreet, modern glassmorphism banner for notifying users before auto-refresh
    function showReloadNotification(message = 'Application update detected! Refreshing...') {
        if (document.getElementById('thelab-autoreload-banner')) return;
        const banner = document.createElement('div');
        banner.id = 'thelab-autoreload-banner';
        banner.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(-20px);
            z-index: 999999;
            background: linear-gradient(135deg, rgba(14, 27, 77, 0.96), rgba(30, 58, 138, 0.96));
            color: #FFFFFF;
            padding: 12px 24px;
            border-radius: 30px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 13.5px;
            font-weight: 700;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.18);
            display: flex;
            align-items: center;
            gap: 10px;
            backdrop-filter: blur(8px);
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            opacity: 0;
            pointer-events: none;
        `;
        banner.innerHTML = `
            <span style="font-size: 16px; animation: spin-reload 1s linear infinite; display: inline-block;">🔄</span>
            <span>${message}</span>
        `;
        document.body.appendChild(banner);

        if (!document.getElementById('thelab-autoreload-anim')) {
            const style = document.createElement('style');
            style.id = 'thelab-autoreload-anim';
            style.textContent = `
                @keyframes spin-reload { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `;
            document.head.appendChild(style);
        }

        requestAnimationFrame(() => {
            banner.style.opacity = '1';
            banner.style.transform = 'translateX(-50%) translateY(0)';
        });
    }

    // Force hard reload bypassing cache
    function triggerHardReload(newVersion) {
        if (isReloading) return;
        isReloading = true;
        console.log(`[Auto-Reload] 🚀 Code update detected (New version: ${newVersion}). Refreshing page...`);
        showReloadNotification('🚀 New update deployed! Refreshing application...');

        // Wait 800ms so the user can smoothly see the feedback
        setTimeout(() => {
            try {
                const url = new URL(window.location.href);
                url.searchParams.set('_v', newVersion || Date.now().toString(36));
                window.location.replace(url.toString());
            } catch (e) {
                window.location.reload(true);
            }
        }, 800);
    }

    // Connect to Server-Sent Events stream for instant push notifications
    function initSSE() {
        if (!window.EventSource) return;
        try {
            if (sseSource) {
                try { sseSource.close(); } catch (e) {}
            }
            sseSource = new EventSource('/api/system/version-stream');

            sseSource.onmessage = function (event) {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'init') {
                        if (!currentVersion) {
                            currentVersion = data.version;
                            console.log(`[Auto-Reload] ⚡ Live code sync active. Current version: ${currentVersion}`);
                        } else if (data.version && data.version !== currentVersion) {
                            triggerHardReload(data.version);
                        }
                    } else if (data.type === 'reload' || (data.version && currentVersion && data.version !== currentVersion)) {
                        triggerHardReload(data.version);
                    }
                } catch (e) {}
            };

            sseSource.onerror = function () {
                // When the server restarts (pm2 restart), connection drops.
                // EventSource automatically reconnects, and when the new server responds,
                // the new version is received and triggers refresh!
            };
        } catch (err) {
            console.warn('[Auto-Reload] SSE unavailable, falling back to polling:', err);
        }
    }

    // Lightweight heartbeat check (fallback & tab-focus revalidation)
    async function checkVersion() {
        if (isReloading) return;
        try {
            const res = await fetch(`/api/system/version?_t=${Date.now()}`, {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache' }
            });
            if (!res.ok) return;
            const data = await res.json();
            if (data && data.version) {
                if (!currentVersion) {
                    currentVersion = data.version;
                } else if (data.version !== currentVersion) {
                    triggerHardReload(data.version);
                }
            }
        } catch (e) {
            // Server might be temporarily restarting; next poll will catch it
        }
    }

    // Start all synchronization listeners
    function start() {
        initSSE();
        checkVersion();
        if (pollInterval) clearInterval(pollInterval);
        pollInterval = setInterval(checkVersion, POLL_INTERVAL_MS);

        // Immediate check whenever user switches back to this tab
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                checkVersion();
            }
        });
        window.addEventListener('focus', checkVersion);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
