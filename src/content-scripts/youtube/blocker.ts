// YouTube Shorts Content Script
// Blocks video playback for 5 seconds after scrolling to a new short

import {
  blockerConfigOnChangeListener,
  getNumberWatchedShortVids,
  setNumberWatchedShortVids,
} from "@/lib/storage";
import type { BlockerConfig } from "@/types";

function isOnShorts(): boolean {
  return (
    window.location.hostname.includes("youtube.com") &&
    window.location.pathname.includes("/shorts/")
  );
}

class VideoBlocker {
  private config: BlockerConfig;
  private observeDebounceTimer: number | null = null;
  private lastScrollTime: number = 0;
  private scrollCooldown: number = 1000; // Minimum time between scroll detections
  private currentBlockTimeout: number | null = null;
  private currentVideoSrc: string = "";
  private shortsWatchedCount: number = 0;
  private scrollHandler: ((e: Event) => void) | null = null;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private touchstartHandler: ((e: TouchEvent) => void) | null = null;
  private touchendHandler: ((e: TouchEvent) => void) | null = null;
  private clickHandler: ((e: MouseEvent) => void) | null = null;
  private touchStartY: number = 0;

  constructor(config: BlockerConfig) {
    this.config = config;
    this.init();
    console.log({ config });
  }

  private async init(): Promise<void> {
    console.log("[YouTube Shorts Blocker] Initializing...");

    // Wait for DOM to be ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.start());
    } else {
      this.start();
    }

