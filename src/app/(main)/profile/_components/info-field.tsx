"use client";

interface InfoFieldProps {
  label: string;
  value: string;
  editing: boolean;
  inputValue?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
}

/**
 * A labeled field that toggles between a read-only display and an editable input.
 */
export default function InfoField({
  label,
  value,
  editing,
  inputValue,
  onChange,
  placeholder,
}: InfoFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">
        {label}
      </p>
      <div className="transition-all duration-200">
        {editing && onChange ? (
          <input
            type="text"
            value={inputValue ?? value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm
                       text-gray-900 placeholder:text-gray-400
                       focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/8
                       hover:border-gray-300 transition-all"
          />
        ) : (
          <p className="text-sm font-semibold text-gray-900">{value}</p>
        )}
      </div>
    </div>
  );
}
