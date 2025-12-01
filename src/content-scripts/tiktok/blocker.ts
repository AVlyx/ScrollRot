// TikTok Content Script
// Blocks video playback for 5 seconds after scrolling to a new video
import {
  blockerConfigOnChangeListener,
  getNumberWatchedShortVids,
  setNumberWatchedShortVids,
} from "@/lib/storage";
import { type BlockerConfig } from "@/types";
import Browser from "webextension-polyfill";
import { setReelLimitReachedDOM } from "../reelLimitReached";

interface BlockedVideo {
  element: HTMLElement;
  unblockTime: number;
  observer?: IntersectionObserver;
  unblockTimer?: number;
  overlay?: HTMLElement;
}

function isOnTikTok(): boolean {
  return window.location.hostname.includes("tiktok.com");
}

class VideoBlocker {
  private blockedVideos: Map<HTMLElement, BlockedVideo> = new Map();
  private observedContainers: Set<HTMLElement> = new Set();
  private processedContainers: Set<HTMLElement> = new Set(); // Track containers, not videos
  private config: BlockerConfig;
  private mainObserver: MutationObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private observeDebounceTimer: number | null = null;
  private periodicCheckInterval: number | null = null;
  private videosWatchedCount: number = 0;

  constructor(config: BlockerConfig) {
    this.config = config;
    this.init();
  }

