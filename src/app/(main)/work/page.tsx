"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import AmbientBlob from "@/src/components/ui/ambient-blob";

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

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

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

  const [rotationsMap, setRotationsMap] = useState<Record<number, number>>({});
  useEffect(() => {
    setRotationsMap((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const p of partners) {
        if (!(p.id in next)) {
          next[p.id] = (Math.random() - 0.5) * 3;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [partners]);

  const stats = useMemo(
    () => groups.map((g) => ({ label: g.category, n: g.items.length })),
    [groups],
  );

  const hasContent = partners.length > 0;

  return (
    <div className="bg-white text-black min-h-screen selection:bg-[#FACC15] selection:text-black">
      <main className="pt-32 pb-20 overflow-hidden">
        {/* Page Header */}
        <section className="container mx-auto px-6 mb-20 md:mb-24 animate-fade-in">
          <div className="max-w-4xl">
            <span className="inline-block text-[#FACC15] font-bold uppercase tracking-[0.4em] text-xs mb-6 px-4 py-2 bg-zinc-50 rounded-full border border-black/5">
              Collaborations
            </span>
            <h1 className="text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter uppercase leading-[0.85] mb-10">
              Our <br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-[#FACC15] to-zinc-800">
                WORK
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-zinc-500 max-w-2xl leading-relaxed italic">
              &ldquo;Brands and partners we&rsquo;ve had the privilege of
              working with.&rdquo;
            </p>
          </div>
        </section>

        {/* Stats Strip */}
        {hasContent && (
          <section className="container mx-auto px-6 mb-24 md:mb-32">
            <div
              className="grid gap-px bg-black/5 rounded-3xl overflow-hidden border border-black/5"
              style={{
                gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, 1fr)`,
              }}
            >
              {stats.map((s) => (
                <div key={s.label} className="bg-white p-8 md:p-10">
                  <p className="text-5xl md:text-6xl font-black tracking-tighter leading-none">
                    {s.n}
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mt-3">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Category Sections */}
        {isLoading ? (
          <section className="container mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-2xl bg-zinc-50 border border-black/5 animate-pulse"
                />
              ))}
            </div>
          </section>
        ) : groups.length === 0 ? (
          <section className="container mx-auto px-6">
            <div className="text-center py-32">
              <p className="text-6xl font-black text-black/5 mb-6">&mdash;</p>
              <p className="text-zinc-400 font-bold uppercase tracking-widest text-sm">
                No partners listed yet
              </p>
            </div>
          </section>
        ) : (
          groups.map(({ category, items }) => (
            <section
              key={category}
              className="container mx-auto px-6 mb-24 md:mb-32 relative"
            >
              <AmbientBlob
                color="#FACC15"
                className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-[40rem] h-[40rem] -z-10 hidden md:block"
              />
              <div className="flex items-center gap-8 mb-12 md:mb-16">
                <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter whitespace-nowrap">
                  {category}
                </h2>
                <div className="h-0.5 flex-1 bg-black/5" />
                <span className="text-zinc-400 font-bold uppercase tracking-widest text-xs whitespace-nowrap">
                  {items.length} partner{items.length > 1 ? "s" : ""}
                </span>
              </div>

              <motion.div
                className="flex flex-wrap justify-start gap-5 md:gap-8"
                variants={containerVariants}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-80px" }}
              >
                {items.map((p) => (
                  <motion.div
                    key={p.id}
                    variants={itemVariants}
                    className="flex-shrink-0"
                    style={{
                      transform: `rotate(${rotationsMap[p.id] ?? 0}deg)`,
                    }}
                  >
                    <div className="group flex items-center gap-4 md:gap-6 px-4 md:px-6 py-4 rounded-2xl border border-transparent hover:border-black/10 hover:bg-zinc-50 hover:scale-105 transition-all duration-500 cursor-default hover:shadow-[0_8px_32px_rgba(250,204,21,0.15)]">
                      {/* Logo */}
                      <div className="w-20 h-20 md:w-28 md:h-28 flex-shrink-0 flex items-center justify-center">
                        {p.logoUrl ? (
                          <img
                            src={p.logoUrl}
                            alt={p.name}
                            className="max-w-full max-h-full object-contain grayscale group-hover:grayscale-0 transition-all duration-500"
                          />
                        ) : (
                          <span className="text-2xl md:text-3xl font-black text-zinc-300 group-hover:text-zinc-500 transition-colors">
                            {p.name[0]}
                          </span>
                        )}
                      </div>

                      {/* Expandable content */}
                      <div className="overflow-hidden max-w-0 group-hover:max-w-[400px] transition-all duration-500 ease-in-out">
                        <div className="whitespace-nowrap">
                          <h3 className="text-sm md:text-base font-black uppercase tracking-tight">
                            {p.name}
                          </h3>
                          {p.description && (
                            <p className="text-xs md:text-sm text-zinc-500 mt-0.5">
                              {p.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </section>
          ))
        )}
      </main>
    </div>
  );
}
