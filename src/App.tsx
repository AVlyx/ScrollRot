import { useState } from 'react'
import './App.css'

type PlatformSettings = {
  delay: number;
  enabled: boolean;
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
  return (<div className="platform-section">
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
    <button id={id + '-test-button'}>Test</button>
    <label style={{ marginLeft: 8 }}>
      <input
        type="checkbox"
        checked={enabled}
        onChange={e => onEnabledChange(e.target.checked)}
        id={id + '-enabled'}
      />
      &nbsp;Enable
    </label>
  </div>);
}

function App() {
  // State for each platform
  const [instagramSettings, setInstagramSettings] = useState<PlatformSettings>({ delay: 1, enabled: false });
  const [shortsSettings, setShortsSettings] = useState<PlatformSettings>({ delay: 1, enabled: false });
  const [tiktokSettings, setTiktokSettings] = useState<PlatformSettings>({ delay: 1, enabled: false });


  const settings = {
    instagram: instagramSettings,
    shorts: shortsSettings,
    tiktok: tiktokSettings
  };

  const setSettings = {
    instagram: setInstagramSettings,
    shorts: setShortsSettings,
    tiktok: setTiktokSettings
  };
  const handleDelayChange = (platform: keyof typeof settings, value: number) => {
    setSettings[platform]({ ...settings[platform], delay: value });
  }

  const handleEnabledChange = (platform: keyof typeof settings, value: boolean) => {
    setSettings[platform]({ ...settings[platform], enabled: value });
  }



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

export default App