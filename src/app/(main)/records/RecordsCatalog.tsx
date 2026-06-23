"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useCallback,
  useState,
  type CSSProperties,
} from "react";
import Script from "next/script";
import {
  Tv,
  ChevronDown,
  X,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Music,
  Music2,
  Music3,
  Music4,
} from "lucide-react";
import {
  type Song,
  monitorFrameSVG,
  monitorMiniSVG,
  monthYearLabel,
} from "./vinylSvg";
import "./recordsCatalog.css";

const MONITOR_W = 272;
const MONITOR_H = 210;
const WAVE_BARS = 56;

const NOTE_ICONS = [Music, Music2, Music3, Music4];
type FallNote = {
  side: "left" | "right";
  x: number;
  size: number;
  dur: number;
  delay: number;
  op: number;
  icon: number;
};
/** Deterministic cluster of slowly, infinitely falling music notes on both edges. */
const FALLING_NOTES: FallNote[] = [
  { side: "left", x: 14, size: 24, dur: 16, delay: 0, op: 0.45, icon: 0 },
  { side: "left", x: 72, size: 18, dur: 21, delay: -6, op: 0.3, icon: 1 },
  { side: "left", x: 40, size: 30, dur: 19, delay: -11, op: 0.4, icon: 2 },
  { side: "left", x: 104, size: 20, dur: 24, delay: -3, op: 0.35, icon: 3 },
  { side: "left", x: 26, size: 16, dur: 18, delay: -14, op: 0.25, icon: 1 },
  { side: "left", x: 60, size: 26, dur: 22, delay: -9, op: 0.4, icon: 0 },
  { side: "left", x: 132, size: 22, dur: 20, delay: -16, op: 0.35, icon: 2 },
  { side: "left", x: 88, size: 28, dur: 23, delay: -4, op: 0.4, icon: 3 },
  { side: "left", x: 50, size: 18, dur: 26, delay: -19, op: 0.28, icon: 1 },
  { side: "left", x: 118, size: 16, dur: 17, delay: -8, op: 0.3, icon: 0 },
  { side: "left", x: 8, size: 20, dur: 25, delay: -13, op: 0.32, icon: 2 },
  { side: "left", x: 150, size: 26, dur: 21, delay: -1, op: 0.4, icon: 3 },
  { side: "right", x: 16, size: 22, dur: 17, delay: -5, op: 0.45, icon: 2 },
  { side: "right", x: 74, size: 28, dur: 20, delay: -12, op: 0.35, icon: 3 },
  { side: "right", x: 44, size: 18, dur: 23, delay: -2, op: 0.3, icon: 0 },
  { side: "right", x: 106, size: 24, dur: 18, delay: -8, op: 0.4, icon: 1 },
  { side: "right", x: 30, size: 16, dur: 25, delay: -15, op: 0.25, icon: 2 },
  { side: "right", x: 86, size: 30, dur: 19, delay: -10, op: 0.4, icon: 3 },
  { side: "right", x: 134, size: 20, dur: 22, delay: -17, op: 0.35, icon: 0 },
  { side: "right", x: 58, size: 26, dur: 24, delay: -3, op: 0.4, icon: 1 },
  { side: "right", x: 118, size: 16, dur: 16, delay: -20, op: 0.28, icon: 2 },
  { side: "right", x: 10, size: 28, dur: 21, delay: -7, op: 0.4, icon: 3 },
  { side: "right", x: 150, size: 18, dur: 26, delay: -11, op: 0.3, icon: 0 },
  { side: "right", x: 96, size: 22, dur: 18, delay: -14, op: 0.35, icon: 1 },
  { side: "left", x: 14, size: 24, dur: 16, delay: 0, op: 0.45, icon: 0 },
  { side: "left", x: 72, size: 18, dur: 21, delay: -6, op: 0.3, icon: 1 },
  { side: "left", x: 40, size: 30, dur: 19, delay: -11, op: 0.4, icon: 2 },
  { side: "left", x: 104, size: 20, dur: 24, delay: -3, op: 0.35, icon: 3 },
  { side: "left", x: 26, size: 16, dur: 18, delay: -14, op: 0.25, icon: 1 },
  { side: "left", x: 60, size: 26, dur: 22, delay: -9, op: 0.4, icon: 0 },
  { side: "left", x: 132, size: 22, dur: 20, delay: -16, op: 0.35, icon: 2 },
  { side: "left", x: 88, size: 28, dur: 23, delay: -4, op: 0.4, icon: 3 },
  { side: "left", x: 50, size: 18, dur: 26, delay: -19, op: 0.28, icon: 1 },
  { side: "left", x: 118, size: 16, dur: 17, delay: -8, op: 0.3, icon: 0 },
  { side: "left", x: 8, size: 20, dur: 25, delay: -13, op: 0.32, icon: 2 },
  { side: "left", x: 150, size: 26, dur: 21, delay: -1, op: 0.4, icon: 3 },
  { side: "right", x: 16, size: 22, dur: 17, delay: -5, op: 0.45, icon: 2 },
  { side: "right", x: 74, size: 28, dur: 20, delay: -12, op: 0.35, icon: 3 },
  { side: "right", x: 44, size: 18, dur: 23, delay: -2, op: 0.3, icon: 0 },
  { side: "right", x: 106, size: 24, dur: 18, delay: -8, op: 0.4, icon: 1 },
  { side: "right", x: 30, size: 16, dur: 25, delay: -15, op: 0.25, icon: 2 },
];

