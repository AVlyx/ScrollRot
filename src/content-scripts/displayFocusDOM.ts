import { getFocusData } from "@/lib/focusTimer";
import { focusTimerOnChangeListener } from "@/lib/storage/focusTimer";
import type { Blocker } from "./instagram/blocker";
import type { BlockerType } from "./BlockerType";

/**
 * Removes the current DOM and displays a focus message
 */
function displayFocusDOM(): void {
  // Remove all existing content from the page
  document.documentElement.innerHTML = "";

  // Create new HTML structure
  const html = document.createElement("html");
  const head = document.createElement("head");
  const body = document.createElement("body");

  // Add title
  const title = document.createElement("title");
  title.textContent = "Page Blocked";
  head.appendChild(title);

  // Add styles
  const style = document.createElement("style");
  style.textContent = `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      color: #fff;
    }
    
    .container {
      text-align: center;
      padding: 40px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      backdrop-filter: blur(10px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      max-width: 500px;
    }
    
    .icon {
      font-size: 64px;
      margin-bottom: 20px;
    }
    
    h1 {
      font-size: 28px;
      margin-bottom: 16px;
      font-weight: 600;
    }
    
    p {
      font-size: 18px;
      line-height: 1.6;
      opacity: 0.9;
    }
  `;
  head.appendChild(style);

  // Create message container
  const container = document.createElement("div");
  container.className = "container";

  const icon = document.createElement("div");
  icon.className = "icon";
  icon.textContent = "🔒";

  const heading = document.createElement("h1");
  heading.textContent = "Can't access this page right now";

  const message = document.createElement("p");
  message.textContent = "Please don't lose focus.";

  container.appendChild(icon);
  container.appendChild(heading);
  container.appendChild(message);
  body.appendChild(container);

  // Build the new document
  html.appendChild(head);
  html.appendChild(body);

  // Replace the entire document
  document.replaceChild(html, document.documentElement);

  // Prevent any scripts from running
  const observer = new MutationObserver(() => {
    // Remove any dynamically added scripts
    document.querySelectorAll("script").forEach((script) => script.remove());
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

export class FocusDOM {
  private onTimerUpdateListener: () => void;
  private blockerConstructor: () => BlockerType;
  private blocker: BlockerType | null = null;

  constructor(blockerConst: () => BlockerType) {
    this.onTimerUpdateListener = this.listenForFocusTimerUpdate();
    this.blockerConstructor = blockerConst;
  }

  async init() {
    const focusSessionData = await getFocusData();
    if(!focusSessionData)
  }

  private refreshBlocker(){
    if(this.blocker){
      this.blocker.destroy()
    }
    this.blocker = this.blockerConstructor()
  }

  private listenForFocusTimerUpdate() {
    return focusTimerOnChangeListener(() => {});
  }
}

export async function condDisplayFocusDOM() {
  const focusSessionData = await getFocusData();
  if (!focusSessionData || focusSessionData.isComplete) {
    return;
  }
  if (focusSessionData.type == "focus") {
    displayFocusDOM();
  } else {
    setTimeout(condDisplayFocusDOM, focusSessionData.timeRemaining + 500);
  }
  const changeListener = focusTimerOnChangeListener(condDisplayFocusDOM);
  return () => {
    changeListener();
  };
}
