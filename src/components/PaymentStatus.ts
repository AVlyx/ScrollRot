// src/components/PaymentStatus.ts
import { collection, getDocs, query, where } from "firebase/firestore";
import { firestore } from "../config/firebase-init";

export async function checkPaymentStatus(userId: string): Promise<boolean> {
  const paymentsRef = collection(firestore, "customers", userId, "payments");
  const snapshot = await getDocs(paymentsRef);

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (
      (data.amount === 1499 || data.amount === "1499") &&
      data.currency === "usd"
    ) {
      return true;
    }
  }

  const rootPaymentsRef = collection(firestore, "payments");
  const rootQuery = query(rootPaymentsRef, where("customer", "==", userId));
  const rootSnapshot = await getDocs(rootQuery);

  for (const doc of rootSnapshot.docs) {
    const data = doc.data();
    if (
      (data.amount === 1000 || data.amount === "1000") &&
      data.currency === "eur"
    ) {
      return true;
    }
  }

  return false;
}
