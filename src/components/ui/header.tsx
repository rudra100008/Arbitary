"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ProfileDropdown from "./profile-dropdown";
import { usePathname } from "next/navigation";

const Header = () => {
  const fullText = "ARBITARY";
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const pathName = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
    <header
      className={`fixed z-9999 transition-all duration-[1200ms] ease-[cubic-bezier(0.23,1,0.32,1)] left-1/2 -translate-x-1/2
            ${
              scrolled
                ? "top-6 w-[95%] max-w-7xl rounded-[40px] bg-white/20 backdrop-blur-2xl border border-white/20 shadow-[0_30px_100px_rgba(0,0,0,0.12),0_10px_40px_rgba(0,0,0,0.08)] h-16"
                : "top-0 w-full rounded-none bg-white border-b border-black/5 h-24 shadow-none"
            }`}
    >
      <div
        className={`container mx-auto h-full flex items-center justify-between transition-all duration-[1200ms] ease-[cubic-bezier(0.23,1,0.32,1)]
                ${scrolled ? "px-8" : "px-6"}`}
      >
        {/* Logo with Hover Dissolve Effect */}
        <Link
          href="/"
          className="pointer-events-auto group relative flex items-center h-12 min-w-[150px] md:min-w-[200px] shrink-0"
        >
          {/* Text Logo (Keeps its size) */}
          <span className="absolute left-0 top-1/2 -translate-y-1/2 text-black font-black text-3xl tracking-tighter uppercase inline-flex items-center transition-opacity duration-700 group-hover:opacity-0 whitespace-nowrap">
            {displayText}
            <span
              className={`w-[3px] h-[0.8em] bg-[#FACC15] ml-1 ${
                isTyping ? "opacity-100 animate-pulse" : "opacity-0"
              }`}
            />
          </span>

          {/* Image Logo (Extra Large) */}
          <div className="absolute left-0 top-1/3 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-700 flex items-center">
            <img
              src="/arbitary-logo.png"
              alt="ARBITARY"
              className="h-32 md:h-40 w-auto object-contain bg-transparent mix-blend-multiply select-none pointer-events-none transform -translate-x-1"
            />
          </div>
        </Link>

        {/* Navigation Pill and Profile */}
        <div className="pointer-events-auto flex items-center gap-3 shrink-0">
          <nav className="bg-black/5 backdrop-blur-md px-1.5 py-1.5 rounded-full border border-black/10 flex items-center gap-0.5">
            {["Home", "Work", "Events", "Leaderboard", "Dashboard", "Rewards", "About", "Contact"].map(
              (item) => {
                const href = item === "Home" ? "/" : item === "Rewards"? "/deals" : `/${item.toLowerCase()}`;
                const isActive = pathName === href;
                return (
                  <Link
                    key={item}
                    href={href}
                    className={`px-3 md:px-4 py-2 rounded-full font-bold transition-all duration-200 text-[10px] md:text-xs
                       uppercase tracking-wider
                  ${
                    isActive
                      ? "bg-black text-white shadow-md"
                      : "text-black/60 hover:text-black hover:bg-black/5"
                  }`}
                  >
                    {item}
                  </Link>
                );
              },
            )}
          </nav>

          {/* Profile Dropdown */}
          <ProfileDropdown redirectUrl="/" />
        </div>
      </div>
    </header>
  );
};

export default Header;
