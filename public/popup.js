document.getElementById('open-settings')?.addEventListener('click', () => {
    if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
    } else {
        // Fallback: just open the options page manually
        window.open(chrome.runtime.getURL('index.html'));
    }
});
