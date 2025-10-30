import React, { useState } from "react";
import { collection, addDoc, onSnapshot, doc } from "firebase/firestore";
import styles from "./PaymentProcess.module.css";
import { db } from "@/config/firebase-init";

interface PaymentProcessProps {
  user: { uid: string; email: string | null };
  priceId: string;
  mode: "payment" | "subscription";
  onBack?: () => void;
}

type PaymentStage = "idle" | "processing" | "ready" | "error";

const PaymentProcess: React.FC<PaymentProcessProps> = ({ user, priceId, mode, onBack }) => {
  const [stage, setStage] = useState<PaymentStage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);

  const handlePaymentClick = async (): Promise<void> => {
    setError(null);
    setStage("processing");

    try {
      console.log("Creating checkout session...");

      const checkoutSessionRef = collection(db, "customers", user.uid, "checkout_sessions");

      const sessionData = {
        price: priceId,
        success_url: window.location.origin + "/success",
        cancel_url: window.location.origin + "/cancel",
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
    <div className={styles.container}>
      {stage === "idle" && (
        <>
          <h2 className={styles.title}>Complete Your Purchase</h2>
          <p className={styles.info}>Signed in as: {user.email}</p>
          <p className={styles.info}>
            Plan: {mode === "subscription" ? "Monthly Membership" : "Lifetime Deal"}
          </p>
          <div className={styles.buttonGroup}>
            {onBack && (
              <button onClick={onBack} className={`${styles.button} ${styles.buttonSecondary}`}>
                Back
              </button>
            )}
            <button
              id="paymentButton"
              onClick={handlePaymentClick}
              className={`${styles.button} ${styles.buttonPrimary}`}
            >
              Proceed to Payment
            </button>
          </div>
        </>
      )}

      {stage === "processing" && (
        <>
          <h2 className={styles.title}>Processing...</h2>
          <p className={styles.info}>Creating your payment session...</p>
        </>
      )}

      {stage === "ready" && sessionUrl && (
        <>
          <h2 className={styles.title}>Payment Ready</h2>
          <p className={styles.instructions}>You will be redirected to the payment page.</p>
          <p className={styles.instructions}>
            After completing the payment, please close this window and reopen the extension to see
            your updated status.
          </p>
          <div className={styles.buttonGroup}>
            <button
              className={`${styles.buttonSmall} ${styles.buttonDanger}`}
              onClick={() => {
                setSessionUrl(null);
                setStage("idle");
              }}
            >
              Cancel
            </button>
            <button
              className={`${styles.buttonSmall} ${styles.buttonSuccess}`}
              onClick={() => {
                if (!sessionUrl) return;
                console.log("Opening payment page:", sessionUrl);

                // Open checkout in a new tab
                chrome.tabs.create({ url: sessionUrl });
              }}
            >
              Open Payment Page
            </button>
          </div>
        </>
      )}

      {stage === "error" && (
        <>
          <h2 className={styles.title}>Payment Error</h2>
          <p className={styles.error}>{error}</p>
          <div className={styles.buttonGroup}>
            {onBack && (
              <button
                className={`${styles.buttonSmall} ${styles.buttonSecondary}`}
                onClick={onBack}
              >
                Back to Plans
              </button>
            )}
            <button
              className={`${styles.buttonSmall} ${styles.buttonInfo}`}
              onClick={() => {
                setStage("idle");
                setError(null);
              }}
            >
              Try Again
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default PaymentProcess;
