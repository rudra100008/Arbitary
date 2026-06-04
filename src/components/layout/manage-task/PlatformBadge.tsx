import { PLATFORMS } from "@/src/lib/manage-task/types";
import { Platform, PLATFORM_LABELS } from "@/src/lib/social/type";

type Props = {
  platform?: Platform;
};

export function PlatformBadge({
  platform,
}: Props) {
  if (!platform) {
    return (
      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-500">
        Manual
      </span>
    );
  }

  const color = PLATFORMS.find((p) => p.value === platform)?.color ?? "#999";

  return (
    <span
      className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full text-white"
      style={{ background: color }}
    >
      {PLATFORM_LABELS[platform]}
    </span>
  );
}
