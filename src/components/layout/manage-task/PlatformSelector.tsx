import { PLATFORMS, TaskSource } from "@/src/lib/manage-task/types";
import { usePlatformFlags } from "@/src/hooks/use-platform-flags";

const FacebookIcon = ({ selected }: { selected: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    className="w-5 h-5"
    fill={selected ? "white" : "#1877F2"}
  >
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const InstagramIcon = ({ selected }: { selected: boolean }) =>
  selected ? (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="5"
        ry="5"
        stroke="white"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="1.8" />
      <circle cx="17.5" cy="6.5" r="1" fill="white" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
      <defs>
        <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f09433" />
          <stop offset="25%" stopColor="#e6683c" />
          <stop offset="50%" stopColor="#dc2743" />
          <stop offset="75%" stopColor="#cc2366" />
          <stop offset="100%" stopColor="#bc1888" />
        </linearGradient>
      </defs>
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="5"
        ry="5"
        fill="url(#ig-grad)"
      />
      <circle
        cx="12"
        cy="12"
        r="4"
        stroke="white"
        strokeWidth="1.8"
        fill="none"
      />
      <circle cx="17.5" cy="6.5" r="1" fill="white" />
    </svg>
  );

const YouTubeIcon = ({ selected }: { selected: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    className="w-5 h-5"
    fill={selected ? "white" : "#FF0000"}
  >
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const ScreenshotIcon = ({ selected }: { selected: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    className="w-5 h-5"
    fill="none"
    stroke={selected ? "white" : "currentColor"}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const ShareIcon = ({ selected }: { selected: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    className="w-5 h-5"
    fill="none"
    stroke={selected ? "white" : "#3b82f6"}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

type Props = {
  value: TaskSource;
  onChange: (source: TaskSource) => void;
};

export function PlatformSelector({ value, onChange }: Props) {
  const { flags } = usePlatformFlags();

  const allSources: { value: TaskSource; label: string; color: string }[] = [
    { value: "manual", label: "Screenshot", color: "#18181b" },
    { value: "share", label: "Share", color: "#3b82f6" },
    ...PLATFORMS,
  ];

  const isDisabled = (source: TaskSource) =>
    (source === "facebook" && !flags.facebook) ||
    (source === "instagram" && !flags.instagram);

  return (
    <div>
      <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
        Task Source
      </label>
      <div className="grid grid-cols-5 gap-2">
        {allSources.map((p) => {
          const isSelected = value === p.value;
          const disabled = isDisabled(p.value);

          const Icon =
            p.value === "facebook"
              ? FacebookIcon
              : p.value === "instagram"
                ? InstagramIcon
                : p.value === "youtube"
                  ? YouTubeIcon
                  : p.value === "share"
                    ? ShareIcon
                    : ScreenshotIcon;

          return (
            <button
              key={p.value}
              type="button"
              onClick={() => !disabled && onChange(p.value)}
              disabled={disabled}
              title={
                disabled
                  ? `${p.label} is currently disabled in Settings`
                  : undefined
              }
              className={`flex flex-col items-center gap-2 py-3.5 px-2 rounded-2xl border-2 text-xs font-bold tracking-wide transition-all duration-200 ${
                disabled
                  ? "border-black/5 bg-zinc-50 text-zinc-300 opacity-50 cursor-not-allowed"
                  : isSelected
                    ? "shadow-md scale-[1.03] text-white"
                    : "border-black/5 bg-zinc-50 text-zinc-500 hover:border-zinc-300 hover:bg-white hover:scale-[1.01]"
              }`}
              style={
                isSelected && !disabled
                  ? p.value === "instagram"
                    ? {
                        background:
                          "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
                        borderColor: "#dc2743",
                      }
                    : { background: p.color, borderColor: p.color }
                  : {}
              }
            >
              <Icon selected={isSelected && !disabled} />
              <span>{p.label}</span>
              {disabled && (
                <span className="text-[8px] font-black uppercase tracking-wider text-zinc-400">
                  Disabled
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