    this.shortsWatchedCount = await getNumberWatchedShortVids("shorts");
  }

  private start(): void {
    // Listen for scroll events on the shorts container
    this.listenForScrollEvents();

    console.log("[YouTube Shorts Blocker] Started successfully");
  }

  private listenForScrollEvents(): void {
    console.log("[YouTube Shorts Blocker] Setting up scroll detection...");

    // Create the scroll handler
    this.scrollHandler = (_: Event) => {
      const now = Date.now();

      // Check if enough time has passed since last scroll
      if (now - this.lastScrollTime < this.scrollCooldown) {
        return;
      }

      this.lastScrollTime = now;
      console.log("[YouTube Shorts Blocker] Scroll detected, blocking next video...");

      // Small delay to let the new video element load
      setTimeout(() => {
        this.blockCurrentVideo();
      }, 100);
    };

    // Listen for wheel events (mouse scroll)
    window.addEventListener("wheel", this.scrollHandler, { passive: true });

    // Listen for keyboard navigation (arrow keys)
    this.keydownHandler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        this.scrollHandler!(e);
      }
    };
    window.addEventListener("keydown", this.keydownHandler);

    // Listen for touch events (mobile swipe)
    this.touchstartHandler = (e: TouchEvent) => {
      this.touchStartY = e.touches[0].clientY;
    };
    window.addEventListener("touchstart", this.touchstartHandler, { passive: true });

    this.touchendHandler = (e: TouchEvent) => {
      const touchEndY = e.changedTouches[0].clientY;
      const diff = Math.abs(this.touchStartY - touchEndY);

      // Only trigger if swipe was significant (more than 50px)
      if (diff > 50) {
        this.scrollHandler!(e);
      }
    };
    window.addEventListener("touchend", this.touchendHandler, { passive: true });

    // Listen for clicks on next/previous video buttons
    this.clickHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Check if the click was on a next/previous button or its child elements
      const button = target.closest(
        'button[aria-label="Next video"], button[aria-label="Previous video"]'
      );

      if (button) {
        console.log("[YouTube Shorts Blocker] Navigation button clicked, blocking next video...");
        this.scrollHandler!(e);
      }
    };
    document.addEventListener("click", this.clickHandler, { capture: true });

    console.log("[YouTube Shorts Blocker] Scroll detection active");
  }

  private async blockCurrentVideo(): Promise<void> {
    // Find the currently visible video
    const videos = document.querySelectorAll("video");
    let currentVideo: HTMLVideoElement | null = null;
    let currentContainer: HTMLElement | null = null;

    // Find the video that's most in view
    videos.forEach((video) => {
      const rect = video.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Check if video is in the viewport (at least 30% visible)
      if (rect.top < viewportHeight * 0.7 && rect.bottom > viewportHeight * 0.3) {
        currentVideo = video as HTMLVideoElement;
        // Find the container
        currentContainer = video.closest("ytd-reel-video-renderer, ytd-shorts") as HTMLElement;
      }
    });

    if (!currentVideo) {
      console.log("[YouTube Shorts Blocker] No video found in viewport");
      return;
    }

    // Get the video source to track which video this is
    const videoElement = currentVideo as HTMLVideoElement;
    const videoSrc = videoElement.src || videoElement.currentSrc || "";

    // Check if this is the same video we just processed
    if (this.currentVideoSrc === videoSrc && videoSrc !== "") {
      console.log("[YouTube Shorts Blocker] Same video (by src), skipping block");
      return;
    }

    this.currentVideoSrc = videoSrc;
    console.log(
      "[YouTube Shorts Blocker] New video detected, src:",
      videoSrc.substring(0, 50) + "..."
    );

    // Increment counter and update storage
    this.shortsWatchedCount++;
    await setNumberWatchedShortVids("shorts", this.shortsWatchedCount);

    // If we don't have a container, use the video's parent
    if (!currentContainer) {
      let parent: HTMLElement | null = videoElement.parentElement;
      let depth = 0;
      while (parent && depth < 10) {
        if (parent.offsetHeight > 400) {
          currentContainer = parent;
          break;
        }
        parent = parent.parentElement;
        depth++;
      }
    }

    if (!currentContainer) {
      console.log("[YouTube Shorts Blocker] No container found for video");
      return;
    }

    console.log("[YouTube Shorts Blocker] Found current video, blocking now");
    this.blockVideo(videoElement, currentContainer);
  }

  private blockVideo(video: HTMLVideoElement, container: HTMLElement): void {
    // Clear any existing timeout for a previous video
    if (this.currentBlockTimeout !== null) {
      clearTimeout(this.currentBlockTimeout);
      this.currentBlockTimeout = null;
    }

    const unblockTime = Date.now() + this.config.blockDuration * 1000;

    console.log(
      "[YouTube Shorts Blocker] Blocking video for",
      this.config.blockDuration,
      "ms, autoPlayAfterBlock:",
      this.config.autoPlayAfterBlock
    );

    // Pause the video IMMEDIATELY - this is critical
    video.pause();
    video.currentTime = 0; // Reset to beginning

    // Prevent play events during block period
    const preventPlay = (e: Event) => {
      const timeRemaining = unblockTime - Date.now();
      if (timeRemaining > 0) {
        e.preventDefault();
        e.stopImmediatePropagation();
        video.pause();
      }
    };

    // Use capture phase to intercept before YouTube's handlers
    video.addEventListener("play", preventPlay, { capture: true });
    video.addEventListener("playing", preventPlay, { capture: true });

    // Also prevent loadeddata from auto-playing
    const preventAutoPlay = (e: Event) => {
      const timeRemaining = unblockTime - Date.now();
      if (timeRemaining > 0) {
        e.preventDefault();
        video.pause();
      }
    };

    video.addEventListener("loadeddata", preventAutoPlay, { capture: true });

    // Set timeout to unblock
    this.currentBlockTimeout = window.setTimeout(() => {
      video.removeEventListener("play", preventPlay, { capture: true });
      video.removeEventListener("playing", preventPlay, { capture: true });
      video.removeEventListener("loadeddata", preventAutoPlay, { capture: true });
      this.currentBlockTimeout = null;
      console.log("[YouTube Shorts Blocker] Unblocked short, playback allowed");

      // Auto-play only if configured
      if (this.config.autoPlayAfterBlock) {
        console.log("[YouTube Shorts Blocker] Auto-play enabled, attempting to play...");

        // Try to play immediately
        const attemptPlay = () => {
          const currentVideo = container.querySelector("video");
          if (currentVideo) {
            console.log("[YouTube Shorts Blocker] Video element found, calling play()");
            console.log(
              "[YouTube Shorts Blocker] Video paused:",
              currentVideo.paused,
              "readyState:",
              currentVideo.readyState
            );

            // Ensure video is in a playable state
            if (currentVideo.readyState >= 2) {
              // HAVE_CURRENT_DATA or better
              currentVideo
                .play()
                .then(() => {
                  console.log("[YouTube Shorts Blocker] ✓ Auto-play successful!");
                })
                .catch((error) => {
                  console.error("[YouTube Shorts Blocker] ✗ Auto-play failed:", error);
                  // Try clicking the video as fallback
                  currentVideo.click();
                });
            } else {
              // Wait for video to be ready
              console.log("[YouTube Shorts Blocker] Video not ready, waiting for loadeddata event");
              currentVideo.addEventListener(
                "loadeddata",
                () => {
                  currentVideo
                    .play()
                    .then(() => {
                      console.log(
                        "[YouTube Shorts Blocker] ✓ Auto-play successful after loadeddata!"
                      );
                    })
                    .catch((error) => {
                      console.error(
                        "[YouTube Shorts Blocker] ✗ Auto-play failed after loadeddata:",
                        error
                      );
                    });
                },
                { once: true }
              );
            }
          } else {
            console.log("[YouTube Shorts Blocker] Video element not found for auto-play");
          }
        };

        // Small delay to ensure all event listeners are cleaned up
        setTimeout(attemptPlay, 100);
      }
    }, this.config.blockDuration * 1000);

    // Add visual indicator (optional)
    this.addBlockIndicator(container, unblockTime);
  }

  private addBlockIndicator(container: HTMLElement, unblockTime: number): void {
    // Find the video element
    const video = container.querySelector("video");
    if (!video) {
      return;
    }

    // Check if overlay already exists to prevent duplicates
    const existingOverlay = document.querySelector(".shorts-blocker-overlay");
    if (existingOverlay) {
      console.log("[YouTube Shorts Blocker] Overlay already exists, removing old one");
      existingOverlay.remove();
    }

    // Find the shorts container
    const shortsContainer = document.getElementById("page-manager");
    if (!shortsContainer) {
      console.log("[YouTube Shorts Blocker] page-manager not found");
      return;
    }

    // Create a visual overlay to show blocking is active
    const overlay = document.createElement("div");
    overlay.className = "shorts-blocker-overlay";
    overlay.style.cssText = `
      position: absolute;
      top: 48%;
      left: 48%;
      transform: translate(-50%, -47%);
      background: rgba(0, 0, 0, 0.85);
      color: white;
      padding: 25px 40px;
      border-radius: 16px;
      font-family: Roboto, Arial, sans-serif;
      font-size: 15px;
      font-weight: 600;
      z-index: 10000;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      min-width: 200px;
    `;

    const pauseIcon = document.createElement("span");
    pauseIcon.textContent = "⏸️";
    pauseIcon.style.fontSize = "28px";

    const countdownText = document.createElement("span");
    countdownText.className = "shorts-blocker-countdown";
    countdownText.style.fontSize = "17px";

    // Counter section with icon
    const counterContainer = document.createElement("div");
    counterContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
    `;

    const shortsIcon = document.createElement("span");
    shortsIcon.textContent = "🎬";
    shortsIcon.style.fontSize = "17px";

    const counterText = document.createElement("span");
    counterText.className = "shorts-counter-text";
    counterText.textContent = `Shorts watched: ${this.shortsWatchedCount}`;
    counterText.style.cssText = `
      font-size: 17px;
      opacity: 0.8;
    `;

    counterContainer.appendChild(shortsIcon);
    counterContainer.appendChild(counterText);

    overlay.appendChild(pauseIcon);
    overlay.appendChild(countdownText);
    overlay.appendChild(counterContainer);

    // Ensure the shorts-container has relative positioning for absolute child
    const containerStyle = window.getComputedStyle(shortsContainer);
    if (containerStyle.position === "static") {
      shortsContainer.style.position = "relative";
    }

    // Append to shorts-container
    shortsContainer.appendChild(overlay);

    // Update countdown
    const updateCountdown = () => {
      const remaining = Math.ceil((unblockTime - Date.now()) / 1000);
      if (remaining > 0) {
        countdownText.textContent = `Wait ${remaining}s...`;
        requestAnimationFrame(updateCountdown);
      } else {
        overlay.remove();
      }
    };

    updateCountdown();
  }

  public destroy(): void {
    // Remove all event listeners
    if (this.scrollHandler) {
      window.removeEventListener("wheel", this.scrollHandler);
      this.scrollHandler = null;
    }

    if (this.keydownHandler) {
      window.removeEventListener("keydown", this.keydownHandler);
      this.keydownHandler = null;
    }

    if (this.touchstartHandler) {
      window.removeEventListener("touchstart", this.touchstartHandler);
      this.touchstartHandler = null;
    }

    if (this.touchendHandler) {
      window.removeEventListener("touchend", this.touchendHandler);
      this.touchendHandler = null;
    }

    if (this.clickHandler) {
      document.removeEventListener("click", this.clickHandler, { capture: true });
      this.clickHandler = null;
    }

    // Clear timers
    if (this.observeDebounceTimer !== null) {
      clearTimeout(this.observeDebounceTimer);
    }

    if (this.currentBlockTimeout !== null) {
      clearTimeout(this.currentBlockTimeout);
    }

    this.currentVideoSrc = "";
    console.log("[YouTube Shorts Blocker] Destroyed");
  }
}

export class Blocker {
  private pageObserver: MutationObserver;
  private videoBlocker: VideoBlocker | null = null;
  private config: BlockerConfig;
  private configChangeListener: () => void;
  private readonly platform = "shorts";

  constructor(config: BlockerConfig) {
    this.pageObserver = this.spaNavigationObserver();
    this.config = config;
    this.configChangeListener = this.listenForConfigChange();
  }

  private renewVideoBlocker() {
    this.destroyBlocker();
    if (isOnShorts() && this.config.enabled) {
      this.videoBlocker = new VideoBlocker(this.config);
    }
  }

  private destroyBlocker(): void {
    if (this.videoBlocker) {
      this.videoBlocker.destroy();
      this.videoBlocker = null;
    }
  }

  private spaNavigationObserver(): MutationObserver {
    const pageObserver = new MutationObserver(() => {
      if (!this.config.enabled) {
        this.destroyBlocker();
        return;
      }
      if (!isOnShorts()) {
        this.destroyBlocker();
        return;
      }
      if (this.videoBlocker) {
        return;
      }
      setTimeout(() => {
        if (this.videoBlocker) {
          return;
        }
        this.renewVideoBlocker();
      }, 500);
      console.log("NEW VideoBlocker CREATED");
    });
    const observeNavigation = () => {
      if (document.body) {
        pageObserver.observe(document.body, {
          childList: true,
          subtree: true,
        });
      } else {
        // Body doesn't exist yet, wait for it
        setTimeout(observeNavigation, 100);
      }
      return pageObserver;
    };
    observeNavigation();
    return pageObserver;
  }

  private listenForConfigChange(): () => void {
    const configChangeListener = blockerConfigOnChangeListener(this.platform, (newConfig) => {
      this.config = newConfig;
      this.renewVideoBlocker();
    });
    window.addEventListener("beforeunload", configChangeListener);
    return configChangeListener;
  }

  public destroy() {
    this.configChangeListener();
    this.pageObserver.disconnect();
    this.videoBlocker?.destroy();
  }
}
