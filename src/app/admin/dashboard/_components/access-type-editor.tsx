"use client";

import type { AccessType } from "./types";

interface AccessTypeEditorProps {
  types: AccessType[];
  fieldErrors: Record<string, string>;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: "title" | "price", value: string) => void;
  onClearError: (field: string) => void;
}

const AccessTypeEditor = ({
  types,
  fieldErrors,
  onAdd,
  onRemove,
  onUpdate,
  onClearError,
}: AccessTypeEditorProps) => (
  <div className="bg-white p-10 rounded-[2.5rem] border border-black/5 space-y-6 shadow-sm">
    <h4 className="text-sm font-black uppercase tracking-widest text-black/80 flex items-center justify-between">
      Secure Your Access
      <button
        onClick={onAdd}
        className="text-[10px] font-black text-[#FACC15] bg-black px-4 py-2 rounded-full hover:scale-105 transition-all shadow-xl shadow-black/20"
      >
        + Add More
      </button>
    </h4>
    <div className="space-y-4">
      {types.map((access) => (
        <div
          key={access.id}
          className="relative bg-zinc-50 border border-black/5 rounded-[2rem] p-6 space-y-4 animate-fade-in group"
        >
          <button
            onClick={() => onRemove(access.id)}
            className="absolute -top-3 -right-3 w-8 h-8 rounded-xl bg-white/90 backdrop-blur-md shadow-sm border border-black/5 text-zinc-400 hover:bg-red-500 hover:text-white hover:border-red-500 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center z-20 font-black"
            title="Delete Access Type"
          >
            ✕
          </button>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-2">
                Type Title
              </label>
              <input
                type="text"
                value={access.title}
                onChange={(e) => {
                  onUpdate(access.id, "title", e.target.value);
                  const key = `accessTypes.${access.id}.title`;
                  if (fieldErrors[key]) onClearError(key);
                }}
                placeholder="e.g. VIP"
                className={`w-full px-4 py-3 bg-white border rounded-xl focus:outline-none font-bold text-xs shadow-sm transition-colors ${
                  fieldErrors[`accessTypes.${access.id}.title`]
                    ? "border-red-500 focus:border-red-500"
                    : "border-black/5 focus:border-[#FACC15]"
                }`}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-2">
                Price
              </label>
              <input
                type="text"
                value={access.price}
                onChange={(e) => {
                  onUpdate(access.id, "price", e.target.value);
                  const key = `accessTypes.${access.id}.price`;
                  if (fieldErrors[key]) onClearError(key);
                }}
                placeholder="e.g. $150"
                className={`w-full px-4 py-3 bg-white border rounded-xl focus:outline-none font-bold text-xs shadow-sm transition-colors ${
                  fieldErrors[`accessTypes.${access.id}.price`]
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

export default AccessTypeEditor;
