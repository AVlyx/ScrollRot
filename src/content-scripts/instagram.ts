// Instagram Reels Content Script
// Blocks video playback for 5 seconds after scrolling to a new reel
import { getBlockerConfig } from "../lib/storage";
import type { BlockerConfig } from "../types";

interface BlockedReel {
  element: HTMLElement;
  unblockTime: number;
  observer?: IntersectionObserver;
}

class InstagramReelsBlocker {
  private blockedReels: Map<HTMLElement, BlockedReel> = new Map();
  private observedContainers: Set<HTMLElement> = new Set();
  private processedVideos: WeakSet<HTMLVideoElement> = new WeakSet();
  private config: BlockerConfig;
  private mainObserver: MutationObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private observeDebounceTimer: number | null = null;

  constructor(config: BlockerConfig) {
    this.config = config;
    this.init();
  }

  private init(): void {
    console.log("[Instagram Reels Blocker] Initializing...");

    // Wait for DOM to be ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.start());
    } else {
      this.start();
    }
  }

  private start(): void {
    // Create intersection observer to detect when reels come into view
    this.createIntersectionObserver();

    // Observe existing reels once
    this.observeExistingReels();

    // Watch for new reels being added to the DOM
    this.watchForNewReels();

    console.log("[Instagram Reels Blocker] Started successfully");
  }

  private createIntersectionObserver(): void {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const reelContainer = entry.target as HTMLElement;
            this.handleReelInView(reelContainer);
          }
        });
      },
      {
        threshold: 0.5, // Trigger when 50% of the reel is visible
        rootMargin: "0px",
      }
    );
  }

  private observeExistingReels(): void {
    // Instagram Reels are typically in articles or divs with specific roles
    // The video container structure: article > div > div > video
    const reelContainers = this.findReelContainers();

    let newObservations = 0;
    reelContainers.forEach((container) => {
      // Check if we're already observing this container
      if (!this.observedContainers.has(container) && this.intersectionObserver) {
        this.intersectionObserver.observe(container);
        this.observedContainers.add(container);
        newObservations++;
        console.log(
          "[Instagram Reels Blocker] Now observing container:",
          container.tagName,
          container.className.substring(0, 50)
        );
      }
    });

    if (newObservations > 0) {
      console.log(
        `[Instagram Reels Blocker] Added ${newObservations} new containers for observation (total observed: ${this.observedContainers.size})`
      );
    }
  }

  private findReelContainers(): HTMLElement[] {
    const containers: HTMLElement[] = [];

    // Instagram Reels selectors - try multiple approaches

    // Method 1: Find all video elements
    const videos = document.querySelectorAll("video");
    console.log(`[Instagram Reels Blocker] Found ${videos.length} video elements`);

    videos.forEach((video) => {
      // Find the closest article or main container
      // Instagram uses various structures, so we try multiple selectors
      let container = video.closest("article");

      if (!container) {
        // Try to find parent div that contains the video and is scrollable
        let parent = video.parentElement;
        let depth = 0;
        while (parent && depth < 10) {
          const style = window.getComputedStyle(parent);
          // Look for scroll snap or large height containers
          if (
            parent.tagName === "DIV" &&
            (style.scrollSnapAlign !== "none" || parent.offsetHeight > 400)
          ) {
            container = parent;
            break;
          }
          parent = parent.parentElement;
          depth++;
        }
      }

      // Fallback: use the video's closest div with significant height
      if (!container) {
        let parent = video.parentElement;
        let depth = 0;
        while (parent && depth < 5) {
          if (parent.offsetHeight > 300) {
            container = parent;
            break;
          }
          parent = parent.parentElement;
          depth++;
        }
      }

      if (container && !containers.includes(container as HTMLElement)) {
        containers.push(container as HTMLElement);
      }
    });

    // Method 2: If no containers found, look for Instagram's specific structure
    if (containers.length === 0) {
      // Instagram Reels often use specific class patterns or data attributes
      const reelCandidates = document.querySelectorAll('div[role="presentation"]');
      reelCandidates.forEach((candidate) => {
        if (candidate.querySelector("video")) {
          containers.push(candidate as HTMLElement);
        }
      });
    }

    return containers;
  }

  private watchForNewReels(): void {
    this.mainObserver = new MutationObserver((mutations) => {
      let newVideosAdded = false;

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            // Only trigger if we find actual video elements, not just any div change
            if (element.tagName === "VIDEO" || element.querySelector("video")) {
              newVideosAdded = true;
            }
          }
        });
      });

      if (newVideosAdded) {
        // Cancel any pending observation
        if (this.observeDebounceTimer !== null) {
          clearTimeout(this.observeDebounceTimer);
        }

        // Debounce to avoid excessive checks - only call once per batch of mutations
        console.log(
          "[Instagram Reels Blocker] New video elements detected in DOM, scheduling observation..."
        );
        this.observeDebounceTimer = window.setTimeout(() => {
          this.observeDebounceTimer = null;
          this.observeExistingReels();
        }, 300);
      }
    });

    // More selective observation - only watch for childList changes, not attributes or character data
    this.mainObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false,
    });
  }

  private handleReelInView(reelContainer: HTMLElement): void {
    // Check if this reel is already blocked or being processed
    if (this.blockedReels.has(reelContainer)) {
      console.log("[Instagram Reels Blocker] Container already blocked, skipping");
      return;
    }

    const video = reelContainer.querySelector("video");

    if (!video) {
      return;
    }

    // Check if we've already processed this specific video
    if (this.processedVideos.has(video)) {
      console.log("[Instagram Reels Blocker] Video already processed, skipping");
      return;
    }

    this.processedVideos.add(video);
    console.log("[Instagram Reels Blocker] New reel in view, blocking for 5s");

    // Block the video
    this.blockVideo(video, reelContainer);
  }

  private blockVideo(video: HTMLVideoElement, container: HTMLElement): void {
    // Check once more if already blocked (race condition protection)
    if (this.blockedReels.has(container)) {
      console.log("[Instagram Reels Blocker] Container already blocked in blockVideo, aborting");
      return;
    }

    const unblockTime = Date.now() + this.config.blockDuration * 1000;

    // Store the blocked reel IMMEDIATELY to prevent race conditions
    this.blockedReels.set(container, {
      element: container,
      unblockTime: unblockTime,
    });

    console.log(
      "[Instagram Reels Blocker] Blocking video for",
      this.config.blockDuration,
      "ms, autoPlayAfterBlock:",
      this.config.autoPlayAfterBlock
    );

    // Pause the video immediately
    video.pause();

    // Prevent play events during block period
    const preventPlay = (e: Event) => {
      const timeRemaining = unblockTime - Date.now();
      if (timeRemaining > 0) {
        e.preventDefault();
        e.stopImmediatePropagation();
        video.pause();
      }
    };

    // Use capture phase to intercept before Instagram's handlers
    video.addEventListener("play", preventPlay, { capture: true });
    video.addEventListener("playing", preventPlay, { capture: true });

    // Set timeout to unblock
    setTimeout(() => {
      video.removeEventListener("play", preventPlay, { capture: true });
      video.removeEventListener("playing", preventPlay, { capture: true });
      this.blockedReels.delete(container);
      console.log("[Instagram Reels Blocker] Unblocked reel, playback allowed");

      // Auto-play only if configured
      if (this.config.autoPlayAfterBlock) {
        console.log("[Instagram Reels Blocker] Auto-play enabled, attempting to play...");

        // Try to play immediately
        const attemptPlay = () => {
          const currentVideo = container.querySelector("video");
          if (currentVideo) {
            console.log("[Instagram Reels Blocker] Video element found, calling play()");
            console.log(
              "[Instagram Reels Blocker] Video paused:",
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
                  console.log("[Instagram Reels Blocker] ✓ Auto-play successful!");
                })
                .catch((error) => {
                  console.error("[Instagram Reels Blocker] ✗ Auto-play failed:", error);
                  // Try clicking the video as fallback
                  currentVideo.click();
                });
            } else {
              // Wait for video to be ready
              console.log(
                "[Instagram Reels Blocker] Video not ready, waiting for loadeddata event"
              );
              currentVideo.addEventListener(
                "loadeddata",
                () => {
                  currentVideo
                    .play()
                    .then(() => {
                      console.log(
                        "[Instagram Reels Blocker] ✓ Auto-play successful after loadeddata!"
                      );
                    })
                    .catch((error) => {
                      console.error(
                        "[Instagram Reels Blocker] ✗ Auto-play failed after loadeddata:",
                        error
                      );
                    });
                },
                { once: true }
              );
            }
          } else {
            console.log("[Instagram Reels Blocker] Video element not found for auto-play");
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
    // Find the video container to append the overlay
    const videoWrapper = container.querySelector("video")?.parentElement;
    if (!videoWrapper) {
      return;
    }

    // Check if overlay already exists to prevent duplicates
    const existingOverlay = videoWrapper.querySelector(".reels-blocker-overlay");
    if (existingOverlay) {
      console.log("[Instagram Reels Blocker] Overlay already exists, skipping");
      return;
    }

    // Create a visual overlay to show blocking is active
    const overlay = document.createElement("div");
    overlay.className = "reels-blocker-overlay";
    overlay.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 15px 25px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 14px;
      font-weight: 600;
      z-index: 9999;
      pointer-events: none;
      display: flex;
      align-items: center;
      gap: 10px;
    `;

    const icon = document.createElement("span");
    icon.textContent = "⏸️";
    icon.style.fontSize = "20px";

    const text = document.createElement("span");
    text.className = "reels-blocker-text";

    overlay.appendChild(icon);
    overlay.appendChild(text);

    videoWrapper.style.position = "relative";
    videoWrapper.appendChild(overlay);

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
    if (this.mainObserver) {
      this.mainObserver.disconnect();
    }

    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }

    if (this.observeDebounceTimer !== null) {
      clearTimeout(this.observeDebounceTimer);
    }

    this.blockedReels.clear();
    this.observedContainers.clear();
    console.log("[Instagram Reels Blocker] Destroyed");
  }
}

// Initialize the blocker
let reelsBlocker: InstagramReelsBlocker | null = null;
(async () => {
  // Configuration - You can modify these settings
  const config: BlockerConfig = await getBlockerConfig("reels");

  // Start blocking when on Instagram Reels
  if (window.location.hostname.includes("instagram.com")) {
    reelsBlocker = new InstagramReelsBlocker(config);
  }

  // Example: Update configuration dynamically
  // This can be called from your extension's popup or options page
  (window as any).updateBlockerConfig = (newConfig: BlockerConfig) => {
    if (reelsBlocker) {
      reelsBlocker.destroy();
    }
    reelsBlocker = new InstagramReelsBlocker({ ...config, ...newConfig });
    console.log("[Instagram Reels Blocker] Configuration updated:", newConfig);
  };

  // Handle navigation changes (for SPAs like Instagram)
  let lastUrl = window.location.href;
  const navigationObserver = new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;

      // Reinitialize if navigating to/from reels
      if (reelsBlocker) {
        reelsBlocker.destroy();
      }

      if (window.location.hostname.includes("instagram.com")) {
        setTimeout(() => {
          reelsBlocker = new InstagramReelsBlocker(config);
        }, 500); // Small delay to let Instagram load
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
})();

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  if (reelsBlocker) {
    reelsBlocker.destroy();
  }
});
