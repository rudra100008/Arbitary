"use client";

import React, { useState, useEffect } from "react";

const LoadingScreen = () => {
  const fullText = "ARBITARY";
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    let currentText = "";
    let i = 0;

    const typingInterval = setInterval(() => {
      if (i < fullText.length) {
        currentText += fullText[i];
        setDisplayText(currentText);
        i++;
      } else {
        setIsTyping(false);
        clearInterval(typingInterval);
      }
    }, 150);

    return () => clearInterval(typingInterval);
  }, []);

  return (
    <div className="fixed inset-0 z-9999 bg-white flex flex-col items-center justify-center overflow-hidden">
      <div className="relative flex flex-col items-center">
        {/* Text Logo Animation */}
        <div className="text-black font-black text-5xl md:text-8xl tracking-tighter uppercase inline-flex items-center mb-8">
          {displayText}
          <span
            className={`w-1.5 h-[0.8em] bg-[#FACC15] ml-2 ${
              isTyping
                ? "opacity-100 animate-pulse"
                : "opacity-0 transition-opacity duration-500"
            }`}
          />
        </div>

        {/* Image Logo (Fades in after typing finishes) */}
        <div
          className={`transition-all duration-1000 transform ${!isTyping ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          <img
            src="/arbitary-logo.png"
            alt="ARBITARY"
            className="h-32 md:h-48 w-auto object-contain bg-transparent mix-blend-multiply select-none pointer-events-none"
          />
        </div>

        {/* Cinematic Loading Progress */}
        <div className="mt-20 w-48 md:w-64 h-px bg-black/5 relative overflow-hidden">
          <div
            className="absolute inset-0 bg-[#FACC15] origin-left"
            style={{
              animation:
                "loadingProgress 3s cubic-bezier(0.65, 0, 0.35, 1) forwards",
            }}
          />
        </div>

        {/* Subtext */}
        <div
          className={`mt-6 text-[10px] uppercase tracking-[0.4em] font-bold text-zinc-300 transition-opacity duration-1000 ${!isTyping ? "opacity-100" : "opacity-0"}`}
        >
          Initializing Creative Legacy
        </div>
      </div>

      <style>{`
                @keyframes loadingProgress {
                    0% { transform: scaleX(0); }
                    100% { transform: scaleX(1); }
                }
            `}</style>
    </div>
  );
};

export default LoadingScreen;
