// src/App.tsx
import { useEffect, useState } from "react";
import {
  // getChromeEmailProfile,
  getAuthToken,
  authenticateUser,
  getSubscribtionType,
  type SubscriptionType,
} from "./lib/auth-stripePayments";
import { Purchase } from "./components";
import type { User } from "firebase/auth/web-extension";
import { LIFETIME_DEAL_PRICE_ID } from "./config/stripe_keys";

const App = () => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionType>({ type: "none" });
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = await getAuthToken();
      const puser = await authenticateUser(token!);
      const psubscriptionStatus = await getSubscribtionType(puser);

      setUser(puser);
      setSubscriptionStatus(psubscriptionStatus);
    };
    fetchProfile();
  }, []);

  if (!user || !user.email) {
    return <h1>make sure you are logged in to chrome and sync is enabled</h1>;
  }

  if (subscriptionStatus.type == "none") {
    const userProp = { uid: user.uid, email: user.email };
    return <Purchase user={userProp} priceId={LIFETIME_DEAL_PRICE_ID} />;
  }
  return <pre>{JSON.stringify(subscriptionStatus, null, 2)}</pre>;
};

export default App;
