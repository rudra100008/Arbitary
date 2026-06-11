import React from 'react';
import Link from 'next/link';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white text-black pt-24 pb-12 border-t border-black/5">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
          {/* Brand Column */}
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-black font-black text-2xl tracking-tighter uppercase">ARBITRARY</span>
            </Link>
            <p className="text-zinc-500 max-w-xs leading-relaxed">
              Pushing the boundaries of digital creativity. We build high-end experiences for brands that dare to be different.
            </p>
            <div className="flex gap-4">
              {[
                { name: 'Instagram', url: 'https://www.instagram.com/arbitrary.group/', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg> },
                { name: 'YouTube', url: 'https://www.youtube.com/@ChannelArbitrary', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 2-2 58.38 58.38 0 0 1 15 0 2 2 0 0 1 2 2 24.12 24.12 0 0 1 0 10 2 2 0 0 1-2 2 58.38 58.38 0 0 1-15 0 2 2 0 0 1-2-2z" /><path d="m10 15 5-3-5-3z" /></svg> },
                { name: 'Facebook', url: 'https://www.facebook.com/arbitrary.group/?ref=PROFILE_EDIT_xav_ig_profile_page_web', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg> },
                { name: 'TikTok', url: 'https://www.tiktok.com/@arbitrary_group?fbclid=PAZXh0bgNhZW0CMTEAc3J0YwZhcHBfaWQMMjU2MjgxMDQwNTU4AAGnVqxRLF_0T9QOgUV_AUD60nzhCw6quWMEZigQc2uoHO8UYhJkNx5_GhdMQjU_aem_kxIzQoiRjOP98rz08zqPMg', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V2h5" /><path d="M15 8a4 4 0 0 0 4 4" /></svg> }
              ].map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full border border-black/10 flex items-center justify-center hover:border-black hover:text-[#FACC15] transition-all duration-300"
                >
                  <span className="sr-only">{social.name}</span>
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h4 className="text-[#FACC15] font-bold uppercase tracking-widest text-sm">Navigation</h4>
            <ul className="space-y-4">
              {['Home', 'Work', 'Events', 'Records', 'About', 'Contact'].map((item) => (
                <li key={item}>
                  <Link
                    href={item === "Home" ? "/" : `/${item.toLowerCase()}`}
                    className="text-zinc-500 hover:text-black transition-colors font-medium"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <h4 className="text-[#FACC15] font-bold uppercase tracking-widest text-sm">Get in Touch</h4>
            <ul className="space-y-4 text-zinc-500">
              <li>
                <Link href="/contact" className="block group">
                  <p className="text-black font-bold uppercase text-xs tracking-widest mb-1 group-hover:text-[#FACC15] transition-colors">Headquarters</p>
                  <p>123 Creative Street, Design District</p>
                  <p>New York, NY 10001</p>
                </Link>
              </li>
              <li>
                <Link href="/contact" className="block group">
                  <p className="text-black font-bold uppercase text-xs tracking-widest mb-1 group-hover:text-[#FACC15] transition-colors">Inquiries</p>
                  <p>hello@arbitrary.com</p>
                  <p>+1 (555) 000-0000</p>
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="space-y-6">
            <h4 className="text-[#FACC15] font-bold uppercase tracking-widest text-sm">Newsletter</h4>
            <p className="text-zinc-500">Stay updated with our latest projects and insights.</p>
            <form className="relative">
              <input
                type="email"
                placeholder="Your email"
                className="w-full bg-zinc-50 border border-black/5 rounded-full px-6 py-3 focus:outline-none focus:border-black transition-colors"
              />
              <button className="absolute right-2 top-1.5 bg-black text-white px-4 py-1.5 rounded-full font-bold text-xs hover:bg-[#FACC15] hover:text-black transition-colors">
                SUBMIT
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-black/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-zinc-400 text-sm font-medium">
            © {currentYear} ARBITRARY AGENCY. ALL RIGHTS RESERVED.
          </p>
          <div className="flex gap-8 text-sm text-zinc-400 font-medium">
            <Link href="/privacy-policy" className="hover:text-black transition-colors">PRIVACY POLICY</Link>
            <a href="#" className="hover:text-black transition-colors">TERMS OF SERVICE</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
