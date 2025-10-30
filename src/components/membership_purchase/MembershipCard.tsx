import React from "react";
import styles from "./MembershipCard.module.css";

interface MembershipCardProps {
  title: string;
  price: string;
  period: string;
  features: string[];
  buttonText: string;
  onSelect: () => void;
  variant?: "default" | "highlighted";
  badge?: string;
}

const MembershipCard: React.FC<MembershipCardProps> = ({
  title,
  price,
  period,
  features,
  buttonText,
  onSelect,
  variant = "default",
  badge,
}) => {
  const cardClass = variant === "highlighted" ? styles.cardHighlighted : styles.card;
  const priceClass = variant === "highlighted" ? styles.priceHighlighted : styles.priceDefault;
  const buttonClass = variant === "highlighted" ? styles.buttonHighlighted : styles.buttonDefault;

  return (
    <div className={cardClass}>
      {badge && <div className={styles.badge}>{badge}</div>}

      <h3 className={styles.title}>{title}</h3>

      <div className={styles.priceContainer}>
        <span className={`${styles.price} ${priceClass}`}>{price}</span>
        <span className={styles.period}>{period}</span>
      </div>

      <ul className={styles.featureList}>
        {features.map((feature, index) => (
          <li key={index} className={styles.featureItem}>
            ✓ {feature}
          </li>
        ))}
      </ul>

      <button onClick={onSelect} className={`${styles.button} ${buttonClass}`}>
        {buttonText}
      </button>
    </div>
  );
};

export default MembershipCard;
