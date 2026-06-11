"use client";

import { useEffect, useMemo, useRef,useState } from "react";
import Script from "next/script";
import {
  X,
  RotateCcw,
  Headphones,
  Tv,
  ChevronDown,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Maximize2,
} from "lucide-react";
import {
  type Song,
  discSVG,
  fullPlatterSVG,
  miniSVG,
  monitorFrameSVG,
  monitorMiniSVG,
  monthYearLabel,
} from "./vinylSvg";
import "./recordsCatalog.css";

const MONITOR_W = 272;
const MONITOR_H = 210;
const POPUP_SCALE = 2.2;
const POPUP_W = Math.round(MONITOR_W * POPUP_SCALE);
const POPUP_H = Math.round(MONITOR_H * POPUP_SCALE);
const POPUP_VID_X = Math.round(14 * POPUP_SCALE);
const POPUP_VID_Y = Math.round(10 * POPUP_SCALE);
const POPUP_VID_W = Math.round((MONITOR_W - 28) * POPUP_SCALE);
const POPUP_VID_H = Math.round((MONITOR_H - 44) * POPUP_SCALE);

type Group = { key: string; label: string; items: Song[] };

function buildGroups(songs: Song[]): Group[] {
  const map = new Map<string, Group>();
  for (const s of songs) {
    const key = `${s.releaseYear ?? 0}-${String(s.releaseMonth ?? 0).padStart(2, "0")}`;
    let g = map.get(key);
    if (!g) {
      g = { key, label: monthYearLabel(s.releaseMonth, s.releaseYear), items: [] };
      map.set(key, g);
    }
    g.items.push(s);
  }
  // reverse-chronological: newest shelf first
  return Array.from(map.values()).sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0));
}

