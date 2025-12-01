import { PLATFORMS, type Platform } from "@/types";

export function setReelLimitReachedDOM(reelPlatform: Platform): void {
  const html = buildBlockedPageHTML(reelPlatform);
  const blob = new Blob([html], { type: "text/html" });
  const blobUrl = URL.createObjectURL(blob);
  window.location.replace(blobUrl);
}

function buildBlockedPageHTML(reelPlatform: Platform): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Video Limit Reached</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .container {
      background: white;
      border-radius: 20px;
      padding: 60px 40px;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      text-align: center;
      animation: slideIn 0.5s ease-out;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 30px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
    }

    h1 {
      font-size: 28px;
      color: #2d3748;
      margin-bottom: 15px;
      font-weight: 700;
    }

    .platform {
      font-size: 18px;
      color: #667eea;
      margin-bottom: 20px;
      font-weight: 600;
    }

    p {
      font-size: 16px;
      color: #4a5568;
      line-height: 1.6;
      margin-bottom: 15px;
    }

    .tip {
      margin-top: 30px;
      padding: 20px;
      background: #edf2f7;
      border-radius: 10px;
      font-size: 14px;
      color: #4a5568;
      border-left: 4px solid #667eea;
      text-align: left;
    }

    .tip strong {
      color: #2d3748;
      display: block;
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">😫</div>
    <h1>Video Limit Reached</h1>
    <div class="platform">${PLATFORMS[reelPlatform]}</div>
    <p>You've reached your daily limit for ${PLATFORMS[reelPlatform]}. Take a break and focus on what matters!</p>
    <div class="tip">
      <strong>💡 What to do instead:</strong>
      Take a walk, read a book, connect with friends, or work on your goals. 
      Your future self will thank you!
    </div>
  </div>
</body>
</html>`;
}
