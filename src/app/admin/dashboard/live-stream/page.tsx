"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function AdminLiveStream() {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/live");
      const data = await res.json();
      if (data.live && data.youtubeId) {
        setLive(true);
        setYoutubeUrl(`https://www.youtube.com/watch?v=${data.youtubeId}`);
      } else {
        setLive(false);
        setYoutubeUrl("");
      }
    } catch {
      toast.error("Failed to load live stream status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    fetchStatus();
  }, [fetchStatus]);

  const handleSave = async () => {
    if (!youtubeUrl.trim()) {
      toast.error("Please enter a YouTube URL");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtubeUrl: youtubeUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      toast.success("Live stream is now active");
      setLive(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleEndLive = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clear: true }),
      });
      if (!res.ok) throw new Error("Failed to end live stream");
      toast.success("Live stream ended");
      setLive(false);
      setYoutubeUrl("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to end live stream");
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
            Live Stream
          </h3>
          <p className="text-[10px] md:text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">
            Manage the YouTube live stream
          </p>
        </div>
        {live && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 border border-red-200">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-bold text-red-600 uppercase tracking-wider">LIVE</span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-[2.5rem] border border-black/5 overflow-hidden shadow-sm p-4 md:p-8">
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-black uppercase tracking-wider text-black mb-4">Stream Settings</h4>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>YouTube Live URL</label>
                <input
                  className={inputClass}
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                />
                <p className="text-[10px] text-zinc-400 mt-1.5 ml-1">
                  Paste the full YouTube URL of the live stream
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3 bg-black text-white rounded-xl text-sm font-black uppercase tracking-wider hover:bg-black/80 transition-all disabled:opacity-50"
            >
              {saving ? "Saving..." : "Start Live Stream"}
            </button>
            {live && (
              <button
                onClick={handleEndLive}
                disabled={saving}
                className="px-8 py-3 bg-red-500 text-white rounded-xl text-sm font-black uppercase tracking-wider hover:bg-red-600 transition-all disabled:opacity-50"
              >
                End Live
              </button>
            )}
          </div>
        </div>
      </div>

      {live && (
        <div className="bg-white rounded-[2.5rem] border border-black/5 overflow-hidden shadow-sm p-4 md:p-8">
          <h4 className="text-sm font-black uppercase tracking-wider text-black mb-4">Preview</h4>
          <div className="aspect-video bg-black rounded-xl overflow-hidden">
            <iframe
              src={`https://www.youtube.com/embed/${youtubeUrl.split("v=")[1]?.split("&")[0] ?? ""}`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
}
