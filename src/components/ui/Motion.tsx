"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

const springSettle = { type: "spring" as const, bounce: 0, duration: 0.4 };
const springPress = { type: "spring" as const, bounce: 0, duration: 0.25 };

export function RiseIn({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springSettle, delay }}
    >
      {children}
    </motion.div>
  );
}

export function Pressable({
  children,
  className,
  onClick,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type={type}
      disabled={disabled}
      className={className}
      onClick={onClick}
      whileTap={reduce || disabled ? undefined : { scale: 0.97 }}
      transition={springPress}
    >
      {children}
    </motion.button>
  );
}

export function MotionCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.article
      className={className}
      whileHover={reduce ? undefined : { y: -4 }}
      whileTap={reduce ? undefined : { scale: 0.985 }}
      transition={springSettle}
    >
      {children}
    </motion.article>
  );
}
