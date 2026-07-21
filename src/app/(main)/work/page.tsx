"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type Partner = {
  id: number;
  name: string;
  logoUrl: string | null;
  description: string | null;
  websiteUrl: string | null;
  category: string | null;
  sortOrder: number | null;
};

type Group = { category: string; items: Partner[] };

const CATEGORY_ORDER = ["Brand", "Venue", "Press", "Sponsor"];

function groupPartners(partners: Partner[]): Group[] {
  const map = new Map<string, Partner[]>();
  for (const p of partners) {
    const cat = p.category || "Other";
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(p);
  }
  return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({
    category: c,
    items: map.get(c)!,
  }));
}

const STYLES = `
@keyframes tickerLoop {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
.ticker-track {
  animation: tickerLoop 60s linear infinite;
}
`;

function LockIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#bbb"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

export default function WorkPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    document.title = "Work | Arbitrary";
    fetch("/api/partners")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setPartners(d.partners ?? []);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const groups = useMemo(() => groupPartners(partners), [partners]);

  const stats = useMemo(
    () => groups.map((g) => ({ label: g.category, n: g.items.length })),
    [groups],
  );

  const hasContent = partners.length > 0;
  const allNames = useMemo(() => partners.map((p) => p.name), [partners]);

  const isConfidential = (p: Partner) => !p.logoUrl;

  return (
    <div className="min-h-screen bg-white text-black selection:bg-[#FACC15] selection:text-white">
      <style>{STYLES}</style>

      <main className="pt-32 pb-20">
        <div className="container mx-auto px-6 animate-fade-in relative">
          {/* Page Header */}
          <div className="max-w-4xl mb-16">
            <span className="inline-block text-[#FACC15] font-bold uppercase tracking-[0.4em] text-xs mb-6 px-4 py-2 bg-zinc-50 rounded-full border border-black/5">
              Collaborations
            </span>
            <h1 className="text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter uppercase leading-[0.85] mb-8">
              Our <br />
              <span className="text-[#FACC15]">WORK</span>
            </h1>
            <p className="text-xl md:text-2xl text-zinc-500 max-w-2xl leading-relaxed italic">
              &ldquo;Brands and partners we&rsquo;ve had the privilege of
              working with.&rdquo;
            </p>
          </div>

          {/* Stats bar — dark scoreboard */}
          {hasContent && (
            <div className="bg-[#111] rounded-xl mb-12 overflow-hidden">
              <div className="grid grid-cols-4">
                {stats.map((s, i) => (
                  <div
                    key={s.label}
                    className="flex flex-col py-5 px-6"
                    style={{
                      padding: "20px 24px",
                      borderRight:
                        i < stats.length - 1 ? "0.5px solid #2a2a2a" : "none",
                    }}
                  >
                    <span
                      className="text-white font-black tracking-tighter leading-none"
                      style={{ fontSize: "32px" }}
                    >
                      {String(s.n).padStart(2, "0")}
                    </span>
                    <span
                      className="uppercase mt-1"
                      style={{
                        fontSize: "10px",
                        letterSpacing: "0.12em",
                        color: "#666",
                        fontWeight: 600,
                      }}
                    >
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dark ticker */}
          {hasContent && (
            <div className="w-full bg-[#111] rounded-lg py-3.5 mb-16 overflow-hidden">
              <div className="ticker-track flex w-max hover:[animation-play-state:paused]">
                {Array.from({ length: 8 }).map((_, copyIdx) => (
                  <div
                    key={copyIdx}
                    className="flex shrink-0 items-center px-4"
                    style={{ gap: "24px" }}
                    {...(copyIdx === 0
                      ? {}
                      : ({
                          "aria-hidden": true,
                        } as React.HTMLAttributes<HTMLDivElement>))}
                  >
                    {allNames.map((name, i) => (
                      <span
                        key={i}
                        className="flex items-center shrink-0"
                        style={{ gap: "24px" }}
                      >
                        {i > 0 && (
                          <span className="text-[#FACC15]/40 shrink-0">✦</span>
                        )}
                        <span
                          className="text-[#FACC15] uppercase text-[11px] font-semibold shrink-0"
                          style={{ letterSpacing: "0.14em" }}
                        >
                          {name}
                        </span>
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Category sections */}
        {isLoading ? (
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-2xl bg-zinc-50 border border-black/5 animate-pulse"
                />
              ))}
            </div>
          </div>
        ) : groups.length === 0 ? (
          <div className="container mx-auto px-6">
            <div className="text-center py-32">
              <p className="text-6xl font-black text-black/5 mb-6">&mdash;</p>
              <p className="text-zinc-400 font-bold uppercase tracking-widest text-sm">
                No partners listed yet
              </p>
            </div>
          </div>
        ) : (
          <div className="container mx-auto px-6">
            {groups.map(({ category, items }) => (
              <div key={category} className="mb-16">
                {/* Setlist divider */}
                <div
                  className="flex items-center gap-3.5 mb-6"
                  style={{ gap: "14px" }}
                >
                  <span
                    className="uppercase shrink-0"
                    style={{
                      fontSize: "12px",
                      letterSpacing: "0.16em",
                      fontWeight: 700,
                      color: "#111",
                    }}
                  >
                    {category}
                  </span>
                  <div
                    className="flex-1"
                    style={{ borderTop: "1px dashed #ddd" }}
                  />
                  <span
                    className="uppercase shrink-0"
                    style={{
                      fontSize: "11px",
                      letterSpacing: "0.1em",
                      color: "#aaa",
                      fontWeight: 600,
                    }}
                  >
                    {String(items.length).padStart(2, "0")}{" "}
                    {items.length === 1 ? "PARTNER" : "PARTNERS"}
                  </span>
                </div>

                {/* Partner tiles */}
                <div className="partner-grid">
                  {items.map((p) => {
                    const confidential = isConfidential(p);

                    return (
                      <div key={p.id} className="partner-tile">
                        <div className="partner-tile-inner">
                          <div className="partner-logo">
                            {confidential ? (
                              <LockIcon />
                            ) : p.logoUrl ? (
                              <Image
                                src={p.logoUrl}
                                alt={p.name}
                                fill
                                className="partner-logo-img"
                              />
                            ) : (
                              <LockIcon />
                            )}
                          </div>

                          <div className="partner-info">
                            <span
                              className={`partner-name ${confidential ? "partner-name-conf" : ""}`}
                            >
                              {confidential ? "Confidential Partner" : p.name}
                            </span>
                            {!confidential && p.category && (
                              <span className="partner-type-badge">
                                {p.category}
                              </span>
                            )}
                            <div className="partner-desc">
                              {confidential ? (
                                <span
                                  className="flex items-center gap-2"
                                  style={{ flexWrap: "wrap" }}
                                >
                                  <span className="partner-nda-text">
                                    Details available under NDA
                                  </span>
                                  <span className="partner-conf-badge">
                                    CONFIDENTIAL
                                  </span>
                                </span>
                              ) : (
                                <span>{p.description ?? ""}</span>
                              )}
                            </div>
                            {!confidential && p.websiteUrl && (
                              <a
                                href={p.websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="partner-website-link"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Visit Website →
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <style>{`
.partner-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.partner-tile {
  width: 160px;
  height: 160px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: width 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94), height 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  flex-shrink: 0;
}
.partner-tile:hover {
  width: 460px;
  height: 220px;
}

.partner-tile-inner {
  display: flex;
  height: 100%;
  width: 460px;
  align-items: flex-start;
}

.partner-logo {
  width: 160px;
  height: 160px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #f5f5f5;
  border-radius: 8px;
  transition: width 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94), height 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.partner-tile:hover .partner-logo {
  width: 220px;
  height: 220px;
}
.partner-logo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: grayscale(1);
  transition: filter 0.3s ease, transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.partner-tile:hover .partner-logo-img {
  filter: grayscale(0);
  transform: scale(1.25);
}

.partner-info {
  width: 240px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.25s ease;
}
.partner-tile:hover .partner-info {
  opacity: 1;
  transition-delay: 0.1s;
}

.partner-name {
  display: block;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #111;
  margin-bottom: 4px;
}
.partner-name.partner-name-conf {
  font-style: italic;
  color: #bbb;
}

.partner-type-badge {
  display: inline-block;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #FACC15;
  border: 1px solid #FACC15;
  padding: 2px 8px;
  border-radius: 20px;
  line-height: 1.4;
  white-space: nowrap;
  margin-bottom: 6px;
  align-self: flex-start;
}

.partner-desc {
  font-size: 13px;
  color: #888;
  line-height: 1.65;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.partner-website-link {
  display: inline-block;
  margin-top: 8px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #FACC15;
  text-decoration: none;
  align-self: flex-start;
  transition: gap 0.2s ease;
}
.partner-website-link:hover {
  text-decoration: underline;
}

.partner-nda-text {
  font-size: 13px;
  color: #888;
}

.partner-conf-badge {
  display: inline-block;
  font-size: 9px;
  letter-spacing: 0.1em;
  color: #FACC15;
  border: 0.5px solid rgba(250,204,21,0.4);
  padding: 2px 7px;
  border-radius: 20px;
  font-weight: 600;
  white-space: nowrap;
  text-transform: uppercase;
}
`}</style>
    </div>
  );
}
