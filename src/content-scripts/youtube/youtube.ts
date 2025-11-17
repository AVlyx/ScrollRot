import { getBlockerConfig } from "@/lib/storage";
import { Blocker } from "./blocker";
import { FocusDOM } from "../displayFocusDOM";

const PLATFORM = "shorts";

function isOnShorts(): boolean {
  return (
    window.location.hostname.includes("youtube.com") &&
    window.location.pathname.includes("/shorts/")
  );
}

let FOCUS_DOM: FocusDOM | null = null;

async function loadContentScript() {
  const config = await getBlockerConfig(PLATFORM);
  FOCUS_DOM = new FocusDOM(() => new Blocker(config), isOnShorts);
  await FOCUS_DOM.init();
}

loadContentScript();

window.addEventListener("beforeunload", () => {
  FOCUS_DOM?.destroy();
});
