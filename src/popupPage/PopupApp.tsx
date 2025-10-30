import React, { useEffect, useState } from "react";
import { OpenSettingsButton } from "@/components";
import { getAuthenticatedUser } from "@/lib/auth";
import { MembershipFlow } from "@/components/membership_purchase";

const PopupApp: React.FC = () => {
  const [user, setUser] = useState<{ uid: string; email: string } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { uid, email } = await getAuthenticatedUser();
      setUser({ uid, email: email! });
    };
    fetchUser();
  }, []);

  if (!user) {
    return (
      <>
        <h1>Logging in user</h1>
        <OpenSettingsButton />
      </>
    );
  }

  return (
    <>
      <MembershipFlow user={user} />
      <OpenSettingsButton />
    </>
  );
};

export default PopupApp;
