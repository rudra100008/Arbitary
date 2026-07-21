"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";
import { ModalShell } from "@/src/components/layout/manage-task/ModalShell";
import Image from "next/image";

type RecordItem = {
  id: number;
  title: string;
  artist: string;
  releaseMonth: number | null;
  releaseYear: number | null;
  genre: string | null;
  coverImageUrl: string | null;
  labelColor: string | null;
  youtubeUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const emptyForm = {
  title: "",
  artist: "",
  releaseMonth: "",
  releaseYear: "",
  genre: "",
  coverImageUrl: "",
  labelColor: "#000000",
  youtubeUrl: "",
};

export default function AdminRecords() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [removeCover, setRemoveCover] = useState(false);

  const fetchRecords = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/records");
      const data = await res.json();
      if (data.records) setRecords(data.records);
    } catch {
      toast.error("Failed to load records");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    fetchRecords();
  }, [fetchRecords]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setCoverFile(null);
    setCoverPreview("");
    setRemoveCover(false);
    setIsModalOpen(true);
  };

  const openEdit = (record: RecordItem) => {
    setEditingId(record.id);
    setForm({
      title: record.title,
      artist: record.artist,
      releaseMonth: record.releaseMonth?.toString() ?? "",
      releaseYear: record.releaseYear?.toString() ?? "",
      genre: record.genre ?? "",
      coverImageUrl: record.coverImageUrl ?? "",
      labelColor: record.labelColor ?? "#000000",
      youtubeUrl: record.youtubeUrl ?? "",
    });
    setCoverPreview(record.coverImageUrl ?? "");
    setCoverFile(null);
    setRemoveCover(false);
    setIsModalOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const uploadCover = async (): Promise<string | null> => {
    if (!coverFile) return form.coverImageUrl || null;
    const formData = new FormData();
    formData.append("file", coverFile);
    formData.append("type", "record_cover");
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || "Upload failed");
    }
    const data = await res.json();
    return data.url;
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!form.artist.trim()) {
      toast.error("Artist is required");
      return;
    }
    if (!form.youtubeUrl.trim()) {
      toast.error("YouTube link is required");
      return;
    }
    if (!/(?:youtube\.com|youtu\.be)/i.test(form.youtubeUrl.trim())) {
      toast.error("Please enter a valid YouTube link");
      return;
    }

    setIsSaving(true);
    try {
      let coverUrl = form.coverImageUrl;
      if (coverFile) {
        coverUrl = (await uploadCover()) ?? coverUrl;
      }

      const payload: Record<string, unknown> = {
        title: form.title,
        artist: form.artist,
        releaseMonth: form.releaseMonth
          ? parseInt(form.releaseMonth, 10)
          : null,
        releaseYear: form.releaseYear ? parseInt(form.releaseYear, 10) : null,
        genre: form.genre || null,
        coverImageUrl: removeCover ? null : coverUrl || null,
        labelColor: form.labelColor || null,
        youtubeUrl: form.youtubeUrl.trim(),
        removeCover: removeCover || undefined,
      };
      if (editingId) payload.id = editingId;

      const res = await fetch("/api/admin/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      toast.success(editingId ? "Record updated" : "Record created");
      setIsModalOpen(false);
      fetchRecords();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setLoadingId(String(id));
    try {
      const res = await fetch("/api/admin/records", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Record deleted");
      fetchRecords();
    } catch {
      toast.error("Failed to delete record");
    } finally {
      setLoadingId(null);
    }
  };

  const inputClass =
    "w-full px-4 py-3 bg-zinc-50 border border-black/10 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#FACC15]/40 focus:border-[#FACC15]/50 transition-all";
  const labelClass =
    "text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 block";

  return (
    <div className="animate-fade-in space-y-8">
      <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}.fade-in-up{animation:fadeInUp .25s ease-out forwards}`}</style>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 md:p-8 rounded-[2rem] border border-black/5 shadow-sm">
        <div>
          <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter">
            Records Catalog
          </h3>
          <p className="text-[10px] md:text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">
            {records.length} record{records.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <button
          onClick={openCreate}
          className="w-full sm:w-auto px-6 md:px-8 py-3 md:py-4 bg-[#FACC15] text-black font-black uppercase tracking-widest rounded-2xl hover:bg-black hover:text-white transition-all shadow-lg shadow-[#FACC15]/20 text-[11px] md:text-xs"
        >
          + Add New Record
        </button>
      </div>

      {records.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] border border-black/5 p-8 md:p-16 text-center">
          <p className="text-lg md:text-xl font-bold text-zinc-400 uppercase tracking-wide">
            No records yet
          </p>
          <p className="text-xs md:text-sm text-zinc-300 mt-2">
            Click &quot;Add New Record&quot; to create your first entry
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-black/5 shadow-sm overflow-hidden">
          {/* Desktop header */}
          <div className="hidden sm:grid grid-cols-[80px_2fr_1.5fr_1fr_1fr_1fr] gap-4 px-4 md:px-8 py-4 md:py-6 bg-zinc-50 border-b border-black/5">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
              Cover
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
              Title
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
              Artist
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
              Year
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
              Genre
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">
              Actions
            </span>
          </div>

          {/* Body */}
          <div className="divide-y divide-black/5">
            {records.map((record) => (
              <div key={record.id} className="fade-in-up">
                {/* Desktop row */}
                <div className="hidden sm:grid grid-cols-[80px_2fr_1.5fr_1fr_1fr_1fr] gap-4 px-4 md:px-8 py-3 md:py-4 items-center hover:bg-zinc-50/50 transition-colors group">
                  <div>
                    {record.coverImageUrl ? (
                      <div className="relative w-10 h-10 md:w-12 md:h-12">
                        <Image
                          src={record.coverImageUrl}
                          alt={record.title}
                          fill
                          className="rounded-xl object-cover border border-black/5"
                        />
                      </div>
                    ) : (
                      <div
                        className="w-10 h-10 md:w-12 md:h-12 rounded-xl border border-black/5 flex items-center justify-center"
                        style={{
                          backgroundColor: record.labelColor || "#e0e0e0",
                        }}
                      >
                        <span className="text-[8px] font-black text-white/70 uppercase">
                          N/A
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="font-bold text-xs md:text-sm uppercase tracking-tight">
                    {record.title}
                  </p>
                  <p className="text-[11px] md:text-xs font-bold text-zinc-500">
                    {record.artist}
                  </p>
                  <p className="text-[11px] md:text-xs font-bold text-zinc-500">
                    {record.releaseYear || "—"}
                  </p>
                  <div>
                    {record.genre ? (
                      <span className="text-[9px] font-black uppercase tracking-widest border border-black/5 px-2 md:px-3 py-1 rounded-full bg-zinc-50">
                        {record.genre}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-300">—</span>
                    )}
                  </div>
                  <div className="flex justify-end gap-2 md:gap-3">
                    <button
                      onClick={() => openEdit(record)}
                      disabled={loadingId === String(record.id)}
                      className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg transition-all text-[11px] md:text-xs font-black whitespace-nowrap ${
                        loadingId === String(record.id)
                          ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                          : "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white"
                      }`}
                    >
                      {loadingId === String(record.id) ? "..." : "Edit"}
                    </button>
                    <button
                      onClick={() => handleDelete(record.id, record.title)}
                      disabled={loadingId === String(record.id)}
                      className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg transition-all text-[11px] md:text-xs font-black whitespace-nowrap ${
                        loadingId === String(record.id)
                          ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                          : "bg-red-50 text-red-600 hover:bg-red-600 hover:text-white"
                      }`}
                    >
                      {loadingId === String(record.id) ? "..." : "Delete"}
                    </button>
                  </div>
                </div>

                {/* Mobile card */}
                <div className="sm:hidden p-4 border-b border-black/5 hover:bg-zinc-50/50 transition-colors">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="shrink-0">
                      {record.coverImageUrl ? (
                        <div className="relative w-10 h-10">
                          <Image
                            src={record.coverImageUrl}
                            alt={record.title}
                            fill
                            className="rounded-xl object-cover border border-black/5"
                          />
                        </div>
                      ) : (
                        <div
                          className="w-10 h-10 rounded-xl border border-black/5 flex items-center justify-center"
                          style={{
                            backgroundColor: record.labelColor || "#e0e0e0",
                          }}
                        >
                          <span className="text-[7px] font-black text-white/70 uppercase">
                            N/A
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-black uppercase tracking-tight truncate">
                        {record.title}
                      </p>
                      <p className="text-[11px] font-bold text-zinc-500">
                        {record.artist}
                        {record.releaseYear && (
                          <span> · {record.releaseYear}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0 ml-2">
                      <button
                        onClick={() => openEdit(record)}
                        disabled={loadingId === String(record.id)}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-black bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-40"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(record.id, record.title)}
                        disabled={loadingId === String(record.id)}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-black bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {record.genre && (
                    <span className="text-[9px] font-black uppercase tracking-widest border border-black/5 px-2 py-0.5 rounded-full bg-zinc-50">
                      {record.genre}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <ModalShell
            onClose={() => setIsModalOpen(false)}
            title={editingId ? "Edit Record" : "New Record"}
            subtitle="Records Catalog"
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
              <div>
                <label className={labelClass}>Title</label>
                <input
                  className={inputClass}
                  placeholder="Record title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div>
                <label className={labelClass}>Artist</label>
                <input
                  className={inputClass}
                  placeholder="Artist name"
                  value={form.artist}
                  onChange={(e) => setForm({ ...form, artist: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Release Month</label>
                  <select
                    className={inputClass}
                    value={form.releaseMonth}
                    onChange={(e) =>
                      setForm({ ...form, releaseMonth: e.target.value })
                    }
                  >
                    <option value="">—</option>
                    {MONTHS.map((m, i) => (
                      <option key={i + 1} value={i + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Release Year</label>
                  <input
                    className={inputClass}
                    type="number"
                    placeholder="e.g. 2024"
                    value={form.releaseYear}
                    onChange={(e) =>
                      setForm({ ...form, releaseYear: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Genre</label>
                <input
                  className={inputClass}
                  placeholder="e.g. Electronic, Hip-Hop"
                  value={form.genre}
                  onChange={(e) => setForm({ ...form, genre: e.target.value })}
                />
              </div>

              <div>
                <label className={labelClass}>Cover Image</label>
                <label className="flex flex-col items-center justify-center gap-2 px-4 py-6 bg-zinc-50 border-2 border-dashed border-black/10 rounded-xl cursor-pointer hover:bg-zinc-100 transition-colors">
                  {coverPreview && !removeCover ? (
                    <Image
                      src={coverPreview}
                      alt="Cover preview"
                      width={200}
                      height={200}
                      unoptimized
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  ) : (
                    <svg
                      className="w-8 h-8 text-zinc-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  )}
                  <span className="text-[10px] text-zinc-400 font-medium">
                    {coverPreview && !removeCover
                      ? "Tap to change"
                      : "Tap to upload cover art"}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
                {coverPreview && !removeCover && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setRemoveCover(true);
                      setCoverFile(null);
                    }}
                    className="mt-2 text-xs font-bold text-red-500 hover:text-red-700 transition-colors"
                  >
                    Remove cover
                  </button>
                )}
                {removeCover && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setRemoveCover(false);
                    }}
                    className="mt-2 text-xs font-bold text-blue-500 hover:text-blue-700 transition-colors"
                  >
                    Undo remove
                  </button>
                )}
              </div>

              <div>
                <label className={labelClass}>Label Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.labelColor}
                    onChange={(e) =>
                      setForm({ ...form, labelColor: e.target.value })
                    }
                    className="w-12 h-12 rounded-xl border border-black/10 cursor-pointer bg-transparent"
                  />
                  <input
                    className={inputClass}
                    placeholder="#000000"
                    value={form.labelColor}
                    onChange={(e) =>
                      setForm({ ...form, labelColor: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  YouTube URL <span className="text-[#FACC15]">*</span>
                </label>
                <input
                  className={inputClass}
                  placeholder="https://youtube.com/watch?v=..."
                  value={form.youtubeUrl}
                  onChange={(e) =>
                    setForm({ ...form, youtubeUrl: e.target.value })
                  }
                  required
                />
              </div>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>
    </div>
  );
}
