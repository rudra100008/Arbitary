"use client";

/**
 * Dark gradient header block for the complete-birthday page: brand mark,
 * title, subtitle, and the curved transition down into the white card.
 * The fade/slide-in is pure CSS (see the `floatUp` keyframes in page.tsx)
 * and plays automatically on paint — no mount-tracking state needed.
 */
export default function BirthdayHeader() {
  return (
    <>
      <div
        className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900
                     rounded-t-3xl px-8 pt-8 pb-10 float-up"
      >
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute right-12 -bottom-6 w-24 h-24 rounded-full bg-white/5" />

        <div className="relative z-10 flex flex-col items-center text-center gap-3">
          <div
            className="w-12 h-12 bg-[#FACC15] rounded-2xl flex items-center justify-center
                          shadow-lg shadow-yellow-400/20"
          >
            <span className="text-black font-black text-xl">A</span>
          </div>
          <div>
            <h1 className="text-white text-2xl font-black tracking-[0.15em] uppercase">
              One more thing
            </h1>
            <p className="text-white/40 text-xs font-semibold uppercase tracking-[0.25em] mt-1">
              Confirm your birthday
            </p>
          </div>
        </div>
      </div>

      <div className="h-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative float-up">
        <div className="absolute inset-x-0 bottom-0 h-4 bg-white rounded-t-3xl" />
      </div>
    </>
  );
}
