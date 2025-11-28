import Browser from "webextension-polyfill";

const DebugStorage = () => {
  const handleClick = () => Browser.storage.local.clear();
  return <button onClick={handleClick}>DebugClearChromeStorage</button>;
};

export default DebugStorage;
