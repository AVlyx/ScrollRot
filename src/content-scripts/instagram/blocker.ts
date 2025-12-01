// Instagram Reels Content Script
// Blocks video playback for 5 seconds after scrolling to a new reel
import {
  blockerConfigOnChangeListener,
  getNumberWatchedShortVids,
  setNumberWatchedShortVids,
} from "@/lib/storage";
import { type BlockerConfig } from "@/types";
import Browser from "webextension-polyfill";
import { setReelLimitReachedDOM } from "../reelLimitReached";
// import { condDisplayFocusDOM } from "./displayFocusDOM";

//GLOBAL VARIABLES

interface BlockedReel {
  element: HTMLElement;
  unblockTime: number;
  observer?: IntersectionObserver;
}

function isOnReels(): boolean {
  return (
    window.location.hostname.includes("instagram.com") &&
    (window.location.pathname.includes("/reels/") ||
      window.location.pathname.includes("/p/") ||
      window.location.pathname.includes("/explore/"))
  );
}

class VideoBlocker {
  private blockedReels: Map<HTMLElement, BlockedReel> = new Map();
  private observedContainers: Set<HTMLElement> = new Set();
  private processedVideos: WeakSet<HTMLVideoElement> = new WeakSet();
  private config: BlockerConfig;
  private mainObserver: MutationObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private observeDebounceTimer: number | null = null;
  private reelsWatchedCount: number = 0;

  constructor(config: BlockerConfig) {
    this.config = config;
    this.init();
  }

  private async init(): Promise<void> {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.start());
    } else {
      this.start();
    }
    this.reelsWatchedCount = await getNumberWatchedShortVids("reels");
  }

  private start(): void {
    // Create intersection observer to detect when reels come into view
    this.createIntersectionObserver();
    // Observe existing reels once
    this.observeExistingReels();
    // Watch for new reels being added to the DOM
    this.watchForNewReels();
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
        threshold: 0.5,
        rootMargin: "0px",
      }
    );
  }

  private observeExistingReels(): void {
    const reelContainers = this.findReelContainers();

    let newObservations = 0;
    reelContainers.forEach((container) => {
      // Check if we're already observing this container
      if (!this.observedContainers.has(container) && this.intersectionObserver) {
        this.intersectionObserver.observe(container);
        this.observedContainers.add(container);
        newObservations++;
      }
    });
  }

  private findReelContainers(): HTMLElement[] {
    const containers: HTMLElement[] = [];

    // Instagram Reels selectors - try multiple approaches

    // Method 1: Find all video elements
    const videos = document.querySelectorAll("video");

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

  private updateNumberWatchedReels() {
    this.reelsWatchedCount++;
    setNumberWatchedShortVids("reels", this.reelsWatchedCount);

    if (this.reelsWatchedCount >= this.config.maxReelCount) {
      setReelLimitReachedDOM("reels");
    }
  }

  private handleReelInView(reelContainer: HTMLElement): void {
    // Check if this reel is already blocked or being processed
    if (this.blockedReels.has(reelContainer)) {
      return;
    }

    const video = reelContainer.querySelector("video");

    if (!video) {
      return;
    }

    if (this.processedVideos.has(video)) {
      return;
    }
    this.processedVideos.add(video);

    this.updateNumberWatchedReels();

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

    if (this.config.grayscale) {
      video.style.filter = "grayscale(100%)";
    } else {
      video.style.filter = "grayscale(0%)";
    }

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
    background: rgba(0, 0, 0, 0.85);
    color: white;
    padding: 25px 40px;
    border-radius: 16px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    font-size: 15px;
    font-weight: 600;
    z-index: 9999;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    min-width: 200px;
  `;

    const pauseIcon = document.createElement("img");
    pauseIcon.src = Browser.runtime.getURL("./assets/pause.svg");
    pauseIcon.alt = "Pause";
    pauseIcon.style.width = "28px";
    pauseIcon.style.height = "28px";

    const countdownText = document.createElement("span");
    countdownText.className = "reels-blocker-countdown";
    countdownText.style.fontSize = "17px";

    // Counter section with icon
    const counterContainer = document.createElement("div");
    counterContainer.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
  `;

    const counterIcon = document.createElement("img");
    counterIcon.src = Browser.runtime.getURL("./assets/video-counter.svg");
    counterIcon.alt = "Pause";
    counterIcon.style.width = "24px";
    counterIcon.style.height = "24px";

    const counterText = document.createElement("span");
    counterText.className = "reels-counter-text";
    counterText.textContent = `Reels watched: ${this.reelsWatchedCount}`;
    counterText.style.cssText = `
    font-size: 17px;
    opacity: 0.8;
  `;

    counterContainer.appendChild(counterIcon);
    counterContainer.appendChild(counterText);

    overlay.appendChild(pauseIcon);
    overlay.appendChild(countdownText);
    overlay.appendChild(counterContainer);

    videoWrapper.style.position = "relative";
    videoWrapper.appendChild(overlay);

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

export class Blocker {
  private pageObserver: MutationObserver;
  private videoBlocker: VideoBlocker | null = null;
  private config: BlockerConfig;
  private configChangeListener: () => void;
  private readonly platform = "reels";

  constructor(config: BlockerConfig) {
    this.pageObserver = this.spaNavigationObserver();
    this.config = config;
    this.configChangeListener = this.listenForConfigChange();
  }

  private renewVideoBlocker() {
    this.destroyBlocker();
    if (isOnReels() && this.config.enabled) {
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
      if (!isOnReels()) {
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
