const DebugStorage = () => {
  const handleClick = () => chrome.storage.local.clear();
  return <button onClick={handleClick}>DebugClearChromeStorage</button>;
};

export default DebugStorage;
