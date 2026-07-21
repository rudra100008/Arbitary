const YT_URL_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=|embed\/|v\/|.+\/)?([a-zA-Z0-9_-]{11,}).*$/;

interface TaskLike {
  title?: string | null;
  description?: string | null;
  platform?: string | null;
  postUrl?: string | null;
  targetUrl?: string | null;
  taskType?: string | null;
}

function getText(task: TaskLike): string {
  return ((task.title ?? '') + ' ' + (task.description ?? '')).toLowerCase();
}

function isYtTask(task: TaskLike): boolean {
  if (task.platform === 'youtube') return true;
  const url: string = (task.postUrl ?? task.targetUrl ?? '');
  return YT_URL_REGEX.test(url);
}

// A task only falls back to keyword sniffing if its taskType is the old
// generic "social" value (or missing)  i.e. it predates structured YouTube
// action types. Anything with a specific, recognized taskType is decided by
// that field alone, and anything with a *different* specific taskType
// (e.g. "video_watch") is explicitly NOT any of these three actions.
function isLegacyUntyped(task: TaskLike): boolean {
  return !task.taskType || task.taskType === 'social';
}

export function isYtLike(task: TaskLike): boolean {
  if (!isYtTask(task)) return false;
  if (task.taskType === 'youtube_like') return true;
  if (!isLegacyUntyped(task)) return false;
  return getText(task).includes('like');
}

export function isYtSubscribe(task: TaskLike): boolean {
  if (!isYtTask(task)) return false;
  if (task.taskType === 'youtube_subscribe') return true;
  if (!isLegacyUntyped(task)) return false;
  return getText(task).includes('subscribe') || getText(task).includes('sub');
}

export function isYtComment(task: TaskLike): boolean {
  if (!isYtTask(task)) return false;
  if (task.taskType === 'youtube_comment') return true;
  if (!isLegacyUntyped(task)) return false;
  return getText(task).includes('comment');
}
