"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import ProfileDropdown from "./profile-dropdown";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

const Header = () => {
  const fullText = "ARBITRARY";
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const pathName = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    indexRef.current = 0;
    const typingInterval = setInterval(() => {
      indexRef.current += 1;
      setDisplayText(fullText.slice(0, indexRef.current));
      if (indexRef.current >= fullText.length) {
        setIsTyping(false);
        clearInterval(typingInterval);
      }
    }, 150);
    return () => clearInterval(typingInterval);
  }, []);

  return (
    <header
      className={`fixed z-[9999] transition-all duration-[1200ms] ease-[cubic-bezier(0.23,1,0.32,1)] left-1/2 -translate-x-1/2
        ${
          scrolled
            ? "top-6 w-[95%] max-w-7xl rounded-[40px] bg-white/20 backdrop-blur-2xl border border-white/20 shadow-[0_30px_100px_rgba(0,0,0,0.12),0_10px_40px_rgba(0,0,0,0.08)] h-16"
            : "top-0 w-full rounded-none bg-white border-b border-black/5 h-20 shadow-none"
        }`}
    >
      <div
        className={`container mx-auto h-full flex items-center justify-between transition-all duration-[1200ms] ease-[cubic-bezier(0.23,1,0.32,1)]
          ${scrolled ? "px-4 sm:px-8" : "px-3 sm:px-6"}`}
      >
        {/* Logo */}
        <Link
          href="/"
          className="pointer-events-auto group relative flex items-center h-12 min-w-fit sm:min-w-[150px] md:min-w-[200px] shrink-0"
        >
          <span className="absolute left-0 top-1/2 -translate-y-1/2 text-black font-black text-lg sm:text-2xl md:text-3xl tracking-tighter uppercase inline-flex items-center transition-opacity duration-700 group-hover:opacity-0 whitespace-nowrap">
            {displayText}
            <span
              className={`w-[3px] h-[0.8em] bg-[#FACC15] ml-1 ${
                isTyping ? "opacity-100 animate-pulse" : "opacity-0"
              }`}
            />
          </span>

          <div className="absolute left-0 top-1/3 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-700 flex items-center">
            <img
              src="/arbitary-logo.png"
              alt="ARBITRARY"
              className="h-24 sm:h-32 md:h-40 w-auto object-contain bg-transparent mix-blend-multiply select-none pointer-events-none transform -translate-x-1"
            />
          </div>
        </Link>

        {/* Right side */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Desktop Nav */}
          <nav className="hidden lg:flex bg-black/5 backdrop-blur-md px-1.5 py-1.5 rounded-full border border-black/10 items-center gap-0.5">
            {[
              "Home",
              "Work",
              "Events",
              "Records",
              "Leaderboard",
              "Dashboard",
              "About",
              "Contact",
            ].map((item) => {
              const href = item === "Home" ? "/" : `/${item.toLowerCase()}`;

              const isActive = pathName === href;
              return (
                <Link
                  key={item}
                  href={href}
                  className={`px-3 md:px-4 py-2 rounded-full font-bold transition-all duration-200 text-[10px] md:text-xs uppercase tracking-wider
                      ${isActive ? "bg-black text-white shadow-md" : "text-black/60 hover:text-black hover:bg-black/5"}`}
                >
                  {item}
                </Link>
              );
            })}
          </nav>

          <ProfileDropdown redirectUrl="/" />

          {/* Mobile Menu Toggle */}
          <button
            className="lg:hidden p-2 rounded-full bg-black/5 text-black hover:bg-black/10 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 mt-2 mx-4 bg-white/90 backdrop-blur-xl border border-black/10 rounded-3xl shadow-xl overflow-hidden p-4 flex flex-col gap-2 z-50">
          {[
            "Home",
            "Work",
            "Events",
            "Records",
            "Leaderboard",
            "Dashboard",
            "About",
            "Contact",
          ].map((item) => {
            const href = item === "Home" ? "/" : `/${item.toLowerCase()}`;

            const isActive = pathName === href;
            return (
              <Link
                key={item}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-2.5 rounded-2xl font-bold transition-all duration-200 text-xs uppercase tracking-wider text-center
                    ${isActive ? "bg-black text-white shadow-md" : "text-black/70 hover:text-black hover:bg-black/5"}`}
              >
                {item}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
};

export default Header;
