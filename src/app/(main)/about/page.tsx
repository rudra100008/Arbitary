"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

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
              {about?.heading &&
                (() => {
                  const firstSpace = about.heading!.indexOf(" ");
                  const firstWord =
                    firstSpace === -1
                      ? about.heading!
                      : about.heading!.slice(0, firstSpace);
                  const rest =
                    firstSpace === -1
                      ? ""
                      : about.heading!.slice(firstSpace + 1);
                  return (
                    <h1 className="text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter uppercase leading-[0.85] mb-16">
                      <span className="text-black">{firstWord}</span>
                      {rest && (
                        <>
                          {" "}
                          <span className="text-[#FACC15]">{rest}</span>
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
              <div className="relative w-full min-h-[200px] rounded-3xl border border-black/5 overflow-hidden shadow-sm">
                <Image
                  src={about.heroImageUrl}
                  alt="About Arbitrary"
                  fill
                  className="object-cover"
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                {about?.projectsCount && (
                  <div className="relative bg-white rounded-2xl border border-black/5 p-8 overflow-hidden shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md group">
                    <div className="absolute inset-y-0 left-0 w-full bg-[#FACC15] -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-in-out" />
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FACC15] transition-all duration-300 group-hover:w-2 z-10" />
                    <p className="text-6xl md:text-8xl font-black text-black leading-none mb-2 relative z-10 group-hover:text-white transition-colors duration-300">
                      {about.projectsCount}
                    </p>
                    <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold relative z-10 group-hover:text-white/80 transition-colors duration-300">
                      {about.projectsLabel || "Projects Completed"}
                    </p>
                  </div>
                )}
                {about?.awardsCount && (
                  <div className="relative bg-white rounded-2xl border border-black/5 p-8 overflow-hidden shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md group">
                    <div className="absolute inset-y-0 left-0 w-full bg-[#FACC15] -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-in-out" />
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FACC15] transition-all duration-300 group-hover:w-2 z-10" />
                    <p className="text-6xl md:text-8xl font-black text-black leading-none mb-2 relative z-10 group-hover:text-white transition-colors duration-300">
                      {about.awardsCount}
                    </p>
                    <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold relative z-10 group-hover:text-white/80 transition-colors duration-300">
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
              <div className="relative p-12 md:p-20 bg-black rounded-[2.5rem] text-white overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#FACC15]/10 rounded-full blur-[80px] transition-all duration-500 group-hover:scale-150" />
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
    </div>
  );
}
