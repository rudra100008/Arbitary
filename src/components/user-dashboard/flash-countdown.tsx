"use client";
import { useState, useEffect } from "react";

export function FlashCountdown({ expiresAt }: { expiresAt: string }) {
    const [timeLeft, setTimeLeft] = useState("");

    useEffect(() => {
        const update = () => {
            const now = Date.now();
            const target = new Date(expiresAt).getTime();
            const diff = target - now;
            if (diff <= 0) {
                setTimeLeft("Expired");
                return;
            }
            const hours = Math.floor(diff / 3600000);
            const minutes = Math.floor((diff % 3600000) / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            setTimeLeft(`${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
        };
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, [expiresAt]);

    if (!timeLeft) return null;

    return (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${timeLeft === "Expired" ? "bg-red-500/30 text-red-200" : "bg-yellow-400/20 text-yellow-200"}`}>
            ⚡ {timeLeft}
        </span>
    );
}
