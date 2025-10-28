// TikTok Content Script
// Blocks video playback for 5 seconds after scrolling to a new video
import { getBlockerConfig } from "../lib/storage";
import type { BlockerConfig } from "../types";

interface BlockedVideo {
  element: HTMLElement;
  unblockTime: number;
  observer?: IntersectionObserver;
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

  constructor(config: BlockerConfig) {
    this.config = config;
    this.init();
  }

  private init(): void {
    console.log("[TikTok Blocker] Initializing...");

    // Wait for DOM to be ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.start());
    } else {
      this.start();
    }
  }

  private start(): void {
    // Create intersection observer to detect when videos come into view
    this.createIntersectionObserver();

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
            const hasArticle = element.querySelector('article[class*="ArticleItemContainer"]');

            // Also check for video elements as before
            const hasVideo = element.tagName === "VIDEO" || element.querySelector("video");

            if (isArticle || hasArticle || hasVideo) {
              shouldReobserve = true;

              const scrollIndex = isArticle
                ? element.getAttribute("data-scroll-index")
                : (hasArticle as HTMLElement)?.getAttribute("data-scroll-index");

              console.log("[TikTok Blocker] Detected new content:", {
                isArticle,
                hasArticle: !!hasArticle,
                hasVideo,
                scrollIndex,
                tag: element.tagName,
                classes: element.className.substring(0, 50),
              });
            }
          }
        });
      });

      if (shouldReobserve) {
        // Cancel any pending observation
        if (this.observeDebounceTimer !== null) {
          clearTimeout(this.observeDebounceTimer);
        }

        // Debounce to avoid excessive checks
        console.log(
          "[TikTok Blocker] New article/video content detected, scheduling observation..."
        );
        this.observeDebounceTimer = window.setTimeout(() => {
          this.observeDebounceTimer = null;
          console.log("[TikTok Blocker] Running scheduled observation of new containers");
          this.observeExistingVideos();
        }, 200); // Reduced from 300ms for faster detection
      }
    });

    // Watch the column-list-container specifically if it exists
    const columnList = document.getElementById("column-list-container");
    if (columnList) {
      console.log("[TikTok Blocker] Found column-list-container, observing it directly");
      this.mainObserver.observe(columnList, {
        childList: true,
        subtree: false, // Only direct children (articles)
        attributes: false,
        characterData: false,
      });
    }

    // Also observe the whole body as fallback
    this.mainObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false,
    });

    // Also do periodic checks for new videos (safety net)
    this.periodicCheckInterval = window.setInterval(() => {
      console.log("[TikTok Blocker] Periodic check for new videos...");
      this.observeExistingVideos();
    }, 2000); // Check every 2 seconds
  }

  private handleVideoInView(videoContainer: HTMLElement): void {
    const scrollIndex = videoContainer.getAttribute("data-scroll-index") || "unknown";
    const containerId = (videoContainer as any).__tiktokBlockerId || `article-${scrollIndex}`;
    console.log(
      `[TikTok Blocker] === handleVideoInView called for article [${containerId}] with scroll-index: ${scrollIndex} ===`
    );

    // Check if this container (article) has already been processed
    if (this.processedContainers.has(videoContainer)) {
      console.log(
        `[TikTok Blocker] ❌ Article [${containerId}] (scroll-index: ${scrollIndex}) already processed, skipping`
      );
      return;
    }

    // Check if this video is already blocked or being processed
    if (this.blockedVideos.has(videoContainer)) {
      console.log(`[TikTok Blocker] Article [${containerId}] already blocked, skipping`);
      return;
    }

    // Look for video in BasePlayerContainer first (most reliable)
    let video = videoContainer.querySelector('div[class*="BasePlayerContainer"] video');

    // Fallback to any video element in the article
    if (!video) {
      video = videoContainer.querySelector("video");
    }

    if (!video) {
      console.log(
        `[TikTok Blocker] ❌ No video found in article [${containerId}] with scroll-index ${scrollIndex}`
      );
      return;
    }

    console.log(`[TikTok Blocker] Found video in article [${containerId}]:`, {
      scrollIndex,
      paused: (video as HTMLVideoElement).paused,
      currentTime: (video as HTMLVideoElement).currentTime,
      src: (video as HTMLVideoElement).src.substring(0, 80),
      readyState: (video as HTMLVideoElement).readyState,
    });

    // Mark this container (article) as processed
    this.processedContainers.add(videoContainer);
    console.log(
      `[TikTok Blocker] ✓✓✓ NEW ARTICLE [${containerId}] (scroll-index: ${scrollIndex}), blocking video for`,
      this.config.blockDuration,
      "seconds"
    );
    console.log(
      `[TikTok Blocker] Total articles processed so far: ${this.processedContainers.size}`
    );

    // Block the video
    this.blockVideo(video as HTMLVideoElement, videoContainer);
  }

  private blockVideo(video: HTMLVideoElement, container: HTMLElement): void {
    const scrollIndex = container.getAttribute("data-scroll-index") || "unknown";
    const containerId = (container as any).__tiktokBlockerId || `article-${scrollIndex}`;

    // Check once more if already blocked (race condition protection)
    if (this.blockedVideos.has(container)) {
      console.log(
        `[TikTok Blocker] Article [${containerId}] already blocked in blockVideo, aborting`
      );
      return;
    }

    const unblockTime = Date.now() + this.config.blockDuration * 1000;

    // Store the blocked video IMMEDIATELY to prevent race conditions
    this.blockedVideos.set(container, {
      element: container,
      unblockTime: unblockTime,
    });

    console.log(
      `[TikTok Blocker] ========== BLOCKING VIDEO in article [${containerId}] ==========`
    );
    console.log(
      `[TikTok Blocker] Block duration: ${this.config.blockDuration}s, autoPlayAfterBlock: ${this.config.autoPlayAfterBlock}`
    );

    console.log("[TikTok Blocker] Video state BEFORE blocking:", {
      paused: video.paused,
      currentTime: video.currentTime,
      muted: video.muted,
      volume: video.volume,
      readyState: video.readyState,
      src: video.src.substring(0, 80),
    });

    // Find the BasePlayerContainer and hide its image overlay
    const basePlayerContainer = video.closest('div[class*="BasePlayerContainer"]');
    let overlayImage: HTMLImageElement | null = null;
    let originalImageDisplay = "";

    if (basePlayerContainer) {
      overlayImage = basePlayerContainer.querySelector("img");
      if (overlayImage) {
        console.log("[TikTok Blocker] Found overlay image, hiding it");
        originalImageDisplay = overlayImage.style.display;
        overlayImage.style.display = "none";
      } else {
        console.log("[TikTok Blocker] No overlay image found in BasePlayerContainer");
      }
    } else {
      console.log("[TikTok Blocker] No BasePlayerContainer found");
    }

    // Store original muted state
    const originalMuted = video.muted;
    console.log("[TikTok Blocker] Original muted state:", originalMuted);

    // Pause the video immediately and mute it
    try {
      video.pause();
      console.log("[TikTok Blocker] ✓ Called video.pause()");
    } catch (e) {
      console.error("[TikTok Blocker] ✗ Error calling video.pause():", e);
    }

    try {
      video.muted = true;
      console.log("[TikTok Blocker] ✓ Set video.muted = true");
    } catch (e) {
      console.error("[TikTok Blocker] ✗ Error setting video.muted:", e);
    }

    try {
      video.currentTime = 0;
      console.log("[TikTok Blocker] ✓ Set video.currentTime = 0");
    } catch (e) {
      console.error("[TikTok Blocker] ✗ Error setting video.currentTime:", e);
    }

    console.log("[TikTok Blocker] Video state AFTER initial blocking:", {
      paused: video.paused,
      currentTime: video.currentTime,
      muted: video.muted,
    });

    // Prevent play events during block period
    const preventPlay = (e: Event) => {
      const timeRemaining = unblockTime - Date.now();
      if (timeRemaining > 0) {
        console.log(
          `[TikTok Blocker] [${containerId}] Preventing play event, time remaining: ${timeRemaining}ms`
        );
        e.preventDefault();
        e.stopImmediatePropagation();
        video.pause();
        video.muted = true;
      }
    };

    // Prevent volume/mute changes during block
    const preventVolumeChange = (e: Event) => {
      const timeRemaining = unblockTime - Date.now();
      if (timeRemaining > 0) {
        console.log(`[TikTok Blocker] [${containerId}] Preventing volume change`);
        e.preventDefault();
        e.stopImmediatePropagation();
        video.muted = true;
      }
    };

    // Prevent time updates during block (keep at 0)
    const preventTimeUpdate = (e: Event) => {
      const timeRemaining = unblockTime - Date.now();
      if (timeRemaining > 0 && video.currentTime > 0.1) {
        console.log(
          `[TikTok Blocker] [${containerId}] Resetting video time to 0 (was ${video.currentTime})`
        );
        video.currentTime = 0;
      }
    };

    // Use capture phase to intercept before TikTok's handlers
    video.addEventListener("play", preventPlay, { capture: true });
    video.addEventListener("playing", preventPlay, { capture: true });
    video.addEventListener("volumechange", preventVolumeChange, { capture: true });
    video.addEventListener("timeupdate", preventTimeUpdate, { capture: true });
    console.log("[TikTok Blocker] ✓ Added all event listeners");

    // Also try to prevent play via setting properties
    let checkCount = 0;
    const checkInterval = setInterval(() => {
      const timeRemaining = unblockTime - Date.now();
      checkCount++;

      if (timeRemaining > 0) {
        let changes = [];

        if (!video.paused) {
          console.log(
            `[TikTok Blocker] [${containerId}] Check #${checkCount}: Video playing detected, pausing`
          );
          video.pause();
          changes.push("paused");
        }
        if (!video.muted) {
          console.log(
            `[TikTok Blocker] [${containerId}] Check #${checkCount}: Video unmuted detected, muting`
          );
          video.muted = true;
          changes.push("muted");
        }
        if (video.currentTime > 0.1) {
          console.log(
            `[TikTok Blocker] [${containerId}] Check #${checkCount}: Video progressed to ${video.currentTime}, resetting to 0`
          );
          video.currentTime = 0;
          changes.push("reset time");
        }

        // Keep overlay image hidden
        if (overlayImage && overlayImage.style.display !== "none") {
          console.log(
            `[TikTok Blocker] [${containerId}] Check #${checkCount}: Overlay image reappeared, hiding again`
          );
          overlayImage.style.display = "none";
          changes.push("hid overlay");
        }

        if (changes.length === 0 && checkCount % 10 === 0) {
          console.log(
            `[TikTok Blocker] [${containerId}] Check #${checkCount}: Video still blocked correctly (${Math.ceil(
              timeRemaining / 1000
            )}s remaining)`
          );
        }
      } else {
        clearInterval(checkInterval);
      }
    }, 100);

    // Set timeout to unblock
    setTimeout(() => {
      console.log(
        `[TikTok Blocker] ========== UNBLOCKING VIDEO in article [${containerId}] ==========`
      );

      clearInterval(checkInterval);
      video.removeEventListener("play", preventPlay, { capture: true });
      video.removeEventListener("playing", preventPlay, { capture: true });
      video.removeEventListener("volumechange", preventVolumeChange, { capture: true });
      video.removeEventListener("timeupdate", preventTimeUpdate, { capture: true });

      // Restore original muted state
      video.muted = originalMuted;
      console.log(`[TikTok Blocker] Restored muted state to: ${originalMuted}`);

      // Restore overlay image display
      if (overlayImage) {
        console.log("[TikTok Blocker] Restoring overlay image display");
        overlayImage.style.display = originalImageDisplay;
      }

      this.blockedVideos.delete(container);
      console.log("[TikTok Blocker] ✓ Video unblocked, playback allowed");

      // Auto-play only if configured
      if (this.config.autoPlayAfterBlock) {
        console.log("[TikTok Blocker] Auto-play enabled, attempting to play...");

        // Try to play immediately
        const attemptPlay = () => {
          const currentVideo = container.querySelector("video");
          if (currentVideo) {
            console.log("[TikTok Blocker] Video element found, calling play()");
            console.log(
              "[TikTok Blocker] Video paused:",
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
      }
    }, this.config.blockDuration * 1000);

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
      position: fixed !important;
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

    // Append to body instead of videoWrapper to avoid positioning issues
    document.body.appendChild(overlay);

    console.log("[TikTok Blocker] Overlay added to body");

    // Store overlay reference for cleanup
    const blockedVideo = this.blockedVideos.get(container);
    if (blockedVideo) {
      (blockedVideo as any).overlay = overlay;
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
    if (this.mainObserver) {
      this.mainObserver.disconnect();
    }

    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }

    if (this.observeDebounceTimer !== null) {
      clearTimeout(this.observeDebounceTimer);
    }

    if (this.periodicCheckInterval !== null) {
      clearInterval(this.periodicCheckInterval);
    }

    this.blockedVideos.clear();
    this.observedContainers.clear();
    this.processedContainers.clear();
    console.log("[TikTok Blocker] Destroyed");
  }
}

// Initialize the blocker
let tiktokBlocker: TikTokBlocker | null = null;
(async () => {
  // Configuration - You can modify these settings
  const config: BlockerConfig = await getBlockerConfig("tiktok");

  // Start blocking when on TikTok
  if (window.location.hostname.includes("tiktok.com")) {
    tiktokBlocker = new TikTokBlocker(config);
  }

  // Example: Update configuration dynamically
  // This can be called from your extension's popup or options page
  (window as any).updateBlockerConfig = (newConfig: BlockerConfig) => {
    if (tiktokBlocker) {
      tiktokBlocker.destroy();
    }
    tiktokBlocker = new TikTokBlocker({ ...config, ...newConfig });
    console.log("[TikTok Blocker] Configuration updated:", newConfig);
  };

  // Handle navigation changes (for SPAs like TikTok)
  let lastUrl = window.location.href;
  const navigationObserver = new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;

      // Reinitialize if navigating to/from videos
      if (tiktokBlocker) {
        tiktokBlocker.destroy();
      }

      if (window.location.hostname.includes("tiktok.com")) {
        setTimeout(() => {
          tiktokBlocker = new TikTokBlocker(config);
        }, 500); // Small delay to let TikTok load
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
  if (tiktokBlocker) {
    tiktokBlocker.destroy();
  }
});
