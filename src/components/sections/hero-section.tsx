"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

const HeroSection = () => {
  const [hovered, setHovered] = useState<"left" | "right" | null>(null);

  return (
    <section className="relative h-screen w-full flex overflow-hidden bg-black pt-24">
      {/* Records Side */}
      <div
        onMouseEnter={() => setHovered("left")}
        onMouseLeave={() => setHovered(null)}
        className={`group relative h-full flex items-center justify-center transition-all duration-[1200ms] ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer overflow-hidden
          ${hovered === "left" ? "w-[90%]" : hovered === "right" ? "w-[10%]" : "w-1/2"}
          border-r border-white/10`}
      >
        <div
          className={`absolute inset-0 bg-cover bg-center transition-transform duration-[1200ms] ease-out
            ${hovered === "left" ? "scale-110" : "scale-100"}`}
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=2070&auto=format&fit=crop')",
          }}
        />
        <div
          className={`absolute inset-0 bg-black/60 transition-opacity duration-700 
          ${hovered === "left" ? "opacity-30" : "opacity-70"}`}
        />

        {/* Decorative Grid Overlay */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />

        <div className="relative z-10 text-center px-4 w-full flex flex-col items-center justify-center h-full pointer-events-none">
          <div
            className={`transition-all duration-[1200ms] ease-[cubic-bezier(0.23,1,0.32,1)] flex flex-col items-center will-change-transform
            ${hovered === "right" ? "-rotate-90 scale-75 opacity-20" : "rotate-0 scale-100 opacity-100"}`}
          >
            <span
              className={`block text-[#FACC15] font-bold tracking-[0.4em] uppercase text-xs mb-4 transition-all duration-[1200ms] ease-[cubic-bezier(0.23,1,0.32,1)]
              ${hovered === "left" ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}`}
            >
              Arbitary Audio
            </span>
            <h2
              className={`font-black tracking-tighter text-white uppercase transition-all duration-[1200ms] ease-[cubic-bezier(0.23,1,0.32,1)] leading-none whitespace-nowrap
              ${hovered === "left" ? "text-7xl md:text-9xl" : "text-3xl md:text-5xl opacity-40"}`}
            >
              Records
            </h2>
          </div>

          <div
            className={`mt-8 transition-all duration-[1200ms] ease-[cubic-bezier(0.23,1,0.32,1)] pointer-events-auto
            ${hovered === "left" ? "opacity-100 translate-y-0 relative" : "opacity-0 translate-y-10 absolute"}`}
          >
            <p className="text-zinc-300 text-lg mb-8 max-w-md mx-auto leading-relaxed">
              Elevating the underground to a global stage. Explore our curated
              roster of boundary-pushing artists.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="px-12 py-5 bg-[#FACC15] text-black font-black uppercase tracking-widest rounded-full shadow-[0_0_30px_rgba(250,204,21,0.3)]"
            >
              Explore Catalog
            </motion.button>
          </div>
        </div>
      </div>

      {/* Events Side */}
      <div
        onMouseEnter={() => setHovered("right")}
        onMouseLeave={() => setHovered(null)}
        className={`group relative h-full flex items-center justify-center transition-all duration-[1200ms] ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer overflow-hidden
          ${hovered === "right" ? "w-[90%]" : hovered === "left" ? "w-[10%]" : "w-1/2"}`}
      >
        <div
          className={`absolute inset-0 bg-cover bg-center transition-transform duration-[1200ms] ease-out
            ${hovered === "right" ? "scale-110" : "scale-100"}`}
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=2070&auto=format&fit=crop')",
          }}
        />
        <div
          className={`absolute inset-0 bg-black/60 transition-opacity duration-700 
          ${hovered === "right" ? "opacity-30" : "opacity-70"}`}
        />

        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />

        <div className="relative z-10 text-center px-4 w-full flex flex-col items-center justify-center h-full pointer-events-none">
          <div
            className={`transition-all duration-[1200ms] ease-[cubic-bezier(0.23,1,0.32,1)] flex flex-col items-center will-change-transform
            ${hovered === "left" ? "rotate-90 scale-75 opacity-20" : "rotate-0 scale-100 opacity-100"}`}
          >
            <span
              className={`block text-[#FACC15] font-bold tracking-[0.4em] uppercase text-xs mb-4 transition-all duration-[1200ms] ease-[cubic-bezier(0.23,1,0.32,1)]
              ${hovered === "right" ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}`}
            >
              Live Experience
            </span>
            <h2
              className={`font-black tracking-tighter text-white uppercase transition-all duration-[1200ms] ease-[cubic-bezier(0.23,1,0.32,1)] leading-none whitespace-nowrap
              ${hovered === "right" ? "text-7xl md:text-9xl" : "text-3xl md:text-5xl opacity-40"}`}
            >
              Events
            </h2>
          </div>

          <div
            className={`mt-8 transition-all duration-[1200ms] ease-[cubic-bezier(0.23,1,0.32,1)] pointer-events-auto
            ${hovered === "right" ? "opacity-100 translate-y-0 relative" : "opacity-0 translate-y-10 absolute"}`}
          >
            <p className="text-zinc-300 text-lg mb-8 max-w-md mx-auto leading-relaxed">
              From intimate showcases to massive arenas. Witness the next era of
              live entertainment.
            </p>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="inline-block"
            >
              <Link
                href="/events"
                className="px-12 py-5 bg-white text-black font-black uppercase tracking-widest rounded-full shadow-[0_0_30px_rgba(255,255,255,0.2)] inline-block"
              >
                View Schedule
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
