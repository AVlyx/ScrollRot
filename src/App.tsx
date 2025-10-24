// src/App.tsx
import React, { useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  signInWithCredential,
  type User,
} from "firebase/auth/web-extension";
import { auth } from "./config/firebase-init";
import Donation from "./components/Donation";
import { checkPaymentStatus } from "./components/PaymentStatus";

declare const chrome: any; // Declare chrome for TypeScript (extensions context)

const PRICE_ID = "price_1SCMAlLAge6tJYbWmfzBLb5k";

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    chrome.identity.getProfileUserInfo(async (info: { email: string }) => {
      if (!info.email) {
        setError(
          "Please make sure you're signed into Chrome and sync is enabled."
        );
        return;
      }

      chrome.identity.getAuthToken(
        { interactive: true },
        async (token: string) => {
          if (chrome.runtime.lastError) {
            setError(chrome.runtime.lastError.message);
            return;
          }

          try {
            const credential = GoogleAuthProvider.credential(null, token);
            const userCred = await signInWithCredential(auth, credential);
            const hasPaid = await checkPaymentStatus(userCred.user.uid);
            setUser(userCred.user);
            setPaid(hasPaid);
          } catch (err: unknown) {
            const errorMessage =
              err instanceof Error ? err.message : "Unknown error";
            setError(errorMessage);
          }
        }
      );
    });
  }, []);

  if (error)
    return (
      <div>
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );

  if (!user) return <p>Loading...</p>;
  if (paid)
    return (
      <div>
        <h2>Thank You!</h2>
        <p>Your payment has been received.</p>
        <p>Signed in as: {user.email}</p>
      </div>
    );

  return (
    <Donation user={{ uid: user.uid, email: user.email }} priceId={PRICE_ID} />
  );
};

export default App;
