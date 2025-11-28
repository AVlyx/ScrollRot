# ScrollRot - Delays on Short-Form Feeds

ScrollRot is an open-source Firefox extension that delays automatic scrolling on short-form content feeds.

---

## Source Code

All code is open-source and available on GitHub:

```bash
git clone https://github.com/AVlyx/ScrollRot.git
```

---

## Build Instructions

1. **Node.js** and **npm** versions:

```bash
node --version   # v22.19.0
npm --version    # 11.6.0
```

2. Install dependencies:

```bash
npm install
```

3. Build the extension:

```bash
npm run build:firefox   # Firefox
npm run build:chrome    # Chrome
npm run build           # Both
```

The built extension can then be loaded into Firefox or Chrome for testing.

- Firefox code is located in `distFirefox`
- Chrome code is located in `distChrome`

---

## Platform Compatibility

Developed and tested on Windows.
