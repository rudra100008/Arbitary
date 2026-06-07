import { PLATFORMS, TaskSource } from "@/src/lib/manage-task/types";

type Props = {
  value: TaskSource;
  onChange: (source: TaskSource) => void;
};

export function PlatformSelector({ value, onChange }: Props) {
  return (
    <div>
      <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
        Task Source
      </label>
      <div className="grid grid-cols-5 gap-2">
        {/* Manual */}
        <button
          type="button"
          onClick={() => onChange("manual")}
          className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 text-sm font-black font-semibold tracking-wider transition-all
            ${
              value === "manual"
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-black/5 bg-zinc-50 text-zinc-500 hover:border-zinc-400"
            }`}
        >
          <span className="text-base">✏️</span>
          Manual
        </button>

        {/* Social platforms */}
        {PLATFORMS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange(p.value)}
            className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border-2 text-sm font-black font-semibold tracking-wider transition-all
              ${
                value === p.value
                  ? "text-white"
                  : "border-black/5 bg-zinc-50 text-zinc-500 hover:border-zinc-400"
              }`}
            style={
              value === p.value
                ? { background: p.color, borderColor: p.color }
                : {}
            }
          >
            <span className="text-base">{p.icon}</span>
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