  private async init(): Promise<void> {
    // Wait for DOM to be ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.start());
    } else {
      this.start();
    }
    this.videosWatchedCount = await getNumberWatchedShortVids("tiktok");
  }

  private start(): void {
    // Create intersection observer to detect when videos come into view
    this.createIntersectionObserver();

    // Observe existing videos once
    this.observeExistingVideos();

    // Watch for new videos being added to the DOM
    this.watchForNewVideos();
  }

  private createIntersectionObserver(): void {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const videoContainer = entry.target as HTMLElement;
            this.handleVideoInView(videoContainer);
          }
        });
      },
      {
        threshold: 0.5, // Trigger when 50% of the video is visible
        rootMargin: "0px",
      }
    );
  }

  private observeExistingVideos(): void {
    // Find TikTok video containers
    const videoContainers = this.findVideoContainers();

    let newObservations = 0;
    videoContainers.forEach((container) => {
      // Check if we're already observing this container
      if (!this.observedContainers.has(container)) {
        if (this.intersectionObserver) {
          this.intersectionObserver.observe(container);
          this.observedContainers.add(container);
          newObservations++;
        }
      }
    });

    if (newObservations > 0) {
    }
  }

  private findVideoContainers(): HTMLElement[] {
    const containers: HTMLElement[] = [];

    // TikTok's actual structure: #column-list-container > article[class*="ArticleItemContainer"]
    // Each article has a unique data-scroll-index attribute

    // Method 1: Find all article elements with ArticleItemContainer class
    const articles = document.querySelectorAll('article[class*="ArticleItemContainer"]');

    articles.forEach((article) => {
      const scrollIndex = article.getAttribute("data-scroll-index");
      const video = article.querySelector("video");

      if (video) {
        // Use the article element as the container
        if (!containers.includes(article as HTMLElement)) {
          // Store the scroll index as the container ID for easy tracking
          (article as any).__tiktokBlockerId = `article-${scrollIndex}`;
          containers.push(article as HTMLElement);
        }
      }
    });

    // Method 2: Fallback - look in column-list-container
    if (containers.length === 0) {
      const columnList = document.getElementById("column-list-container");
      if (columnList) {
        const articlesInColumn = columnList.querySelectorAll("article");

        articlesInColumn.forEach((article) => {
          const video = article.querySelector("video");
          const scrollIndex = article.getAttribute("data-scroll-index") || "unknown";

          if (video && !containers.includes(article as HTMLElement)) {
            (article as any).__tiktokBlockerId = `article-${scrollIndex}`;
            containers.push(article as HTMLElement);
          }
        });
      }
    }

    // Method 3: Last resort fallback - find by video elements
    if (containers.length === 0) {
      const videos = document.querySelectorAll("video");

      videos.forEach((video) => {
        // Find the closest article element
        const article = video.closest("article");
        if (article && !containers.includes(article as HTMLElement)) {
          const scrollIndex = article.getAttribute("data-scroll-index") || "unknown";
          (article as any).__tiktokBlockerId = `article-${scrollIndex}`;
          containers.push(article as HTMLElement);
        }
      });
    }

    return containers;
  }

  private watchForNewVideos(): void {
    this.mainObserver = new MutationObserver((mutations) => {
      let shouldReobserve = false;

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;

            // Check if it's an article element or contains article elements
            const isArticle =
              element.tagName === "ARTICLE" && element.className.includes("ArticleItemContainer");
            const hasArticles =
              element.querySelectorAll('article[class*="ArticleItemContainer"]').length > 0;

            if (isArticle || hasArticles) {
              shouldReobserve = true;
            }
          }
        });
      });

      if (shouldReobserve) {
        // Debounce the observation to avoid excessive calls
        if (this.observeDebounceTimer !== null) {
          clearTimeout(this.observeDebounceTimer);
        }

        this.observeDebounceTimer = window.setTimeout(() => {
          this.observeExistingVideos();
          this.observeDebounceTimer = null;
        }, 200);
      }
    });

    // Start observing the document with the configured parameters
    this.mainObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Also set up periodic checks for new videos (as a fallback)
    this.periodicCheckInterval = window.setInterval(() => {
      this.observeExistingVideos();
    }, 2000); // Check every 2 seconds
  }

  private updateNumberWatchedReels() {
    this.videosWatchedCount++;
    setNumberWatchedShortVids("tiktok", this.videosWatchedCount);

    if (this.videosWatchedCount >= this.config.maxReelCount) {
      setReelLimitReachedDOM("tiktok");
    }
  }

  private handleVideoInView(container: HTMLElement): void {
    // Check if we've already processed this container
    if (this.processedContainers.has(container)) {
      return;
    }

    // Mark this container as processed
    this.processedContainers.add(container);
    this.updateNumberWatchedReels();

    // Find the video element within this container
    const video = container.querySelector("video") as HTMLVideoElement;

    if (!video) {
      return;
    }

    // Block the video if it's not already blocked
    if (!this.blockedVideos.has(container)) {
      this.blockVideo(container, video);
    }
  }

  private blockVideo(container: HTMLElement, video: HTMLVideoElement): void {
    // Pause the video immediately
    if (!video.paused) {
      video.pause();
    }

    if (this.config.grayscale) {
      video.style.filter = "grayscale(100%)";
    } else {
      video.style.filter = "grayscale(0%)";
    }

    // Reset to beginning
    video.currentTime = 0;

    // Calculate unblock time
    const unblockTime = Date.now() + this.config.blockDuration * 1000;
    // Store blocked video info
    const blockedVideo: BlockedVideo = {
      element: container,
      unblockTime: unblockTime,
    };
    this.blockedVideos.set(container, blockedVideo);

    // Add event listeners to prevent playback
    const preventPlay = (e: Event) => {
      const now = Date.now();
      if (now < unblockTime) {
        e.preventDefault();
        e.stopImmediatePropagation();

        // Force pause if somehow playing
        if (!video.paused) {
          video.pause();
        }
      }
    };

    // Use capture phase to catch the event before TikTok's handlers
    video.addEventListener("play", preventPlay, true);
    video.addEventListener("playing", preventPlay, true);

    // Also prevent clicks on the video during block period
    const preventClick = (e: MouseEvent) => {
      const now = Date.now();
      if (now < unblockTime) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    video.addEventListener("click", preventClick, true);

    // Set up unblock timer - STORE THE TIMER ID
    const unblockTimer = window.setTimeout(() => {
      // Remove event listeners
      video.removeEventListener("play", preventPlay, true);
      video.removeEventListener("playing", preventPlay, true);
      video.removeEventListener("click", preventClick, true);

      // Remove from blocked videos
      this.blockedVideos.delete(container);

      // Try to start playing the video
      const attemptPlay = () => {
        const currentVideo = container.querySelector("video") as HTMLVideoElement;
        if (currentVideo) {
          // Ensure video is in a playable state
          if (currentVideo.readyState >= 2) {
            // HAVE_CURRENT_DATA or better
            currentVideo
              .play()
              .then(() => {})
              .catch((error) => {
                console.error("[TikTok Blocker] ✗ Auto-play failed:", error);
                // Try clicking the video as fallback
                currentVideo.click();
              });
          } else {
            // Wait for video to be ready
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
    }, this.config.blockDuration * 1000);

    // Store the timer ID in the blockedVideo object
    blockedVideo.unblockTimer = unblockTimer;

    // Add visual indicator (optional)
    this.addBlockIndicator(container, unblockTime);
  }

  private addBlockIndicator(container: HTMLElement, unblockTime: number): void {
    // Find the video element first
    const video = container.querySelector("video");
    if (!video) {
      return;
    }
    // Check if overlay already exists to prevent duplicates
    const existingOverlay = container.querySelector(".tiktok-blocker-overlay");
    if (existingOverlay) {
      existingOverlay.remove();
    }

    // Create a visual overlay to show blocking is active
    const overlay = document.createElement("div");
    overlay.className = "tiktok-blocker-overlay";
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
    countdownText.className = "tiktok-blocker-countdown";
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
    counterText.className = "tiktok-counter-text";
    counterText.textContent = `Watched ${this.videosWatchedCount}`;
    counterText.style.cssText = `
    font-size: 17px;
    opacity: 0.8;
  `;

    counterContainer.appendChild(counterIcon);
    counterContainer.appendChild(counterText);

    overlay.appendChild(pauseIcon);
    overlay.appendChild(countdownText);
    overlay.appendChild(counterContainer);

    // Ensure video has relative positioning for absolute overlay
    const videoStyle = window.getComputedStyle(video);
    if (videoStyle.position === "static") {
      video.style.position = "relative";
    }

    // Append to video element so it's perfectly centered on the video
    video.parentElement?.appendChild(overlay);

    // Store overlay reference for cleanup
    const blockedVideo = this.blockedVideos.get(container);
    if (blockedVideo) {
      blockedVideo.overlay = overlay;
    }

    // Update countdown
    let animationFrameId: number;
    const updateCountdown = () => {
      const remaining = Math.ceil((unblockTime - Date.now()) / 1000);
      if (remaining > 0) {
        countdownText.textContent = `Wait ${remaining}s...`;
        animationFrameId = requestAnimationFrame(updateCountdown);
      } else {
        cancelAnimationFrame(animationFrameId);
        overlay.remove();
      }
    };

    updateCountdown();

    // Failsafe: Force remove overlay after block duration + buffer
    setTimeout(() => {
      if (overlay.parentElement) {
        overlay.remove();
      }
    }, this.config.blockDuration * 1000 + 500);
  }

  public destroy(): void {
    // Disconnect observers
    if (this.mainObserver) {
      this.mainObserver.disconnect();
      this.mainObserver = null;
    }

    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }

    // Clear debounce timer
    if (this.observeDebounceTimer !== null) {
      clearTimeout(this.observeDebounceTimer);
      this.observeDebounceTimer = null;
    }

    // Clear periodic check interval
    if (this.periodicCheckInterval !== null) {
      clearInterval(this.periodicCheckInterval);
      this.periodicCheckInterval = null;
    }

    // Clear all blocked video timers and remove overlays
    this.blockedVideos.forEach((blockedVideo) => {
      // Clear the unblock timer
      if (blockedVideo.unblockTimer !== undefined) {
        clearTimeout(blockedVideo.unblockTimer);
      }

      // Remove overlay if it exists
      if (blockedVideo.overlay && blockedVideo.overlay.parentElement) {
        blockedVideo.overlay.remove();
      }

      // Remove event listeners from video
      const video = blockedVideo.element.querySelector("video");
      if (video) {
        // Clone and replace to remove all event listeners
        const newVideo = video.cloneNode(true);
        video.parentNode?.replaceChild(newVideo, video);
      }
    });

    // Clear all maps and sets
    this.blockedVideos.clear();
    this.observedContainers.clear();
    this.processedContainers.clear();
  }
}
export class Blocker {
  private pageObserver: MutationObserver;
  private videoBlocker: VideoBlocker | null = null;
  private config: BlockerConfig;
  private configChangeListener: () => void;
  private readonly platform = "tiktok";

  constructor(config: BlockerConfig) {
    this.pageObserver = this.spaNavigationObserver();
    this.config = config;
    this.configChangeListener = this.listenForConfigChange();
  }

  private renewVideoBlocker() {
    this.destroyBlocker();
    if (isOnTikTok() && this.config.enabled) {
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
      if (!isOnTikTok()) {
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
