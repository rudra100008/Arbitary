"use client";

import type { TimelineItem } from "./types";

interface TimelineEditorProps {
  timelines: TimelineItem[];
  fieldErrors: Record<string, string>;
  onAdd: () => void;
  onRemove: (id: string | number) => void;
  onUpdate: (id: string | number, field: "time" | "description", value: string) => void;
  onClearError: (field: string) => void;
}

const TimelineEditor = ({
  timelines,
  fieldErrors,
  onAdd,
  onRemove,
  onUpdate,
  onClearError,
}: TimelineEditorProps) => (
  <div className="bg-white p-10 rounded-[2.5rem] border border-black/5 space-y-6 shadow-sm">
    <h4 className="text-sm font-black uppercase tracking-widest text-black/80 flex items-center justify-between">
      Event Timeline
      <button
        onClick={onAdd}
        className="text-[10px] font-black text-[#FACC15] bg-black px-4 py-2 rounded-full hover:scale-105 transition-all shadow-xl shadow-black/20"
      >
        + Add More
      </button>
    </h4>
    <div className="space-y-4">
      {timelines.map((timeline) => (
        <div
          key={timeline.id}
          className="relative bg-zinc-50 border border-black/5 rounded-[2rem] p-6 space-y-4 animate-fade-in group"
        >
          <button
            onClick={() => onRemove(timeline.id)}
            className="absolute -top-3 -right-3 w-8 h-8 rounded-xl bg-white/90 backdrop-blur-md shadow-sm border border-black/5 text-zinc-400 hover:bg-red-500 hover:text-white hover:border-red-500 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center z-20 font-black"
            title="Delete Timeline Event"
          >
            ✕
          </button>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-2">
                Time
              </label>
              <input
                type="time"
                value={timeline.time}
                onChange={(e) => {
                  onUpdate(timeline.id, "time", e.target.value);
                  const key = `timelineItems.${timeline.id}.time`;
                  if (fieldErrors[key]) onClearError(key);
                }}
                className={`w-full px-4 py-3 bg-white border rounded-xl focus:outline-none font-bold text-xs shadow-sm transition-colors ${
                  fieldErrors[`timelineItems.${timeline.id}.time`]
                    ? "border-red-500 focus:border-red-500"
                    : "border-black/5 focus:border-[#FACC15]"
                }`}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-2">
                Description
              </label>
              <input
                type="text"
                value={timeline.description}
                onChange={(e) => {
                  onUpdate(timeline.id, "description", e.target.value);
                  const key = `timelineItems.${timeline.id}.description`;
                  if (fieldErrors[key]) onClearError(key);
                }}
                placeholder="e.g. Gates Open"
                className={`w-full px-4 py-3 bg-white border rounded-xl focus:outline-none font-bold text-xs shadow-sm transition-colors ${
                  fieldErrors[`timelineItems.${timeline.id}.description`]
                    ? "border-red-500 focus:border-red-500"
                    : "border-black/5 focus:border-[#FACC15]"
                }`}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default TimelineEditor;
