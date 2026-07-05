// SVG string generators ported from the vinyl_catalog_v9 prototype.
// Functions return SVG markup strings injected via dangerouslySetInnerHTML.
// Visual improvements (shimmer ring, hairline ring, groove variation,
// felt-mat rings, counterweight, tonearm group) are baked in.

export type Song = {
  id: number;
  title: string;
  artist: string;
  releaseMonth: number | null;
  releaseYear: number | null;
  ytId: string;
  labelColor: string;
  accentColor: string;
  coverColor: string;
  sleeveText: string;
  accent: string;
  tilt: number;
  desc: string;
  tags: string[];
  coverImageUrl?: string | null;
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "Jan 2026" style label from a record's month/year. */
export function monthYearLabel(month: number | null, year: number | null): string {
  const m = month && month >= 1 && month <= 12 ? MONTHS[month - 1] : "";
  const y = year ? String(year) : "";
  return [m, y].filter(Boolean).join(" ") || "Undated";
}

/** Extract a YouTube video id from a full URL or bare id. */
export function extractYtId(url: string | null | undefined): string {
  if (!url) return "";
  const s = url.trim();
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  return s;
}

/** Build a YouTube thumbnail URL for a valid 11-char video id. */
function getYouTubeThumbnailUrl(ytId: string): string | null {
  if (!/^[A-Za-z0-9_-]{11}$/.test(ytId)) return null;
  return `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
}

/** Lighten a hex color toward white by `amt` (0..1) for a soft accent. */
function lighten(hex: string, amt: number): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amt);
  const to2 = (c: number) => mix(c).toString(16).padStart(2, "0");
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

/** Map a raw DB record row into a fully-populated Song for the catalog. */
export function mapRecordToSong(rec: {
  id: number;
  title: string;
  artist: string;
  releaseMonth: number | null;
  releaseYear: number | null;
  genre: string | null;
  coverImageUrl: string | null;
  labelColor: string | null;
  youtubeUrl: string | null;
}): Song {
  const labelColor = rec.labelColor || "#c0392b";
  const accentColor = lighten(labelColor, 0.45);
  const tilt = ((rec.id * 37) % 9) - 4; // deterministic -4..4 lean
  const ytId = extractYtId(rec.youtubeUrl);
  const resolvedCoverImageUrl = rec.coverImageUrl || getYouTubeThumbnailUrl(ytId);
  const hasCover = !!resolvedCoverImageUrl;
  const tags = [
    rec.genre || "Single",
    rec.releaseYear ? String(rec.releaseYear) : null,
  ].filter(Boolean) as string[];
  return {
    id: rec.id,
    title: rec.title,
    artist: rec.artist,
    releaseMonth: rec.releaseMonth,
    releaseYear: rec.releaseYear,
    ytId,
    labelColor,
    accentColor,
    coverColor: lighten(labelColor, 0.7),
    sleeveText: hasCover ? "#ffffff" : "#1a1a1a",
    accent: labelColor,
    tilt,
    desc:
      `${rec.title} by ${rec.artist}` +
      (rec.genre ? ` — a ${rec.genre.toLowerCase()} release` : "") +
      (rec.releaseYear ? ` from ${rec.releaseYear}.` : "."),
    tags,
    coverImageUrl: resolvedCoverImageUrl,
  };
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === '"' ? "&quot;" : "&#39;",
  );
}

/* ── vinyl disc ── */
export function discSVG(
  cx: number,
  cy: number,
  r: number,
  labelColor: string,
  accentColor: string,
  title: string,
  sid: string,
): string {
  const step = r / 9;
  const grooves = Array.from({ length: 9 }, (_, i) => {
    const gr = r * 0.97 - i * step * 0.72;
    // groove depth variation: every third groove slightly stronger
    const op = 0.12 + i * 0.035 + (i % 3 === 0 ? 0.04 : 0);
    return `<circle cx="${cx}" cy="${cy}" r="${gr}" fill="none" stroke="#fff" stroke-width="${
      0.5 + i * 0.04
    }" opacity="${op.toFixed(3)}"/>`;
  }).join("");
  const lr = r * 0.3;
  const short = (t: string) => (t.length > 9 ? t.slice(0, 9) + "\u2026" : t);
  const lastName = title.split(" ").slice(-1)[0];
  return `
<defs>
  <radialGradient id="vg${sid}" cx="36%" cy="32%" r="68%"><stop offset="0%" stop-color="#2e2e2e"/><stop offset="40%" stop-color="#141414"/><stop offset="100%" stop-color="#080808"/></radialGradient>
  <radialGradient id="lg${sid}" cx="38%" cy="35%" r="72%"><stop offset="0%" stop-color="${accentColor}" stop-opacity="0.55"/><stop offset="60%" stop-color="${labelColor}"/><stop offset="100%" stop-color="${labelColor}" stop-opacity=".85"/></radialGradient>
  <radialGradient id="sh${sid}" cx="28%" cy="25%" r="55%"><stop offset="0%" stop-color="#fff" stop-opacity="0.07"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <linearGradient id="shim${sid}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ff9999"/><stop offset="33%" stop-color="#ffffaa"/><stop offset="66%" stop-color="#aaffee"/><stop offset="100%" stop-color="#aaaaff"/></linearGradient>
</defs>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#vg${sid})"/>
<circle cx="${cx}" cy="${cy}" r="${r * 0.99}" fill="none" stroke="#fff" stroke-width=".5" opacity=".06"/>
${grooves}
<circle cx="${cx}" cy="${cy}" r="${r * 0.85}" fill="none" stroke="url(#shim${sid})" stroke-width="1.2" opacity="0.05"/>
<circle cx="${cx}" cy="${cy}" r="${r * 0.37}" fill="url(#vg${sid})" opacity=".55"/>
<circle cx="${cx}" cy="${cy}" r="${lr}" fill="url(#lg${sid})"/>
<circle cx="${cx}" cy="${cy}" r="${lr * 1.04}" fill="none" stroke="#fff" stroke-width="0.5" opacity="0.22"/>
<circle cx="${cx}" cy="${cy}" r="${lr * 0.93}" fill="none" stroke="#fff" stroke-width=".6" opacity=".14"/>
<circle cx="${cx}" cy="${cy}" r="${lr * 0.78}" fill="none" stroke="#fff" stroke-width=".4" opacity=".09"/>
<line x1="${cx - lr * 0.52}" y1="${cy}" x2="${cx + lr * 0.52}" y2="${cy}" stroke="#fff" stroke-width=".4" opacity=".13"/>
<line x1="${cx}" y1="${cy - lr * 0.52}" x2="${cx}" y2="${cy + lr * 0.52}" stroke="#fff" stroke-width=".4" opacity=".13"/>
<circle cx="${cx}" cy="${cy - lr * 0.28}" r="${lr * 0.06}" fill="#fff" opacity=".18"/>
<text x="${cx}" y="${cy - lr * 0.06}" text-anchor="middle" font-size="${lr * 0.34}" font-family="sans-serif" font-weight="500" fill="#fff" opacity=".93">${escapeXml(short(title))}</text>
<text x="${cx}" y="${cy + lr * 0.38}" text-anchor="middle" font-size="${lr * 0.27}" font-family="sans-serif" fill="#fff" opacity=".62">${escapeXml(lastName)}</text>
<circle cx="${cx}" cy="${cy}" r="${r * 0.044}" fill="#060606"/>
<circle cx="${cx}" cy="${cy}" r="${r * 0.044}" fill="none" stroke="#fff" stroke-width=".5" opacity=".22"/>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#sh${sid})"/>
<ellipse cx="${cx - r * 0.2}" cy="${cy - r * 0.24}" rx="${r * 0.28}" ry="${r * 0.13}" fill="#fff" opacity=".028" transform="rotate(-28,${cx},${cy})"/>`;
}

