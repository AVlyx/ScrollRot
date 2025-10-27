import { useEffect, useState } from "react";
import { getSubscriptionType, type SubscriptionType } from "../lib/stripe";
import { Purchase } from "../components";
import type { User } from "firebase/auth/web-extension";
import {
  // LIFETIME_DEAL_PRICE_ID ,
  MEMBERSHIP_PRICE_ID,
} from "../config/stripe_keys";
import { getAuthenticatedUser, getChromeEmailProfile } from "../lib/auth";

const PopupApp = () => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionType>({
    subscriptionType: "none",
  });
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const puser = await getAuthenticatedUser();
      const subscriptionType = await getSubscriptionType();
      console.log(await getChromeEmailProfile());
      setUser(puser);
      setSubscriptionStatus(subscriptionType);
    };
    fetchProfile();
  }, []);

  if (!user || !user.email) {
    return <h1>make sure you are logged in to chrome and sync is enabled</h1>;
  }

  if (subscriptionStatus.subscriptionType == "none") {
    const userProp = { uid: user.uid, email: user.email };
    return <Purchase user={userProp} priceId={MEMBERSHIP_PRICE_ID} mode="subscription" />;
  }
  return (
    <>
      <pre>{JSON.stringify(subscriptionStatus, null, 2)}</pre>
      <p>{Date.now()}</p>
    </>
  );
};

export default PopupApp;
