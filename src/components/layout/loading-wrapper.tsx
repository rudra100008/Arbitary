"use client";

import React, { useState, useEffect } from "react";
import LoadingScreen from "@/src/components/layout/loading-screen";

export default function LoadingWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [shouldRenderContent, setShouldRenderContent] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    // 3 second loading time
    const timer = setTimeout(() => {
      setIsLoading(false);
      setIsTransitioning(true);

      // Remove the transform after the animation completes (1.2s)
      // This is crucial because 'fixed' elements don't work inside 'transform'
      setTimeout(() => {
        setIsTransitioning(false);
      }, 1500);
    }, 3000);

    const renderTimer = setTimeout(() => {
      setShouldRenderContent(true);
    }, 100);

    return () => {
      clearTimeout(timer);
      clearTimeout(renderTimer);
    };
  }, []);

  return (
    <div
      className={`relative min-h-screen bg-white ${isLoading ? "overflow-hidden h-screen" : "overflow-visible"}`}
    >
      {/* Loading Screen stays on top until finished */}
      <div
        className={`transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] fixed inset-0 z-[100]
        ${isLoading ? "opacity-100" : "opacity-0 pointer-events-none -translate-y-full"}`}
      >
        <LoadingScreen />
      </div>

      {/* Main Content slides up from the bottom */}
      {/* We only apply the transform during the transition phase */}
      <div
        className={`transition-all duration-[1200ms] ease-[cubic-bezier(0.23,1,0.32,1)]
          ${isLoading ? "translate-y-32 opacity-0" : isTransitioning ? "translate-y-0 opacity-100" : "opacity-100"}`}
      >
        {shouldRenderContent && children}
      </div>
    </div>
  );
}
