"use client";

import { useEffect, useState } from "react";
import Header from "@/src/components/ui/header";
import Footer from "@/src/components/ui/footer";

type AboutData = {
  tagline: string | null;
  heading: string | null;
  description: string | null;
  heroImageUrl: string | null;
  projectsCount: string | null;
  projectsLabel: string | null;
  awardsCount: string | null;
  awardsLabel: string | null;
  motto: string | null;
  mottoAuthor: string | null;
};

export default function AboutPage() {
  const [about, setAbout] = useState<AboutData | null>(null);

  useEffect(() => {
    document.title = "About | Arbitrary";
    fetch("/api/about")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setAbout(d.about);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="bg-white text-black min-h-screen selection:bg-[#FACC15] selection:text-black">
      <Header />

      <main className="pt-32 pb-20 overflow-hidden">
        {/* Hero + Story side by side */}
        <section className="container mx-auto px-6 mb-32 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <div>
              {about?.tagline && (
                <span className="inline-block text-[#FACC15] font-bold uppercase tracking-[0.4em] text-xs mb-6 px-4 py-2 bg-zinc-50 rounded-full border border-black/5">
                  {about.tagline}
                </span>
              )}
              {about?.heading && (() => {
                const firstSpace = about.heading!.indexOf(" ");
                const firstWord = firstSpace === -1 ? about.heading! : about.heading!.slice(0, firstSpace);
                const rest = firstSpace === -1 ? "" : about.heading!.slice(firstSpace + 1);
                return (
                  <h1 className="text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter uppercase leading-[0.85] mb-16">
                    <span className="text-black">{firstWord}</span>
                    {rest && (
                      <>
                        {" "}
                        <span className="text-transparent bg-clip-text bg-linear-to-r from-[#FACC15] to-zinc-800">
                          {rest}
                        </span>
                      </>
                    )}
                  </h1>
                );
              })()}
              {about?.description && (
                <p className="text-xl md:text-2xl text-zinc-500 max-w-2xl leading-relaxed italic">
                  {about.description}
                </p>
              )}
            </div>
            {about?.heroImageUrl && (
              <div className="rounded-3xl border border-black/5 overflow-hidden shadow-sm">
                <img
                  src={about.heroImageUrl}
                  alt="About Arbitrary"
                  className="w-full block"
                />
              </div>
            )}
          </div>
        </section>

        {/* Stats Section */}
        {(about?.projectsCount || about?.awardsCount) && (
          <section className="container mx-auto px-6 mb-32">
            <div className="relative p-12 md:p-20 border border-black/5 rounded-[2.5rem] bg-white overflow-hidden">
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#FACC15]/5 rounded-full blur-[80px]" />
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-black/[0.02] rounded-full blur-[80px]" />
              <div className="flex justify-center gap-16 md:gap-32 relative z-10">
                {about?.projectsCount && (
                  <div className="text-center">
                    <p className="text-5xl md:text-7xl font-black text-black mb-2">
                      {about.projectsCount}
                    </p>
                    <p className="text-zinc-500 text-xs md:text-sm uppercase tracking-widest font-bold">
                      {about.projectsLabel || "Projects Completed"}
                    </p>
                  </div>
                )}
                {about?.awardsCount && (
                  <div className="text-center">
                    <p className="text-5xl md:text-7xl font-black text-black mb-2">
                      {about.awardsCount}
                    </p>
                    <p className="text-zinc-500 text-xs md:text-sm uppercase tracking-widest font-bold">
                      {about.awardsLabel || "Awards Won"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Motto Section */}
        {about?.motto && (
          <section className="container mx-auto px-6 mb-20">
            <div className="max-w-4xl mx-auto">
              <div className="relative p-12 md:p-20 bg-black rounded-[2.5rem] text-white overflow-hidden">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#FACC15]/10 rounded-full blur-[80px]" />
                <p className="text-3xl md:text-5xl font-bold italic leading-tight mb-6 relative z-10">
                  &ldquo;{about.motto}&rdquo;
                </p>
                {about?.mottoAuthor && (
                  <p className="text-sm font-bold uppercase tracking-widest text-[#FACC15] relative z-10">
                    {about.mottoAuthor}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
