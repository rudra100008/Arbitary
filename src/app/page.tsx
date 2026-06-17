"use client";
import React, { useEffect } from "react";
import Header from "../components/ui/header";
import Footer from "../components/ui/footer";
import HeroSection from "../components/sections/hero-section";
import Link from "next/link";

interface HomePageEvent {
  id: number;
  title: string;
  eventDate: string;
  eventType: string;
  status: string;
  venue: string | null;
  description: string | null;
  heroImageUrl: string | null;
}

const HomePage = () => {
  const [events, setEvents] = React.useState<HomePageEvent[]>([]);
  const [partners, setPartners] = React.useState<
    { name: string; logoUrl: string | null }[]
  >([]);
  const [teamMembers, setTeamMembers] = React.useState<
    { name: string; role: string; photoUrl: string | null }[]
  >([]);
  const [featuredRecords, setFeaturedRecords] = React.useState<
    {
      id: number;
      title: string;
      artist: string;
      genre: string | null;
      coverImageUrl: string | null;
      labelColor: string | null;
    }[]
  >([]);
  const [aboutContent, setAboutContent] = React.useState<{
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
  } | null>(null);

  React.useEffect(() => {
    const fetchEvents = async () => {
      try {
        console.log('mounted', window.location.hash) 
        const response = await fetch("/api/events");
        const data = await response.json();
        if (data.success) {
          setEvents(
            data.events.filter((e: HomePageEvent) => e.status === "Upcoming"),
          );
        }
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };

    const fetchPartners = async () => {
      try {
        const res = await fetch("/api/partners");
        const data = await res.json();
        if (data.success) setPartners(data.partners ?? []);
      } catch {
        // non-critical
      }
    };

    const fetchTeamMembers = async () => {
      try {
        const res = await fetch("/api/team-members");
        const data = await res.json();
        if (data.success) setTeamMembers(data.teamMembers ?? []);
      } catch {
        // non-critical
      }
    };

    const fetchFeaturedRecords = async () => {
      try {
        const res = await fetch("/api/records?latest=2");
        const data = await res.json();
        if (data.success) setFeaturedRecords(data.records ?? []);
      } catch {
        // non-critical
      }
    };

    const fetchAboutContent = async () => {
      try {
        const res = await fetch("/api/about");
        const data = await res.json();
        if (data.success) setAboutContent(data.about);
      } catch {
        // non-critical
      }
    };

    fetchEvents();
    fetchPartners();
    fetchTeamMembers();
    fetchFeaturedRecords();
    fetchAboutContent();
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
    console.log('mounted', window.location.hash) 
    document.title = "Home | Arbitrary";
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
                  const dateInfo = formatDate(event.eventDate);
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
                          href={`/events/${event.id}`}
                          className="px-10 py-4 bg-black text-white rounded-xl hover:bg-[#FACC15] hover:text-black transition-all duration-500 font-black uppercase tracking-[0.2em] text-[10px] shadow-xl hover:shadow-[0_20px_50px_rgba(250,204,21,0.2)]"
                        >
                          View Event
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

        {/* ── Tilt Your Music Banner ─────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-black py-20">
          {/* Tuborg bottle-green glow */}
          <div
            className="pointer-events-none absolute -left-40 top-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-20"
            style={{
              background:
                "radial-gradient(circle, #1a4a1f 0%, transparent 70%)",
            }}
          />
          {/* Background tilt watermark */}
          <div
            className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[22vw] font-black leading-none select-none"
            style={{ color: "rgba(200,230,60,0.04)" }}
          >
            ~
          </div>

          <div className="container mx-auto px-6 relative z-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-10">
              {/* Left — branding */}
              <div className="flex items-center gap-6">
                {/* tilt logo mark */}
                <div
                  className="flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center text-4xl font-black"
                  style={{
                    background: "#c8e63c",
                    color: "#0e1f10",
                    boxShadow: "0 0 32px rgba(200,230,60,0.25)",
                  }}
                >
                  ~
                </div>
                <div>
                  {/* Red stripe label, like the Tuborg bottle */}
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="h-px w-6"
                      style={{ background: "#d42b2b" }}
                    />
                    <span
                      className="text-[9px] font-black uppercase tracking-[0.35em]"
                      style={{ color: "#d42b2b" }}
                    >
                      Now Open
                    </span>
                    <div
                      className="h-px w-6"
                      style={{ background: "#d42b2b" }}
                    />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white leading-none">
                    Tilt Your <span style={{ color: "#c8e63c" }}>Music</span>
                  </h2>
                  <p className="text-zinc-400 text-sm mt-1 uppercase tracking-widest font-medium">
                    Register now — limited spots
                  </p>
                </div>
              </div>

              {/* Right — CTA */}
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Link
                  href="/tilt/signup"
                  className="px-10 py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all duration-300 hover:scale-105"
                  style={{
                    background: "#c8e63c",
                    color: "#0e1f10",
                    boxShadow: "0 8px 32px rgba(200,230,60,0.2)",
                  }}
                >
                  Register
                </Link>
                <Link
                  href="/tilt/login"
                  className="px-10 py-4 rounded-xl font-black text-sm uppercase tracking-widest border transition-all duration-300 hover:bg-white/5"
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    borderColor: "rgba(255,255,255,0.1)",
                  }}
                >
                  Already registered? Sign in →
                </Link>
              </div>
            </div>
          </div>

          {/* Bottom red stripe — Tuborg label detail */}
          <div
            className="absolute bottom-0 left-0 right-0 h-1"
            style={{
              background:
                "linear-gradient(90deg, transparent, #d42b2b 30%, #d42b2b 70%, transparent)",
            }}
          />
        </section>
        {/* ── End Tilt Your Music Banner ─────────────────────────────────── */}

        {/* 4. Featured Work Section */}
        {featuredRecords.length > 0 && (
          <section className="py-32 bg-white">
            <div className="container mx-auto px-6">
              <div className="flex justify-between items-end mb-20">
                <div>
                  <h2 className="text-4xl md:text-5xl font-black tracking-tight text-black">
                    FEATURED WORK
                  </h2>
                </div>
                <Link
                  href="/records"
                  className="hidden md:block text-zinc-400 hover:text-black transition-colors uppercase tracking-[0.2em] font-bold border-b border-black/10 pb-2"
                >
                  View All Projects
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {featuredRecords.map((r) => (
                  <Link
                    key={r.id}
                    href="/records"
                    className="group cursor-pointer"
                  >
                    <div className="aspect-[16/10] bg-zinc-100 rounded-2xl overflow-hidden mb-6 relative border border-black/5">
                      {r.coverImageUrl ? (
                        <img
                          src={r.coverImageUrl}
                          alt={r.title}
                          className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-700"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{ backgroundColor: r.labelColor || "#e0e0e0" }}
                        >
                          <span className="text-2xl font-black text-white/40 uppercase">
                            {r.title[0]}
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-white/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      {r.genre && (
                        <div className="absolute bottom-8 left-8 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                          <span className="bg-[#FACC15] text-black px-4 py-1.5 rounded-full font-bold text-xs uppercase tracking-widest shadow-lg">
                            {r.genre}
                          </span>
                        </div>
                      )}
                    </div>
                    <h4 className="text-2xl font-bold mb-2 group-hover:text-[#FACC15] transition-colors text-black uppercase">
                      {r.title}
                    </h4>
                    <p className="text-zinc-400 uppercase tracking-widest text-sm font-medium">
                      {r.artist}
                    </p>
                  </Link>
                ))}
              </div>

              <Link
                href="/records"
                className="md:hidden block text-center mt-12 text-zinc-400 hover:text-black transition-colors uppercase tracking-[0.2em] font-bold"
              >
                View All Projects
              </Link>
            </div>
          </section>
        )}

        {/* 5. About Us (Team) Section */}
        {teamMembers.length > 0 && (
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
              <div
                className={`flex gap-6 md:gap-8 ${teamMembers.length > 4 ? "overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin" : "flex-wrap justify-center"}`}
              >
                {teamMembers.map((m) => (
                  <div
                    key={m.name}
                    className={`group text-center ${teamMembers.length > 4 ? "min-w-[260px] md:min-w-[300px] snap-start" : "w-[260px] md:w-[300px]"}`}
                  >
                    <div className="aspect-square bg-zinc-200 rounded-2xl mb-6 overflow-hidden border border-black/5 transition-all duration-500 group-hover:shadow-2xl">
                      {m.photoUrl ? (
                        <img
                          src={m.photoUrl}
                          alt={m.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-zinc-300 flex items-center justify-center">
                          <span className="text-4xl font-black text-zinc-400">
                            {m.name[0]}
                          </span>
                        </div>
                      )}
                    </div>
                    <h4 className="text-xl font-bold group-hover:text-[#FACC15] transition-colors uppercase text-black">
                      {m.name}
                    </h4>
                    <p className="text-zinc-500 text-sm uppercase tracking-widest mt-1">
                      {m.role}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 6. Clients Section */}
        {partners.length > 0 && (
          <section className="py-24 bg-white">
            <div className="container mx-auto px-6 text-center">
              <h3 className="text-zinc-400 font-bold uppercase tracking-[0.3em] text-sm mb-12">
                TRUSTED BY WORLD CLASS BRANDS
              </h3>
              <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20">
                {partners.map((p) =>
                  p.logoUrl ? (
                    <img
                      key={p.name}
                      src={p.logoUrl}
                      alt={p.name}
                      className="h-16 md:h-20 object-contain grayscale opacity-40 hover:opacity-100 hover:grayscale-0 transition-all duration-300"
                    />
                  ) : (
                    <div
                      key={p.name}
                      className="text-2xl md:text-3xl font-black tracking-tighter text-black grayscale opacity-40 hover:opacity-100 hover:grayscale-0 transition-all duration-300"
                    >
                      {p.name}
                    </div>
                  ),
                )}
              </div>
            </div>
          </section>
        )}

        {/* 7. About the Arbitrary Section */}
        {aboutContent && (aboutContent.tagline || aboutContent.heading) && (
          <section className="py-32 relative overflow-hidden bg-white">
            <div className="container mx-auto px-6">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-20 items-center">
                <div className="lg:col-span-3">
                  {aboutContent.tagline && (
                    <h3 className="text-[#FACC15] font-bold uppercase tracking-widest mb-4">
                      {aboutContent.tagline}
                    </h3>
                  )}
                  {aboutContent.heading &&
                    (() => {
                      const firstSpace = aboutContent.heading!.indexOf(" ");
                      const firstWord =
                        firstSpace === -1
                          ? aboutContent.heading!
                          : aboutContent.heading!.slice(0, firstSpace);
                      const rest =
                        firstSpace === -1
                          ? ""
                          : aboutContent.heading!.slice(firstSpace + 1);
                      return (
                        <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-tight text-black mb-6">
                          <span className="text-black">{firstWord}</span>
                          {rest && (
                            <>
                              <br />
                              <span className="text-transparent bg-clip-text bg-linear-to-r from-[#FACC15] to-zinc-800">
                                {rest}
                              </span>
                            </>
                          )}
                        </h2>
                      );
                    })()}
                  {aboutContent.description && (
                    <p className="text-base md:text-lg text-zinc-500 leading-relaxed mb-8">
                      {aboutContent.description.length > 120
                        ? aboutContent.description.slice(0, 120).trimEnd() +
                          "..."
                        : aboutContent.description}
                      <Link
                        href="/about"
                        className="inline ml-2 text-[#FACC15] hover:text-black font-bold transition-colors"
                      >
                        Read more →
                      </Link>
                    </p>
                  )}
                  {(aboutContent.projectsCount || aboutContent.awardsCount) && (
                    <div className="grid grid-cols-2 gap-8 mb-10">
                      {aboutContent.projectsCount && (
                        <div>
                          <p className="text-3xl font-black text-black">
                            {aboutContent.projectsCount}
                          </p>
                          <p className="text-zinc-500 text-xs uppercase tracking-widest">
                            {aboutContent.projectsLabel || "Projects Completed"}
                          </p>
                        </div>
                      )}
                      {aboutContent.awardsCount && (
                        <div>
                          <p className="text-3xl font-black text-black">
                            {aboutContent.awardsCount}
                          </p>
                          <p className="text-zinc-500 text-xs uppercase tracking-widest">
                            {aboutContent.awardsLabel || "Awards Won"}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="relative lg:col-span-2">
                  <div className="rounded-3xl border border-black/5 overflow-hidden shadow-sm">
                    {aboutContent.heroImageUrl ? (
                      <img
                        src={aboutContent.heroImageUrl}
                        alt="About Arbitrary"
                        className="w-full block"
                      />
                    ) : (
                      <div className="text-[15vw] font-black text-black/5 select-none py-32 bg-zinc-50 flex items-center justify-center min-h-[200px]">
                        A
                      </div>
                    )}
                  </div>
                  {aboutContent.motto && (
                    <div className="absolute -bottom-10 -left-10 bg-black p-8 rounded-2xl text-white max-w-[280px] hidden md:block shadow-2xl">
                      <p className="font-bold text-xl mb-2 italic">
                        &ldquo;{aboutContent.motto}&rdquo;
                      </p>
                      {aboutContent.mottoAuthor && (
                        <p className="text-sm font-medium uppercase tracking-widest opacity-70 text-[#FACC15]">
                          {aboutContent.mottoAuthor}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Big CTA Section (Before Footer) */}
        <section className="py-32 relative overflow-hidden border-t border-black/5 bg-zinc-50">
          <div className="container mx-auto px-6 text-center relative z-10">
            <h2 className="text-5xl md:text-7xl font-black mb-12 tracking-tighter max-w-4xl mx-auto text-black uppercase">
              READY TO BUILD SOMETHING{" "}
              <span className="text-[#FACC15]">LEGENDARY?</span>
            </h2>
            <Link
              href="/contact"
              className="inline-block bg-black text-white px-12 py-6 rounded-full font-black text-xl uppercase tracking-widest hover:bg-[#FACC15] hover:text-black hover:scale-105 transition-all duration-300 shadow-2xl"
            >
              Let&rsquo;s Collaborate
            </Link>
          </div>
          {/* Background Text Overlay */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[20vw] font-black text-black/[0.02] whitespace-nowrap pointer-events-none">
            ARBITRARY ARBITRARY
          </div>
        </section>
      </main>

      {/* 8. Footer Section */}
      <Footer />
    </div>
  );
};

export default HomePage;
