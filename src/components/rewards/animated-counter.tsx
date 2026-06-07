"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useMotionValueEvent, animate } from "framer-motion";

type AnimatedCounterProps = {
  value: number;
  className?: string;
};

export function AnimatedCounter({ value, className = "" }: AnimatedCounterProps) {
  const prevRef = useRef(value);
  const motionValue = useMotionValue(prevRef.current);
  const [displayValue, setDisplayValue] = useState(value.toLocaleString());
  const [animating, setAnimating] = useState(false);

  useMotionValueEvent(motionValue, "change", (latest) => {
    setDisplayValue(Math.round(latest).toLocaleString());
  });

  useEffect(() => {
    const prev = prevRef.current;
    if (prev !== value) {
      setAnimating(true);
      const controls = animate(motionValue, value, {
        duration: 0.7,
        ease: [0.25, 0.1, 0.25, 1],
        onComplete: () => {
          setAnimating(false);
          prevRef.current = value;
        },
      });
      return controls.stop;
    }
  }, [value, motionValue]);

  return (
    <motion.span
      className={className}
      animate={
        animating
          ? { scale: 1.15, textShadow: "0 0 20px rgba(250,204,21,0.4)" }
          : { scale: 1, textShadow: "0 0 0px rgba(250,204,21,0)" }
      }
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {displayValue}
    </motion.span>
  );
}
