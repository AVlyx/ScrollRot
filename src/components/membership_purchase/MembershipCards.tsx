import React from "react";
import MembershipCard from "./MembershipCard";
import styles from "./MembershipCards.module.css";

interface MembershipCardsProps {
  onSelectPlan: (priceId: string, mode: "payment" | "subscription") => void;
}

const LIFETIME_DEAL_PRICE_ID = "price_lifetime_deal_id"; // Replace with your actual price ID
const MEMBERSHIP_PRICE_ID = "price_membership_id"; // Replace with your actual price ID

const MembershipCards: React.FC<MembershipCardsProps> = ({ onSelectPlan }) => {
  const membershipPlans = [
    {
      id: MEMBERSHIP_PRICE_ID,
      mode: "subscription" as const,
      title: "Monthly Membership",
      price: "$1.99",
      period: "/month",
      features: ["Full access to all features", "Cancel anytime", "7 days trial"],
      buttonText: "Subscribe Now",
      variant: "default" as const,
    },
    {
      id: LIFETIME_DEAL_PRICE_ID,
      mode: "payment" as const,
      title: "Lifetime Deal",
      price: "$14.99",
      period: " one-time",
      features: ["Lifetime access", "All future updates included", "Pay once, use forever"],
      buttonText: "Get Lifetime Access",
      variant: "highlighted" as const,
      badge: "BEST VALUE",
    },
  ];

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Choose Your Membership</h2>

      <div className={styles.grid}>
        {membershipPlans.map((plan) => (
          <MembershipCard
            key={plan.id}
            title={plan.title}
            price={plan.price}
            period={plan.period}
            features={plan.features}
            buttonText={plan.buttonText}
            onSelect={() => onSelectPlan(plan.id, plan.mode)}
            variant={plan.variant}
            badge={plan.badge}
          />
        ))}
      </div>
    </div>
  );
};

export default MembershipCards;
