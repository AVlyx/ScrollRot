// import { getAuthToken, authenticateUser } from "@/lib/auth-stripePayments";
// import type { User } from "firebase/auth/web-extension";

// // Define the message interface
// interface AuthMessage {
//   type: "AUTHENTICATE_USER";
// }

// // Define the response interface
// interface AuthResponse {
//   success: boolean;
//   user?: User;
//   error?: string;
// }

// // Handle service worker install or activation
// chrome.runtime.onInstalled.addListener(() => {
//   console.log("Service worker installed.");
// });

// // Listen for messages
// chrome.runtime.onMessage.addListener(
//   (message: AuthMessage, _, sendResponse: (response: AuthResponse) => void) => {
//     if (message.type === "AUTHENTICATE_USER") {
//       (async () => {
//         try {
//           console.log("Starting user authentication...");

//           const token = await getAuthToken();
//           if (!token) throw new Error("Failed to obtain Chrome auth token.");
//           const user: User = await authenticateUser(token);
//           console.log("Authenticated Firebase user:", user.email);

//           sendResponse({
//             success: true,
//             user,
//           });
//         } catch (error: any) {
//           console.error("Authentication failed:", error);
//           sendResponse({ success: false, error: error.message });
//         }
//       })();

//       // Keeps the message channel open for async response
//       return true;
//     }
//   }
// );
