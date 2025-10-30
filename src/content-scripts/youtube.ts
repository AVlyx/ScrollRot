// YouTube Shorts Content Script
// Blocks video playback for 5 seconds after scrolling to a new short

import { getBlockerConfig } from "@/lib/storage";
import type { BlockerConfig } from "@/types";

function isOnShorts(): boolean {
  return (
    window.location.hostname.includes("youtube.com") &&
    window.location.pathname.includes("/shorts/")
  );
}

interface BlockedShort {
  element: HTMLElement;
  unblockTime: number;
  observer?: IntersectionObserver;
}
class YouTubeShortsBlocker {
  private blockedShorts: Map<HTMLElement, BlockedShort> = new Map();
  private config: BlockerConfig;
  private observeDebounceTimer: number | null = null;
  private lastScrollTime: number = 0;
  private scrollCooldown: number = 1000; // Minimum time between scroll detections
  private currentBlockTimeout: number | null = null;
  private currentVideo: HTMLVideoElement | null = null;

  constructor(config: BlockerConfig) {
    this.config = config;
    this.init();
    console.log({ config });
  }

  private init(): void {
    console.log("[YouTube Shorts Blocker] Initializing...");

    // Wait for DOM to be ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.start());
    } else {
      this.start();
    }
  }

  private start(): void {
    // Listen for scroll events on the shorts container
    this.listenForScrollEvents();

    console.log("[YouTube Shorts Blocker] Started successfully");
  }

  private listenForScrollEvents(): void {
    console.log("[YouTube Shorts Blocker] Setting up scroll detection...");

    // Listen for scroll events on the document
    const handleScroll = (_: Event) => {
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
    window.addEventListener("wheel", handleScroll, { passive: true });

    // Listen for keyboard navigation (arrow keys)
    window.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        handleScroll(e);
      }
    });

    // Listen for touch events (mobile swipe)
    let touchStartY = 0;
    window.addEventListener(
      "touchstart",
      (e: TouchEvent) => {
        touchStartY = e.touches[0].clientY;
      },
      { passive: true }
    );

    window.addEventListener(
      "touchend",
      (e: TouchEvent) => {
        const touchEndY = e.changedTouches[0].clientY;
        const diff = Math.abs(touchStartY - touchEndY);

        // Only trigger if swipe was significant (more than 50px)
        if (diff > 50) {
          handleScroll(e);
        }
      },
      { passive: true }
    );

    // Listen for clicks on next/previous video buttons
    document.addEventListener(
      "click",
      (e: MouseEvent) => {
        const target = e.target as HTMLElement;

        // Check if the click was on a next/previous button or its child elements
        const button = target.closest(
          'button[aria-label="Next video"], button[aria-label="Previous video"]'
        );

        if (button) {
          console.log("[YouTube Shorts Blocker] Navigation button clicked, blocking next video...");
          handleScroll(e);
        }
      },
      { capture: true }
    );

    console.log("[YouTube Shorts Blocker] Scroll detection active");
  }

  private blockCurrentVideo(): void {
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

    // Check if this video was just processed
    if (this.currentVideo === currentVideo) {
      console.log("[YouTube Shorts Blocker] Same video, skipping block");
      return;
    }

    this.currentVideo = currentVideo;

    // If we don't have a container, use the video's parent
    if (!currentContainer) {
      let parent: HTMLElement | null = (currentVideo as HTMLVideoElement).parentElement;
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
    this.blockVideo(currentVideo, currentContainer);
  }

  private blockVideo(video: HTMLVideoElement, container: HTMLElement): void {
    // Clear any existing timeout for a previous video
    if (this.currentBlockTimeout !== null) {
      clearTimeout(this.currentBlockTimeout);
      this.currentBlockTimeout = null;
    }

    // Check if already blocked (skip duplicate blocks)
    if (this.blockedShorts.has(container)) {
      console.log("[YouTube Shorts Blocker] Container already blocked, skipping");
      return;
    }

    const unblockTime = Date.now() + this.config.blockDuration * 1000;

    // Add to blocked list
    this.blockedShorts.set(container, {
      element: container,
      unblockTime: unblockTime,
    });

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
      this.blockedShorts.delete(container);
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
    const existingOverlay = container.querySelector(".shorts-blocker-overlay");
    if (existingOverlay) {
      console.log("[YouTube Shorts Blocker] Overlay already exists, skipping");
      return;
    }

    // Create a visual overlay to show blocking is active
    const overlay = document.createElement("div");
    overlay.className = "shorts-blocker-overlay";
    overlay.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 20px 30px;
      border-radius: 12px;
      font-family: Roboto, Arial, sans-serif;
      font-size: 16px;
      font-weight: 600;
      z-index: 10000;
      pointer-events: none;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    `;

    const icon = document.createElement("span");
    icon.textContent = "⏸️";
    icon.style.fontSize = "24px";

    const text = document.createElement("span");
    text.className = "shorts-blocker-text";

    overlay.appendChild(icon);
    overlay.appendChild(text);

    // Append to body for fixed positioning
    document.body.appendChild(overlay);

    // Update countdown
    const updateCountdown = () => {
      const remaining = Math.ceil((unblockTime - Date.now()) / 1000);
      if (remaining > 0) {
        text.textContent = `Wait ${remaining}s...`;
        requestAnimationFrame(updateCountdown);
      } else {
        overlay.remove();
      }
    };

    updateCountdown();
  }

  public destroy(): void {
    if (this.observeDebounceTimer !== null) {
      clearTimeout(this.observeDebounceTimer);
    }

    if (this.currentBlockTimeout !== null) {
      clearTimeout(this.currentBlockTimeout);
    }

    this.blockedShorts.clear();
    this.currentVideo = null;
    console.log("[YouTube Shorts Blocker] Destroyed");
  }
}

// Initialize the blocker
let shortsBlocker: YouTubeShortsBlocker | null = null;

// Configuration - You can modify these settings

(async () => {
  // Handle navigation changes (YouTube is an SPA)
  let lastUrl = window.location.href;
  // const config = await getBlockerConfig("shorts");

  const config: BlockerConfig = await getBlockerConfig("shorts");

  if (isOnShorts()) {
    shortsBlocker = new YouTubeShortsBlocker(config);
  }
  const navigationObserver = new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;

      // Destroy existing blocker
      if (shortsBlocker) {
        shortsBlocker.destroy();
        shortsBlocker = null;
      }

      // Reinitialize if navigating to shorts
      if (isOnShorts()) {
        setTimeout(() => {
          shortsBlocker = new YouTubeShortsBlocker(config);
        }, 500); // Small delay to let YouTube load
      }
    }
  });

  // Wait for body to exist before observing
  const observeNavigation = () => {
    if (document.body) {
      navigationObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    } else {
      // Body doesn't exist yet, wait for it
      setTimeout(observeNavigation, 100);
    }
  };

  observeNavigation();

  // Cleanup on page unload
  window.addEventListener("beforeunload", () => {
    if (shortsBlocker) {
      shortsBlocker.destroy();
    }
  });
})();
