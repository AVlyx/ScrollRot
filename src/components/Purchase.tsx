import React, { useState } from "react";
import { collection, addDoc, onSnapshot, doc } from "firebase/firestore";
import { db } from "../config/firebase-init";

interface PurchaseProps {
  user: { uid: string; email: string | null };
  priceId: string;
  mode: "payment" | "subscription";
}

type PurchaseStage = "idle" | "processing" | "ready" | "error";

const Purchase: React.FC<PurchaseProps> = ({ user, priceId, mode }: PurchaseProps) => {
  const [stage, setStage] = useState<PurchaseStage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);

  const handleDonateClick = async (): Promise<void> => {
    setError(null);
    setStage("processing");

    try {
      console.log("Creating checkout session...");

      const checkoutSessionRef = collection(db, "customers", user.uid, "checkout_sessions");

      const sessionData = {
        price: priceId,
        success_url: "https://example.com/success",
        cancel_url: "https://example.com/cancel",
        mode: mode,
        metadata: {
          userId: user.uid,
          userEmail: user.email,
        },
      };

      const docRef = await addDoc(checkoutSessionRef, sessionData);
      console.log("Checkout session created:", docRef.id);

      const unsubscribe = onSnapshot(doc(db, docRef.path), (snap) => {
        const data = snap.data();

        if (!data) return;

        if (data.error) {
          console.error("Checkout error:", data.error);
          setError(data.error.message || "An unknown error occurred.");
          setStage("error");
          unsubscribe();
        }

        if (data.url) {
          console.log("Payment URL available:", data.url);
          setSessionUrl(data.url);
          setStage("ready");
          unsubscribe();
        }
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to setup payment.";
      console.error("Payment Setup Error:", errorMessage);
      setError(errorMessage);
      setStage("error");
    }
  };

  return (
    <div style={{ textAlign: "center", padding: "1rem" }}>
      {stage === "idle" && (
        <>
          <h2>Make a Purchase 💖</h2>
          <p>Signed in as: {user.email}</p>
          <p>Firebase UID: {user.uid}</p>
          <button
            id="donateButton"
            onClick={handleDonateClick}
            style={{
              backgroundColor: "#635bff",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Donate Now
          </button>
        </>
      )}

      {stage === "processing" && (
        <>
          <h2>Processing...</h2>
          <p>Creating your Purchase session...</p>
        </>
      )}

      {stage === "ready" && sessionUrl && (
        <>
          <h2>Payment Instructions</h2>
          <p>You will be redirected to the payment page.</p>
          <p>
            After completing the payment, please close this window and reopen the extension to see
            your status.
          </p>
          <div
            style={{
              display: "flex",
              gap: "10px",
              justifyContent: "center",
            }}
          >
            <button
              style={{
                backgroundColor: "#dc3545",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "6px",
                cursor: "pointer",
              }}
              onClick={() => {
                setSessionUrl(null);
                setStage("idle");
              }}
            >
              Cancel
            </button>
            <button
              style={{
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "6px",
                cursor: "pointer",
              }}
              onClick={() => {
                if (!sessionUrl) return;
                console.log("trying to access", sessionUrl);

                // Open checkout in a new tab
                chrome.tabs.create({ url: sessionUrl });
              }}
            >
              Proceed to Payment
            </button>
          </div>
        </>
      )}

      {stage === "error" && (
        <>
          <h2>Error</h2>
          <p style={{ color: "red" }}>{error}</p>
          <button
            style={{
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "6px",
              cursor: "pointer",
            }}
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </>
      )}
    </div>
  );
};

export default Purchase;
