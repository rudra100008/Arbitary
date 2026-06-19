"use client";

import { useEffect, useState } from "react";
import Header from "@/src/components/ui/header";
import Footer from "@/src/components/ui/footer";
import { Mail, MapPin, Phone } from "lucide-react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    document.title = "Contact | Arbitrary";
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mailtoLink = `mailto:hello@arbitrary.com?subject=${encodeURIComponent(subject || "Collaboration Inquiry")}&body=${encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\n\n${message}`,
    )}`;
    window.location.href = mailtoLink;
  };

  const contactInfo = [
    {
      icon: MapPin,
      label: "Headquarters",
      value: "123 Creative Street\nDesign District\nNew York, NY 10001",
    },
    {
      icon: Mail,
      label: "Inquiries",
      value: "hello@arbitrary.com",
      href: "mailto:hello@arbitrary.com",
    },
    {
      icon: Phone,
      label: "Phone",
      value: "+1 (555) 000-0000",
    },
  ];

  const inputClass =
    "w-full px-5 py-4 bg-white border border-black/10 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#FACC15]/40 focus:border-[#FACC15]/50 transition-all";
  const labelClass =
    "text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block";

  return (
    <div className="bg-white text-black min-h-screen selection:bg-[#FACC15] selection:text-black">
      <main className="pt-32 pb-20 overflow-hidden">
        {/* Hero */}
        <section className="container mx-auto px-6 mb-24 md:mb-32 animate-fade-in">
          <div className="max-w-4xl">
            <span className="inline-block text-[#FACC15] font-bold uppercase tracking-[0.4em] text-xs mb-6 px-4 py-2 bg-zinc-50 rounded-full border border-black/5">
              Contact Us
            </span>
            <h1 className="text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter uppercase leading-[0.85] mb-10">
              GET IN{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-[#FACC15] to-zinc-800">
                TOUCH
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-zinc-500 max-w-2xl leading-relaxed italic">
              &ldquo;Have a project, idea, or collaboration in mind? We&rsquo;d
              love to hear from you.&rdquo;
            </p>
          </div>
        </section>

        {/* Info Cards + Form */}
        <section className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-20">
            {/* Left — Contact Info */}
            <div className="lg:col-span-2 space-y-6">
              {contactInfo.map((item) => {
                const Icon = item.icon;
                const content = (
                  <div className="relative p-6 md:p-8 border border-black/5 rounded-[2.5rem] bg-white overflow-hidden group hover:border-black/10 hover:shadow-sm transition-all duration-500">
                    <div className="absolute -top-16 -right-16 w-32 h-32 bg-[#FACC15]/5 rounded-full blur-[60px] group-hover:bg-[#FACC15]/10 transition-all duration-500" />
                    <div className="flex items-start gap-4 relative z-10">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-50 border border-black/5 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-zinc-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#FACC15] mb-1">
                          {item.label}
                        </p>
                        <p className="text-sm font-medium text-zinc-600 whitespace-pre-line">
                          {item.value}
                        </p>
                      </div>
                    </div>
                  </div>
                );

                if (item.href) {
                  return (
                    <a key={item.label} href={item.href}>
                      {content}
                    </a>
                  );
                }
                return <div key={item.label}>{content}</div>;
              })}
            </div>

            {/* Right — Form */}
            <div className="lg:col-span-3">
              <div className="relative p-8 md:p-12 border border-black/5 rounded-[2.5rem] bg-white overflow-hidden">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#FACC15]/5 rounded-full blur-[80px]" />
                <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter mb-8 relative z-10">
                  Send a Message
                </h3>
                <form
                  onSubmit={handleSubmit}
                  className="space-y-5 relative z-10"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className={labelClass}>Name</label>
                      <input
                        className={inputClass}
                        placeholder="Your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Email</label>
                      <input
                        className={inputClass}
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Subject</label>
                    <input
                      className={inputClass}
                      placeholder="What's this about?"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Message</label>
                    <textarea
                      className={`${inputClass} min-h-[160px] resize-y`}
                      placeholder="Tell us about your project..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-4 bg-black text-white font-black uppercase tracking-wider rounded-2xl hover:bg-[#FACC15] hover:text-black transition-all duration-300 shadow-xl hover:shadow-[0_20px_50px_rgba(250,204,21,0.2)]"
                  >
                    Send Message
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
