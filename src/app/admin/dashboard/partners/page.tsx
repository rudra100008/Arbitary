"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";
import { ModalShell } from "@/src/components/layout/manage-task/ModalShell";
import Image from "next/image";

type PartnerItem = {
  id: number;
  name: string;
  logoUrl: string | null;
  description: string | null;
  websiteUrl: string | null;
  category: string | null;
  sortOrder: number | null;
  createdAt: string | null;
  updatedAt: string | null;
};

const emptyForm = {
  name: "",
  logoUrl: "",
  description: "",
  websiteUrl: "",
  category: "",
  sortOrder: "0",
};

const CATEGORIES = ["Brand", "Venue", "Press", "Sponsor"];

export default function AdminPartners() {
  const [partners, setPartners] = useState<PartnerItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);

  const fetchPartners = async () => {
    try {
      const res = await fetch("/api/admin/partners");
      const data = await res.json();
      setPartners(data.partners ?? []);
    } catch {
      toast.error("Failed to load partners");
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    fetchPartners();
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setLogoFile(null);
    setLogoPreview(null);
    setRemoveLogo(false);
    setIsModalOpen(true);
  };

  const openEdit = (p: PartnerItem) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      logoUrl: p.logoUrl ?? "",
      description: p.description ?? "",
      websiteUrl: p.websiteUrl ?? "",
      category: p.category ?? "",
      sortOrder: String(p.sortOrder ?? 0),
    });
    setLogoFile(null);
    setLogoPreview(p.logoUrl);
    setRemoveLogo(false);
    setIsModalOpen(true);
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return null;
    const fd = new FormData();
    fd.append("file", logoFile);
    fd.append("type", "partner_logo");
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data.url;
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }

    setIsSaving(true);
    try {
      let logoUrl = removeLogo ? null : form.logoUrl || null;
      if (logoFile) {
        logoUrl = await uploadLogo();
      }

      const body: Record<string, unknown> = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        websiteUrl: form.websiteUrl.trim() || null,
        category: form.category || null,
        sortOrder: form.sortOrder ? Number(form.sortOrder) : 0,
        removeCover: removeLogo && !logoFile,
      };

      if (logoUrl !== null) {
        body.logoUrl = logoUrl;
      } else if (removeLogo && !logoFile) {
        body.logoUrl = null;
      }

      if (editingId) body.id = editingId;

      const res = await fetch("/api/admin/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }

      toast.success(editingId ? "Partner updated" : "Partner created");
      setIsModalOpen(false);
      fetchPartners();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    setLoadingId(String(id));
    try {
      const res = await fetch("/api/admin/partners", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete");
      }

      toast.success("Partner deleted");
      fetchPartners();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setLoadingId(null);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (logoPreview && !logoPreview.startsWith("blob:")) {
      setLogoPreview(null);
    }
    setLogoFile(file);
    setRemoveLogo(false);
    setLogoPreview(URL.createObjectURL(file));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-zinc-500">
          Brands and partners the label has worked with
        </p>
        <button
          onClick={openAdd}
          className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-black bg-[#FACC15] hover:bg-black hover:text-[#FACC15] rounded-2xl transition-all"
        >
          Add Partner
        </button>
      </div>

      {partners.length === 0 ? (
        <div className="text-center py-20 text-zinc-400">
          <p className="text-lg font-bold mb-2">No partners yet</p>
          <p className="text-sm">
            Click &quot;Add Partner&quot; to get started
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl bg-white border border-black/5 shadow-sm">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-black/5 text-[11px] font-black uppercase tracking-wider text-zinc-400">
                <th className="text-left px-5 py-4">Logo</th>
                <th className="text-left px-5 py-4">Name</th>
                <th className="text-left px-5 py-4 hidden md:table-cell">
                  Category
                </th>
                <th className="text-left px-5 py-4 hidden md:table-cell">
                  Sort
                </th>
                <th className="text-right px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-black/5 last:border-0 hover:bg-zinc-50 transition-colors"
                >
                  <td className="px-5 py-4">
                    {p.logoUrl ? (
                      <div className="relative w-10 h-10">
                        <Image
                          src={p.logoUrl}
                          alt={p.name}
                          fill
                          className="object-contain rounded-lg bg-zinc-100"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-400 text-xs font-bold">
                        —
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 font-bold text-sm">{p.name}</td>
                  <td className="px-5 py-4 text-sm text-zinc-500 hidden md:table-cell">
                    {p.category || "—"}
                  </td>
                  <td className="px-5 py-4 text-sm text-zinc-500 hidden md:table-cell">
                    {p.sortOrder ?? 0}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(p)}
                        className="px-3 md:px-4 py-1.5 md:py-2 rounded-lg transition-all text-[11px] md:text-xs font-black whitespace-nowrap bg-zinc-100 text-zinc-700 hover:bg-black hover:text-white"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        disabled={loadingId === String(p.id)}
                        className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg transition-all text-[11px] md:text-xs font-black whitespace-nowrap ${
                          loadingId === String(p.id)
                            ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                            : "bg-red-50 text-red-600 hover:bg-red-600 hover:text-white"
                        }`}
                      >
                        {loadingId === String(p.id) ? "..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <ModalShell
            onClose={() => setIsModalOpen(false)}
            title={editingId ? "Edit Partner" : "New Partner"}
            subtitle="Our Work"
            scrollableBody
            footer={
              <>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-black/10 text-sm font-bold text-zinc-600 hover:bg-zinc-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 py-3 rounded-xl bg-black text-white text-sm font-black uppercase tracking-wider hover:bg-[#FACC15] hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? "Saving..." : editingId ? "Update" : "Create"}
                </button>
              </>
            }
          >
            <div className="p-4 md:p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">
                  Brand Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-sm focus:outline-none focus:border-[#FACC15] focus:ring-1 focus:ring-[#FACC15] transition-all"
                  placeholder="Brand or partner name"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-sm focus:outline-none focus:border-[#FACC15] focus:ring-1 focus:ring-[#FACC15] transition-all"
                >
                  <option value="">No category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Logo */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">
                  Logo
                </label>
                {logoPreview ? (
                  <div className="relative inline-block">
                    <Image
                      src={logoPreview}
                      alt="Preview"
                      width={200}
                      height={200}
                      unoptimized
                      className="h-20 w-20 object-contain rounded-xl bg-zinc-100 border border-zinc-200"
                    />
                    <button
                      onClick={() => {
                        setLogoFile(null);
                        setLogoPreview(null);
                        setRemoveLogo(true);
                      }}
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 border-dashed cursor-pointer hover:border-[#FACC15] transition-colors text-sm text-zinc-500">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Upload logo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Website URL */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">
                  Website URL
                </label>
                <input
                  type="url"
                  value={form.websiteUrl}
                  onChange={(e) =>
                    setForm({ ...form, websiteUrl: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-sm focus:outline-none focus:border-[#FACC15] focus:ring-1 focus:ring-[#FACC15] transition-all"
                  placeholder="https://..."
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-sm focus:outline-none focus:border-[#FACC15] focus:ring-1 focus:ring-[#FACC15] transition-all resize-none"
                  placeholder="Brief description of the partnership"
                />
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm({ ...form, sortOrder: e.target.value })
                  }
                  min={0}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-sm focus:outline-none focus:border-[#FACC15] focus:ring-1 focus:ring-[#FACC15] transition-all"
                />
              </div>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>
    </div>
  );
}
