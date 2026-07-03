"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import ProfileDropdown from "./profile-dropdown";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { NotificationBell } from "@/src/components/notifications/notification-bell";

const Header = () => {
  const { status } = useSession();
  const fullText = "ARBITRARY";
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const pathName = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const indexRef = useRef(0);

  const { data: liveStatus } = useQuery({
    queryKey: ["live-status"],
    queryFn: async () => {
      const res = await fetch("/api/live/status");
      if (!res.ok) return { live: false, youtubeId: null };
      return res.json() as Promise<{ live: boolean; youtubeId: string | null }>;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const { data: featureFlags } = useQuery({
    queryKey: ["feature-flags"],
    queryFn: async () => {
      const res = await fetch("/api/feature-flags");
      const data = await res.json() as { flags: Record<string, boolean> };
      return data.flags;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const navItems = useMemo(() => {
    const items = [
      "Home",
      "Work",
      "Events",
      "Records",
    ];
    if (featureFlags?.leaderboard !== false) {
      items.push("Leaderboard");
    }
    if (featureFlags?.dashboard !== false) {
      items.push("Dashboard");
    }
    items.push("About", "Contact");
    if (liveStatus?.live) {
      items.splice(4, 0, "Live");
    }
    return items;
  }, [featureFlags, liveStatus]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1280) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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
            ? "w-[95%] max-w-7xl rounded-[40px] bg-white/20 backdrop-blur-2xl border border-white/20 shadow-[0_30px_100px_rgba(0,0,0,0.12),0_10px_40px_rgba(0,0,0,0.08)] h-16"
            : "w-full rounded-none bg-white border-b border-black/5 h-20 shadow-none"
        }`}
      style={{
        top: scrolled
          ? "calc(var(--banner-h, 0px) + 1.5rem)"
          : "var(--banner-h, 0px)",
      }}
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
          <nav className="hidden xl:flex bg-black/5 backdrop-blur-md px-1.5 py-1.5 rounded-full border border-black/10 items-center gap-0.5">
            {navItems.map((item) => {
              const href = item === "Home" ? "/" : `/${item.toLowerCase()}`;

              const isActive = pathName === href;
              return (
                <Link
                  key={item}
                  href={href}
                  className={`px-3 md:px-4 py-2 rounded-full font-bold transition-all duration-200 text-[10px] md:text-xs uppercase tracking-wider
                      ${isActive ? "bg-black text-white shadow-md" : "text-black/60 hover:text-black hover:bg-black/5"}`}
                >
                  <span>{item}</span>
                  {item === "Live" && (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse ml-1.5 inline-block" />
                  )}
                </Link>
              );
            })}
          </nav>

          {status === "authenticated" && <NotificationBell />}

          <ProfileDropdown redirectUrl="/" />

          {/* Mobile Menu Toggle */}
          <button
            className="xl:hidden p-2 rounded-full bg-black/5 text-black hover:bg-black/10 transition-colors cursor-pointer"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className={`absolute left-0 right-0 top-full overflow-hidden xl:hidden
              ${
                scrolled
                  ? "mt-2 rounded-[30px] bg-white/90 backdrop-blur-2xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.15)]"
                  : "border-b border-black/5 bg-white shadow-lg"
              }`}
          >
            <div
              className={`flex flex-col gap-1 py-4 px-6 ${scrolled ? "" : "border-t border-black/5"}`}
            >
              {navItems.map((item, idx) => {
                const href = item === "Home" ? "/" : `/${item.toLowerCase()}`;
                const isActive = pathName === href;
                return (
                  <motion.div
                    key={item}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Link
                      href={href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between py-3 px-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all duration-200
                        ${
                          isActive
                            ? "bg-black text-white"
                            : "text-black/70 hover:text-black hover:bg-black/5"
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{item}</span>
                        {item === "Live" && (
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
                        )}
                      </div>
                      {isActive && (
                        <span className="w-2 h-2 rounded-full bg-[#FACC15]" />
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
