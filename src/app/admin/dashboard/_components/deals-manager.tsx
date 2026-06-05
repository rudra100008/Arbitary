"use client";

import { useEffect, useState } from "react";

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
  isActive: boolean;
  createdAt: string | null;
  totalCodes: number;
  availableCodes: number;
  redeemedCodes: number;
};

const defaultForm = {
  title: "",
  description: "",
  pointsCost: "",
  discountType: "percent",
  discountValue: "",
  discountMaxAmount: "",
  imageUrl: "",
  codes: "",
};

const DealsManager = () => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId(null);
    setShowForm(false);
  };

  const fetchDeals = async () => {
    try {
      const res = await fetch(`/api/admin/deals?t=${Date.now()}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setDeals(data);
      } else if (data.error) {
        alert("Failed to load deals: " + data.error);
      }
    } catch {
      alert("Failed to load deals");
    }
  };

  useEffect(() => {
    fetchDeals();
  }, []);

  const handleSave = async () => {
    if (!form.title || !form.description || !form.pointsCost || !form.discountValue) {
      alert("Title, description, points cost and discount value are required");
      return;
    }
    if (form.discountType === "percent" && Number(form.discountValue) > 100) {
      alert("Percent discount cannot exceed 100");
      return;
    }
    if (!editingId && !form.codes.trim()) {
      alert("At least one redeem code is required");
      return;
    }

    setSaving(true);
    try {
      const codes = form.codes
        .split(/[\n,]+/)
        .map((c) => c.trim())
        .filter(Boolean);

      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim(),
        pointsCost: Number(form.pointsCost),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
      };
      if (form.discountMaxAmount) {
        payload.discountMaxAmount = Number(form.discountMaxAmount);
      }
      if (form.imageUrl.trim()) {
        payload.imageUrl = form.imageUrl.trim();
      }

      let res: Response;
      if (editingId) {
        payload.id = editingId;
        payload.newCodes = codes;
        res = await fetch("/api/admin/deals", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        payload.codes = codes;
        res = await fetch("/api/admin/deals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (res.ok) {
        resetForm();
        fetchDeals();
      } else {
        alert("Failed: " + (data.error || "Unknown error"));
      }
    } catch {
      alert("An error occurred while saving");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: number, isActive: boolean) => {
    setTogglingId(id);
    try {
      const res = await fetch("/api/admin/deals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !isActive }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchDeals();
      } else {
        alert("Failed: " + (data.error || "Unknown error"));
      }
    } catch {
      alert("An error occurred");
    } finally {
      setTogglingId(null);
    }
  };

  const handleEdit = (deal: Deal) => {
    setEditingId(deal.id);
    setForm({
      title: deal.title,
      description: deal.description,
      pointsCost: String(deal.pointsCost),
      discountType: deal.discountType || "percent",
      discountValue: String(deal.discountValue || ""),
      discountMaxAmount: deal.discountMaxAmount ? String(deal.discountMaxAmount) : "",
      imageUrl: deal.imageUrl || "",
      codes: "",
    });
    setShowForm(true);
  };

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-8 rounded-[2rem] border border-black/5 shadow-sm">
        <div>
          <h3 className="text-2xl font-black uppercase tracking-tighter">Deals</h3>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">
            {deals.length} total &middot; {deals.filter((d) => d.isActive).length} active
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="px-8 py-4 bg-[#FACC15] text-black font-black uppercase tracking-widest rounded-2xl hover:bg-black hover:text-white transition-all shadow-lg shadow-[#FACC15]/20 text-xs"
        >
          + New Deal
        </button>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="bg-white p-10 rounded-[2.5rem] border border-black/5 shadow-sm space-y-6">
          <h4 className="text-sm font-black uppercase tracking-widest">
            {editingId ? "Edit Deal" : "New Deal"}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. 20% Off Voucher"
                className="w-full px-6 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-[#FACC15] font-bold text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Points Cost</label>
              <input
                type="number"
                value={form.pointsCost}
                onChange={(e) => setForm({ ...form, pointsCost: e.target.value })}
                placeholder="e.g. 500"
                className="w-full px-6 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-[#FACC15] font-bold text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Discount Type</label>
              <select
                value={form.discountType}
                onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                className="w-full px-6 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-[#FACC15] font-bold text-sm appearance-none"
              >
                <option value="percent">Percent Off</option>
                <option value="amount">Fixed Amount Off</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                {form.discountType === "percent" ? "Discount Percent" : "Discount Amount"}
              </label>
              <input
                type="number"
                value={form.discountValue}
                onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                placeholder={form.discountType === "percent" ? "e.g. 20" : "e.g. 500"}
                className="w-full px-6 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-[#FACC15] font-bold text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Max Discount Cap</label>
              <input
                type="number"
                value={form.discountMaxAmount}
                onChange={(e) => setForm({ ...form, discountMaxAmount: e.target.value })}
                placeholder="e.g. 1000"
                disabled={form.discountType !== "percent"}
                className="w-full px-6 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-[#FACC15] font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Image URL</label>
              <input
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="https://..."
                className="w-full px-6 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-[#FACC15] font-bold text-sm"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Short description shown to users..."
                className="w-full px-6 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-[#FACC15] font-bold text-sm h-24 resize-none"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                Redeem Codes {editingId ? "(add more — one per line)" : "(one per line)"}
              </label>
              <textarea
                value={form.codes}
                onChange={(e) => setForm({ ...form, codes: e.target.value })}
                placeholder={editingId ? "Add extra codes to top up stock..." : "CODE-001\nCODE-002\nCODE-003"}
                className="w-full px-6 py-4 bg-zinc-50 border border-black/5 rounded-2xl focus:outline-none focus:border-[#FACC15] font-mono text-sm h-32 resize-none"
              />
              <p className="text-[10px] font-bold text-zinc-400 tracking-wider">
                Codes are encrypted at rest. {editingId ? "Existing codes are never displayed." : ""}
              </p>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-10 py-4 bg-[#FACC15] text-black font-black uppercase tracking-widest rounded-2xl hover:bg-black hover:text-[#FACC15] transition-all text-xs disabled:opacity-40"
            >
              {saving ? "Saving..." : editingId ? "Update Deal" : "Create Deal"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-8 py-4 bg-zinc-100 text-black font-black uppercase tracking-widest rounded-2xl hover:bg-zinc-200 transition-all text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Deals Table */}
      <div className="bg-white rounded-[2.5rem] border border-black/5 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-zinc-50 border-b border-black/5">
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Deal</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Cost</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Discount</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Stock</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Status</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {deals.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-8 py-16 text-center text-zinc-300 font-black uppercase tracking-widest text-[10px]">
                  No deals yet — create one above
                </td>
              </tr>
            ) : deals.map((deal) => (
              <tr key={deal.id} className="hover:bg-zinc-50/50 transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    {deal.imageUrl && (
                      <img src={deal.imageUrl} alt={deal.title} className="w-12 h-12 rounded-xl object-cover border border-black/5" />
                    )}
                    <div>
                      <p className="font-bold text-sm uppercase tracking-tight">{deal.title}</p>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wider mt-0.5 line-clamp-1 max-w-xs">{deal.description}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className="text-lg font-black">{deal.pointsCost}</span>
                  <span className="text-[9px] font-black text-zinc-400 ml-1">PTS</span>
                </td>
                <td className="px-8 py-6">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#8a6d00]">
                      {deal.discountType === "amount"
                        ? `Rs ${deal.discountValue}`
                        : `${deal.discountValue}% off`}
                    </span>
                    {deal.discountType === "percent" && deal.discountMaxAmount ? (
                      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                        up to Rs {deal.discountMaxAmount}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-green-600">
                      {deal.availableCodes} available
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                      {deal.redeemedCodes} redeemed &middot; {deal.totalCodes} total
                    </span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                    deal.isActive
                      ? "bg-green-50 text-green-600"
                      : "bg-zinc-100 text-zinc-400"
                  }`}>
                    {deal.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleEdit(deal)}
                      className="p-2 hover:bg-black hover:text-[#FACC15] rounded-lg transition-all text-xs font-black uppercase"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggle(deal.id, deal.isActive)}
                      disabled={togglingId === deal.id}
                      className={`p-2 rounded-lg transition-all text-xs font-black uppercase disabled:opacity-40 ${
                        deal.isActive
                          ? "hover:bg-red-500 hover:text-white"
                          : "hover:bg-green-500 hover:text-white"
                      }`}
                    >
                      {togglingId === deal.id ? "..." : deal.isActive ? "Disable" : "Enable"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DealsManager;