/* ── monitor frame ── */
export function monitorFrameSVG(W: number, H: number, accentColor: string): string {
  const bevel = 14,
    scrW = W - bevel * 2,
    scrH = H - 44,
    scrX = bevel,
    scrY = 10;
  return `
<defs>
  <linearGradient id="monBody" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#3a3a3a"/><stop offset="100%" stop-color="#1e1e1e"/></linearGradient>
  <linearGradient id="monBezel" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#444"/><stop offset="100%" stop-color="#2a2a2a"/></linearGradient>
  <linearGradient id="monBase" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#4a4a4a"/><stop offset="100%" stop-color="#282828"/></linearGradient>
  <linearGradient id="scrGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#0a0a0a"/><stop offset="100%" stop-color="#111"/></linearGradient>
  <filter id="monShadow"><feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000" flood-opacity="0.5"/></filter>
</defs>
<rect x="4" y="4" width="${W - 8}" height="${H - 30}" rx="10" fill="url(#monBody)" filter="url(#monShadow)"/>
<rect x="4" y="4" width="${W - 8}" height="${H - 30}" rx="10" fill="none" stroke="#fff" stroke-width=".4" opacity=".08"/>
<rect x="${scrX - 6}" y="${scrY - 4}" width="${scrW + 12}" height="${scrH + 8}" rx="6" fill="url(#monBezel)"/>
<rect id="screenBg" x="${scrX}" y="${scrY}" width="${scrW}" height="${scrH}" rx="3" fill="url(#scrGrad)"/>
<polygon points="${scrX},${scrY} ${scrX + scrW * 0.45},${scrY} ${scrX + scrW * 0.28},${scrY + scrH * 0.42} ${scrX},${scrY + scrH * 0.32}" fill="#fff" opacity="0.025"/>
<rect x="4" y="${H - 30}" width="${W - 8}" height="22" rx="0" fill="url(#monBody)"/>
<rect x="4" y="${H - 30 + 22 - 8}" width="${W - 8}" height="8" rx="0" fill="url(#monBody)"/>
<circle cx="${W - 22}" cy="${H - 19}" r="3" fill="${accentColor || "#c0392b"}" opacity=".85"/>
<circle cx="${W - 22}" cy="${H - 19}" r="1.5" fill="#fff" opacity=".4"/>
<text x="${W / 2}" y="${H - 16}" text-anchor="middle" font-size="7" font-family="sans-serif" fill="#555" letter-spacing="2">MONO</text>
<rect x="${W / 2 - 6}" y="${H - 8}" width="12" height="8" rx="1" fill="url(#monBase)"/>
<ellipse cx="${W / 2}" cy="${H}" rx="28" ry="5" fill="url(#monBase)"/>
<ellipse cx="${W / 2}" cy="${H}" rx="28" ry="5" fill="none" stroke="#fff" stroke-width=".3" opacity=".1"/>`;
}

