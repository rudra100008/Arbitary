"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";
import { ModalShell } from "@/src/components/layout/manage-task/ModalShell";

type TeamMemberItem = {
  id: number;
  name: string;
  role: string;
  photoUrl: string | null;
  bio: string | null;
  sortOrder: number | null;
  createdAt: string | null;
  updatedAt: string | null;
};

const emptyForm = {
  name: "",
  role: "",
  photoUrl: "",
  bio: "",
  sortOrder: "0",
};

export default function AdminTeamMembers() {
  const [members, setMembers] = useState<TeamMemberItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);

  const fetchMembers = async () => {
    try {
      const res = await fetch("/api/admin/team-members");
      const data = await res.json();
      setMembers(data.teamMembers ?? []);
    } catch {
      toast.error("Failed to load team members");
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setPhotoFile(null);
    setPhotoPreview(null);
    setRemovePhoto(false);
    setIsModalOpen(true);
  };

  const openEdit = (m: TeamMemberItem) => {
    setEditingId(m.id);
    setForm({
      name: m.name,
      role: m.role,
      photoUrl: m.photoUrl ?? "",
      bio: m.bio ?? "",
      sortOrder: String(m.sortOrder ?? 0),
    });
    setPhotoFile(null);
    setPhotoPreview(m.photoUrl);
    setRemovePhoto(false);
    setIsModalOpen(true);
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile) return null;
    const fd = new FormData();
    fd.append("file", photoFile);
    fd.append("type", "member_photo");
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data.url;
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!form.role.trim()) { toast.error("Role is required"); return; }

    setIsSaving(true);
    try {
      let photoUrl = removePhoto ? null : form.photoUrl || null;
      if (photoFile) photoUrl = await uploadPhoto();

      const body: Record<string, unknown> = {
        name: form.name.trim(),
        role: form.role.trim(),
        bio: form.bio.trim() || null,
        sortOrder: form.sortOrder ? Number(form.sortOrder) : 0,
        removePhoto: removePhoto && !photoFile,
      };

      if (photoUrl !== null) body.photoUrl = photoUrl;
      else if (removePhoto && !photoFile) body.photoUrl = null;

      if (editingId) body.id = editingId;

      const res = await fetch("/api/admin/team-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }

      toast.success(editingId ? "Member updated" : "Member created");
      setIsModalOpen(false);
      fetchMembers();
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
      const res = await fetch("/api/admin/team-members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete");
      }

      toast.success("Member deleted");
      fetchMembers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setLoadingId(null);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photoPreview && !photoPreview.startsWith("blob:")) setPhotoPreview(null);
    setPhotoFile(file);
    setRemovePhoto(false);
    setPhotoPreview(URL.createObjectURL(file));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-zinc-500">
          People behind the label
        </p>
        <button
          onClick={openAdd}
          className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-black bg-[#FACC15] hover:bg-black hover:text-[#FACC15] rounded-2xl transition-all"
        >
          Add Member
        </button>
      </div>

      {members.length === 0 ? (
        <div className="text-center py-20 text-zinc-400">
          <p className="text-lg font-bold mb-2">No team members yet</p>
          <p className="text-sm">Click &quot;Add Member&quot; to get started</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl bg-white border border-black/5 shadow-sm">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-black/5 text-[11px] font-black uppercase tracking-wider text-zinc-400">
                <th className="text-left px-5 py-4">Photo</th>
                <th className="text-left px-5 py-4">Name</th>
                <th className="text-left px-5 py-4 hidden md:table-cell">Role</th>
                <th className="text-left px-5 py-4 hidden md:table-cell">Sort</th>
                <th className="text-right px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-black/5 last:border-0 hover:bg-zinc-50 transition-colors"
                >
                  <td className="px-5 py-4">
                    {m.photoUrl ? (
                      <img
                        src={m.photoUrl}
                        alt={m.name}
                        className="w-10 h-10 object-cover rounded-full bg-zinc-100"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 text-xs font-bold">
                        {m.name[0]}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 font-bold text-sm">{m.name}</td>
                  <td className="px-5 py-4 text-sm text-zinc-500 hidden md:table-cell">
                    {m.role}
                  </td>
                  <td className="px-5 py-4 text-sm text-zinc-500 hidden md:table-cell">
                    {m.sortOrder ?? 0}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(m)}
                        className="px-3 md:px-4 py-1.5 md:py-2 rounded-lg transition-all text-[11px] md:text-xs font-black whitespace-nowrap bg-zinc-100 text-zinc-700 hover:bg-black hover:text-white"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(m.id, m.name)}
                        disabled={loadingId === String(m.id)}
                        className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg transition-all text-[11px] md:text-xs font-black whitespace-nowrap ${
                          loadingId === String(m.id)
                            ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                            : "bg-red-50 text-red-600 hover:bg-red-600 hover:text-white"
                        }`}
                      >
                        {loadingId === String(m.id) ? "..." : "Delete"}
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
            title={editingId ? "Edit Member" : "New Member"}
            subtitle="Team"
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
                  Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-sm focus:outline-none focus:border-[#FACC15] focus:ring-1 focus:ring-[#FACC15] transition-all"
                  placeholder="Full name"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">
                  Role *
                </label>
                <input
                  type="text"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-sm focus:outline-none focus:border-[#FACC15] focus:ring-1 focus:ring-[#FACC15] transition-all"
                  placeholder="e.g. Creative Director"
                />
              </div>

              {/* Photo */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">
                  Photo
                </label>
                {photoPreview ? (
                  <div className="relative inline-block">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="h-20 w-20 object-cover rounded-full bg-zinc-100 border border-zinc-200"
                    />
                    <button
                      onClick={() => {
                        setPhotoFile(null);
                        setPhotoPreview(null);
                        setRemovePhoto(true);
                      }}
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 border-dashed cursor-pointer hover:border-[#FACC15] transition-colors text-sm text-zinc-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Upload photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Bio */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">
                  Bio
                </label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-sm focus:outline-none focus:border-[#FACC15] focus:ring-1 focus:ring-[#FACC15] transition-all resize-none"
                  placeholder="Short bio"
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
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
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
