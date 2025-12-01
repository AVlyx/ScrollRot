// Snapchat Spotlight Content Script
// Blocks video playback for 5 seconds after scrolling to a new spotlight video
import {
  blockerConfigOnChangeListener,
  getNumberWatchedShortVids,
  setNumberWatchedShortVids,
} from "@/lib/storage";
import { type BlockerConfig } from "@/types";
import Browser from "webextension-polyfill";
import { setReelLimitReachedDOM } from "../reelLimitReached";

//GLOBAL VARIABLES

interface BlockedSpotlight {
  element: HTMLElement;
  unblockTime: number;
  observer?: IntersectionObserver;
}

function isOnSpotlight(): boolean {
  return (
    window.location.hostname.includes("snapchat.com") && window.location.pathname.includes("/web")
  );
}

class VideoBlocker {
  private blockedSpotlights: Map<HTMLElement, BlockedSpotlight> = new Map();
  private observedContainers: Set<HTMLElement> = new Set();
  private processedVideos: WeakSet<HTMLVideoElement> = new WeakSet();
  private currentlyPlayingVideo: HTMLVideoElement | null = null;
  private config: BlockerConfig;
  private mainObserver: MutationObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private observeDebounceTimer: number | null = null;
  private spotlightsWatchedCount: number = 0;

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
    this.spotlightsWatchedCount = await getNumberWatchedShortVids("snapchat");
  }

  private start(): void {
    // Create intersection observer to detect when spotlights come into view
    this.createIntersectionObserver();
    // Observe existing spotlights once
    this.observeExistingSpotlights();
    // Watch for new spotlights being added to the DOM
    this.watchForNewSpotlights();
  }

  private createIntersectionObserver(): void {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const spotlightContainer = entry.target as HTMLElement;
          const video = spotlightContainer.querySelector("video");

          if (entry.isIntersecting) {
            // Video entered viewport
            this.handleSpotlightInView(spotlightContainer);
          } else {
            // Video left viewport - pause it
            if (video && !video.paused) {
              video.pause();
              // Clear current playing video if it's this one
              if (this.currentlyPlayingVideo === video) {
                this.currentlyPlayingVideo = null;
              }
            }
          }
        });
      },
      {
        threshold: 0.5,
        rootMargin: "0px",
      }
    );
  }

  private observeExistingSpotlights(): void {
    const spotlightContainers = this.findSpotlightContainers();

    let newObservations = 0;
    spotlightContainers.forEach((container) => {
      // Check if we're already observing this container
      if (!this.observedContainers.has(container) && this.intersectionObserver) {
        this.intersectionObserver.observe(container);
        this.observedContainers.add(container);
        newObservations++;
      }
    });
  }

  private findSpotlightContainers(): HTMLElement[] {
    const containers: HTMLElement[] = [];

    // Snapchat Spotlight selectors - try multiple approaches
    // NOTE: These selectors are ESTIMATED and may need adjustment after testing

    // Method 1: Find all video elements
    const videos = document.querySelectorAll("video");

    videos.forEach((video) => {
      // Find the closest container
      // Snapchat likely uses specific div structures for spotlight videos
      let container = video.closest("[role='presentation']");

      if (!container) {
        container = video.closest("article");
      }

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

    // Method 2: If no containers found, look for Snapchat's specific structure
    if (containers.length === 0) {
      // Snapchat Spotlight may use specific class patterns or data attributes
      // These are guesses and may need to be updated after inspecting the actual DOM
      const spotlightCandidates = document.querySelectorAll('div[data-testid*="spotlight"]');
      spotlightCandidates.forEach((candidate) => {
        if (candidate.querySelector("video") && (candidate as HTMLElement).offsetHeight > 400) {
          containers.push(candidate as HTMLElement);
        }
      });
    }

    // Method 3: Look for main content area divs with videos
    if (containers.length === 0) {
      const mainCandidates = document.querySelectorAll('main div, [role="main"] div');
      mainCandidates.forEach((candidate) => {
        if (candidate.querySelector("video") && (candidate as HTMLElement).offsetHeight > 400) {
          containers.push(candidate as HTMLElement);
        }
      });
    }

    return containers;
  }

  private watchForNewSpotlights(): void {
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
          this.observeExistingSpotlights();
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

  private updateNumberWatchedSpotlights() {
    this.spotlightsWatchedCount++;
    setNumberWatchedShortVids("snapchat", this.spotlightsWatchedCount);

    if (this.spotlightsWatchedCount >= this.config.maxReelCount) {
      setReelLimitReachedDOM("snapchat");
    }
  }

  private handleSpotlightInView(spotlightContainer: HTMLElement): void {
    // Check if this spotlight is already blocked or being processed
    if (this.blockedSpotlights.has(spotlightContainer)) {
      return;
    }

    const video = spotlightContainer.querySelector("video");

    if (!video) {
      return;
    }

    // Pause the previously playing video if there is one
    if (this.currentlyPlayingVideo && this.currentlyPlayingVideo !== video) {
      this.currentlyPlayingVideo.pause();
    }

    // Set this as the current video
    this.currentlyPlayingVideo = video;

    if (this.processedVideos.has(video)) {
      return;
    }
    this.processedVideos.add(video);

    this.updateNumberWatchedSpotlights();

    this.blockVideo(video, spotlightContainer);
  }

  private blockVideo(video: HTMLVideoElement, container: HTMLElement): void {
    // Check once more if already blocked (race condition protection)
    if (this.blockedSpotlights.has(container)) {
      return;
    }

    const unblockTime = Date.now() + this.config.blockDuration * 1000;

    // Store the blocked spotlight IMMEDIATELY to prevent race conditions
    this.blockedSpotlights.set(container, {
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

    // Use capture phase to intercept before Snapchat's handlers
    video.addEventListener("play", preventPlay, { capture: true });
    video.addEventListener("playing", preventPlay, { capture: true });

    // Set timeout to unblock
    setTimeout(() => {
      video.removeEventListener("play", preventPlay, { capture: true });
      video.removeEventListener("playing", preventPlay, { capture: true });
      this.blockedSpotlights.delete(container);

      // Auto-play only if configured
      if (this.config.autoPlayAfterBlock) {
        // Try to play immediately
        const attemptPlay = () => {
          const currentVideo = container.querySelector("video");
          if (currentVideo) {
            // Ensure video is in a playable state
            if (currentVideo.readyState >= 2) {
              // HAVE_CURRENT_DATA or better
              currentVideo.play().catch((_) => {
                currentVideo.click();
              });
            } else {
              currentVideo.addEventListener(
                "loadeddata",
                () => {
                  currentVideo.play();
                },
                { once: true }
              );
            }
          }
        };

        // Small delay to ensure all event listeners are cleaned up
        setTimeout(attemptPlay, 100);
      }
    }, this.config.blockDuration * 1000);

    // Add visual indicator
    this.addBlockIndicator(container, unblockTime);
  }

  private addBlockIndicator(container: HTMLElement, unblockTime: number): void {
    // Find the video container to append the overlay
    const videoWrapper = container.querySelector("video")?.parentElement;
    if (!videoWrapper) {
      return;
    }

    // Check if overlay already exists to prevent duplicates
    const existingOverlay = videoWrapper.querySelector(".snapchat-spotlight-blocker-overlay");
    if (existingOverlay) {
      return;
    }

    // Create a visual overlay to show blocking is active
    const overlay = document.createElement("div");
    overlay.className = "snapchat-spotlight-blocker-overlay";
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
    countdownText.className = "snapchat-spotlight-blocker-countdown";
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
    counterIcon.alt = "Counter";
    counterIcon.style.width = "24px";
    counterIcon.style.height = "24px";

    const counterText = document.createElement("span");
    counterText.className = "snapchat-spotlight-counter-text";
    counterText.textContent = `Spotlights watched: ${this.spotlightsWatchedCount}`;
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

    this.blockedSpotlights.clear();
    this.observedContainers.clear();
    this.currentlyPlayingVideo = null;
  }
}

export class Blocker {
  private pageObserver: MutationObserver;
  private videoBlocker: VideoBlocker | null = null;
  private config: BlockerConfig;
  private configChangeListener: () => void;
  private readonly platform = "snapchat";

  constructor(config: BlockerConfig) {
    this.pageObserver = this.spaNavigationObserver();
    this.config = config;
    this.configChangeListener = this.listenForConfigChange();
  }

  private renewVideoBlocker() {
    this.destroyBlocker();
    if (isOnSpotlight() && this.config.enabled) {
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
      if (!isOnSpotlight()) {
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
