"use client";
import React, { useEffect } from "react";
import Header from "../components/ui/header";
import Footer from "../components/ui/footer";
import HeroSection from "../components/sections/hero-section";
import Link from "next/link";

interface HomePageEvent {
  id: number;
  title: string;
  date: string;
  category: string;
  status: string;
  venue: string | null;
  description: string | null;
  heroImageUrl: string | null;
}

const HomePage = () => {
  const [events, setEvents] = React.useState<HomePageEvent[]>([]);

  React.useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch("/api/events");
        const data = await response.json();
        if (data.success) {
          setEvents(data.events.filter((e: HomePageEvent) => e.status === "Upcoming"));
        }
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };
    fetchEvents();
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return { day: "--", month: "---", year: "----" };
    const d = new Date(dateStr);
    return {
      day: d.toLocaleDateString("en-US", { day: "2-digit" }),
      month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
      year: d.getFullYear().toString(),
    };
  };

  useEffect(() => {
    document.title = "Home | Arbitary";
  });
  return (
    <div className="bg-white text-black selection:bg-[#FACC15] selection:text-black">
      {/* 1. Header Section */}
      <Header />

      <main>
        {/* 2. Hero Section */}
        <HeroSection />

        {/* 3. Event/Show Section */}
        <section className="py-32 bg-zinc-50 border-y border-black/5">
          <div className="container mx-auto px-6">
            <div className="mb-16">
              <h3 className="text-[#FACC15] font-bold uppercase tracking-widest mb-4 text-sm">
                Upcoming
              </h3>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight text-black uppercase">
                EVENTS & SHOWS
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-6">
              {events.length > 0 ? (
                events.slice(0, 3).map((event) => {
                  const dateInfo = formatDate(event.date);
                  return (
                    <div
                      key={event.id}
                      className="group relative flex flex-col md:flex-row justify-between items-center p-8 border border-black/5 rounded-2xl bg-white hover:shadow-2xl transition-all duration-500 overflow-hidden min-h-[160px]"
                    >
                      {/* Background Hero Image with Left-to-Right Fade */}
                      {event.heroImageUrl && (
                        <div className="absolute inset-0 z-0">
                          <img
                            src={event.heroImageUrl}
                            alt=""
                            className="absolute right-0 top-0 h-full w-2/3 object-cover transition-transform duration-1000 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-r from-white via-white to-transparent z-10 w-full" />
                        </div>
                      )}

                      <div className="relative z-20 flex flex-col md:flex-row items-center gap-8 mb-6 md:mb-0 w-full md:w-auto">
                        <div className="text-center md:text-left min-w-[100px]">
                          <p className="text-3xl font-black text-black leading-none">
                            {dateInfo.day}
                          </p>
                          <p className="text-[10px] uppercase tracking-widest font-black text-[#FACC15] mt-1">
                            {dateInfo.month} {dateInfo.year}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-2xl font-black group-hover:text-[#FACC15] transition-colors text-black uppercase tracking-tighter leading-none mb-2">
                            {event.title}
                          </h4>
                          <p className="text-zinc-500 uppercase text-[10px] font-black tracking-widest flex items-center gap-2">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="text-[#FACC15]"
                            >
                              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            {event.venue}
                          </p>
                        </div>
                      </div>

                      <div className="relative z-20">
                        <Link
                          href={`/eventcontent?id=${event.id}`}
                          className="px-10 py-4 bg-black text-white rounded-xl hover:bg-[#FACC15] hover:text-black transition-all duration-500 font-black uppercase tracking-[0.2em] text-[10px] shadow-xl hover:shadow-[0_20px_50px_rgba(250,204,21,0.2)]"
                        >
                          Get Tickets
                        </Link>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-20 text-center border border-dashed border-black/10 rounded-2xl">
                  <p className="text-zinc-400 uppercase font-black tracking-widest text-sm">
                    No upcoming events scheduled
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 4. Featured Work Section */}
        <section className="py-32 bg-white">
          <div className="container mx-auto px-6">
            <div className="flex justify-between items-end mb-20">
              <div>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight text-black">
                  FEATURED WORK
                </h2>
              </div>
              <button className="hidden md:block text-zinc-400 hover:text-black transition-colors uppercase tracking-[0.2em] font-bold border-b border-black/10 pb-2">
                View All Projects
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {[1, 2].map((id) => (
                <div key={id} className="group cursor-pointer">
                  <div className="aspect-[16/10] bg-zinc-100 rounded-2xl overflow-hidden mb-6 relative border border-black/5">
                    <div className="absolute inset-0 bg-gradient-to-t from-white/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute inset-0 flex items-center justify-center scale-110 group-hover:scale-100 transition-transform duration-700">
                      <div className="w-full h-full bg-zinc-200" />
                    </div>
                    {/* Project Label */}
                    <div className="absolute bottom-8 left-8 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                      <span className="bg-[#FACC15] text-black px-4 py-1.5 rounded-full font-bold text-xs uppercase tracking-widest shadow-lg">
                        {id === 1 ? "Visual Identity" : "Web Experience"}
                      </span>
                    </div>
                  </div>
                  <h4 className="text-2xl font-bold mb-2 group-hover:text-[#FACC15] transition-colors text-black uppercase">
                    {id === 1 ? "NEON VERTIGO" : "CRYPTO SPHERE"}
                  </h4>
                  <p className="text-zinc-400 uppercase tracking-widest text-sm font-medium">
                    {id === 1
                      ? "Direction / 3D / Web"
                      : "Product / UIUX / Branding"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. About Us (Team) Section */}
        <section className="py-32 bg-zinc-50">
          <div className="container mx-auto px-6">
            <div className="text-center mb-20">
              <h3 className="text-[#FACC15] font-bold uppercase tracking-widest mb-4">
                Our Team
              </h3>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight uppercase text-black">
                Meet the Minds
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[1, 2, 3, 4].map((id) => (
                <div key={id} className="group text-center">
                  <div className="aspect-square bg-zinc-200 rounded-2xl mb-6 overflow-hidden border border-black/5 transition-all duration-500 group-hover:shadow-2xl">
                    <div className="w-full h-full bg-zinc-300" />
                  </div>
                  <h4 className="text-xl font-bold group-hover:text-[#FACC15] transition-colors uppercase text-black">
                    Team Member {id}
                  </h4>
                  <p className="text-zinc-500 text-sm uppercase tracking-widest mt-1">
                    Creative Director
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. Clients Section */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-6 text-center">
            <h3 className="text-zinc-400 font-bold uppercase tracking-[0.3em] text-sm mb-12">
              TRUSTED BY WORLD CLASS BRANDS
            </h3>
            <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-20 hover:opacity-50 transition-opacity duration-500 grayscale">
              {[1, 2, 3, 4, 5].map((id) => (
                <div
                  key={id}
                  className="text-2xl font-black tracking-tighter text-black"
                >
                  LOGO_{id}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 7. About the Arbitary Section */}
        <section className="py-32 relative overflow-hidden bg-white">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              <div>
                <h3 className="text-[#FACC15] font-bold uppercase tracking-widest mb-4">
                  The Arbitary
                </h3>
                <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-8 uppercase leading-tight text-black">
                  DEFINING THE <br /> ARBITRARY
                </h2>
                <p className="text-lg text-zinc-600 mb-8 leading-relaxed italic">
                  "In a world of structure, we find beauty in the unexpected.
                  Our agency thrives at the intersection of chaos and design."
                </p>
                <div className="grid grid-cols-2 gap-8 mb-10">
                  <div>
                    <p className="text-3xl font-black text-black">150+</p>
                    <p className="text-zinc-500 text-xs uppercase tracking-widest">
                      Projects Completed
                    </p>
                  </div>
                  <div>
                    <p className="text-3xl font-black text-black">25+</p>
                    <p className="text-zinc-500 text-xs uppercase tracking-widest">
                      Awards Won
                    </p>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="aspect-square bg-zinc-50 rounded-3xl border border-black/5 flex items-center justify-center overflow-hidden shadow-sm">
                  <div className="text-[15vw] font-black text-black/5 select-none">
                    A
                  </div>
                </div>
                {/* Floating card */}
                <div className="absolute -bottom-10 -left-10 bg-black p-8 rounded-2xl text-white max-w-[280px] hidden md:block shadow-2xl">
                  <p className="font-bold text-xl mb-2 italic">
                    "Vision without limits."
                  </p>
                  <p className="text-sm font-medium uppercase tracking-widest opacity-70 text-[#FACC15]">
                    - Founding Philosophy
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Big CTA Section (Before Footer) */}
        <section className="py-32 relative overflow-hidden border-t border-black/5 bg-zinc-50">
          <div className="container mx-auto px-6 text-center relative z-10">
            <h2 className="text-5xl md:text-7xl font-black mb-12 tracking-tighter max-w-4xl mx-auto text-black uppercase">
              READY TO BUILD SOMETHING{" "}
              <span className="text-[#FACC15]">LEGENDARY?</span>
            </h2>
            <button className="bg-black text-white px-12 py-6 rounded-full font-black text-xl uppercase tracking-widest hover:bg-[#FACC15] hover:text-black hover:scale-105 transition-all duration-300 shadow-2xl">
              Let's Collaborate
            </button>
          </div>
          {/* Background Text Overlay */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[20vw] font-black text-black/[0.02] whitespace-nowrap pointer-events-none">
            ARBITARY ARBITARY
          </div>
        </section>
      </main>

      {/* 8. Footer Section */}
      <Footer />
    </div>
  );
};

export default HomePage;
