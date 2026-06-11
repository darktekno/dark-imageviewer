"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface HeaderProps {
  username: string;
  onScanClick: () => void;
  onRefresh?: () => void;
}

export default function Header({ username, onScanClick, onRefresh }: HeaderProps) {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/session", { method: "DELETE" });
    router.push("/");
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-dark/95 backdrop-blur-md shadow-lg shadow-neon-cyan/5" : "bg-dark/80"
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 relative flex items-center justify-center">
              <div className="absolute inset-0 clip-hex border border-neon-cyan/40 animate-spin-slow" style={{animationDuration: "12s"}} />
              <div className="absolute inset-[2px] clip-hex bg-dark flex items-center justify-center">
                <span className="text-neon-cyan font-gaming font-bold text-xs sm:text-sm">D</span>
              </div>
            </div>
            <div>
              <h1 className="font-gaming text-sm sm:text-base font-bold leading-tight">
                <span className="text-neon-cyan">DARK</span>
                <span className="text-white/90">VIEW</span>
              </h1>
              <p className="text-[9px] text-gray-500 font-mono -mt-0.5 leading-tight">
                <span className="text-neon-cyan/50">&gt;</span> {username}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={onScanClick}
              className="px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs font-gaming font-semibold
                border border-neon-cyan/30 text-neon-cyan/80 rounded
                hover:border-neon-cyan/60 hover:text-neon-cyan hover:shadow-[0_0_12px_rgba(0,245,255,0.15)]
                transition-all duration-300 active:scale-95"
            >
              + SCAN
            </button>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-1.5 text-gray-500 hover:text-neon-cyan/70 transition-colors"
                title="Refresh"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
            <button
              onClick={handleLogout}
              className="p-1.5 text-gray-500 hover:text-neon-orange/70 transition-colors"
              title="Logout"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="h-[0.5px] bg-gradient-to-r from-transparent via-neon-cyan/20 to-transparent" />
    </header>
  );
}
