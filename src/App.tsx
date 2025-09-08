// src/App.tsx
import { useEffect, useState } from 'react';
import './App.css';

/**
 * Tip: run `npm i -D @types/chrome` so TypeScript knows about `chrome.*` types.
 * At runtime (dev server) `chrome` doesn't exist — we guard for that (fallback to localStorage).
 */

type PlatformSettings = {
  delay: number;
  enabled: boolean;
};

type AllSettings = {
  instagram: PlatformSettings;
  shorts: PlatformSettings;
  tiktok: PlatformSettings;
};

type PlatformProps = {
  id: string;
  name: string;
  delay: number;
  enabled: boolean;
  onDelayChange: (value: number) => void;
  onEnabledChange: (value: boolean) => void;
};

function Platform({ id, name, delay, enabled, onDelayChange, onEnabledChange }: PlatformProps) {
  return (
    <div className="platform-section">
      <h3 style={{ textTransform: 'capitalize' }}>{name}</h3>
      <label>
        Delay (s):&nbsp;
        <input
          type="number"
          min={1}
          value={delay}
          onChange={e => onDelayChange(Number(e.target.value))}
          style={{ width: 50 }}
          id={id + '-delay'}
        />
      </label>
      <label style={{ marginLeft: 8 }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={e => onEnabledChange(e.target.checked)}
          id={id + '-enabled'}
        />
        &nbsp;Enable
      </label>
    </div>
  );
}

const STORAGE_KEY = 'scrollrot_settings';
const DEFAULT_SETTINGS: AllSettings = {
  instagram: { delay: 1, enabled: false },
  shorts: { delay: 1, enabled: false },
  tiktok: { delay: 1, enabled: false },
};

function App() {
  const [instagramSettings, setInstagramSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS.instagram);
  const [shortsSettings, setShortsSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS.shorts);
  const [tiktokSettings, setTiktokSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS.tiktok);

  // Helper: read from storage (chrome.storage.sync preferred, fallback to localStorage)
  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      try {
        // runtime guard: when running dev server, chrome might be undefined
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
          const result = await chrome.storage.sync.get(STORAGE_KEY);
          const saved: Partial<AllSettings> | undefined = result?.[STORAGE_KEY];
          if (saved && mounted) {
            setInstagramSettings(saved.instagram ?? DEFAULT_SETTINGS.instagram);
            setShortsSettings(saved.shorts ?? DEFAULT_SETTINGS.shorts);
            setTiktokSettings(saved.tiktok ?? DEFAULT_SETTINGS.tiktok);
          }
        } else {
          // dev fallback: use localStorage so you can develop with Vite
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw && mounted) {
            const parsed = JSON.parse(raw) as Partial<AllSettings>;
            setInstagramSettings(parsed.instagram ?? DEFAULT_SETTINGS.instagram);
            setShortsSettings(parsed.shorts ?? DEFAULT_SETTINGS.shorts);
            setTiktokSettings(parsed.tiktok ?? DEFAULT_SETTINGS.tiktok);
          }
        }
      } catch (err) {
        console.error('Failed to load settings from storage:', err);
      }
    }

    loadSettings();
    return () => { mounted = false; };
  }, []);

  // Save (debounced) whenever any of the platform states change
  useEffect(() => {
    const settings: AllSettings = { instagram: instagramSettings, shorts: shortsSettings, tiktok: tiktokSettings };

    // debounce to reduce write-frequency (respect Chrome sync limits)
    const timer = window.setTimeout(async () => {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
          await chrome.storage.sync.set({ [STORAGE_KEY]: settings });
        } else {
          // dev fallback
          localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        }
      } catch (err) {
        console.error('Failed to save settings to storage:', err);
      }
    }, 400); // 400 ms; adjust if you like

    return () => clearTimeout(timer);
  }, [instagramSettings, shortsSettings, tiktokSettings]);

  // Handler helpers
  const handleDelayChange = (platform: keyof AllSettings, value: number) => {
    if (platform === 'instagram') setInstagramSettings(prev => ({ ...prev, delay: value }));
    if (platform === 'shorts') setShortsSettings(prev => ({ ...prev, delay: value }));
    if (platform === 'tiktok') setTiktokSettings(prev => ({ ...prev, delay: value }));
  };

  const handleEnabledChange = (platform: keyof AllSettings, value: boolean) => {
    if (platform === 'instagram') setInstagramSettings(prev => ({ ...prev, enabled: value }));
    if (platform === 'shorts') setShortsSettings(prev => ({ ...prev, enabled: value }));
    if (platform === 'tiktok') setTiktokSettings(prev => ({ ...prev, enabled: value }));
  };

  const settings = {
    instagram: instagramSettings,
    shorts: shortsSettings,
    tiktok: tiktokSettings
  };

  return (
    <div className="popup-container">
      <h2>ScrollRot Settings</h2>
      {(['instagram', 'shorts', 'tiktok'] as const).map(platform => (
        <Platform
          id={platform}
          key={platform}
          name={platform}
          delay={settings[platform].delay}
          enabled={settings[platform].enabled}
          onDelayChange={(value) => handleDelayChange(platform, value)}
          onEnabledChange={(value) => handleEnabledChange(platform, value)}
        />
      ))}
    </div>
  );
}

export default App;