type Group = { key: string; label: string; items: Song[] };

function buildGroups(songs: Song[]): Group[] {
  const map = new Map<string, Group>();
  for (const s of songs) {
    const key = String(s.releaseYear ?? 0);
    let g = map.get(key);
    if (!g) {
      g = { key, label: key === "0" ? "Unknown" : key, items: [] };
      map.set(key, g);
    }
    g.items.push(s);
  }
  // reverse-chronological: newest year first
  return Array.from(map.values()).sort((a, b) => Number(b.key) - Number(a.key));
}

/** Deterministic pseudo-random bar heights (0.18..1) for a record's waveform. */
function waveHeights(seed: number): number[] {
  let x = (seed + 1) * 9301 + 49297;
  const out: number[] = [];
  for (let i = 0; i < WAVE_BARS; i++) {
    x = (x * 9301 + 49297) % 233280;
    const r = x / 233280;
    const env = 0.55 + 0.45 * Math.sin((i / WAVE_BARS) * Math.PI);
    out.push(Math.max(0.18, Math.min(1, env * (0.45 + r * 0.7))));
  }
  return out;
}

// ─── WAVEFORM CANVAS ─────────────────────────────────────────────────────────
function WaveformCanvas({
  heights,
  isPlaying,
  getProgress,
  onSeek,
}: {
  heights: number[];
  isPlaying: boolean;
  getProgress: () => number;
  onSeek: (ratio: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(0);
  const rafRef = useRef(0);
  const isDragging = useRef(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (!w || !h) return;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const progress = progressRef.current;
    const barCount = heights.length;
    const gap = 4;
    const totalGap = gap * (barCount - 1);
    const barWidth = Math.max(0, (w - totalGap) / barCount);
    const midY = h / 2;
    const maxH = h * 0.85;
    const radius = Math.max(0, Math.min(barWidth / 2, 1.5));
    const progressBarIndex = progress * barCount;

    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < barCount; i++) {
      const barH = heights[i] * maxH;
      const x = i * (barWidth + gap);
      const y = midY - barH / 2;
      const barEnd = i + 1;

      let fillRatio = 0;
      if (progressBarIndex >= barEnd) fillRatio = 1;
      else if (progressBarIndex > i) fillRatio = progressBarIndex - i;

      // Base bar — muted
      ctx.fillStyle = "rgba(63,63,70,0.4)";
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barH, radius);
      ctx.fill();

      // Played fill
      if (fillRatio > 0) {
        const fillW = barWidth * fillRatio;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, fillW, barH);
        ctx.clip();
        ctx.fillStyle = "#FACC15";
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barH, radius);
        ctx.fill();
        ctx.restore();
      }
    }
  }, [heights]);

  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    const tick = () => {
      progressRef.current = getProgress();
      draw();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, getProgress, draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  const seekFromEvent = useCallback(
    (clientX: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width),
      );
      onSeek(ratio);
      progressRef.current = ratio;
      draw();
    },
    [onSeek, draw],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDragging.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      seekFromEvent(e.clientX);
    },
    [seekFromEvent],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      seekFromEvent(e.clientX);
    },
    [seekFromEvent],
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="rc-wave-canvas"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
}

