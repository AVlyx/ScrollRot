import { getBlockerConfig } from "@/lib/storage";
import { Blocker } from "./blocker";
import { FocusDOM } from "../displayFocusDOM";

function isOnSpotlight(): boolean {
  return (
    window.location.hostname.includes("snapchat.com") && window.location.pathname.includes("/web")
  );
}

const PLATFORM = "snapchat";
let FOCUS_DOM: FocusDOM | null = null;

async function loadContentScript() {
  const config = await getBlockerConfig(PLATFORM);
  FOCUS_DOM = new FocusDOM(() => new Blocker(config), isOnSpotlight);
  await FOCUS_DOM.init();
}

loadContentScript();

window.addEventListener("beforeunload", () => {
  FOCUS_DOM?.destroy();
});
