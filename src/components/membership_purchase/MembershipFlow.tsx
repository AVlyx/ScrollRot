import React, { useState } from "react";
import MembershipCards from "./MembershipCards";
import PaymentProcess from "./PaymentProcess";

interface MembershipFlowProps {
  user: { uid: string; email: string | null };
}

const MembershipFlow: React.FC<MembershipFlowProps> = ({ user }) => {
  const [selectedPlan, setSelectedPlan] = useState<{
    priceId: string;
    mode: "payment" | "subscription";
  } | null>(null);

  const handleSelectPlan = (priceId: string, mode: "payment" | "subscription") => {
    setSelectedPlan({ priceId, mode });
  };

  const handleBack = () => {
    setSelectedPlan(null);
  };

  return (
    <div>
      {!selectedPlan ? (
        <MembershipCards onSelectPlan={handleSelectPlan} />
      ) : (
        <PaymentProcess
          user={user}
          priceId={selectedPlan.priceId}
          mode={selectedPlan.mode}
          onBack={handleBack}
        />
      )}
    </div>
  );
};

export default MembershipFlow;
