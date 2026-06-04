"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
    document.title = "Rewards | Arbitary";
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

  const { data: redemptions = [], isLoading: historyLoading } = useQuery<Redemption[]>({
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
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-in-up { animation: fadeInUp 0.3s ease-out forwards; }
      `}</style>

      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        {/* Heading */}
        <div className="flex flex-col items-center gap-1.5 py-8">
          <h1 className="text-3xl font-black uppercase tracking-[0.18em] text-slate-900">
            Rewards
          </h1>
          {dealsData && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200">
                ✦ {dealsData.userPoints.toLocaleString()} pts
              </span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-white border border-black/8 rounded-2xl w-fit mx-auto mb-8 relative shadow-sm">
          {(["deals", "history"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative z-10 px-6 py-2 text-sm font-semibold rounded-xl capitalize transition-colors duration-200 ${
                activeTab === tab ? "text-white" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {tab === "deals" ? "Available Deals" : "My Redemptions"}
            </button>
          ))}
          <div
            className="absolute top-1 bottom-1 rounded-xl bg-slate-900 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            style={{
              width: "50%",
              transform: `translateX(${activeTab === "deals" ? "0%" : "100%"})`,
            }}
          />
        </div>

        {activeTab === "deals" && (
          <div className="fade-in-up">
            {dealsLoading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-slate-900 animate-spin" />
              </div>
            ) : !dealsData?.deals?.length ? (
              <div className="text-center py-20">
                <p className="text-slate-400 text-sm font-semibold">No deals available right now</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {dealsData.deals.map((deal) => {
                  const canAfford = (dealsData.userPoints ?? 0) >= deal.pointsCost;
                  const outOfStock = deal.stock !== null && deal.available <= 0;
                  return (
                    <div
                      key={deal.id}
                      className="bg-white rounded-3xl border border-black/8 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                    >
                      {deal.imageUrl && (
                        <div className="aspect-[16/9] bg-slate-100 overflow-hidden">
                          <img
                            src={deal.imageUrl}
                            alt={deal.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="p-5 flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-base font-bold text-slate-900 leading-tight">
                            {deal.title}
                          </h3>
                          <span className="shrink-0 text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                            ✦ {deal.pointsCost.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">
                          {deal.description}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {deal.discountType === "percent" ? (
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              {deal.discountValue}% OFF
                              {deal.discountMaxAmount ? ` (up to $${deal.discountMaxAmount})` : ""}
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              ${deal.discountValue} OFF
                            </span>
                          )}
                          {deal.stock !== null && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              deal.available <= 3
                                ? "text-red-700 bg-red-100"
                                : "text-slate-500 bg-slate-100"
                            }`}>
                              {deal.available} left
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => setConfirmDeal(deal)}
                          disabled={!canAfford || outOfStock}
                          className="w-full mt-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                          style={{
                            background: canAfford && !outOfStock
                              ? "#FACC15"
                              : "rgb(226 232 240)",
                            color: canAfford && !outOfStock ? "black" : "rgb(148 163 184)",
                          }}
                        >
                          {outOfStock ? "Out of stock" : !canAfford ? "Not enough points" : "Redeem →"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="fade-in-up">
            {historyLoading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-slate-900 animate-spin" />
              </div>
            ) : !redemptions.length ? (
              <div className="text-center py-20">
                <p className="text-slate-400 text-sm font-semibold">No redemptions yet</p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-black/8 shadow-sm overflow-hidden">
                {redemptions.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between px-6 py-4 border-b border-black/5 last:border-b-0"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-bold text-slate-900">{r.dealTitle}</span>
                      <span className="text-xs text-slate-400">
                        {new Date(r.createdAt).toLocaleDateString()} · -{r.pointsSpent} pts
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {r.revealedCode && (
                        <code className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          {r.revealedCode}
                        </code>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        r.status === "fulfilled"
                          ? "text-emerald-700 bg-emerald-100"
                          : "text-amber-700 bg-amber-100"
                      }`}>
                        {r.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />

      {/* Confirm redeem modal */}
      {confirmDeal && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmDeal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" style={{ animation: "fadeInUp 0.2s ease-out" }}>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Redeem deal?</h3>
            <p className="text-sm text-slate-500 mb-1">{confirmDeal.title}</p>
            <p className="text-sm font-bold text-amber-700 mb-5">Cost: ✦ {confirmDeal.pointsCost.toLocaleString()}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDeal(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => redeemMutation.mutate(confirmDeal.id)}
                disabled={redeemMutation.isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-black bg-[#FACC15] hover:bg-[#eab308] transition-colors disabled:opacity-50"
              >
                {redeemMutation.isPending ? "..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success modal */}
      {redeemedCode && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setRedeemedCode(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center" style={{ animation: "fadeInUp 0.2s ease-out" }}>
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Redeemed!</h3>
            <p className="text-xs text-slate-400 mb-4">Your discount code:</p>
            <div className="bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 mb-5">
              <code className="text-sm font-mono font-bold text-slate-900 break-all select-all">{redeemedCode}</code>
            </div>
            <button
              onClick={() => {
                setRedeemedCode(null);
                navigator.clipboard.writeText(redeemedCode);
                toast.success("Code copied!");
              }}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-black bg-[#FACC15] hover:bg-[#eab308] transition-colors"
            >
              Copy Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
