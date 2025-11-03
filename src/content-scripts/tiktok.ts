// TikTok Content Script
// Blocks video playback for 5 seconds after scrolling to a new video
import {
  blockerConfigOnChangeListener,
  getBlockerConfig,
  getNumberWatchedShortVids,
  setNumberWatchedShortVids,
} from "@/lib/storage";
import { blockerConfigDefault, type BlockerConfig, type Platform } from "@/types";
import { condDisplayFocusDOM } from "./displayFocusDOM";

//GLOBAL VARIABLES
let CONFIG: BlockerConfig = blockerConfigDefault;
let BLOCKER: TikTokBlocker | null = null;
const PLATFORM: Platform = "tiktok";

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

class TikTokBlocker {
  private blockedVideos: Map<HTMLElement, BlockedVideo> = new Map();
  private observedContainers: Set<HTMLElement> = new Set();
  private processedContainers: Set<HTMLElement> = new Set(); // Track containers, not videos
  private config: BlockerConfig;
  private mainObserver: MutationObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private observeDebounceTimer: number | null = null;
  private periodicCheckInterval: number | null = null;
  private videosWatchedCount: number = 0;
  private counterElement: HTMLDivElement | null = null;

  constructor(config: BlockerConfig) {
    this.config = config;
    this.init();
  }

  private async init(): Promise<void> {
    console.log("[TikTok Blocker] Initializing...");

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

    // Create counter display
    this.createCounterDisplay();

    // Observe existing videos once
    this.observeExistingVideos();

    // Watch for new videos being added to the DOM
    this.watchForNewVideos();

    console.log("[TikTok Blocker] Started successfully");
  }

