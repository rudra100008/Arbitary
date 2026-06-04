"use client";

import React from "react";

interface SectionHeaderProps {
  label: string;
  title: string;
  actions?: React.ReactNode;
}

/**
 * Reusable dark gradient header used at the top of each tab's main card.
 * Includes the decorative circle, label/title, and optional action buttons.
 */
export default function SectionHeader({
  label,
  title,
  actions,
}: SectionHeaderProps) {
  return (
    <>
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 pt-5 pb-6">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/5" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">
              {label}
            </p>
            <h2 className="text-white text-xl font-black">{title}</h2>
          </div>
          {actions}
        </div>
      </div>
      {/* Curved transition to white */}
      <div className="h-3 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative">
        <div className="absolute inset-x-0 bottom-0 h-3 bg-white rounded-t-2xl" />
      </div>
    </>
  );
}