/* ── mini monitor ── */
export function monitorMiniSVG(accentColor: string | null): string {
  return `
<defs>
  <linearGradient id="mmBody" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#3a3a3a"/><stop offset="100%" stop-color="#1e1e1e"/></linearGradient>
</defs>
<rect x="2" y="2" width="64" height="44" rx="6" fill="url(#mmBody)"/>
<rect x="2" y="2" width="64" height="44" rx="6" fill="none" stroke="#fff" stroke-width=".4" opacity=".08"/>
<rect x="8" y="7" width="52" height="34" rx="3" fill="#0a0a0a"/>
${Array.from({ length: 6 }, (_, i) => `<line x1="8" y1="${10 + i * 5}" x2="60" y2="${10 + i * 5}" stroke="#fff" stroke-width=".4" opacity=".04"/>`).join("")}
<rect x="8" y="7" width="52" height="34" rx="3" fill="${accentColor || "#c0392b"}" opacity=".08"/>
<circle cx="60" cy="38" r="2.5" fill="${accentColor || "#c0392b"}" opacity=".8"/>
<rect x="30" y="46" width="8" height="6" rx="1" fill="#2a2a2a"/>
<ellipse cx="34" cy="55" rx="14" ry="3" fill="#2a2a2a"/>`;
}

/* ── full turntable platter ── */
export function fullPlatterSVG(song: Song | null): string {
  const cx = 105,
    cy = 105,
    pr = 90;
  const record = song
    ? discSVG(cx, cy, pr, song.labelColor, song.accentColor, song.title, "fp")
    : `<circle cx="${cx}" cy="${cy}" r="${pr}" fill="#1e1e1e" stroke="#333" stroke-width=".5"/><text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="10" fill="#555" font-family="sans-serif">no record</text>`;
  // felt-mat rings (dashed, faint), radii evenly spaced 30..75
  const feltRings = [30, 45, 60, 75]
    .map(
      (rr) =>
        `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="none" stroke="#fff" stroke-dasharray="2 4" stroke-width=".4" opacity="0.03"/>`,
    )
    .join("");
  return `
<defs>
  <radialGradient id="fpBase" cx="50%" cy="44%" r="56%"><stop offset="0%" stop-color="#2e2e2e"/><stop offset="100%" stop-color="#181818"/></radialGradient>
  <radialGradient id="fpMat" cx="50%" cy="46%" r="54%"><stop offset="0%" stop-color="#363636"/><stop offset="65%" stop-color="#252525"/><stop offset="100%" stop-color="#1c1c1c"/></radialGradient>
  <radialGradient id="bodyFP" cx="30%" cy="25%" r="76%"><stop offset="0%" stop-color="#3a3a3a"/><stop offset="100%" stop-color="#1a1a1a"/></radialGradient>
  <linearGradient id="armFP" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#5a5a5a"/><stop offset="100%" stop-color="#2c2c2c"/></linearGradient>
  <linearGradient id="armHL" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#fff" stop-opacity=".18"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <filter id="fshadow"><feDropShadow dx="1" dy="2" stdDeviation="2.5" flood-color="#000" flood-opacity=".55"/></filter>
</defs>
<rect x="2" y="2" width="206" height="206" rx="12" fill="url(#bodyFP)" filter="url(#fshadow)"/>
<rect x="2" y="2" width="206" height="206" rx="12" fill="none" stroke="#fff" stroke-width=".4" opacity=".07"/>
${Array.from({ length: 6 }, (_, i) => `<line x1="2" y1="${30 + i * 28}" x2="208" y2="${32 + i * 28}" stroke="#fff" stroke-width=".3" opacity=".025"/>`).join("")}
<circle cx="${cx}" cy="${cy}" r="${pr + 10}" fill="url(#fpBase)" filter="url(#fshadow)"/>
<circle cx="${cx}" cy="${cy}" r="${pr + 10}" fill="none" stroke="#fff" stroke-width=".4" opacity=".08"/>
<circle cx="${cx}" cy="${cy}" r="${pr}" fill="url(#fpMat)"/>
${Array.from({ length: 4 }, (_, i) => `<circle cx="${cx}" cy="${cy}" r="${pr - 4 - i * 6}" fill="none" stroke="#fff" stroke-width=".3" opacity=".04"/>`).join("")}
${feltRings}
<g id="platterRecordG" class="rc-record-group" style="transform-origin:${cx}px ${cy}px">
  ${record}
</g>
<circle cx="${cx}" cy="${cy}" r="5" fill="#444"/>
<circle cx="${cx}" cy="${cy}" r="3" fill="#282828"/>
<circle cx="${cx - 1}" cy="${cy - 1}" r="1" fill="#666"/>
<rect x="164" y="14" width="34" height="34" rx="17" fill="url(#bodyFP)" stroke="#fff" stroke-width=".4" opacity=".08"/>
<rect x="164" y="14" width="34" height="34" rx="17" fill="none" stroke="#fff" stroke-width=".4" opacity=".08"/>
<circle cx="181" cy="31" r="12" fill="#252525"/>
<circle cx="181" cy="31" r="6" fill="url(#armFP)"/>
<circle cx="181" cy="31" r="6" fill="url(#armHL)"/>
<circle cx="181" cy="31" r="2.5" fill="#1a1a1a"/>
<circle cx="180" cy="30" r="1" fill="#666"/>
<line x1="195" y1="19" x2="201" y2="11" stroke="#777" stroke-width=".7"/>
<circle cx="202" cy="10" r="2.5" fill="#555"/>
<g id="tonearmG" class="rc-tonearm" style="transform-origin:181px 31px">
  <rect x="186" y="11" width="8" height="5" rx="2" fill="url(#armFP)" transform="rotate(42 190 13.5)"/>
  <rect x="186" y="11" width="8" height="5" rx="2" fill="none" stroke="#fff" stroke-width=".3" opacity=".18" transform="rotate(42 190 13.5)"/>
  <path d="M181 25 L140 64" stroke="url(#armFP)" stroke-width="5" stroke-linecap="round" fill="none"/>
  <path d="M181 25 L140 64" stroke="url(#armHL)" stroke-width="5" stroke-linecap="round" fill="none"/>
  <path d="M140 64 L128 77" stroke="#424242" stroke-width="4" stroke-linecap="round" fill="none"/>
  <path d="M140 64 L128 77" stroke="url(#armHL)" stroke-width="4" stroke-linecap="round" fill="none"/>
  <rect x="114" y="73" width="20" height="11" rx="3" fill="url(#armFP)"/>
  <rect x="114" y="73" width="20" height="11" rx="3" fill="url(#armHL)"/>
  <rect x="114" y="73" width="20" height="11" rx="3" fill="none" stroke="#fff" stroke-width=".3" opacity=".2"/>
  <line x1="124" y1="84" x2="126" y2="94" stroke="#777" stroke-width="1.1" stroke-linecap="round"/>
  <circle cx="126" cy="95" r="1.8" fill="#aaa"/>
  <circle cx="126" cy="95" r=".9" fill="#ddd"/>
</g>
<rect x="170" y="52" width="24" height="7" rx="3.5" fill="#2e2e2e"/>
<rect x="170" y="52" width="24" height="7" rx="3.5" fill="none" stroke="#fff" stroke-width=".3" opacity=".12"/>
<circle cx="194" cy="55.5" r="2.8" fill="#3a3a3a"/>
<rect x="14" y="178" width="32" height="12" rx="3" fill="#2a2a2a"/>
<text x="30" y="187.5" text-anchor="middle" font-size="7" fill="#888" font-family="sans-serif">33\u2153</text>
<rect x="50" y="178" width="24" height="12" rx="3" fill="#1e1e1e"/>
<text x="62" y="187.5" text-anchor="middle" font-size="7" fill="#555" font-family="sans-serif">45</text>
<circle cx="192" cy="184" r="4" fill="${song ? song.labelColor : "#333"}" opacity=".9"/>
<circle cx="192" cy="184" r="2" fill="#fff" opacity=".4"/>`;
}

