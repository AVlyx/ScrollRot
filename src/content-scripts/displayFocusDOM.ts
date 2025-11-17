import { getFocusData } from "@/lib/focusTimer";
import { focusTimerOnChangeListener } from "@/lib/storage/focusTimer";
import type { BlockerType } from "./BlockerType";

/**
 * Removes the current DOM and displays a focus message
 */
function displayFocusDOM(): void {
  console.log("[FocusDOM] Displaying focus DOM - reloading to stop all media");

  // Set a flag in sessionStorage so we know to show focus DOM after reload
  sessionStorage.setItem("showFocusDOMAfterReload", "true");

  // Reload the page to completely kill all media
  window.location.reload();
}

/**
 * Check if we should show focus DOM after reload and display it
 */
function checkAndShowFocusDOMAfterReload(): void {
  if (sessionStorage.getItem("showFocusDOMAfterReload") === "true") {
    sessionStorage.removeItem("showFocusDOMAfterReload");

    // Stop any videos that might have started during reload
    const videos = document.querySelectorAll("video");
    videos.forEach((video) => {
      video.pause();
      video.muted = true;
    });

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
      // Remove any dynamically added scripts and videos
      document.querySelectorAll("script").forEach((script) => script.remove());
      document.querySelectorAll("video, audio").forEach((media) => {
        (media as HTMLMediaElement).pause();
        (media as HTMLMediaElement).muted = true;
        media.remove();
      });
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    console.log("[FocusDOM] Focus DOM displayed after reload");
  }
}

export class FocusDOM {
  private onTimerUpdateListener: () => void;
  private blockerConstructor: () => BlockerType;
  private blocker: BlockerType | null = null;
  private spaObserver: MutationObserver;
  private isOnPage: () => boolean;
  private wasOnPage = false;
  private breakTimeout: number | null = null;

  constructor(blockerConstructor: () => BlockerType, isOnPage: () => boolean) {
    console.log("[FocusDOM] Constructor called");
    this.isOnPage = isOnPage;
    this.blockerConstructor = blockerConstructor;

    // Check if we just reloaded to show focus DOM
    const shouldShowAfterReload = sessionStorage.getItem("showFocusDOMAfterReload") === "true";

    // Check if we need to show focus DOM after a reload
    if (shouldShowAfterReload) {
      checkAndShowFocusDOMAfterReload();
    }

    // Set up the focus timer listener
    this.onTimerUpdateListener = this.listenForFocusTimerUpdate();
    console.log("[FocusDOM] Timer listener registered");

    // Check if we should display focus DOM on initial load
    // BUT skip if we just showed it after reload
    if (isOnPage() && !shouldShowAfterReload) {
      this.condDisplayFocusDOM();
    }

    // Set up SPA navigation observer
    this.spaObserver = new MutationObserver(() => {
      if (!isOnPage()) {
        this.wasOnPage = false;
        return;
      }
      if (this.wasOnPage) {
        return;
      }
      this.wasOnPage = true;
      console.log("[FocusDOM] Navigated to shorts page");
      this.condDisplayFocusDOM();
    });

    // Start observing for SPA navigation - wait for body to exist
    const startObserving = () => {
      if (document.body) {
        this.spaObserver.observe(document.body, {
          childList: true,
          subtree: true,
        });
        console.log("[FocusDOM] SPA observer started");
      } else {
        // Body doesn't exist yet, wait a bit and try again
        setTimeout(startObserving, 100);
      }
    };
    startObserving();
  }

  async init() {
    const focusSessionData = await getFocusData();
    if (!focusSessionData) {
    }
    this.refreshBlocker();
  }

  private refreshBlocker() {
    if (this.blocker) {
      this.blocker.destroy();
    }
    this.blocker = this.blockerConstructor();
  }

  private listenForFocusTimerUpdate() {
    console.log("[FocusDOM] Setting up focusTimerOnChangeListener");
    return focusTimerOnChangeListener(() => {
      console.log("[FocusDOM] Change detected");
      console.log("[FocusDOM] isOnPage function:", this.isOnPage);
      console.log("[FocusDOM] isOnPage result:", this.isOnPage());
      console.log("[FocusDOM] Current URL:", window.location.href);

      if (this.isOnPage()) {
        console.log("[FocusDOM] CALLBACK CALLED - On shorts page, checking focus DOM");
        this.condDisplayFocusDOM();
      } else {
        console.log("[FocusDOM] CALLBACK SKIPPED - Not on shorts page");
      }
    });
  }

  private async condDisplayFocusDOM() {
    console.log("[FocusDOM] condDisplayFocusDOM called");

    // Clear any existing timeout to avoid duplicates
    if (this.breakTimeout !== null) {
      clearTimeout(this.breakTimeout);
      this.breakTimeout = null;
    }

    const focusSessionData = await getFocusData();
    console.log("[FocusDOM] Focus session data:", focusSessionData);

    if (!focusSessionData || focusSessionData.isComplete) {
      console.log("[FocusDOM] No active focus session");
      return;
    }

    if (focusSessionData.type == "focus") {
      console.log("[FocusDOM] Focus time - displaying focus DOM");
      displayFocusDOM();
      this.blocker?.destroy();
    } else {
      console.log("[FocusDOM] Break time - scheduling check after break ends");
      // Use arrow function to preserve 'this' context
      this.breakTimeout = window.setTimeout(() => {
        this.condDisplayFocusDOM();
      }, focusSessionData.timeRemaining + 100);
    }
  }

  public destroy() {
    this.spaObserver.disconnect();
    this.blocker?.destroy();
    this.onTimerUpdateListener();

    // Clear any pending timeout
    if (this.breakTimeout !== null) {
      clearTimeout(this.breakTimeout);
      this.breakTimeout = null;
    }
  }
}
