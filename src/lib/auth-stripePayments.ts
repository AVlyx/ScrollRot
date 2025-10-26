import { auth, db } from "../config/firebase-init";
import {
  GoogleAuthProvider,
  signInWithCredential,
  type User,
  type UserCredential,
} from "firebase/auth/web-extension";
import { LIFETIME_DEAL_PRODUCT_ID, MEMBERSHIP_ID } from "../config/stripe_keys";
import {
  collection,
  // collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { signOut } from "firebase/auth";

export interface SubscriptionType {
  type: "lifetime" | "membership" | "free trial" | "none" | "not implemented yet" | "error";
  message?: string;
  error?: any;
}

export async function getChromeEmailProfile(): Promise<string | null> {
  const { email } = await chrome.identity.getProfileUserInfo();
  console.log({ email });
  return email || null;
}

export async function getAuthToken(): Promise<string | null> {
  const { token } = await chrome.identity.getAuthToken({ interactive: true });
  console.log({ token });
  return token || null;
}

export async function authenticateUser(token: string): Promise<User> {
  const ocredential = GoogleAuthProvider.credential(null, token);
  //   console.log({ ocredential });
  const userCred: UserCredential = await signInWithCredential(auth, ocredential);
  //   console.log({ userCred });
  return userCred.user;
}

export async function getSubscribtionType(user: User): Promise<SubscriptionType> {
  try {
    const customerRef = doc(db, "customers", user.uid);
    const customerSnap = await getDoc(customerRef);

    if (!customerSnap.exists()) {
      return { type: "none", message: "Customer not found in Firestore." };
    }

    // 1️⃣ Check for a lifetime deal payment
    const paymentsRef = collection(customerRef, "payments");
    const lifetimeDealQuery = query(
      paymentsRef,
      where("payment_details.order_reference", "==", LIFETIME_DEAL_PRODUCT_ID),
      where("status", "==", "succeeded")
    );
    const lifetimeSnap = await getDocs(lifetimeDealQuery);

    if (!lifetimeSnap.empty) {
      return { type: "lifetime" };
    }

    // 2️⃣ Check for an active membership subscription
    const subscriptionsRef = collection(customerRef, "subscriptions");
    const activeMembershipQuery = query(
      subscriptionsRef,
      where("status", "in", ["active", "trialing"]),
      where("items.0.price.product", "==", MEMBERSHIP_ID)
    );
    const activeSubSnap = await getDocs(activeMembershipQuery);

    if (!activeSubSnap.empty) {
      const sub = activeSubSnap.docs[0].data();
      if (sub.status === "trialing") {
        return { type: "free trial" };
      }
      return { type: "membership" };
    }

    // 3️⃣ Default to none if no subscription or lifetime payment
    return { type: "none" };
  } catch (error) {
    console.error("Error checking subscription type:", error);
    return { type: "error", message: "Failed to check subscription type.", error };
  }
}
