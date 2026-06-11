"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";

type AboutData = {
  tagline: string;
  heading: string;
  description: string;
  heroImageUrl: string;
  projectsCount: string;
  projectsLabel: string;
  awardsCount: string;
  awardsLabel: string;
  motto: string;
  mottoAuthor: string;
};

const defaultForm: AboutData = {
  tagline: "",
  heading: "",
  description: "",
  heroImageUrl: "",
  projectsCount: "",
  projectsLabel: "",
  awardsCount: "",
  awardsLabel: "",
  motto: "",
  mottoAuthor: "",
};

export default function AdminAbout() {
  const [form, setForm] = useState<AboutData>({ ...defaultForm });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState("");
  const [removeHero, setRemoveHero] = useState(false);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const res = await fetch("/api/admin/about");
      const data = await res.json();
      if (data.about) {
        setForm({
          tagline: data.about.tagline ?? "",
          heading: data.about.heading ?? "",
          description: data.about.description ?? "",
          heroImageUrl: data.about.heroImageUrl ?? "",
          projectsCount: data.about.projectsCount ?? "",
          projectsLabel: data.about.projectsLabel ?? "",
          awardsCount: data.about.awardsCount ?? "",
          awardsLabel: data.about.awardsLabel ?? "",
          motto: data.about.motto ?? "",
          mottoAuthor: data.about.mottoAuthor ?? "",
        });
        setHeroPreview(data.about.heroImageUrl ?? "");
      }
    } catch {
      toast.error("Failed to load about content");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setHeroFile(file);
      setHeroPreview(URL.createObjectURL(file));
    }
  };

  const uploadHero = async (): Promise<string | null> => {
    if (!heroFile) return form.heroImageUrl || null;
    const formData = new FormData();
    formData.append("file", heroFile);
    formData.append("type", "about_hero");
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || "Upload failed");
    }
    const data = await res.json();
    return data.url;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let heroUrl = form.heroImageUrl;
      if (heroFile) {
        heroUrl = (await uploadHero()) ?? heroUrl;
      }

      const payload: Record<string, unknown> = {
        tagline: form.tagline || null,
        heading: form.heading || null,
        description: form.description || null,
        heroImageUrl: removeHero ? null : (heroUrl || null),
        projectsCount: form.projectsCount || null,
        projectsLabel: form.projectsLabel || null,
        awardsCount: form.awardsCount || null,
        awardsLabel: form.awardsLabel || null,
        motto: form.motto || null,
        mottoAuthor: form.mottoAuthor || null,
        removeHero: removeHero || undefined,
      };

      const res = await fetch("/api/admin/about", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      toast.success("About content saved");
      fetchContent();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-4 border-black/10 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  const inputClass = "w-full px-4 py-3 bg-zinc-50 border border-black/10 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#FACC15]/40 focus:border-[#FACC15]/50 transition-all";
  const labelClass = "text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 block";

  return (
    <div className="animate-fade-in space-y-8 max-w-3xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 md:p-8 rounded-[2rem] border border-black/5 shadow-sm">
        <div>
          <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter">
            About Content
          </h3>
          <p className="text-[10px] md:text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">
            Manage the about page and homepage about section
          </p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-black/5 overflow-hidden shadow-sm p-4 md:p-8">
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-black uppercase tracking-wider text-black mb-4">Hero Section</h4>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Tagline</label>
                <input
                  className={inputClass}
                  placeholder="e.g. The Arbitrary"
                  value={form.tagline}
                  onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Heading</label>
                <input
                  className={inputClass}
                  placeholder="e.g. DEFINING THE ARBITRARY"
                  value={form.heading}
                  onChange={(e) => setForm({ ...form, heading: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Hero Image</label>
                <label className="flex flex-col items-center justify-center gap-2 px-4 py-6 bg-zinc-50 border-2 border-dashed border-black/10 rounded-xl cursor-pointer hover:bg-zinc-100 transition-colors">
                  {heroPreview && !removeHero ? (
                    <img src={heroPreview} alt="Hero preview" className="w-full max-h-48 object-cover rounded-lg" />
                  ) : (
                    <svg className="w-8 h-8 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                  <span className="text-[10px] text-zinc-400 font-medium">
                    {heroPreview && !removeHero ? "Tap to change" : "Tap to upload hero image"}
                  </span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} className="hidden" />
                </label>
                {heroPreview && !removeHero && (
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setRemoveHero(true); setHeroFile(null); }}
                    className="mt-2 text-xs font-bold text-red-500 hover:text-red-700 transition-colors"
                  >
                    Remove image
                  </button>
                )}
                {removeHero && (
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setRemoveHero(false); }}
                    className="mt-2 text-xs font-bold text-blue-500 hover:text-blue-700 transition-colors"
                  >
                    Undo remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <hr className="border-black/5" />

          <div>
            <h4 className="text-sm font-black uppercase tracking-wider text-black mb-4">Story</h4>
            <div>
              <label className={labelClass}>Description</label>
              <textarea
                className={`${inputClass} min-h-[120px] resize-y`}
                placeholder="About the company story..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>

          <hr className="border-black/5" />

          <div>
            <h4 className="text-sm font-black uppercase tracking-wider text-black mb-4">Statistics</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Projects Count</label>
                <input
                  className={inputClass}
                  placeholder="e.g. 150+"
                  value={form.projectsCount}
                  onChange={(e) => setForm({ ...form, projectsCount: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Projects Label</label>
                <input
                  className={inputClass}
                  placeholder="e.g. Projects Completed"
                  value={form.projectsLabel}
                  onChange={(e) => setForm({ ...form, projectsLabel: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Awards Count</label>
                <input
                  className={inputClass}
                  placeholder="e.g. 25+"
                  value={form.awardsCount}
                  onChange={(e) => setForm({ ...form, awardsCount: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Awards Label</label>
                <input
                  className={inputClass}
                  placeholder="e.g. Awards Won"
                  value={form.awardsLabel}
                  onChange={(e) => setForm({ ...form, awardsLabel: e.target.value })}
                />
              </div>
            </div>
          </div>

          <hr className="border-black/5" />

          <div>
            <h4 className="text-sm font-black uppercase tracking-wider text-black mb-4">Motto / Quote</h4>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Motto</label>
                <textarea
                  className={`${inputClass} min-h-[80px] resize-y`}
                  placeholder="e.g. Vision without limits."
                  value={form.motto}
                  onChange={(e) => setForm({ ...form, motto: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Motto Author</label>
                <input
                  className={inputClass}
                  placeholder="e.g. - Founding Philosophy"
                  value={form.mottoAuthor}
                  onChange={(e) => setForm({ ...form, mottoAuthor: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-4 rounded-2xl bg-black text-white font-black uppercase tracking-wider hover:bg-[#FACC15] hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save About Content"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
