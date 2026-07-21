"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
// TODO: Deals feature is temporarily disabled. The data-fetching/mutation
// layer below is kept for when the feature is re-enabled. Remove the
// eslint-disable comments if/when the real UI is restored.
/* eslint-disable @typescript-eslint/no-unused-vars */
import Footer from "@/src/components/ui/footer";
import Header from "@/src/components/ui/header";

type Deal = {
  id: number;
  title: string;
  description: string;
  pointsCost: number;
  discountType: string;
  discountValue: number;
  discountMaxAmount: number | null;
  imageUrl: string | null;
  stock: number | null;
  available: number;
};

type Redemption = {
  id: number;
  pointsSpent: number;
  status: string;
  revealedCode: string | null;
  createdAt: string;
  dealTitle: string;
};

export default function DealsPage() {
  const [activeTab, setActiveTab] = useState<"deals" | "history">("deals");
  const [confirmDeal, setConfirmDeal] = useState<Deal | null>(null);
  const [redeemedCode, setRedeemedCode] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    document.title = "Rewards | Arbitrary";
  }, []);

  const { data: dealsData, isLoading: dealsLoading } = useQuery<{
    deals: Deal[];
    userPoints: number;
  }>({
    queryKey: ["deals"],
    queryFn: async () => {
      const res = await fetch("/api/deals");
      if (!res.ok) throw new Error("Failed to fetch deals");
      return res.json();
    },
  });

  const { data: redemptions = [], isLoading: historyLoading } = useQuery<
    Redemption[]
  >({
    queryKey: ["redemptions"],
    queryFn: async () => {
      const res = await fetch("/api/redemptions");
      if (!res.ok) throw new Error("Failed to fetch redemptions");
      return res.json();
    },
    enabled: activeTab === "history",
  });

  const redeemMutation = useMutation({
    mutationFn: async (dealId: number) => {
      const res = await fetch(`/api/deals/${dealId}/redeem`, {
        method: "POST",
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to redeem deal");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setRedeemedCode(data.code);
      setConfirmDeal(null);
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["redemptions"] });
      queryClient.invalidateQueries({ queryKey: ["user-points"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setConfirmDeal(null);
    },
  });

  return (
    <div className="bg-[#F5F5F0] pt-24 text-black min-h-screen flex flex-col selection:bg-[#FACC15] selection:text-black">
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-amber-100 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight mb-3">
            Rewards
          </h1>
          <p className="text-sm text-zinc-500 leading-relaxed">
            This feature is temporarily unavailable. Please check back later.
          </p>
        </div>
      </main>
    </div>
  );
}
