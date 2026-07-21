"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface StashedPage {
  id: string;
  name: string;
  igUserId: string | null;
  igUsername: string | null;
}

export default function SelectPageClient({ pages }: { pages: StashedPage[] }) {
  const router = useRouter();
  const [selecting, setSelecting] = useState<string | null>(null);

  const handleSelect = async (pageId: string) => {
    setSelecting(pageId);
    try {
      const res = await fetch("/api/admin/facebook/select-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to select page");
      }

      toast.success("Facebook Page connected!");
      router.push("/admin/dashboard/settings?connected=1");
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to select page";
      toast.error(message);
      setSelecting(null);
    }
  };

  return (
    <div className="animate-fade-in space-y-8 max-w-2xl">
      <div className="bg-white rounded-[2.5rem] border border-black/5 overflow-hidden shadow-sm p-4 md:p-8">
        <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter mb-2">
          Select Facebook Page
        </h3>
        <p className="text-xs text-zinc-400 mb-6">
          Your Facebook account manages multiple pages. Choose which page you
          want to connect for social post browsing and task verification.
        </p>

        <div className="space-y-3">
          {pages.map((page) => (
            <div
              key={page.id}
              className="flex items-center justify-between px-4 py-4 bg-zinc-50 border border-black/5 rounded-2xl transition-all duration-200 hover:bg-white hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#1877F2] shadow-sm shrink-0">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-black text-black uppercase tracking-wide">
                    {page.name}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    ID: {page.id}
                    {page.igUsername && (
                      <span className="ml-2">
                        | Instagram: @{page.igUsername}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <button
                disabled={selecting !== null}
                onClick={() => handleSelect(page.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                  selecting === page.id
                    ? "bg-black/10 text-black/40 cursor-wait"
                    : "bg-black text-white hover:bg-black/80 active:scale-95"
                }`}
              >
                {selecting === page.id ? "Connecting..." : "Select"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