  private createIntersectionObserver(): void {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        console.log(
          `[TikTok Blocker] IntersectionObserver callback fired with ${entries.length} entries`
        );
        entries.forEach((entry) => {
          console.log("[TikTok Blocker] Intersection entry:", {
            isIntersecting: entry.isIntersecting,
            intersectionRatio: entry.intersectionRatio,
            target: entry.target.className.substring(0, 50),
            boundingRect: {
              top: entry.boundingClientRect.top,
              bottom: entry.boundingClientRect.bottom,
              height: entry.boundingClientRect.height,
            },
          });

          if (entry.isIntersecting) {
            const videoContainer = entry.target as HTMLElement;
            console.log("[TikTok Blocker] Container is intersecting, calling handleVideoInView");
            this.handleVideoInView(videoContainer);
          } else {
            console.log("[TikTok Blocker] Container is NOT intersecting, skipping");
          }
        });
      },
      {
        threshold: 0.5, // Trigger when 50% of the video is visible
        rootMargin: "0px",
      }
    );
    console.log("[TikTok Blocker] IntersectionObserver created with threshold 0.5");
  }

  private createCounterDisplay(): void {
    // Create the counter element
    this.counterElement = document.createElement("div");
    this.counterElement.className = "tiktok-counter-display";
    this.counterElement.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 20px;
      border-radius: 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 16px;
      font-weight: 600;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.3s ease;
    `;

    const icon = document.createElement("span");
    icon.textContent = "🎬";
    icon.style.fontSize = "20px";

    const countText = document.createElement("span");
    countText.className = "tiktok-counter-text";
    countText.textContent = `TikToks: ${this.videosWatchedCount}`;

    this.counterElement.appendChild(icon);
    this.counterElement.appendChild(countText);

    // Add to the page
    document.body.appendChild(this.counterElement);

    console.log("[TikTok Blocker] Counter display created");
  }

  private updateCounterDisplay(): void {
    if (this.counterElement) {
      const countText = this.counterElement.querySelector(".tiktok-counter-text");
      if (countText) {
        countText.textContent = `TikToks: ${this.videosWatchedCount}`;

        // Add a subtle animation on update
        this.counterElement.style.transform = "scale(1.1)";
        setTimeout(() => {
          if (this.counterElement) {
            this.counterElement.style.transform = "scale(1)";
          }
        }, 200);
      }
    }
  }

  private observeExistingVideos(): void {
    // Find TikTok video containers
    const videoContainers = this.findVideoContainers();

    console.log(
      `[TikTok Blocker] observeExistingVideos called - found ${videoContainers.length} containers, currently observing ${this.observedContainers.size}`
    );

    let newObservations = 0;
    videoContainers.forEach((container) => {
      const containerId = (container as any).__tiktokBlockerId || "unknown";

      // Check if we're already observing this container
      if (!this.observedContainers.has(container)) {
        if (this.intersectionObserver) {
          this.intersectionObserver.observe(container);
          this.observedContainers.add(container);
          newObservations++;
          console.log(
            `[TikTok Blocker] ✓ Now observing NEW container [${containerId}]:`,
            container.tagName,
            container.className.substring(0, 50)
          );
        }
      } else {
        // Already observing, but let's check if video is in view
        const rect = container.getBoundingClientRect();
        const isInView = rect.top < window.innerHeight && rect.bottom > 0;
        console.log(
          `[TikTok Blocker] Container [${containerId}] already observed, isInView: ${isInView}`
        );
      }
    });

    if (newObservations > 0) {
      console.log(
        `[TikTok Blocker] ✓✓ Added ${newObservations} new containers for observation (total observed: ${this.observedContainers.size})`
      );
    } else {
      console.log(
        `[TikTok Blocker] No new containers to observe (total observed: ${this.observedContainers.size})`
      );
    }
  }

  private findVideoContainers(): HTMLElement[] {
    const containers: HTMLElement[] = [];

    // TikTok's actual structure: #column-list-container > article[class*="ArticleItemContainer"]
    // Each article has a unique data-scroll-index attribute

    // Method 1: Find all article elements with ArticleItemContainer class
    const articles = document.querySelectorAll('article[class*="ArticleItemContainer"]');
    console.log(
      `[TikTok Blocker] Found ${articles.length} article elements with ArticleItemContainer`
    );

    articles.forEach((article) => {
      const scrollIndex = article.getAttribute("data-scroll-index");
      const video = article.querySelector("video");

      if (video) {
        console.log(`[TikTok Blocker] Found video in article with scroll-index: ${scrollIndex}`, {
          hasVideo: true,
          videoSrc: (video as HTMLVideoElement).src.substring(0, 80),
          articleClasses: article.className.substring(0, 80),
        });

        // Use the article element as the container
        if (!containers.includes(article as HTMLElement)) {
          // Store the scroll index as the container ID for easy tracking
          (article as any).__tiktokBlockerId = `article-${scrollIndex}`;
          containers.push(article as HTMLElement);
        }
      } else {
        console.log(`[TikTok Blocker] Article with scroll-index ${scrollIndex} has no video yet`);
      }
    });

    // Method 2: Fallback - look in column-list-container
    if (containers.length === 0) {
      const columnList = document.getElementById("column-list-container");
      if (columnList) {
        console.log(`[TikTok Blocker] Fallback: Found column-list-container`);
        const articlesInColumn = columnList.querySelectorAll("article");
        console.log(
          `[TikTok Blocker] Found ${articlesInColumn.length} articles in column-list-container`
        );

        articlesInColumn.forEach((article) => {
          const video = article.querySelector("video");
          const scrollIndex = article.getAttribute("data-scroll-index") || "unknown";

          if (video && !containers.includes(article as HTMLElement)) {
            (article as any).__tiktokBlockerId = `article-${scrollIndex}`;
            containers.push(article as HTMLElement);
            console.log(
              `[TikTok Blocker] Added article with scroll-index ${scrollIndex} from column-list`
            );
          }
        });
      }
    }

    // Method 3: Last resort fallback - find by video elements
    if (containers.length === 0) {
      console.log(`[TikTok Blocker] Last resort: searching for videos and finding parent articles`);
      const videos = document.querySelectorAll("video");

      videos.forEach((video) => {
        // Find the closest article element
        const article = video.closest("article");
        if (article && !containers.includes(article as HTMLElement)) {
          const scrollIndex = article.getAttribute("data-scroll-index") || "unknown";
          (article as any).__tiktokBlockerId = `article-${scrollIndex}`;
          containers.push(article as HTMLElement);
          console.log(
            `[TikTok Blocker] Added article with scroll-index ${scrollIndex} via video search`
          );
        }
      });
    }

    console.log(`[TikTok Blocker] Found ${containers.length} total article containers`);
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
              console.log(
                `[TikTok Blocker] Mutation detected: new article${
                  hasArticles ? "s" : ""
                } added to DOM`
              );
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
          console.log("[TikTok Blocker] Debounced: calling observeExistingVideos");
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
      console.log("[TikTok Blocker] Periodic check triggered");
      this.observeExistingVideos();
    }, 2000); // Check every 2 seconds

    console.log("[TikTok Blocker] MutationObserver and periodic check setup complete");
  }

  private handleVideoInView(container: HTMLElement): void {
    const containerId = (container as any).__tiktokBlockerId || "unknown";
    console.log(
      `[TikTok Blocker] ========== handleVideoInView called for [${containerId}] ==========`
    );

    // Check if we've already processed this container
    if (this.processedContainers.has(container)) {
      console.log(`[TikTok Blocker] Container [${containerId}] already processed, skipping`);
      return;
    }

    // Mark this container as processed
    this.processedContainers.add(container);
    console.log(`[TikTok Blocker] ✓ Marked container [${containerId}] as processed`);

    // Increment counter and update storage
    this.videosWatchedCount++;
    setNumberWatchedShortVids("tiktok", this.videosWatchedCount);
    this.updateCounterDisplay();

    // Find the video element within this container
    const video = container.querySelector("video") as HTMLVideoElement;

    if (!video) {
      console.log(`[TikTok Blocker] No video found in container [${containerId}]`);
      return;
    }

    console.log(`[TikTok Blocker] Found video in container [${containerId}]:`, {
      src: video.src.substring(0, 80),
      paused: video.paused,
      readyState: video.readyState,
      currentTime: video.currentTime,
    });

    // Block the video if it's not already blocked
    if (!this.blockedVideos.has(container)) {
      console.log(`[TikTok Blocker] Blocking video in container [${containerId}]...`);
      this.blockVideo(container, video);
    } else {
      console.log(`[TikTok Blocker] Container [${containerId}] already has an active block`);
    }
  }

  private blockVideo(container: HTMLElement, video: HTMLVideoElement): void {
    const containerId = (container as any).__tiktokBlockerId || "unknown";
    console.log(
      `[TikTok Blocker] ========== blockVideo called for article [${containerId}] ==========`
    );

    // Pause the video immediately
    if (!video.paused) {
      console.log("[TikTok Blocker] Pausing video...");
      video.pause();
      console.log("[TikTok Blocker] Video paused, currentTime:", video.currentTime);
    } else {
      console.log("[TikTok Blocker] Video already paused");
    }

    // Reset to beginning
    console.log("[TikTok Blocker] Resetting video to beginning");
    video.currentTime = 0;

    // Calculate unblock time
    const unblockTime = Date.now() + this.config.blockDuration * 1000;

    console.log("[TikTok Blocker] Block duration:", this.config.blockDuration, "seconds");
    console.log("[TikTok Blocker] Unblock time:", new Date(unblockTime).toLocaleTimeString());

    // Store blocked video info
    const blockedVideo: BlockedVideo = {
      element: container,
      unblockTime: unblockTime,
    };
    this.blockedVideos.set(container, blockedVideo);

    // Add event listeners to prevent playback
    const preventPlay = (e: Event) => {
      const now = Date.now();
      const remaining = Math.ceil((unblockTime - now) / 1000);

      if (now < unblockTime) {
        console.log(
          `[TikTok Blocker] Prevented play attempt - ${remaining}s remaining for article [${containerId}]`
        );
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
        console.log(`[TikTok Blocker] Prevented click on video for article [${containerId}]`);
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    video.addEventListener("click", preventClick, true);

    console.log("[TikTok Blocker] Event listeners attached to video element");

    // Set up unblock timer - STORE THE TIMER ID
    const unblockTimer = window.setTimeout(() => {
      console.log(`[TikTok Blocker] ========== UNBLOCKING article [${containerId}] ==========`);

      // Remove event listeners
      video.removeEventListener("play", preventPlay, true);
      video.removeEventListener("playing", preventPlay, true);
      video.removeEventListener("click", preventClick, true);

      console.log("[TikTok Blocker] Event listeners removed");

      // Remove from blocked videos
      this.blockedVideos.delete(container);

      console.log("[TikTok Blocker] Attempting to auto-play video...");

      // Try to start playing the video
      const attemptPlay = () => {
        const currentVideo = container.querySelector("video") as HTMLVideoElement;
        if (currentVideo) {
          console.log(
            "[TikTok Blocker] Found video for auto-play, paused:",
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
                console.log("[TikTok Blocker] ✓ Auto-play successful!");
              })
              .catch((error) => {
                console.error("[TikTok Blocker] ✗ Auto-play failed:", error);
                // Try clicking the video as fallback
                currentVideo.click();
              });
          } else {
            // Wait for video to be ready
            console.log("[TikTok Blocker] Video not ready, waiting for loadeddata event");
            currentVideo.addEventListener(
              "loadeddata",
              () => {
                currentVideo
                  .play()
                  .then(() => {
                    console.log("[TikTok Blocker] ✓ Auto-play successful after loadeddata!");
                  })
                  .catch((error) => {
                    console.error("[TikTok Blocker] ✗ Auto-play failed after loadeddata:", error);
                  });
              },
              { once: true }
            );
          }
        } else {
          console.log("[TikTok Blocker] Video element not found for auto-play");
        }
      };

      // Small delay to ensure all event listeners are cleaned up
      setTimeout(attemptPlay, 100);
    }, this.config.blockDuration * 1000);

    // Store the timer ID in the blockedVideo object
    blockedVideo.unblockTimer = unblockTimer;

    // Add visual indicator (optional)
    this.addBlockIndicator(container, unblockTime);

    console.log(
      `[TikTok Blocker] ========== BLOCKING SETUP COMPLETE for article [${containerId}] ==========`
    );
  }

  private addBlockIndicator(container: HTMLElement, unblockTime: number): void {
    // Find the video element first
    const video = container.querySelector("video");
    if (!video) {
      console.log("[TikTok Blocker] No video found for overlay");
      return;
    }
    // Check if overlay already exists to prevent duplicates
    const existingOverlay = container.querySelector(".tiktok-blocker-overlay");
    if (existingOverlay) {
      console.log("[TikTok Blocker] Overlay already exists, removing old one");
      existingOverlay.remove();
    }

    // Create a visual overlay to show blocking is active
    const overlay = document.createElement("div");
    overlay.className = "tiktok-blocker-overlay";
    overlay.style.cssText = `
      position: absolute !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      background: rgba(0, 0, 0, 0.85) !important;
      color: white !important;
      padding: 20px 30px !important;
      border-radius: 12px !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
      font-size: 16px !important;
      font-weight: 600 !important;
      z-index: 999999 !important;
      pointer-events: none !important;
      display: flex !important;
      align-items: center !important;
      gap: 12px !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
    `;

    const icon = document.createElement("span");
    icon.textContent = "⏸️";
    icon.style.fontSize = "24px";

    const text = document.createElement("span");
    text.className = "tiktok-blocker-text";

    overlay.appendChild(icon);
    overlay.appendChild(text);

    // Ensure video has relative positioning for absolute overlay
    const videoStyle = window.getComputedStyle(video);
    if (videoStyle.position === "static") {
      video.style.position = "relative";
    }

    // Append to video element so it's perfectly centered on the video
    video.parentElement?.appendChild(overlay);

    console.log("[TikTok Blocker] Overlay added to video's parent");

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
        text.textContent = `Wait ${remaining}s...`;
        animationFrameId = requestAnimationFrame(updateCountdown);
      } else {
        console.log("[TikTok Blocker] Countdown complete, removing overlay");
        cancelAnimationFrame(animationFrameId);
        overlay.remove();
      }
    };

    updateCountdown();

    // Failsafe: Force remove overlay after block duration + buffer
    setTimeout(() => {
      if (overlay.parentElement) {
        console.log("[TikTok Blocker] Failsafe overlay removal triggered");
        overlay.remove();
      }
    }, this.config.blockDuration * 1000 + 500);
  }

  public destroy(): void {
    console.log("[TikTok Blocker] Destroying blocker...");

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

    // Remove the counter display
    if (this.counterElement && this.counterElement.parentElement) {
      this.counterElement.remove();
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

    console.log("[TikTok Blocker] Destroyed successfully");
  }
}

function createBlocker() {
  destroyBlocker();
  if (isOnTikTok() && CONFIG.enabled) {
    BLOCKER = new TikTokBlocker(CONFIG);
  }
}

function destroyBlocker() {
  if (BLOCKER) {
    BLOCKER.destroy();
    BLOCKER = null;
  }
}

function blockShortForm() {
  createBlocker();
  // Handle navigation changes (for SPAs like Instagram)
  const navigationObserver = new MutationObserver(() => {
    if (!CONFIG.enabled) {
      destroyBlocker();
      return;
    }
    if (!isOnTikTok()) {
      destroyBlocker();
      return;
    }
    if (BLOCKER) {
      return;
    }
    setTimeout(() => {
      if (BLOCKER) {
        return;
      }
      createBlocker();
    }, 500);
    console.log("NEW InstagramReelsBlocker CREATED");
  });

  // Wait for body to exist before starting navigationObserver
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
}

async function loadContentScript() {
  condDisplayFocusDOM();
  CONFIG = await getBlockerConfig(PLATFORM);
  blockShortForm();
}

loadContentScript();

const unsubscribe = blockerConfigOnChangeListener(PLATFORM, (newConfig) => {
  CONFIG = newConfig;
  destroyBlocker();
  createBlocker();
});

window.addEventListener("beforeunload", unsubscribe);
window.addEventListener("beforeunload", () => {
  destroyBlocker();
});