export default function RecordsCatalog({ songs }: { songs: Song[] }) {
  const groups = useMemo(() => buildGroups(songs), [songs]);

  const S = useRef({
    currentTrack: null as Song | null,
    isPlaying: false,
    mode: "audio" as "audio" | "video",
    ttExpanded: false,
    monitorExpanded: false,
    modalSong: null as Song | null,
    isFlipped: false,
    ytApiReady: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ytAudioPlayer: null as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ytVideoPlayer: null as any,
    scrollBlockVisible: false,
    scrollY0: 0,
    scrollGuardActive: false,
    popupOpen: false,
  });
  const initRef = useRef(false);

  const byId = (id: string) => document.getElementById(id);

  /* ── spin + tonearm visuals ── */
  const setSpin = (on: boolean) => {
    ["platterRecordG", "miniRecordG"].forEach((id) =>
      byId(id)?.classList.toggle("rc-spinning", on),
    );
    ["tonearmG", "miniTonearmG"].forEach((id) =>
      byId(id)?.classList.toggle("rc-tonearm-playing", on),
    );
  };

  /* ── modal ── */
  const openModal = (song: Song) => {
    const s = S.current;
    s.modalSong = song;
    s.isFlipped = false;
    byId("flipCard")?.classList.remove("rc-flipped");
    const flipBtn = byId("flipBtn");
    flipBtn?.classList.remove("rc-active");
    flipBtn?.setAttribute("title", "Flip to liner notes");
    const svg = byId("bigVinyl");
    if (svg) {
      svg.classList.remove("rc-fly-away", "rc-vinyl-slide-in");
      svg.innerHTML = discSVG(95, 95, 93, song.labelColor, song.accentColor, song.title, "modal");
      void svg.getBoundingClientRect();
      svg.classList.add("rc-vinyl-slide-in");
    }
    const bc = byId("backCircle");
    if (bc)
      bc.style.background = `color-mix(in srgb, ${song.labelColor} 10%, var(--color-background-secondary))`;
    const meta = [song.artist, monthYearLabel(song.releaseMonth, song.releaseYear)]
      .filter(Boolean)
      .join(" \u00b7 ");
    setText("backTitle", song.title);
    setText("backArtist", meta);
    setText("backDesc", song.desc);
    const backMeta = byId("backMeta");
    if (backMeta)
      backMeta.innerHTML = song.tags
        .map((t) => `<span class="rc-back-tag">${escapeHtml(t)}</span>`)
        .join("");
    setText("mTitle", song.title);
    setText("mArtist", meta);
    const playBtn = byId("mPlayBtn");
    if (playBtn) playBtn.style.background = song.accent;
    const loaded = !!s.currentTrack && s.currentTrack.id === song.id;
    const playing = loaded && s.isPlaying && s.mode === "audio";
    playBtn?.classList.toggle("rc-playing", playing);
    setText("mPlayLabel", playing ? "Pause" : "Listen");
    byId("modalOverlay")?.classList.add("rc-open");
  };

  const toggleFlip = () => {
    const s = S.current;
    s.isFlipped = !s.isFlipped;
    byId("flipCard")?.classList.toggle("rc-flipped", s.isFlipped);
    const flipBtn = byId("flipBtn");
    flipBtn?.classList.toggle("rc-active", s.isFlipped);
    flipBtn?.setAttribute("title", s.isFlipped ? "Flip back" : "Flip to liner notes");
  };

  const closeModal = () => {
    byId("modalOverlay")?.classList.remove("rc-open");
    window.setTimeout(() => {
      S.current.isFlipped = false;
      byId("flipCard")?.classList.remove("rc-flipped");
      const flipBtn = byId("flipBtn");
      flipBtn?.classList.remove("rc-active");
      flipBtn?.setAttribute("title", "Flip to liner notes");
    }, 300);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === byId("modalOverlay")) closeModal();
  };

  /* ── listen (audio) ── */
  const handleModalPlay = () => {
    const song = S.current.modalSong;
    if (!song) return;
    if (S.current.isFlipped) {
      toggleFlip();
      window.setTimeout(() => doListen(song), 400);
      return;
    }
    doListen(song);
  };
  const doListen = (song: Song) => {
    const s = S.current;
    if (s.mode === "video") {
      s.ytVideoPlayer?.stopVideo?.();
      hideMonitor();
    }
    s.mode = "audio";
    if (s.currentTrack && s.currentTrack.id === song.id) {
      togglePlay();
      closeModal();
      return;
    }
    byId("bigVinyl")?.classList.add("rc-fly-away");
    window.setTimeout(() => {
      closeModal();
      loadAudio(song);
    }, 650);
  };
  const loadAudio = (song: Song) => {
    const s = S.current;
    s.currentTrack = song;
    s.isPlaying = true;
    if (s.ytApiReady && s.ytAudioPlayer?.loadVideoById) s.ytAudioPlayer.loadVideoById(song.ytId);
    swapRecord(song);
    showTurntable();
    byId("ttPlayBtn")?.classList.add("rc-playing");
  };

  /* ── watch (video) ── */
  const handleModalWatch = () => {
    const song = S.current.modalSong;
    if (!song) return;
    if (S.current.isFlipped) {
      toggleFlip();
      window.setTimeout(() => doWatch(song), 400);
      return;
    }
    doWatch(song);
  };
  const doWatch = (song: Song) => {
    const s = S.current;
    s.ytAudioPlayer?.stopVideo?.();
    if (s.mode === "audio") hideTurntable();
    s.mode = "video";
    s.currentTrack = song;
    s.isPlaying = true;
    closeModal();
    buildMonitorFull(song);
    if (s.ytApiReady && s.ytVideoPlayer?.loadVideoById) s.ytVideoPlayer.loadVideoById(song.ytId);
    showMonitor();
    attachScrollGuard();
  };

  /* ── turntable show/hide ── */
  const showTurntable = () => {
    const wrap = byId("ttWrap");
    if (wrap) wrap.style.display = "flex";
    byId("monitorWidget")?.classList.remove("rc-show");
    if (!S.current.ttExpanded) {
      S.current.ttExpanded = true;
      byId("ttFull")?.classList.add("rc-show");
      const mini = byId("ttMini");
      if (mini) mini.style.display = "none";
    }
  };
  const hideTurntable = () => {
    const wrap = byId("ttWrap");
    if (wrap) wrap.style.display = "none";
  };
  const expandTT = () => {
    S.current.ttExpanded = true;
    byId("ttFull")?.classList.add("rc-show");
    const mini = byId("ttMini");
    if (mini) mini.style.display = "none";
  };
  const collapseTT = () => {
    S.current.ttExpanded = false;
    byId("ttFull")?.classList.remove("rc-show");
    const mini = byId("ttMini");
    if (mini) mini.style.display = "";
  };

  /* ── monitor show/hide ── */
  const showMonitor = () => {
    const wrap = byId("ttWrap");
    if (wrap) wrap.style.display = "none";
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
    const wrap = byId("ttWrap");
    if (wrap) wrap.style.display = "flex";
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
    if (svg) svg.innerHTML = monitorFrameSVG(MONITOR_W, MONITOR_H, song.labelColor);
    const bevel = 14,
      scrW = MONITOR_W - bevel * 2,
      scrH = MONITOR_H - 44,
      scrX = bevel,
      scrY = 10;
    const wrap = byId("ytIframeWrap");
    if (wrap)
      wrap.style.cssText = `position:absolute;left:${scrX}px;top:${scrY}px;width:${scrW}px;height:${scrH}px;border-radius:3px;overflow:hidden;background:#000;`;
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

  /* ── switch video -> audio ── */
  const switchToAudio = () => {
    const s = S.current;
    if (!s.currentTrack) return;
    s.ytVideoPlayer?.stopVideo?.();
    s.mode = "audio";
    hideMonitor();
    loadAudio(s.currentTrack);
  };

  /* ── popup video ── */
  const [popupTrackId, setPopupTrackId] = useState<string | null>(null);
  const [popupAutoplay, setPopupAutoplay] = useState(true);

  const openPopup = () => {
    const s = S.current;
    if (!s.currentTrack) return;
    s.popupOpen = true;
    s.ytVideoPlayer?.pauseVideo();
    setPopupAutoplay(true);
    setPopupTrackId(s.currentTrack.ytId);
    const svg = byId("popupMonitorSvg");
    if (svg) svg.innerHTML = monitorFrameSVG(MONITOR_W, MONITOR_H, s.currentTrack.labelColor);
    byId("popupPlayBtn")?.classList.add("rc-playing");
    byId("popupOverlay")?.classList.add("rc-show");
    document.body.style.overflow = "hidden";
  };

  const closePopup = () => {
    S.current.popupOpen = false;
    setPopupTrackId(null);
    byId("popupOverlay")?.classList.remove("rc-show");
    document.body.style.overflow = "";
  };

  const postToPopupIframe = (cmd: string) => {
    const iframe = byId("popupIframe") as HTMLIFrameElement | null;
    iframe?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: cmd, args: "" }),
      "*",
    );
  };

  const handlePopupTogglePlay = () => {
    const s = S.current;
    s.isPlaying = !s.isPlaying;
    postToPopupIframe(s.isPlaying ? "playVideo" : "pauseVideo");
    byId("popupPlayBtn")?.classList.toggle("rc-playing", s.isPlaying);
  };

  const handlePopupSkip = (dir: number) => {
    const s = S.current;
    s.ytVideoPlayer?.pauseVideo();
    skip(dir);
    s.ytVideoPlayer?.pauseVideo();
    s.isPlaying = false;
    setPopupAutoplay(false);
    if (s.currentTrack) {
      setPopupTrackId(s.currentTrack.ytId);
      const svg = byId("popupMonitorSvg");
      if (svg) svg.innerHTML = monitorFrameSVG(MONITOR_W, MONITOR_H, s.currentTrack.labelColor);
    }
    byId("popupPlayBtn")?.classList.remove("rc-playing");
  };

  /* ── record swap / play / skip ── */
  const swapRecord = (song: Song) => {
    const old = byId("platterRecordG");
    if (old) {
      old.classList.remove("rc-spinning");
      old.classList.add("rc-ejecting");
      window.setTimeout(() => {
        const fp = byId("fullPlatter");
        if (fp) fp.innerHTML = fullPlatterSVG(song);
        animateDrop();
      }, 430);
    } else {
      const fp = byId("fullPlatter");
      if (fp) fp.innerHTML = fullPlatterSVG(song);
      animateDrop();
    }
    updateTTUI(song);
  };
  const animateDrop = () => {
    const rg = byId("platterRecordG");
    if (!rg) return;
    rg.classList.add("rc-dropping");
    window.setTimeout(() => {
      rg.classList.remove("rc-dropping");
      if (S.current.isPlaying) setSpin(true);
    }, 520);
  };
  const updateTTUI = (song: Song) => {
    const track = byId("ttTrack");
    if (track)
      track.innerHTML = `<div class="rc-tname">${escapeHtml(song.title)}</div><div class="rc-tartist">${escapeHtml(song.artist)}</div>`;
    byId("ttPlayBtn")?.classList.toggle("rc-playing", S.current.isPlaying);
    const mini = byId("miniSvg");
    if (mini) mini.innerHTML = miniSVG(song);
    if (S.current.isPlaying) setSpin(true);
  };
  const togglePlay = () => {
    const s = S.current;
    if (!s.currentTrack) return;
    s.isPlaying = !s.isPlaying;
    if (s.mode === "audio") {
      if (s.ytApiReady && s.ytAudioPlayer) {
        if (s.isPlaying) s.ytAudioPlayer.playVideo();
        else s.ytAudioPlayer.pauseVideo();
      }
      setSpin(s.isPlaying);
      byId("ttPlayBtn")?.classList.toggle("rc-playing", s.isPlaying);
    } else {
      if (s.ytApiReady && s.ytVideoPlayer) {
        if (s.isPlaying) s.ytVideoPlayer.playVideo();
        else s.ytVideoPlayer.pauseVideo();
      }
      byId("monPlayBtn")?.classList.toggle("rc-playing", s.isPlaying);
    }
  };
  const skip = (dir: number) => {
    const s = S.current;
    if (!s.currentTrack) return;
    const idx = songs.findIndex((x) => x.id === s.currentTrack!.id);
    if (idx < 0) return;
    const next = songs[(idx + dir + songs.length) % songs.length];
    if (s.mode === "audio") {
      loadAudio(next);
    } else {
      s.currentTrack = next;
      if (s.ytApiReady && s.ytVideoPlayer?.loadVideoById) s.ytVideoPlayer.loadVideoById(next.ytId);
      buildMonitorFull(next);
    }
  };

  /* ── YouTube IFrame API ── */
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    document.title = "Records | Arbitrary";

    const fp = byId("fullPlatter");
    if (fp) fp.innerHTML = fullPlatterSVG(null);
    const mini = byId("miniSvg");
    if (mini) mini.innerHTML = miniSVG(null);
    const mm = byId("monitorMiniSvg");
    if (mm) mm.innerHTML = monitorMiniSVG(null);
    const wrap = byId("ttWrap");
    if (wrap) wrap.style.display = "flex";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const initPlayers = () => {
      const YT = w.YT;
      if (!YT || !YT.Player) return;
      const s = S.current;
      s.ytApiReady = true;
      s.ytAudioPlayer = new YT.Player("ytPlayerAudio", {
        width: "1",
        height: "1",
        playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, modestbranding: 1, playsinline: 1 },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        events: { onStateChange: (e: any) => onAudioStateChange(e) },
      });
      s.ytVideoPlayer = new YT.Player("ytPlayerVideo", {
        width: "240",
        height: "150",
        playerVars: { autoplay: 0, controls: 1, modestbranding: 1, playsinline: 1, rel: 0 },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        events: { onStateChange: (e: any) => onVideoStateChange(e) },
      });
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onAudioStateChange = (e: any) => {
      if (e.data === w.YT?.PlayerState?.ENDED) skip(1);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onVideoStateChange = (e: any) => {
      const PS = w.YT?.PlayerState;
      if (e.data === PS?.ENDED) skip(1);
      if (e.data === PS?.PLAYING) S.current.isPlaying = true;
      if (e.data === PS?.PAUSED) S.current.isPlaying = false;
    };

    if (w.YT && w.YT.Player) initPlayers();
    else w.onYouTubeIframeAPIReady = initPlayers;

    return () => {
      detachScrollGuard();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalLabel = `${songs.length} record${songs.length === 1 ? "" : "s"}`;

  return (
    <div className="rc-root">
      <Script src="https://www.youtube.com/iframe_api" strategy="afterInteractive" />

      {/* Catalog hero — matches the events page tone */}
      <header className="container mx-auto px-6 mb-20 animate-fade-in">
        <span className="inline-block text-[#FACC15] font-bold uppercase tracking-[0.4em] text-xs mb-6 px-4 py-2 bg-zinc-50 rounded-full border border-black/5">
          The Arbitrary Catalog
        </span>
        <h1 className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tighter uppercase leading-[0.85] mb-8">
          Records <br />
          <span className="text-transparent bg-clip-text bg-linear-to-r from-[#FACC15] to-zinc-800">
            &amp; Releases
          </span>
        </h1>
        <p className="text-zinc-400 font-bold uppercase tracking-widest text-sm">{totalLabel}</p>
      </header>

      {groups.map((g) => (
        <section className="rc-shelf-section container mx-auto px-6" key={g.key}>
          <div className="flex items-center gap-6 mb-8">
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter whitespace-nowrap">
              {g.label}
            </h2>
            <div className="h-0.5 flex-1 bg-black/5" />
            <span className="text-zinc-400 font-bold uppercase tracking-widest text-xs whitespace-nowrap">
              {g.items.length} release{g.items.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="rc-shelf">
            {g.items.map((song) => (
              <div
                key={song.id}
                className="rc-vslot"
                style={{ transform: `rotate(${song.tilt}deg)` }}
                onClick={() => openModal(song)}
              >
                <div className="rc-sleeve-wrap">
                  <svg
                    className="rc-disc-peek"
                    width="134"
                    height="134"
                    viewBox="0 0 108 108"
                    style={{ borderRadius: "50%", display: "block" }}
                    dangerouslySetInnerHTML={{
                      __html: discSVG(54, 54, 54, song.labelColor, song.accentColor, song.title, "pk" + song.id),
                    }}
                  />
                  <div
                    className="rc-sleeve-card"
                    style={song.coverImageUrl ? { backgroundImage: `url(${song.coverImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', color: song.sleeveText } : { background: song.coverColor, color: song.sleeveText }}
                  >
                    <svg
                      className="rc-sleeve-lines"
                      viewBox="0 0 108 108"
                      dangerouslySetInnerHTML={{
                        __html: `<g opacity=".08">${[0, 1, 2, 3, 4, 5, 6]
                          .map(
                            (k) =>
                              `<line x1="${k * 18}" y1="0" x2="${k * 18}" y2="108" stroke="${song.sleeveText}" stroke-width=".5"/><line x1="0" y1="${k * 18}" x2="108" y2="${k * 18}" stroke="${song.sleeveText}" stroke-width=".5"/>`,
                          )
                          .join("")}</g>`,
                      }}
                    />
                    <div className="rc-sleeve-shine" />
                    <div className="rc-sleeve-title">{song.title}</div>
                    <div className="rc-sleeve-artist">{song.artist}</div>
                  </div>
                </div>
                <div className="rc-slot-label">
                  <strong>{song.title}</strong>
                  <span>{song.releaseYear ?? ""}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="rc-shelf-ledge" />
        </section>
      ))}

      {/* Modal */}
      <div className="rc-modal-overlay" id="modalOverlay" onClick={handleOverlayClick}>
        <div className="rc-modal-box" id="modalBox">
          <button className="rc-modal-close" onClick={closeModal} aria-label="Close">
            <X size={18} />
          </button>
          <div className="rc-flip-scene">
            <div className="rc-flip-card" id="flipCard">
              <div className="rc-flip-face rc-front">
                <svg id="bigVinyl" className="rc-big-vinyl-svg" width="190" height="190" viewBox="0 0 190 190" />
              </div>
              <div className="rc-flip-face rc-back">
                <div className="rc-back-circle" id="backCircle">
                  <svg className="rc-back-rings" viewBox="0 0 190 190" style={{ position: "absolute", inset: 0 }}>
                    <circle cx="95" cy="95" r="90" fill="none" stroke="var(--color-border-tertiary)" strokeWidth=".5" />
                    <circle cx="95" cy="95" r="76" fill="none" stroke="var(--color-border-tertiary)" strokeWidth=".4" />
                    <circle cx="95" cy="95" r="61" fill="none" stroke="var(--color-border-tertiary)" strokeWidth=".35" />
                    <circle cx="95" cy="95" r="46" fill="none" stroke="var(--color-border-tertiary)" strokeWidth=".3" />
                  </svg>
                  <div className="rc-back-label">Liner Notes</div>
                  <div className="rc-back-title" id="backTitle">
                    &mdash;
                  </div>
                  <div className="rc-back-artist" id="backArtist">
                    &mdash;
                  </div>
                  <div className="rc-back-divider" />
                  <div className="rc-back-desc" id="backDesc">
                    &mdash;
                  </div>
                  <div className="rc-back-meta" id="backMeta" />
                </div>
              </div>
            </div>
          </div>
          <div className="rc-modal-info">
            <div className="rc-modal-title-row">
              <h3 id="mTitle">&mdash;</h3>
              <button className="rc-flip-btn" id="flipBtn" onClick={toggleFlip} title="Flip to liner notes">
                <RotateCcw size={15} />
              </button>
            </div>
            <p id="mArtist">&mdash;</p>
          </div>
          <div className="rc-modal-actions">
            <button className="rc-btn-play" id="mPlayBtn" onClick={handleModalPlay}>
              <span className="rc-ic rc-ic-play">
                <Headphones size={16} />
              </span>
              <span className="rc-ic rc-ic-pause">
                <Pause size={16} />
              </span>
              <span id="mPlayLabel">Listen</span>
            </button>
            <button className="rc-btn-watch" id="mWatchBtn" onClick={handleModalWatch}>
              <Tv size={15} />
              <span>Watch</span>
            </button>
          </div>
        </div>
      </div>

      {/* Turntable dock */}
      <div className="rc-tt-wrap" id="ttWrap">
        <div className="rc-tt-full" id="ttFull">
          <div className="rc-tt-full-header">
            <span>Now Playing</span>
            <button onClick={collapseTT} aria-label="Collapse">
              <ChevronDown size={16} />
            </button>
          </div>
          <div className="rc-tt-platter-wrap">
            <svg width="210" height="210" viewBox="0 0 210 210" id="fullPlatter" style={{ display: "block" }} />
          </div>
          <div className="rc-tt-track" id="ttTrack">
            <div className="rc-tempty">Select a record to play</div>
          </div>
          <div className="rc-tt-controls">
            <button className="rc-tt-btn" onClick={() => skip(-1)} aria-label="Previous">
              <SkipBack size={14} />
            </button>
            <button className="rc-tt-btn rc-big" id="ttPlayBtn" onClick={togglePlay} aria-label="Play/Pause">
              <span className="rc-ic rc-ic-play">
                <Play size={17} />
              </span>
              <span className="rc-ic rc-ic-pause">
                <Pause size={17} />
              </span>
            </button>
            <button className="rc-tt-btn" onClick={() => skip(1)} aria-label="Next">
              <SkipForward size={14} />
            </button>
          </div>
        </div>
        <div className="rc-tt-mini" id="ttMini" onClick={expandTT} title="Open player">
          <svg id="miniSvg" width="68" height="68" viewBox="0 0 68 68" style={{ display: "block" }} />
        </div>
      </div>

      {/* Monitor widget */}
      <div className="rc-monitor-widget" id="monitorWidget">
        <div className="rc-monitor-full" id="monitorFull">
          <div className="rc-monitor-full-header">
            <span>Now Watching</span>
            <div className="rc-monitor-header-btns">
              <button onClick={switchToAudio} title="Switch to audio">
                <Headphones size={15} />
              </button>
              <button onClick={openPopup} title="Pop up">
                <Maximize2 size={17} />
              </button>
              <button onClick={collapseMonitor} title="Collapse">
                <ChevronDown size={15} />
              </button>
            </div>
          </div>
          <div className="rc-monitor-frame-wrap" id="monitorFrameWrap">
            <svg id="monitorSvg" width={MONITOR_W} height={MONITOR_H} viewBox={`0 0 ${MONITOR_W} ${MONITOR_H}`} style={{ display: "block" }} />
            <div className="rc-yt-iframe-wrap" id="ytIframeWrap">
              <div id="ytPlayerVideo" />
            </div>
          </div>
          <div className="rc-monitor-track" id="monitorTrack" />
          <div className="rc-monitor-controls">
            <button className="rc-tt-btn" onClick={() => skip(-1)} aria-label="Previous">
              <SkipBack size={14} />
            </button>
            <button className="rc-tt-btn rc-big" id="monPlayBtn" onClick={togglePlay} aria-label="Play/Pause">
              <span className="rc-ic rc-ic-play">
                <Play size={17} />
              </span>
              <span className="rc-ic rc-ic-pause">
                <Pause size={17} />
              </span>
            </button>
            <button className="rc-tt-btn" onClick={() => skip(1)} aria-label="Next">
              <SkipForward size={14} />
            </button>
          </div>
        </div>
        <div className="rc-monitor-mini" id="monitorMini" onClick={expandMonitor} title="Open player">
          <svg id="monitorMiniSvg" width="68" height="60" viewBox="0 0 68 60" style={{ display: "block" }} />
        </div>
      </div>

      {/* Popup video overlay */}
      <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex-col items-center justify-center overflow-y-auto" id="popupOverlay">
        <div className="flex flex-col items-center gap-6 p-4 max-w-full">
          <div className="relative">
            <button
              onClick={closePopup}
              className="absolute -top-3 -right-3 z-10 w-6 h-6 rounded-full bg-white/5 text-white/40 hover:text-white hover:bg-white/20 transition-all flex items-center justify-center"
              aria-label="Close popup"
            >
              <X size={18} />
            </button>
            <div style={{ position: "relative", width: POPUP_W, height: POPUP_H }}>
              <svg id="popupMonitorSvg" width={POPUP_W} height={POPUP_H} viewBox={`0 0 ${MONITOR_W} ${MONITOR_H}`} style={{ display: "block" }} />
              <div style={{ position: "absolute", left: POPUP_VID_X, top: POPUP_VID_Y, width: POPUP_VID_W, height: POPUP_VID_H, borderRadius: 6, overflow: "hidden", background: "#000" }}>
                {popupTrackId && (
                  <iframe
                    id="popupIframe"
                    src={`https://www.youtube.com/embed/${popupTrackId}?autoplay=${popupAutoplay ? 1 : 0}&enablejsapi=1`}
                    width="100%"
                    height="100%"
                    allow="autoplay; encrypted-media"
                    style={{ border: 0 }}
                  />
                )}
              </div>
            </div>
          </div>
          {S.current.currentTrack && (
            <div className="text-white/80 text-sm text-center">
              <div className="text-base font-bold">{S.current.currentTrack.title}</div>
              <div className="text-zinc-400">{S.current.currentTrack.artist}</div>
            </div>
          )}
          <div className="flex items-center gap-4">
            <button className="rc-tt-btn text-white hover:text-[#FACC15] transition-colors" onClick={() => handlePopupSkip(-1)} aria-label="Previous">
              <SkipBack size={14} />
            </button>
            <button className="rc-tt-btn rc-big text-white hover:text-[#FACC15] transition-colors" id="popupPlayBtn" onClick={handlePopupTogglePlay} aria-label="Play/Pause">
              <span className="rc-ic rc-ic-play">
                <Play size={17} />
              </span>
              <span className="rc-ic rc-ic-pause">
                <Pause size={17} />
              </span>
            </button>
            <button className="rc-tt-btn text-white hover:text-[#FACC15] transition-colors" onClick={() => handlePopupSkip(1)} aria-label="Next">
              <SkipForward size={14} />
            </button>
          </div>
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
        style={{ position: "fixed", width: 1, height: 1, opacity: 0, pointerEvents: "none", bottom: 0, right: 0 }}
      />
    </div>
  );
}

function setText(id: string, text: string) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function escapeHtml(s: string): string {
  return s.replace(/[<>&"']/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === '"' ? "&quot;" : "&#39;",
  );
}
