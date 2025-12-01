import { getBlockerConfig } from "@/lib/storage";
import { Blocker } from "./blocker";
import { FocusDOM } from "../displayFocusDOM";

function isOnReels(): boolean {
  return (
    window.location.hostname.includes("facebook.com") &&
    (window.location.pathname.includes("/reel/") ||
      window.location.pathname.includes("/reels") ||
      window.location.pathname.includes("/watch"))
  );
}

const PLATFORM = "facebook";
let FOCUS_DOM: FocusDOM | null = null;

async function loadContentScript() {
  const config = await getBlockerConfig(PLATFORM);
  FOCUS_DOM = new FocusDOM(() => new Blocker(config), isOnReels);
  await FOCUS_DOM.init();
}

loadContentScript();

window.addEventListener("beforeunload", () => {
  FOCUS_DOM?.destroy();
});
