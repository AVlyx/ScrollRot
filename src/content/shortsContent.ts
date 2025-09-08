type Settings = { enabled: boolean; delay: number };

const STORAGE_KEY = 'scrollrot_settings';
let synchedScrollrotSettings: Settings = { enabled: false, delay: 1 };

function isShortsPage() {
    return location.pathname.startsWith('/shorts');
}

//load the settings from chrome.storage.sync
// * Resolve is a parameter of the Promise constructor. It is used to add return values to the promise.
// * Here its return type is void because the synchedScrollrotSettings is a global variable
async function loadSettings() {
    return new Promise<void>((resolve) => {
        chrome.storage.sync.get(STORAGE_KEY, (res) => {
            const s = res?.[STORAGE_KEY]?.shorts;
            synchedScrollrotSettings = {
                enabled: Boolean(s?.enabled),
                delay: Math.max(1, Number(s?.delay))
            };
            resolve();
        });
    });
}

// Listen for changes to settings and update local copy
// * Avoids needing to re-query storage on every video play
// * Does not call loadSettings to avoid querying storage again
chrome.storage.onChanged.addListener((changes) => {
    if (changes[STORAGE_KEY]) {
        const s = changes[STORAGE_KEY].newValue?.shorts;
        synchedScrollrotSettings.enabled = Boolean(s?.enabled);
        synchedScrollrotSettings.delay = Math.max(1, Number(s?.delay ?? 1));
    }
});

// Prevent video from playing for `ms` milliseconds
// If video is already playing, pause it and block play events until time is up
// If video is paused, just pause it and block play events until time is up
function gatePlay(video: HTMLVideoElement, ms: number) {
    // Handler to re-pause if user or website tries to play early
    const blockPlay = () => {
        if (Date.now() < until) {
            //repause the video
            video.pause();
        } else {
            //remove the event listerner that prevents the vdieo from playing
            video.removeEventListener('play', blockPlay, true);
        }
    };
    // After delay, allow play
    const allowPlay = () => {
        video.removeEventListener('play', blockPlay, true);
        video.play().catch(() => { }); /* catch() to ignore if browser rejects play*/
    }

    const until = Date.now() + ms;
    // optional visual cue:
    // video.style.filter = 'grayscale(100%)'; setTimeout(() => video.style.filter='', ms);

    // Pause immediately and block early resumes
    video.pause();
    video.addEventListener('play', blockPlay, true);
    // * setTimeout method runs after ms time
    setTimeout(allowPlay, ms);
}

function handleVisible(video: HTMLVideoElement) {
    if (!synchedScrollrotSettings.enabled || !isShortsPage()) {
        console.log("[ScrollRot] disabled or not shorts page; no pausing");
        return;
    }

    console.log("[ScrollRot] enabled ; pausing");
    gatePlay(video, synchedScrollrotSettings.delay * 1000);
}

(async function init() {
    await loadSettings();
    console.log('[ScrollRot] Shorts content script ready');

    // Observe which video is actually visible
    const io = new IntersectionObserver((entries) => {
        for (const e of entries) {
            const el = e.target as HTMLVideoElement;
            if (e.isIntersecting && e.intersectionRatio >= 0.75) {
                handleVisible(el);
            }
        }
    }, { threshold: [0.75] });

    // Attach IO to any future videos, too
    const attachIO = () => {
        document.querySelectorAll('video').forEach(v => io.observe(v));
    };

    // Initial & future DOM changes
    attachIO();
    const mo = new MutationObserver(attachIO);
    mo.observe(document.documentElement, { childList: true, subtree: true });
})();

// src/content/shortsContent.ts
(() => {
    console.log('[ScrollRot] Shorts content script loaded');
    const banner = document.createElement('div');
    banner.textContent = 'ScrollRot: Shorts script active';
    banner.style.position = 'fixed';
    banner.style.zIndex = '999999';
    banner.style.top = '0';
    banner.style.left = '0';
    banner.style.padding = '6px 10px';
    banner.style.background = 'rgba(0,0,0,0.8)';
    banner.style.color = 'white';
    banner.style.fontSize = '12px';
    banner.style.pointerEvents = 'none';
    document.documentElement.appendChild(banner);
    setTimeout(() => banner.remove(), 10 * 1000);
})();

