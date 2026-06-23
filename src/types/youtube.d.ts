// Shared global typing for the YouTube IFrame Player API.
// https://developers.google.com/youtube/iframe_api_reference
//
// Only the bits of the API surface actually used in the app are declared.
// IMPORTANT: window.YT / window.onYouTubeIframeAPIReady must only be
// declared ONCE globally. TypeScript merges all `declare global` blocks
// project-wide and requires identical modifiers (optional vs required) on
// every declaration of the same property, so a second `declare global`
// for Window.YT elsewhere in the app will break the build.

export interface YTPlayerInstance {
  destroy(): void;
  playVideo(): void;
  stopVideo(): void;
  pauseVideo(): void;
  getCurrentTime(): number;
}

export interface YTNamespace {
  Player: new (
    el: HTMLElement | string,
    options: {
      videoId: string;
      height?: string | number;
      width?: string | number;
      host?: string;
      playerVars?: Record<string, number | string>;
      events?: {
        onReady?: () => void;
        onStateChange?: (e: { data: number }) => void;
        onError?: () => void;
      };
    },
  ) => YTPlayerInstance;
  PlayerState: {
    OFF: number;
    UNSTARTED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    CUED: number;
  };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export { };