/* ── mini platter ── */
export function miniSVG(song: Song | null): string {
  const cx = 34,
    cy = 34,
    pr = 24;
  if (!song) {
    return `<defs><radialGradient id="mg0" cx="50%" cy="44%" r="56%"><stop offset="0%" stop-color="#2e2e2e"/><stop offset="100%" stop-color="#181818"/></radialGradient><radialGradient id="mm0" cx="50%" cy="46%" r="54%"><stop offset="0%" stop-color="#363636"/><stop offset="100%" stop-color="#1c1c1c"/></radialGradient></defs>
<rect x="1" y="1" width="66" height="66" rx="33" fill="url(#mg0)"/>
<circle cx="${cx}" cy="${cy}" r="${pr + 4}" fill="url(#mm0)"/>
<circle cx="${cx}" cy="${cy}" r="${pr}" fill="#1e1e1e" stroke="#333" stroke-width=".4"/>
<circle cx="${cx}" cy="${cy}" r="3" fill="#444"/>
<line x1="56" y1="12" x2="42" y2="26" stroke="#555" stroke-width="1.1" stroke-linecap="round"/>
<circle cx="57" cy="11" r="2.5" fill="#444"/>`;
  }
  return `<defs><radialGradient id="mg1" cx="50%" cy="44%" r="56%"><stop offset="0%" stop-color="#2e2e2e"/><stop offset="100%" stop-color="#181818"/></radialGradient><radialGradient id="mm1" cx="50%" cy="46%" r="54%"><stop offset="0%" stop-color="#363636"/><stop offset="65%" stop-color="#252525"/><stop offset="100%" stop-color="#1c1c1c"/></radialGradient><linearGradient id="maFP" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#5a5a5a"/><stop offset="100%" stop-color="#2c2c2c"/></linearGradient></defs>
<rect x="1" y="1" width="66" height="66" rx="33" fill="url(#mg1)"/>
<circle cx="${cx}" cy="${cy}" r="${pr + 4}" fill="url(#mm1)"/>
<g id="miniRecordG" class="rc-record-group" style="transform-origin:${cx}px ${cy}px">
  ${discSVG(cx, cy, pr, song.labelColor, song.accentColor, song.title, "mini")}
</g>
<g id="miniTonearmG" class="rc-tonearm" style="transform-origin:56px 11px">
  <path d="M56 11 L43 25" stroke="url(#maFP)" stroke-width="3.5" stroke-linecap="round" fill="none"/>
  <path d="M43 25 L38 30" stroke="#3e3e3e" stroke-width="3" stroke-linecap="round" fill="none"/>
  <rect x="32" y="28" width="10" height="5.5" rx="2" fill="#484848"/>
</g>
<circle cx="56" cy="11" r="3" fill="url(#maFP)"/>`;
}