export default function RecordsCatalog({ songs }: { songs: Song[] }) {
  const groups = useMemo(() => buildGroups(songs), [songs]);

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [closingId, setClosingId] = useState<number | null>(null);
  const [closeDims, setCloseDims] = useState<{ w: number; h: number } | null>(
    null,
  );
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Collapse: lock the card's current size, then shrink width + height to the
  // tile size on the next frame so both axes animate (height can't transition
  // from `auto`). overflow:hidden hides the body as it folds into the tile.
  const startCollapse = useCallback(
    (id: number, cardEl: HTMLElement | null) => {
      if (cardEl) {
        const r = cardEl.getBoundingClientRect();
        setCloseDims({ w: Math.round(r.width), h: Math.round(r.height) });
        setClosingId(id);
      } else {
        setClosingId(null);
        setCloseDims(null);
        setExpandedId((cur) => (cur === id ? null : cur));
      }
    },
    [],
  );

  useEffect(() => {
    if (closingId == null) return;
    const small = window.matchMedia("(max-width: 640px)").matches;
    const target = small ? 150 : 200;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() =>
        setCloseDims({ w: target, h: target }),
      );
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [closingId]);

  const finishCollapse = useCallback((id: number) => {
    setClosingId((cur) => (cur === id ? null : cur));
    setCloseDims(null);
    setExpandedId((cur) => (cur === id ? null : cur));
  }, []);

  const S = useRef({
    currentTrack: null as Song | null,
    mode: "audio" as "audio" | "video",
    monitorExpanded: false,
    ytApiReady: false,
    pendingAudio: null as Song | null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ytAudioPlayer: null as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ytVideoPlayer: null as any,
    scrollBlockVisible: false,
    scrollY0: 0,
    scrollGuardActive: false,
  });
  const initRef = useRef(false);
  const actionsRef = useRef<{ onAudioEnded: () => void }>({
    onAudioEnded: () => {},
  });
  const bgRef = useRef<HTMLDivElement>(null);

  // Parallax scroll for hero background
  useEffect(() => {
    const el = bgRef.current;
    if (!el) return;
    let rafId: number;
    const onScroll = () => {
      rafId = requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        const heroBottom =
          el.parentElement?.getBoundingClientRect().bottom ?? 0;
        if (heroBottom > 0) {
          el.style.transform = `translateY(${scrollY * 0.35}px)`;
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const getProgress = useCallback(() => {
    const p = S.current.ytAudioPlayer;
    if (p?.getCurrentTime && p?.getDuration) {
      const d = p.getDuration();
      return d > 0 ? p.getCurrentTime() / d : 0;
    }
    return 0;
  }, []);

  const handleSeek = useCallback((ratio: number) => {
    const p = S.current.ytAudioPlayer;
    if (p?.seekTo && p?.getDuration) {
      p.seekTo(ratio * p.getDuration(), true);
    }
  }, []);

  const byId = (id: string) => document.getElementById(id);

  /* ── inline audio playback ── */
  const playAudio = (song: Song) => {
    const s = S.current;
    if (s.mode === "video") {
      s.ytVideoPlayer?.stopVideo?.();
      hideMonitor();
    }
    s.mode = "audio";
    s.currentTrack = song;
    setPlayingId(song.id);
    setIsPlaying(true);
    if (s.ytApiReady && s.ytAudioPlayer?.loadVideoById)
      s.ytAudioPlayer.loadVideoById(song.ytId);
    else s.pendingAudio = song;

    if (expandedId && expandedId !== song.id) {
      setClosingId(expandedId);
    }
    setExpandedId(song.id);
  };

  // Collapsed tile → expand + play. Cover of the playing record → pause/resume.
  // Also: collapse button hides card while keeping playback; clicking collapsed
  // playing tile pauses; clicking collapsed paused tile re-expands.
  const handleTileClick = (song: Song) => {
    const s = S.current;
    if (playingId === song.id && s.mode === "audio") {
      if (expandedId === song.id) {
        // Expanded — toggle play/pause
        const next = !isPlaying;
        setIsPlaying(next);
        if (s.ytApiReady && s.ytAudioPlayer) {
          if (next) s.ytAudioPlayer.playVideo();
          else s.ytAudioPlayer.pauseVideo();
        }
      } else {
        // Collapsed tile for the playing song
        if (isPlaying) {
          // Currently playing → pause, stay collapsed
          setIsPlaying(false);
          if (s.ytApiReady && s.ytAudioPlayer) {
            s.ytAudioPlayer.pauseVideo();
          }
        } else {
          // Currently paused → expand, stay paused
          setExpandedId(song.id);
        }
      }
      return;
    }
    playAudio(song);
  };

  const skipAudio = (dir: number) => {
    if (playingId == null) return;
    const idx = songs.findIndex((x) => x.id === playingId);
    if (idx < 0) return;
    playAudio(songs[(idx + dir + songs.length) % songs.length]);
  };

  /* ── progress polling for collapsed tile ── */
  const playingProgressRef = useRef(0);
  useEffect(() => {
    if (!isPlaying || playingId === null || S.current.mode !== "audio") return;
    let raf: number;
    const tick = () => {
      const p = getProgress();
      playingProgressRef.current = p;
      const bar = document.querySelector(
        '[data-role="tile-progress"]',
      ) as HTMLElement | null;
      if (bar) bar.style.width = `${p * 100}%`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, playingId, getProgress]);

  /* ── watch (video monitor) ── */
  const doWatch = (song: Song) => {
    if (window.innerWidth < 768) {
      window.open(`https://www.youtube.com/watch?v=${song.ytId}`, "_blank");
      return;
    }
    const s = S.current;
    s.ytAudioPlayer?.stopVideo?.();
    setPlayingId(null);
    setIsPlaying(false);
    s.mode = "video";
    s.currentTrack = song;
    buildMonitorFull(song);
    if (s.ytApiReady && s.ytVideoPlayer?.loadVideoById)
      s.ytVideoPlayer.loadVideoById(song.ytId);
    showMonitor();
    attachScrollGuard();
  };

  /* ── monitor show/hide ── */
  const showMonitor = () => {
    byId("monitorWidget")?.classList.add("rc-show");
    if (!S.current.monitorExpanded) {
      S.current.monitorExpanded = true;
      byId("monitorFull")?.classList.add("rc-show");
      const mini = byId("monitorMini");
      if (mini) mini.style.display = "none";
    }
  };
  const hideMonitor = () => {
    byId("monitorWidget")?.classList.remove("rc-show");
    detachScrollGuard();
    hideScrollBlock();
  };
  const expandMonitor = () => {
    S.current.monitorExpanded = true;
    byId("monitorFull")?.classList.add("rc-show");
    const mini = byId("monitorMini");
    if (mini) mini.style.display = "none";
  };
  const collapseMonitor = () => {
    S.current.monitorExpanded = false;
    byId("monitorFull")?.classList.remove("rc-show");
    const mini = byId("monitorMini");
    if (mini) mini.style.display = "";
    const t = S.current.currentTrack;
    const mm = byId("monitorMiniSvg");
    if (mm) mm.innerHTML = monitorMiniSVG(t ? t.labelColor : null);
  };

  const buildMonitorFull = (song: Song) => {
    const svg = byId("monitorSvg");
    if (svg)
      svg.innerHTML = monitorFrameSVG(MONITOR_W, MONITOR_H, song.labelColor);
    const bevel = 14,
      scrW = MONITOR_W - bevel * 2,
      scrH = MONITOR_H - 44,
      scrX = bevel,
      scrY = 10;
    const wrap = byId("ytIframeWrap");
    if (wrap) {
      wrap.style.cssText = `position:absolute;left:${scrX}px;top:${scrY}px;width:${scrW}px;height:${scrH}px;border-radius:3px;overflow:hidden;background:#000;display:block;`;
      const iframe = wrap.querySelector("iframe");
      if (iframe) {
        iframe.style.width = "100%";
        iframe.style.height = "100%";
      }
    }
    const track = byId("monitorTrack");
    if (track)
      track.innerHTML = `<div class="rc-tname">${escapeHtml(song.title)}</div><div class="rc-tartist">${escapeHtml(song.artist)}</div>`;
    byId("monPlayBtn")?.classList.add("rc-playing");
  };

  /* ── scroll guard ── */
  const onScrollGuard = () => {
    const s = S.current;
    if (!s.scrollGuardActive) return;
    if (Math.abs(window.scrollY - s.scrollY0) > 60 && !s.scrollBlockVisible) {
      s.scrollBlockVisible = true;
      byId("scrollBlockBar")?.classList.add("rc-show");
    }
  };
  const attachScrollGuard = () => {
    S.current.scrollY0 = window.scrollY;
    S.current.scrollGuardActive = true;
    window.addEventListener("scroll", onScrollGuard, { passive: true });
  };
  const detachScrollGuard = () => {
    S.current.scrollGuardActive = false;
    window.removeEventListener("scroll", onScrollGuard);
  };
  const keepWatching = () => {
    window.scrollTo({ top: S.current.scrollY0, behavior: "smooth" });
    hideScrollBlock();
  };
  const dismissScrollBlock = () => {
    hideScrollBlock();
    detachScrollGuard();
  };
  const hideScrollBlock = () => {
    S.current.scrollBlockVisible = false;
    byId("scrollBlockBar")?.classList.remove("rc-show");
  };

  /* ── monitor video controls ── */
  const monTogglePlay = () => {
    const s = S.current;
    if (s.mode !== "video" || !s.currentTrack) return;
    const playing = !byId("monPlayBtn")?.classList.contains("rc-playing");
    if (s.ytApiReady && s.ytVideoPlayer) {
      if (playing) s.ytVideoPlayer.playVideo();
      else s.ytVideoPlayer.pauseVideo();
    }
    byId("monPlayBtn")?.classList.toggle("rc-playing", playing);
  };
  const skipVideo = (dir: number) => {
    const s = S.current;
    if (!s.currentTrack) return;
    const idx = songs.findIndex((x) => x.id === s.currentTrack!.id);
    if (idx < 0) return;
    const next = songs[(idx + dir + songs.length) % songs.length];
    s.currentTrack = next;
    if (s.ytApiReady && s.ytVideoPlayer?.loadVideoById)
      s.ytVideoPlayer.loadVideoById(next.ytId);
    buildMonitorFull(next);
  };

  /* ── YouTube IFrame API ── */
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    // eslint-disable-next-line react-hooks/immutability
    document.title = "Records | Arbitrary";

    const mm = byId("monitorMiniSvg");
    if (mm) mm.innerHTML = monitorMiniSVG(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const initPlayers = () => {
      const YT = w.YT;
      if (!YT || !YT.Player) return;
      const s = S.current;
      s.ytApiReady = true;
      s.ytAudioPlayer = new YT.Player("ytPlayerAudio", {
        width: "300",
        height: "200",
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        events: { onStateChange: (e: any) => onAudioStateChange(e) },
      });
      s.ytVideoPlayer = new YT.Player("ytPlayerVideo", {
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 1,
          controls: 1,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        events: { onStateChange: (e: any) => onVideoStateChange(e) },
      });
      if (s.pendingAudio && s.ytAudioPlayer?.loadVideoById) {
        s.ytAudioPlayer.loadVideoById(s.pendingAudio.ytId);
        s.pendingAudio = null;
      }
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onAudioStateChange = (e: any) => {
      if (e.data === w.YT?.PlayerState?.ENDED)
        actionsRef.current.onAudioEnded();
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onVideoStateChange = (e: any) => {
      const PS = w.YT?.PlayerState;
      if (e.data === PS?.ENDED) skipVideo(1);
      if (e.data === PS?.PLAYING)
        byId("monPlayBtn")?.classList.add("rc-playing");
      if (e.data === PS?.PAUSED)
        byId("monPlayBtn")?.classList.remove("rc-playing");
    };

    if (w.YT && w.YT.Player) initPlayers();
    // eslint-disable-next-line react-hooks/immutability
    else w.onYouTubeIframeAPIReady = initPlayers;

    // ── top-left resize handle ──────────────────────────────────────────
    const resizeHandle = document.getElementById("monitorResizeHandle");
    const monitorFull = document.getElementById("monitorFull");

    if (resizeHandle && monitorFull) {
      let startX = 0;
      let startY = 0;
      let startW = 0;
      let startH = 0;

      const onMouseMove = (e: MouseEvent) => {
        const dx = startX - e.clientX;
        const dy = startY - e.clientY;
        const newW = Math.min(850, Math.max(300, startW + dx));
        const newH = Math.min(625, Math.max(380, startH + dy));
        monitorFull.style.width = `${newW}px`;
        monitorFull.style.height = `${newH}px`;
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.userSelect = "";
      };

      resizeHandle.addEventListener("mousedown", (e: MouseEvent) => {
        e.preventDefault();
        startX = e.clientX;
        startY = e.clientY;
        // offsetWidth/offsetHeight are 0 when hidden — read actual rendered size
        const rect = monitorFull.getBoundingClientRect();
        startW = rect.width || parseInt(monitorFull.style.width) || 300;
        startH = rect.height || parseInt(monitorFull.style.height) || 380;
        document.body.style.userSelect = "none";
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
      });
    }

    return () => {
      detachScrollGuard();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── scale monitor content when container is resized ── */
  useEffect(() => {
    const fr = document.getElementById("monitorFrameWrap");
    if (!fr) return;
    const content = document.getElementById("monitorContent");
    if (!content) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const scale = Math.min(width / MONITOR_W, height / MONITOR_H);
      const scaledW = MONITOR_W * scale;
      const scaledH = MONITOR_H * scale;
      content.style.left = `${(width - scaledW) / 2}px`;
      content.style.top = `${(height - scaledH) / 2}px`;
      content.style.transform = `scale(${scale})`;
    });
    ro.observe(fr);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    actionsRef.current.onAudioEnded = () => skipAudio(1);
  });

  const totalLabel = `${songs.length} record${songs.length === 1 ? "" : "s"}`;

  return (
    <div className="rc-root">
      <Script
        src="https://www.youtube.com/iframe_api"
        strategy="afterInteractive"
      />

      {/* Falling music-note clusters on both edges */}
      <div className="rc-notes" aria-hidden="true">
        {FALLING_NOTES.map((n, i) => {
          const Icon = NOTE_ICONS[n.icon];
          return (
            <span
              key={i}
              className={`rc-note rc-note-${n.side}`}
              style={
                {
                  [n.side]: `${n.x}px`,
                  animationDuration: `${n.dur}s`,
                  animationDelay: `${n.delay}s`,
                  "--rc-note-op": n.op,
                } as CSSProperties
              }
            >
              <Icon size={n.size} />
            </span>
          );
        })}
      </div>

      {/* Catalog hero — vinyl record background from home page hero */}
      <section className="relative h-screen flex items-center overflow-hidden mb-14 pt-20">
        <div ref={bgRef} className="rc-hero-bg" />

        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />

        {/* Spinning vinyl overlay */}
        <div className="rc-vinyl-overlay" aria-hidden="true" />

        <div className="relative z-10 w-full animate-fade-in">
          <div className="container mx-auto px-6">
            <span className="inline-block text-[#FACC15] font-bold uppercase tracking-[0.4em] text-xs mb-6 px-4 py-2 bg-white/10 rounded-full border border-white/20 backdrop-blur-sm">
              The Arbitrary Catalog
            </span>
            <div className="rc-hero-title mb-8">
              <h1 className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tighter uppercase leading-[0.85] text-white">
                Records <br />
                <span className="text-[#FACC15]">&amp; Releases</span>
              </h1>
              <span className="rc-eq" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </span>
            </div>
            <p className="text-zinc-400 font-bold uppercase tracking-widest text-sm">
              {totalLabel}
            </p>
          </div>
        </div>
      </section>

      {groups.map((g) => (
        <section
          className="rc-shelf-section container mx-auto px-6"
          key={g.key}
        >
          <div className="flex items-center gap-6 mb-8">
            <div className="flex flex-col">
              <span className="text-[#FACC15] font-bold uppercase tracking-widest text-xs whitespace-nowrap">
                {g.items.length} release{g.items.length === 1 ? "" : "s"}
              </span>
              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter whitespace-nowrap">
                {g.label}
              </h2>
            </div>
            <div className="h-0.5 flex-1 rc-year-line" />
          </div>
          <div className="rc-grid">
            {g.items.map((song) => {
              const expanded = expandedId === song.id;
              const closing = closingId === song.id;
              const showCard = expanded || closing;
              const playing = playingId === song.id && isPlaying;
              const cover = song.coverImageUrl;
              if (!showCard) {
                return (
                  <button
                    key={song.id}
                    type="button"
                    className="rc-tile"
                    onClick={() => handleTileClick(song)}
                    title={`${song.title} — ${song.artist}`}
                    style={
                      cover
                        ? { backgroundImage: `url(${cover})` }
                        : {
                            background: song.coverColor,
                            color: song.sleeveText,
                          }
                    }
                  >
                    {!cover && (
                      <span className="rc-tile-fallback">
                        <span className="rc-tile-fallback-title">
                          {song.title}
                        </span>
                        <span className="rc-tile-fallback-artist">
                          {song.artist}
                        </span>
                      </span>
                    )}
                    {playingId === song.id && expandedId !== song.id && (
                      <>
                        {isPlaying && (
                          <span className="rc-tile-play-overlay">
                            <Pause size={28} />
                          </span>
                        )}
                        <span className="rc-tile-progress-track">
                          <span
                            data-role="tile-progress"
                            className="rc-tile-progress-fill"
                          />
                        </span>
                      </>
                    )}
                  </button>
                );
              }
              return (
                <article
                  key={song.id}
                  className={`rc-card${closing ? " rc-closing" : ""}`}
                  style={{
                    ...(cover ? { backgroundImage: `url(${cover})` } : null),
                    ...(closing && closeDims
                      ? {
                          width: `${closeDims.w}px`,
                          height: `${closeDims.h}px`,
                        }
                      : null),
                  }}
                  onTransitionEnd={(e) => {
                    if (
                      closing &&
                      e.target === e.currentTarget &&
                      (e.propertyName === "width" ||
                        e.propertyName === "height")
                    ) {
                      finishCollapse(song.id);
                    }
                  }}
                >
                  <div className="rc-card-wash" />
                  <button
                    type="button"
                    className="rc-collapse-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      startCollapse(
                        song.id,
                        (e.currentTarget as HTMLElement).closest(
                          ".rc-card",
                        ) as HTMLElement | null,
                      );
                    }}
                    aria-label="Collapse"
                  >
                    <X size={16} />
                  </button>
                  <button
                    type="button"
                    className={`rc-card-cover${playing ? " rc-playing" : ""}`}
                    onClick={() => handleTileClick(song)}
                    aria-label={playing ? "Pause" : "Play"}
                    style={
                      cover
                        ? { backgroundImage: `url(${cover})` }
                        : { background: song.coverColor }
                    }
                  >
                    <span className="rc-card-cover-btn">
                      <span className="rc-ic rc-ic-play">
                        <Play size={26} />
                      </span>
                      <span className="rc-ic rc-ic-pause">
                        <Pause size={26} />
                      </span>
                    </span>
                  </button>
                  <div className="rc-card-body">
                    <div className="rc-card-top ">
                      <div className="rc-card-meta">
                        <h3>{song.title}</h3>
                        <p>
                          {[
                            song.artist,
                            monthYearLabel(song.releaseMonth, song.releaseYear),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="rc-watch-btn "
                        onClick={() => doWatch(song)}
                      >
                        <Tv size={14} />
                        <span>Watch Now</span>
                      </button>
                    </div>
                    <div className="rc-wave" aria-hidden="true">
                      <WaveformCanvas
                        heights={waveHeights(song.id)}
                        isPlaying={playing}
                        getProgress={getProgress}
                        onSeek={handleSeek}
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      {/* Monitor widget */}
      <div className="rc-monitor-widget" id="monitorWidget">
        <div className="rc-monitor-full" id="monitorFull">
          <div
            className="rc-monitor-resize-handle"
            id="monitorResizeHandle"
            title="Drag to resize"
          >
            <svg
              viewBox="0 0 10 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M9 1L1 9M5 1L1 5M9 5L5 9" />
            </svg>
          </div>
          <div className="rc-monitor-full-header">
            <span>Now Watching</span>
            <div className="rc-monitor-header-btns">
              <button onClick={collapseMonitor} title="Collapse">
                <ChevronDown size={15} />
              </button>
            </div>
          </div>
          <div className="rc-monitor-frame-wrap" id="monitorFrameWrap">
            <div className="monitor-content" id="monitorContent">
              <svg
                id="monitorSvg"
                width={MONITOR_W}
                height={MONITOR_H}
                viewBox={`0 0 ${MONITOR_W} ${MONITOR_H}`}
                style={{ display: "block" }}
              />
              <div className="rc-yt-iframe-wrap" id="ytIframeWrap">
                <div id="ytPlayerVideo" />
              </div>
            </div>
          </div>
          <div className="rc-monitor-track" id="monitorTrack" />
          <div className="rc-monitor-controls">
            <button
              className="rc-tt-btn"
              onClick={() => skipVideo(-1)}
              aria-label="Previous"
            >
              <SkipBack size={14} />
            </button>
            <button
              className="rc-tt-btn rc-big"
              id="monPlayBtn"
              onClick={monTogglePlay}
              aria-label="Play/Pause"
            >
              <span className="rc-ic rc-ic-play">
                <Play size={17} />
              </span>
              <span className="rc-ic rc-ic-pause">
                <Pause size={17} />
              </span>
            </button>
            <button
              className="rc-tt-btn"
              onClick={() => skipVideo(1)}
              aria-label="Next"
            >
              <SkipForward size={14} />
            </button>
          </div>
        </div>
        <div
          className="rc-monitor-mini"
          id="monitorMini"
          onClick={expandMonitor}
          title="Open player"
        >
          <svg
            id="monitorMiniSvg"
            width="68"
            height="60"
            viewBox="0 0 68 60"
            style={{ display: "block" }}
          />
        </div>
      </div>

      {/* Scroll guard bar */}
      <div className="rc-scroll-block-bar" id="scrollBlockBar">
        <span className="rc-sbb-text">Video is playing</span>
        <button className="rc-sbb-keep" onClick={keepWatching}>
          Keep watching
        </button>
        <button className="rc-sbb-dismiss" onClick={dismissScrollBlock}>
          Continue browsing
        </button>
      </div>

      {/* Hidden persistent audio player */}
      <div
        id="ytPlayerAudio"
        style={{
          position: "fixed",
          width: "300px",
          height: "200px",
          left: "-9999px",
          top: "-9999px",
          opacity: 0.01,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[<>&"']/g, (c) =>
    c === "<"
      ? "&lt;"
      : c === ">"
        ? "&gt;"
        : c === "&"
          ? "&amp;"
          : c === '"'
            ? "&quot;"
            : "&#39;",
  );
}
