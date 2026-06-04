"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";

export default function ShareRedirectPage() {
    const params = useParams();
    const shareCode = params.shareCode as string;
    const calledRef = useRef(false);

    useEffect(() => {
        if (calledRef.current) return;
        calledRef.current = true;

        async function handleRedirect() {
            const storageKey = `clicked_${shareCode}`;
            const fallback = `${window.location.origin}/events`;

            // Fast path: already clicked — redirect immediately, no API call
            if (localStorage.getItem(storageKey)) {
                window.location.href = fallback;
                return;
            }

            try {
                const FingerprintJS = await import("@fingerprintjs/fingerprintjs");
                const fp = await FingerprintJS.load();
                const result = await fp.get();
                const visitorId = result.visitorId;

                const res = await fetch("/api/share-click", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ shareCode, fingerprint: visitorId, userAgent: navigator.userAgent }),
                });

                const data = await res.json();

                if (data.allowed) {
                    localStorage.setItem(storageKey, "true");
                }

                window.location.href = data.redirectUrl || fallback;
            } catch {
                // Fallback: still redirect, just won't count
                window.location.href = fallback;
            }
        }

        if (shareCode) handleRedirect();
    }, [shareCode]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-zinc-950">
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-[#FACC15] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-zinc-400 font-medium">Redirecting...</p>
            </div>
        </div>
    );
}
