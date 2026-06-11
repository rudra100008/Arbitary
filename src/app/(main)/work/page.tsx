"use client";

import { useEffect, useState } from "react";
import Header from "@/src/components/ui/header";
import Footer from "@/src/components/ui/footer";

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
  return CATEGORY_ORDER
    .filter((c) => map.has(c))
    .map((c) => ({ category: c, items: map.get(c)! }));
}

export default function WorkPage() {
  const [partners, setPartners] = useState<Partner[]>([]);

  useEffect(() => {
    document.title = "Work | Arbitrary";
    fetch("/api/partners")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setPartners(d.partners ?? []);
      })
      .catch(() => {});
  }, []);

  const groups = groupPartners(partners);

  return (
    <div className="bg-white text-black min-h-screen selection:bg-[#FACC15] selection:text-black">
      <Header />

      <main className="pt-32 pb-20 overflow-hidden">
        {/* Page Header */}
        <section className="container mx-auto px-6 mb-24 md:mb-32 animate-fade-in">
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
              &ldquo;Brands and partners we&rsquo;ve had the privilege of working with.&rdquo;
            </p>
          </div>
        </section>

        {/* Category Sections */}
        {groups.length === 0 ? (
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
            <section key={category} className="container mx-auto px-6 mb-24 md:mb-32">
              <div className="flex items-center gap-8 mb-12 md:mb-16">
                <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter whitespace-nowrap">
                  {category}
                </h2>
                <div className="h-0.5 flex-1 bg-black/5" />
                <span className="text-zinc-400 font-bold uppercase tracking-widest text-xs whitespace-nowrap">
                  {items.length} partner{items.length > 1 ? "s" : ""}
                </span>
              </div>

              <div className="flex flex-wrap justify-start gap-5 md:gap-8">
                {items.map((p) => (
                  <div
                    key={p.id}
                    className="group flex items-center gap-4 md:gap-6 px-4 md:px-6 py-4 rounded-2xl border border-transparent hover:border-black/10 hover:bg-zinc-50 transition-all duration-500 cursor-default flex-shrink-0"
                  >
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
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      <Footer />
    </div>
  );
}
