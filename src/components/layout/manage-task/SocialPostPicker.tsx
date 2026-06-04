import { PLATFORMS } from "@/src/lib/manage-task/types";
import { Platform, PLATFORM_LABELS, SocialPost } from "@/src/lib/social/type";
import { useQuery } from "@tanstack/react-query";

type Props = {
  platform: Platform;
  selected: SocialPost | null;
  onSelect: (post: SocialPost) => void;
};

export function SocialPostPicker({ platform, selected, onSelect }: Props) {
  const { data, isLoading, error } = useQuery<{ posts: SocialPost[] }>({
    queryKey: ["social-posts", platform],
    queryFn: async () => {
      const res = await fetch(`/api/admin/social-posts?platform=${platform}`);
      if (!res.ok) throw new Error("Failed to load posts");
      return res.json();
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 gap-3">
        <div className="w-5 h-5 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
        <span className="text-sm font-medium text-zinc-400">
          Loading {PLATFORM_LABELS[platform]} posts…
        </span>
      </div>
    );
  }

  if (error || !data?.posts?.length) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm font-medium text-zinc-400">
          {error
            ? `Could not load posts: ${(error as Error).message}`
            : `No posts found. Make sure ${PLATFORM_LABELS[platform]} is configured in .env`}
        </p>
      </div>
    );
  }

  const platformIcon = PLATFORMS.find((p) => p.value === platform)?.icon;

  return (
    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
      {data.posts.map((post) => {
        const isSelected = selected?.id === post.id;
        return (
          <button
            key={post.id}
            type="button"
            onClick={() => onSelect(post)}
            className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all
              ${
                isSelected
                  ? "border-zinc-900 bg-zinc-50"
                  : "border-black/5 bg-white hover:border-zinc-300"
              }`}
          >
            {/* Thumbnail */}
            <div className="w-14 h-14 rounded-xl bg-zinc-100 overflow-hidden shrink-0">
              {post.thumbnailUrl ? (
                <img
                  src={post.thumbnailUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-400 text-xl">
                  {platformIcon}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-black truncate">
                {post.title}
              </p>
              <p className="text-xs font-medium text-zinc-400 mt-0.5">
                {new Date(post.publishedAt).toLocaleDateString()}
                {post.likeCount != null && ` · 👍 ${post.likeCount}`}
              </p>
            </div>

            {/* Check */}
            {isSelected && (
              <div className="w-6 h-6 rounded-full bg-zinc-900 flex items-center justify-center shrink-0">
                <svg
                  className="w-3.5 h-3.5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
