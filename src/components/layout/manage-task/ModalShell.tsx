import { ReactNode } from "react";
import { motion } from "framer-motion";

type Props = {
  onClose: () => void;
  title: string;
  subtitle?: string;
  headerExtras?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  scrollableBody?: boolean;
};

export function ModalShell({
  onClose,
  title,
  subtitle,
  headerExtras,
  children,
  footer,
  scrollableBody = false,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dark header */}
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 pt-5 pb-6 shrink-0">
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/5" />
          <div className="absolute right-16 -bottom-4 w-20 h-20 rounded-full bg-white/5" />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              {subtitle && (
                <p className="text-white/50 text-[10px] font-black uppercase tracking-widest mb-1">
                  {subtitle}
                </p>
              )}
              <h3 className="text-white text-xl font-black leading-snug max-w-[300px]">
                {title}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors mt-0.5"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          {headerExtras && (
            <div className="relative z-10 mt-4 flex items-center gap-2 flex-wrap">
              {headerExtras}
            </div>
          )}
        </div>

        {/* SVG curved transition */}
        <div className="relative h-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shrink-0">
          <svg className="absolute bottom-0 w-full h-4" viewBox="0 0 600 16" preserveAspectRatio="none">
            <path d="M0,16 Q300,-8 600,16" fill="white" />
          </svg>
        </div>

        {/* Body */}
        <div className={scrollableBody ? "overflow-y-auto flex-1" : ""}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-black/5 flex justify-end gap-2 shrink-0">
            {footer}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
