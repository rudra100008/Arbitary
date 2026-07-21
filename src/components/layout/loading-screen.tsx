"use client";

import React, { useReducer, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Image from "next/image";

type AnimState = { displayText: string; isTyping: boolean };
type AnimAction =
  | { type: "RESET" }
  | { type: "SET_DISPLAY"; text: string }
  | { type: "FINISH_TYPING" };

function animReducer(state: AnimState, action: AnimAction): AnimState {
  switch (action.type) {
    case "RESET":
      return { displayText: "", isTyping: true };
    case "SET_DISPLAY":
      return { ...state, displayText: action.text };
    case "FINISH_TYPING":
      return { ...state, isTyping: false };
  }
}

const LoadingScreen = () => {
  const fullText = "ARBITRARY";
  const [anim, animDispatch] = useReducer(animReducer, {
    displayText: "",
    isTyping: true,
  });
  const indexRef = useRef(0);

  useEffect(() => {
    // Reset on mount
    indexRef.current = 0;
    animDispatch({ type: "RESET" });

    const typingInterval = setInterval(() => {
      if (indexRef.current < fullText.length) {
        // Use ref for index to avoid stale closure
        indexRef.current += 1;
        animDispatch({
          type: "SET_DISPLAY",
          text: fullText.slice(0, indexRef.current),
        });
      } else {
        animDispatch({ type: "FINISH_TYPING" });
        clearInterval(typingInterval);
      }
    }, 150);

    return () => clearInterval(typingInterval);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center overflow-hidden px-4">
      <div className="relative flex flex-col items-center w-full">
        {/* Text Logo Animation */}
        <div className="text-black font-black text-[clamp(2.25rem,10vw,5rem)] tracking-tighter uppercase inline-flex items-center mb-8 min-h-[1.2em]">
          {/* Fallback: if displayText empty, show placeholder so layout doesn't collapse */}
          <span>{anim.displayText || "\u00A0"}</span>
          <motion.span
            className="w-[0.1em] h-[0.75em] bg-[#FACC15] ml-2 inline-block"
            animate={anim.isTyping ? { opacity: [1, 0, 1] } : { opacity: 0 }}
            transition={
              anim.isTyping
                ? { duration: 0.8, repeat: Infinity, ease: "easeInOut" }
                : { duration: 0.5 }
            }
          />
        </div>

        {/* Image Logo */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={
            !anim.isTyping ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }
          }
          transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1] }}
        >
          <Image
            src="/arbitary-logo.png"
            alt="ARBITRARY"
            width={512}
            height={512}
            className="h-[clamp(5rem,15vw,12rem)] w-auto object-contain bg-transparent mix-blend-multiply select-none pointer-events-none"
          />
        </motion.div>

        {/* Progress Bar */}
        <div className="mt-16 w-[clamp(7.5rem,30vw,16rem)] h-px bg-black/5 relative overflow-hidden">
          <motion.div
            className="absolute inset-0 bg-[#FACC15]"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{
              duration: 3,
              ease: [0.65, 0, 0.35, 1],
            }}
            style={{ transformOrigin: "left" }}
          />
        </div>

        {/* Subtext */}
        <motion.div
          className="mt-6 text-[10px] uppercase tracking-[clamp(0.2em,2vw,0.4em)] font-bold text-zinc-300"
          initial={{ opacity: 0 }}
          animate={!anim.isTyping ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 1, ease: "easeInOut" }}
        >
          Initializing Creative Legacy
        </motion.div>
      </div>
    </div>
  );
};

export default LoadingScreen;
