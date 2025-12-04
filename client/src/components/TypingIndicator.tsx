import React from "react";
import styles from "../styles/Welcome.module.css";
export const TypingIndicator: React.FC = () => (
  <span className={styles.typingDots}>
    <span className={styles.typingDot}>.</span>
    <span className={styles.typingDot}>.</span>
    <span className={styles.typingDot}>.</span>
  </span>
);
