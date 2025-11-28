# 🏗️ Architecture: Single Source, Dual Output

## The Philosophy

This project follows a **"write once, build twice"** approach:

```
    ┌─────────────┐
    │   src/      │  ← Your code (ONE source folder)
    │  (Unified)  │
    └──────┬──────┘
           │
           │ npm run build
           │
    ┌──────┴───────────┐
    │                  │
    ▼                  ▼
┌─────────┐      ┌──────────┐
│distChrome/│    │distFirefox/│  ← Generated outputs
└─────────┘      └──────────┘
```

## What This Means

### ✅ You Edit
- **One `src/` folder** - All your code
- **One set of components** - React/Preact UI
- **One set of content scripts** - YouTube, Instagram, TikTok
- **One service worker** - Background logic
- **One set of manifests** - In `manifests/` folder

### ✅ Build Scripts Handle
- Adding browser polyfill imports
- Bundling with Vite/Rolldown
- Generating browser-specific manifests
- Creating optimized outputs
- Copying assets

### ✅ You Never Touch
- `distChrome/` - Auto-generated, git-ignored
- `distFirefox/` - Auto-generated, git-ignored
- `*.zip` files - Auto-generated from dist folders

## The Source Structure

```
ScrollRotCrossBrowser/
│
├── src/                          ← YOUR CODE (edit this!)
│   ├── content-scripts/          
│   │   ├── youtube/
│   │   ├── instagram/
│   │   └── tiktok/
│   ├── components/               
│   ├── lib/
│   │   ├── setup-browser.ts      ← Polyfill initialization
│   │   └── storage/              
│   ├── popupPage/                
│   ├── optionsPage/              
│   └── service-workers/          
│
├── manifests/                    ← MANIFEST CONFIGS (edit these!)
│   ├── manifest.base.json        ← Shared settings
│   ├── manifest.chrome.json      ← Chrome-specific
│   └── manifest.firefox.json     ← Firefox-specific
│
├── public/assets/                ← ASSETS (edit these!)
│
├── build.mjs                     ← BUILD LOGIC (don't need to edit)
├── package.json                  ← SCRIPTS & DEPS
│
└── [Generated at build time]
    ├── distChrome/               ← DON'T EDIT (auto-generated)
    ├── distFirefox/              ← DON'T EDIT (auto-generated)
    ├── ScrollRot-chrome.zip      ← DON'T EDIT (auto-generated)
    └── ScrollRot-firefox.zip     ← DON'T EDIT (auto-generated)
```

## How the Build Works

### Step 1: You Write Code
```typescript
// src/content-scripts/youtube/youtube.ts
import "@/lib/setup-browser";  // ← Polyfill loaded once
import { getBlockerConfig } from "@/lib/storage";

// Your code uses browser.* everywhere
const config = await browser.storage.local.get('config');
```

### Step 2: Build for Chrome
```bash
npm run build:chrome
```

The build script:
1. ✅ Bundles all UI code with Vite
2. ✅ Bundles each content script separately
3. ✅ Includes the browser polyfill (wraps `chrome.*`)
4. ✅ Merges `manifest.base.json` + `manifest.chrome.json`
5. ✅ Copies assets to `distChrome/`
6. ✅ Outputs ready-to-load extension

### Step 3: Build for Firefox
```bash
npm run build:firefox
```

The build script:
1. ✅ Bundles all UI code with Vite (same as Chrome)
2. ✅ Bundles each content script separately
3. ✅ Includes the browser polyfill (uses native `browser.*`)
4. ✅ Merges `manifest.base.json` + `manifest.firefox.json` (adds `browser_specific_settings`)
5. ✅ Copies assets to `distFirefox/`
6. ✅ Outputs ready-to-load extension

## Key Insight: The Polyfill Magic

The `webextension-polyfill` makes this work:

```typescript
// Your code (same everywhere)
await browser.storage.local.get('key');

// In Chrome build → polyfill wraps
chrome.storage.local.get('key', callback) → Promise

// In Firefox build → polyfill uses native
browser.storage.local.get('key') → Promise (already exists!)
```

## Development Workflow

```bash
# 1. Edit your source code
vim src/components/FocusTimer/FocusTimerWidget.tsx

# 2. Build for testing
npm run build:chrome

# 3. Reload extension in Chrome
# (Browser shows reload button)

# 4. Test changes

# 5. Build for Firefox when ready
npm run build:firefox

# 6. Test in Firefox

# 7. Build both for production
npm run build
npm run zip
```

## What Makes This Clean

### ❌ You DON'T:
- Duplicate source code
- Maintain separate codebases
- Check which browser is running
- Write conditional browser logic
- Manually copy files between folders
- Track build outputs in git

### ✅ You DO:
- Write code once in `src/`
- Use `browser.*` API everywhere
- Run build commands
- Get optimized outputs for each browser
- Version control only source code

## The Manifest System

```
manifest.base.json          manifest.chrome.json
       +                           +
       │                           │
       └────────►MERGE◄────────────┘
                  │
                  ▼
        distChrome/manifest.json


manifest.base.json          manifest.firefox.json
       +                           +
       │                           │
       └────────►MERGE◄────────────┘
                  │
                  ▼
        distFirefox/manifest.json
        (includes browser_specific_settings)
```

## Benefits

1. **Single Source of Truth**: All logic in one place
2. **Type Safety**: TypeScript across the board
3. **No Duplication**: DRY principle maintained
4. **Easy Updates**: Change once, build twice
5. **Clean Git History**: Only source code versioned
6. **Fast Iterations**: Build only what you're testing
7. **Professional Setup**: Industry-standard approach

## What You Commit to Git

```
✅ src/                    ← Source code
✅ manifests/              ← Manifest configs
✅ public/                 ← Assets
✅ build.mjs               ← Build logic
✅ package.json            ← Dependencies
✅ *.md                    ← Documentation

❌ distChrome/             ← Generated (in .gitignore)
❌ distFirefox/            ← Generated (in .gitignore)
❌ *.zip                   ← Generated (in .gitignore)
❌ node_modules/           ← Dependencies (in .gitignore)
```

## Summary

This is the modern, professional way to build cross-browser extensions:

- ✨ **One source folder**
- ✨ **Multiple build targets**
- ✨ **Automated adaptation**
- ✨ **Clean separation**
- ✨ **Easy maintenance**

You focus on writing great code. The build system handles making it work everywhere! 🚀
