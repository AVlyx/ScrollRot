// src/components/Donation.tsx
import React, { useState } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  DocumentReference,
  type DocumentData,
} from "firebase/firestore";
import { firestore } from "../config/firebase-init";

interface DonationProps {
  user: { uid: string; email: string | null };
  priceId: string;
}

const Donation: React.FC<DonationProps> = ({ user, priceId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);

  const handleDonate = async () => {
    try {
      setLoading(true);
      const checkoutRef = collection(
        firestore,
        "customers",
        user.uid,
        "checkout_sessions"
      );
      const docRef = await addDoc(checkoutRef, {
        price: priceId,
        success_url: "https://example.com/success",
        cancel_url: "https://example.com/cancel",
        mode: "payment",
        metadata: {
          userId: user.uid,
          userEmail: user.email,
        },
      });

      const unsubscribe = onSnapshot(
        docRef as DocumentReference<DocumentData>,
        (snap) => {
          const data = snap.data();
          if (data?.error) {
            setError(data.error.message || "An error occurred");
            unsubscribe();
          }
          if (data?.url) {
            setSessionUrl(data.url);
            unsubscribe();
          }
        }
      );
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div>
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Try Again</button>
      </div>
    );
  }

  if (sessionUrl) {
    return (
      <div>
        <h2>Payment Instructions</h2>
        <p>You’ll be redirected to the payment page.</p>
        <button onClick={() => setSessionUrl(null)}>Cancel</button>
        <button onClick={() => (window.location.href = sessionUrl)}>
          Proceed to Payment
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2>Make a Donation</h2>
      <p>Signed in as: {user.email}</p>
      <p>Firebase UID: {user.uid}</p>
      <button onClick={handleDonate} disabled={loading}>
        {loading ? "Processing..." : "Donate Now"}
      </button>
    </div>
  );
};

export default Donation;
