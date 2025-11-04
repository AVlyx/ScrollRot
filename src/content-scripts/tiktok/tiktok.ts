import { getBlockerConfig } from "@/lib/storage";
import { Blocker } from "./blocker";

const PLATFORM = "tiktok";
let BLOCKER: Blocker | null = null;
async function loadContentScript() {
  const config = await getBlockerConfig(PLATFORM);
  BLOCKER = new Blocker(config);
}

loadContentScript();

window.addEventListener("beforeunload", () => {
  BLOCKER?.destroy();
});
