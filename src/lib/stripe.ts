import { db } from "@/config/firebase-init";
import {
  LIFETIME_DEAL_PRODUCT_ID,
  // MEMBERSHIP_PRICE_ID
} from "@/config/stripe_keys";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { type User } from "firebase/auth/web-extension";
import { getAuthenticatedUser } from "./auth";

/** ───────────────────────────────────────────────────────────────
 *  Types
 *  ─────────────────────────────────────────────────────────────── */
export interface SubscriptionType {
  subscriptionType:
    | "lifetime"
    | "membership"
    | "free trial"
    | "none"
    | "not implemented yet"
    | "error";
  message?: string;
  error?: any;
  membershipExpirationDate?: number; // Unix timestamp in ms
}

/** ───────────────────────────────────────────────────────────────
 *  Local storage helpers
 *  ─────────────────────────────────────────────────────────────── */
export async function storeSubscriptionType(subscriptionType: SubscriptionType) {
  const st: SubscriptionType = {
    subscriptionType: subscriptionType.subscriptionType,
    membershipExpirationDate: subscriptionType.membershipExpirationDate,
  };
  await chrome.storage.local.set(st);
}

export async function getSubscriptionTypeLocalStorage(): Promise<SubscriptionType> {
  const { subscriptionType, membershipExpirationDate } = await chrome.storage.local.get([
    "subscriptionType",
    "membershipExpirationDate",
  ]);

  if (!subscriptionType) {
    return { subscriptionType: "error", error: "subscriptionType not found in local storage" };
  }

  return { subscriptionType, membershipExpirationDate };
}

/** ───────────────────────────────────────────────────────────────
 *  Firestore lookup
 *  ─────────────────────────────────────────────────────────────── */
export async function getSubscriptionTypeFirebase(user: User): Promise<SubscriptionType> {
  try {
    const customerRef = doc(db, "customers", user.uid);
    const customerSnap = await getDoc(customerRef);

    if (!customerSnap.exists()) {
      return { subscriptionType: "none", message: "Customer not found in Firestore." };
    }

    // 1️⃣ Lifetime deal payment
    const paymentsRef = collection(customerRef, "payments");
    const lifetimeDealQuery = query(
      paymentsRef,
      where("payment_details.order_reference", "==", LIFETIME_DEAL_PRODUCT_ID),
      where("status", "==", "succeeded")
    );
    const lifetimeSnap = await getDocs(lifetimeDealQuery);

    if (!lifetimeSnap.empty) {
      return { subscriptionType: "lifetime" };
    }

    // 2️⃣ Active membership
    const subscriptionsRef = collection(customerRef, "subscriptions");
    const activeMembershipQuery = query(
      subscriptionsRef,
      where("status", "in", ["active", "trialing"])
    );
    const activeSubSnap = await getDocs(activeMembershipQuery);

    if (!activeSubSnap.empty) {
      const sub = activeSubSnap.docs[0].data() as any;
      console.log("Active subscription:", sub);

      // Stripe extension usually includes `current_period_end` in seconds

      const periodEndSeconds = sub.current_period_end.seconds;
      console.log({ periodEndSeconds });
      const periodEndMs = periodEndSeconds ? periodEndSeconds * 1000 : undefined;

      if (sub.status === "trialing") {
        return {
          subscriptionType: "free trial",
          membershipExpirationDate: periodEndMs,
        };
      }

      return {
        subscriptionType: "membership",
        membershipExpirationDate: periodEndMs,
      };
    }

    // 3️⃣ Default to none
    return { subscriptionType: "none" };
  } catch (error) {
    console.error("Error checking subscription type:", error);
    return { subscriptionType: "error", message: "Failed to check subscription type.", error };
  }
}

/** ───────────────────────────────────────────────────────────────
 *  Combined logic — Cached + Firestore refresh
 *  ─────────────────────────────────────────────────────────────── */
export async function getSubscriptionType(): Promise<SubscriptionType> {
  // 1️⃣ Try local cache first
  const local = await getSubscriptionTypeLocalStorage();

  const validTypes = ["lifetime", "membership", "free trial"];
  const isKnownType = validTypes.includes(local.subscriptionType);

  // Lifetime never expires
  if (local.subscriptionType === "lifetime") {
    return local;
  }

  // Check membership/trial expiration
  if (isKnownType && local.membershipExpirationDate) {
    const now = Date.now();
    if (local.membershipExpirationDate > now) {
      // Cached membership still valid
      return local;
    } else {
      console.log("Cached membership expired — refreshing from Firestore");
    }
  }

  // 2️⃣ Fetch fresh data from Firestore
  const user = await getAuthenticatedUser();
  const fresh = await getSubscriptionTypeFirebase(user);

  // 3️⃣ Update local storage
  await storeSubscriptionType(fresh);

  console.log({ fresh });
  return fresh;
}
