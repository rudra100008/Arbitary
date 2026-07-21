"use client";

import { useQuery } from "@tanstack/react-query";

export type PlatformFlags = {
    facebook: boolean;
    instagram: boolean;
    facebookConnected: boolean;
};

export const PLATFORM_FLAGS_QUERY_KEY = ["platform-flags"] as const;

const DEFAULT_FLAGS: PlatformFlags = { facebook: true, instagram: true, facebookConnected: false };

/**
 * Reads the current Facebook / Instagram enabled state from
 * /api/platform-flags. Fails open (both enabled) while loading or on error,
 * so a flags-endpoint outage never hides working functionality — the real
 * enforcement always happens server-side regardless of what this returns.
 */
export function usePlatformFlags() {
    const query = useQuery({
        queryKey: PLATFORM_FLAGS_QUERY_KEY,
        queryFn: async () => {
            const res = await fetch("/api/platform-flags");
            if (!res.ok) throw new Error("Failed to fetch platform flags");
            return (await res.json()) as PlatformFlags;
        },
        staleTime: 60_000,
    });

    return {
        flags: query.data ?? DEFAULT_FLAGS,
        isLoading: query.isLoading,
    };
}
