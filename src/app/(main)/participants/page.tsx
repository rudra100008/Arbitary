"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence, useAnimationFrame } from "framer-motion";
import { toast } from "sonner";

type Section = "song" | "dance";

interface FormState {
  name: string;
  email: string;
  phone: string;
  file: File | null;
}

interface SubmissionStatus {
  status: string;
  createdAt: string;
}

interface ExistingSubmissions {
  song?: SubmissionStatus;
  dance?: SubmissionStatus;
}

const emptyForm: FormState = { name: "", email: "", phone: "", file: null };

// ── File validation constants ─────────────────────────────────────────────────
const ACCEPTED = {
  song: [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/aac",
    "audio/ogg",
    "audio/flac",
    "audio/mp4",
  ],
  dance: [
    "video/mp4",
    "video/quicktime",
    "video/x-msvideo",
    "video/webm",
    "video/mpeg",
    "video/3gpp",
  ],
};
const MAX_SIZE_MB = 100;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

// ─── VINYL RECORD ────────────────────────────────────────────────────────────
function VinylRecord({ size = 180 }: { size?: number }) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        width: size,
        height: size,
        bottom: "-15%",
        right: "-10%",
        opacity: 0.12,
      }}
      animate={{ rotate: 360 }}
      transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <circle cx="50" cy="50" r="50" fill="#000" />
        <circle cx="50" cy="50" r="42" fill="#111" />
        {[36, 30, 24, 18].map((r, i) => (
          <circle
            key={i}
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="#333"
            strokeWidth="0.8"
          />
        ))}
        <circle cx="50" cy="50" r="6" fill="#222" />
        <circle cx="50" cy="50" r="3" fill="#FACC15" />
        <path
          d="M 26 30 A 28 28 0 0 1 60 22"
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </motion.div>
  );
}

// ─── EQUALIZER BARS ───────────────────────────────────────────────────────────
function EqualizerBars() {
  const bars = [
    { h: 40, delay: 0, dur: 0.9 },
    { h: 65, delay: 0.12, dur: 1.1 },
    { h: 30, delay: 0.24, dur: 0.8 },
    { h: 80, delay: 0.06, dur: 1.3 },
    { h: 50, delay: 0.18, dur: 1.0 },
    { h: 70, delay: 0.3, dur: 0.85 },
    { h: 45, delay: 0.09, dur: 1.2 },
    { h: 60, delay: 0.21, dur: 0.95 },
    { h: 35, delay: 0.15, dur: 1.15 },
    { h: 75, delay: 0.27, dur: 0.88 },
    { h: 55, delay: 0.03, dur: 1.05 },
    { h: 48, delay: 0.33, dur: 0.92 },
  ];
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        bottom: 0,
        left: 0,
        right: 0,
        height: 120,
        display: "flex",
        alignItems: "flex-end",
        gap: 5,
        padding: "0 20px",
        opacity: 0.13,
      }}
      aria-hidden="true"
    >
      {bars.map((bar, i) => (
        <motion.div
          key={i}
          className="flex-1 rounded-t-sm"
          style={{
            background: "linear-gradient(to top, #000, #555)",
            minWidth: 6,
          }}
          animate={{ scaleY: [0.3, 1, 0.5, 0.85, 0.3] }}
          transition={{
            duration: bar.dur,
            delay: bar.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          transformOrigin="bottom"
          initial={{ height: bar.h, scaleY: 0.4 }}
        />
      ))}
    </div>
  );
}

// ─── SOUND WAVE ───────────────────────────────────────────────────────────────
function SoundWave() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frame = useRef(0);
  useAnimationFrame(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    frame.current += 0.03;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const waves = [
      {
        amp: 18,
        freq: 0.025,
        phase: frame.current,
        color: "rgba(0,0,0,0.18)",
        width: 2,
      },
      {
        amp: 12,
        freq: 0.035,
        phase: frame.current * 1.3,
        color: "rgba(0,0,0,0.10)",
        width: 1.5,
      },
      {
        amp: 8,
        freq: 0.05,
        phase: frame.current * 0.8,
        color: "rgba(250,204,21,0.25)",
        width: 1.5,
      },
    ];
    waves.forEach(({ amp, freq, phase, color, width }) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      for (let x = 0; x <= canvas.width; x += 2) {
        const y = canvas.height / 2 + amp * Math.sin(x * freq + phase);
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    });
  });
  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={80}
      className="absolute pointer-events-none"
      style={{
        top: "50%",
        left: 0,
        right: 0,
        width: "100%",
        transform: "translateY(-50%)",
        opacity: 0.9,
      }}
      aria-hidden="true"
    />
  );
}

// ─── GRADIENT BLOB ────────────────────────────────────────────────────────────
function GradientBlob({
  x,
  y,
  size,
  color,
  dur,
  delay,
}: {
  x: string;
  y: string;
  size: number;
  color: string;
  dur: number;
  delay: number;
}) {
  return (
    <motion.div
      className="absolute pointer-events-none rounded-full"
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
        background: color,
        filter: "blur(40px)",
        transform: "translate(-50%, -50%)",
      }}
      animate={{
        x: [0, 30, -20, 10, 0],
        y: [0, -20, 30, -10, 0],
        scale: [1, 1.15, 0.9, 1.05, 1],
      }}
      transition={{ duration: dur, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

// ─── SONG BACKGROUND ─────────────────────────────────────────────────────────
function SongBackground() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      aria-hidden="true"
    >
      <GradientBlob
        x="15%"
        y="20%"
        size={200}
        color="rgba(99,102,241,0.12)"
        dur={8}
        delay={0}
      />
      <GradientBlob
        x="75%"
        y="60%"
        size={250}
        color="rgba(250,204,21,0.10)"
        dur={10}
        delay={2}
      />
      <GradientBlob
        x="50%"
        y="80%"
        size={180}
        color="rgba(0,0,0,0.06)"
        dur={9}
        delay={1}
      />
      <SoundWave />
      <VinylRecord size={200} />
      {[
        { glyph: "♩", x: "8%", y: "15%", size: 36, delay: 0, dur: 4 },
        { glyph: "♪", x: "22%", y: "70%", size: 28, delay: 1.2, dur: 5 },
        { glyph: "♫", x: "60%", y: "12%", size: 42, delay: 0.6, dur: 4.5 },
        { glyph: "♬", x: "78%", y: "55%", size: 24, delay: 2, dur: 3.8 },
        { glyph: "𝄞", x: "40%", y: "60%", size: 48, delay: 0.3, dur: 5.2 },
      ].map((n, i) => (
        <motion.span
          key={i}
          className="absolute font-black"
          style={{
            left: n.x,
            top: n.y,
            fontSize: n.size,
            color: "#000",
            opacity: 0.22,
          }}
          animate={{ y: [0, -16, 0], opacity: [0.14, 0.28, 0.14] }}
          transition={{
            duration: n.dur,
            delay: n.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {n.glyph}
        </motion.span>
      ))}
      <motion.span
        className="absolute font-black"
        style={{
          left: "55%",
          top: "35%",
          fontSize: 52,
          color: "#FACC15",
          opacity: 0.55,
        }}
        animate={{
          y: [0, -20, 0],
          rotate: [0, 8, -4, 0],
          opacity: [0.45, 0.65, 0.45],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        ♫
      </motion.span>
      <EqualizerBars />
    </div>
  );
}

// ─── SPOTLIGHT BEAM ───────────────────────────────────────────────────────────
function SpotlightBeam({
  left,
  delay,
  dur,
  sweepRange = 0,
}: {
  left: number;
  delay: number;
  dur: number;
  sweepRange?: number;
}) {
  return (
    <motion.div
      className="absolute top-0 pointer-events-none"
      style={{
        left: `${left}%`,
        width: 160,
        height: "90%",
        transformOrigin: "top center",
        background:
          "conic-gradient(from 274deg at 50% 0%, transparent 0deg, rgba(255,255,255,0.06) 4deg, rgba(255,255,255,0.18) 8deg, rgba(255,255,255,0.06) 12deg, transparent 16deg)",
      }}
      animate={{
        rotate: sweepRange ? [-sweepRange, sweepRange, -sweepRange] : [0, 0, 0],
        opacity: [0.5, 1, 0.6, 1, 0.5],
      }}
      transition={{ duration: dur, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function MeshGradient() {
  return (
    <>
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 30% 40%, rgba(129,140,248,0.18) 0%, transparent 70%)",
        }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 50% 60% at 75% 65%, rgba(168,85,247,0.12) 0%, transparent 70%)",
        }}
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{
          duration: 6.5,
          delay: 1,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </>
  );
}

function ParticleDust() {
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    x: `${5 + ((i * 5.5) % 90)}%`,
    startY: `${10 + ((i * 7) % 80)}%`,
    size: i % 3 === 0 ? 3 : i % 3 === 1 ? 2 : 1.5,
    dur: 3 + (i % 5) * 0.8,
    delay: (i * 0.35) % 4,
    opacity: 0.4 + (i % 4) * 0.12,
  }));
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: p.x,
            top: p.startY,
            width: p.size,
            height: p.size,
            background: p.id % 4 === 0 ? "#FACC15" : "rgba(255,255,255,0.9)",
            opacity: 0,
          }}
          animate={{
            y: [0, -60, -120],
            opacity: [0, p.opacity, 0],
            scale: [0.5, 1.2, 0.3],
          }}
          transition={{
            duration: p.dur,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

// ─── DANCE BACKGROUND ─────────────────────────────────────────────────────────
function DanceBackground() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(10,8,30,0.55) 0%, rgba(10,8,30,0.20) 50%, transparent 100%)",
        }}
      />
      <MeshGradient />
      <SpotlightBeam left={15} delay={0} dur={3.8} sweepRange={6} />
      <SpotlightBeam left={44} delay={1.4} dur={5.0} />
      <SpotlightBeam left={72} delay={0.7} dur={4.2} sweepRange={5} />
      <motion.div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: 80,
          background:
            "radial-gradient(ellipse 80% 100% at 50% 100%, rgba(129,140,248,0.22) 0%, transparent 70%)",
        }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      {[
        { shape: "circle", x: "12%", y: "20%", size: 60, delay: 0, dur: 6 },
        { shape: "square", x: "75%", y: "15%", size: 40, delay: 1.5, dur: 7 },
        { shape: "circle", x: "85%", y: "65%", size: 30, delay: 0.8, dur: 5 },
        { shape: "square", x: "20%", y: "70%", size: 50, delay: 2, dur: 8 },
      ].map((s, i) => (
        <motion.div
          key={i}
          className="absolute pointer-events-none"
          style={{
            left: s.x,
            top: s.y,
            width: s.size,
            height: s.size,
            borderRadius: s.shape === "circle" ? "50%" : "8px",
            border: "1.5px solid rgba(129,140,248,0.3)",
            background: "rgba(129,140,248,0.05)",
          }}
          animate={{
            y: [0, -20, 0],
            rotate: s.shape === "square" ? [0, 45, 0] : [0, 0, 0],
            opacity: [0.3, 0.7, 0.3],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: s.dur,
            delay: s.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
      <ParticleDust />
    </div>
  );
}

// ─── INPUT FIELD ─────────────────────────────────────────────────────────────
function InputField({
  label,
  type,
  placeholder,
  value,
  onChange,
  dark = false,
  required = true,
  disabled = false,
}: {
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  dark?: boolean;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        className={`text-[10px] font-black uppercase tracking-[0.15em] ${dark ? "text-white/50" : "text-black/40"}`}
      >
        {label}
      </label>
      <input
        required={required}
        type={type}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full text-sm px-4 py-3 rounded-xl border outline-none transition-all disabled:opacity-50 ${
          dark
            ? "border-white/15 bg-white/8 text-white placeholder:text-white/30 focus:border-white/35 focus:bg-white/12"
            : "border-black/10 bg-black/[0.02] text-black placeholder:text-black/25 focus:border-black/30 focus:bg-white focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)]"
        }`}
        style={
          dark ? { background: "rgba(255,255,255,0.08)", color: "#fff" } : {}
        }
      />
    </div>
  );
}

// ─── ALREADY SUBMITTED PANEL ─────────────────────────────────────────────────
function AlreadySubmittedPanel({
  type,
  onClose,
  statusInfo,
}: {
  type: Section;
  onClose: () => void;
  statusInfo: SubmissionStatus;
}) {
  const isDance = type === "dance";
  const label = isDance ? "Dance" : "Song";
  const statusColor =
    statusInfo.status === "approved"
      ? "#22c55e"
      : statusInfo.status === "rejected"
        ? "#ef4444"
        : "#FACC15";
  const statusLabel =
    statusInfo.status === "approved"
      ? "Approved ✓"
      : statusInfo.status === "rejected"
        ? "Rejected"
        : "Pending review";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center gap-5 h-full py-16 px-8 text-center relative z-10"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 280,
          damping: 18,
          delay: 0.05,
        }}
        className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{
          background: statusColor + "22",
          border: `2px solid ${statusColor}`,
        }}
      >
        {statusInfo.status === "approved" ? (
          <svg
            width="36"
            height="36"
            fill="none"
            stroke={statusColor}
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <path
              d="M20 6L9 17l-5-5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : statusInfo.status === "rejected" ? (
          <svg
            width="36"
            height="36"
            fill="none"
            stroke={statusColor}
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        ) : (
          <svg
            width="36"
            height="36"
            fill="none"
            stroke={statusColor}
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" strokeLinecap="round" />
          </svg>
        )}
      </motion.div>
      <div>
        <h3
          className={`text-2xl font-black uppercase tracking-tight ${isDance ? "text-white" : "text-black"}`}
        >
          {label} submitted
        </h3>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span
            className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full"
            style={{ background: statusColor + "22", color: statusColor }}
          >
            {statusLabel}
          </span>
        </div>
        <p
          className={`text-xs mt-3 ${isDance ? "text-white/45" : "text-black/40"}`}
        >
          Submitted{" "}
          {new Date(statusInfo.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>
      <button
        onClick={onClose}
        className={`text-xs font-black uppercase tracking-widest px-6 py-2.5 rounded-full border transition-all duration-200 ${
          isDance
            ? "border-white/25 text-white/70 hover:bg-white hover:text-black"
            : "border-black/15 text-black/60 hover:bg-black hover:text-white"
        }`}
      >
        Close
      </button>
    </motion.div>
  );
}

// ─── PARTICIPANT FORM ─────────────────────────────────────────────────────────
function ParticipantForm({
  type,
  onClose,
  existingSubmission,
}: {
  type: Section;
  onClose: () => void;
  existingSubmission?: SubmissionStatus;
}) {
  const { data: session } = useSession();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileError, setFileError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const isDance = type === "dance";
  const label = isDance ? "Dance" : "Song";

  useEffect(() => {
    if (session?.user) {
      setForm((f) => ({
        ...f,
        name: session.user.name || f.name,
        email: session.user.email || f.email,
        phone: (session.user as any).phoneNumber || f.phone,
      }));
    }
  }, [session]);

  // ── If already submitted, show status panel instead of form ──────────────
  if (existingSubmission) {
    return (
      <AlreadySubmittedPanel
        type={type}
        onClose={onClose}
        statusInfo={existingSubmission}
      />
    );
  }

  // ── Client-side file validation ──────────────────────────────────────────
  function validateFile(file: File): string | null {
    if (!ACCEPTED[type].includes(file.type)) {
      return isDance
        ? "Please upload a video file (MP4, MOV, WEBM, AVI)"
        : "Please upload an audio file (MP3, WAV, AAC, FLAC)";
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `File is too large. Max size is ${MAX_SIZE_MB} MB`;
    }
    return null;
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setFileError(null);
    if (file) {
      const err = validateFile(file);
      if (err) {
        setFileError(err);
        return;
      }
    }
    setForm((f) => ({ ...f, file }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.file) {
      setError("Please select a file first.");
      return;
    }
    const fileValidation = validateFile(form.file);
    if (fileValidation) {
      setError(fileValidation);
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    // ── Simulated progress ticks while uploading ─────────────────────────
    let tick = 0;
    const progressInterval = setInterval(() => {
      tick += Math.random() * 12;
      setUploadProgress(Math.min(Math.round(tick), 85));
    }, 500);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", form.file);
      uploadFormData.append(
        "type",
        isDance ? "participant-dances" : "participant-songs",
      );

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });
      clearInterval(progressInterval);

      if (!uploadRes.ok) {
        let errMsg = "Upload failed";
        try {
          const errData = await uploadRes.json();
          errMsg = errData.error || errMsg;
        } catch {
          errMsg = `Upload failed (HTTP ${uploadRes.status})`;
        }
        throw new Error(errMsg);
      }

      setUploadProgress(100);
      let uploadJson: { url: string; publicId: string };
      try {
        uploadJson = await uploadRes.json();
      } catch {
        throw new Error("Upload succeeded but returned an unexpected response");
      }
      const { url, publicId } = uploadJson;

      const submitRes = await fetch("/api/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: type,
          name: form.name,
          email: form.email,
          phone: form.phone,
          mediaUrl: url,
          mediaPublicId: publicId,
        }),
      });

      if (!submitRes.ok) {
        let errMsg = "Submission failed";
        try {
          const errData = await submitRes.json();
          errMsg = errData.error || errMsg;
        } catch {
          errMsg = `Submission failed (HTTP ${submitRes.status})`;
        }
        throw new Error(errMsg);
      }

      setSubmitted(true);
    } catch (e) {
      clearInterval(progressInterval);
      setUploadProgress(0);
      const message =
        e instanceof Error ? e.message : "An unexpected error occurred";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Success state ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center gap-5 h-full py-16 px-8 text-center relative z-10"
      >
        <motion.div
          initial={{ scale: 0, rotate: -15 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 280,
            damping: 18,
            delay: 0.05,
          }}
          className="w-20 h-20 rounded-full bg-[#FACC15] flex items-center justify-center"
        >
          <svg
            width="36"
            height="36"
            fill="none"
            stroke="black"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <path
              d="M20 6L9 17l-5-5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>
        <div>
          <h3
            className={`text-2xl font-black uppercase tracking-tight ${isDance ? "text-white" : "text-black"}`}
          >
            You&apos;re in!
          </h3>
          <p
            className={`text-sm mt-1.5 max-w-[220px] mx-auto leading-relaxed ${isDance ? "text-white/50" : "text-black/45"}`}
          >
            Your {label.toLowerCase()} entry has been received. We&apos;ll be in
            touch.
          </p>
        </div>
        <button
          onClick={() => {
            setSubmitted(false);
            setForm(emptyForm);
            setUploadProgress(0);
            onClose();
          }}
          className={`text-xs font-black uppercase tracking-widest px-6 py-2.5 rounded-full border transition-all duration-200 ${
            isDance
              ? "border-white/25 text-white/70 hover:bg-white hover:text-black"
              : "border-black/15 text-black/60 hover:bg-black hover:text-white"
          }`}
        >
          Close
        </button>
      </motion.div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 p-8 h-full overflow-y-auto relative z-10"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <p
            className={`text-[10px] font-black uppercase tracking-[0.2em] mb-0.5 ${isDance ? "text-white/40" : "text-black/35"}`}
          >
            Register for
          </p>
          <h2
            className={`text-2xl font-black uppercase tracking-tight leading-none ${isDance ? "text-white" : "text-black"}`}
          >
            {label}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className={`w-9 h-9 mt-1 rounded-full border flex items-center justify-center transition-all disabled:opacity-40 ${
            isDance
              ? "border-white/20 text-white/40 hover:border-white/50 hover:text-white hover:bg-white/10"
              : "border-black/10 text-black/40 hover:text-black hover:border-black/30 hover:bg-black/5"
          }`}
          aria-label="Close form"
        >
          <svg
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="w-10 h-1 rounded-full bg-[#FACC15] mb-1" />

      <InputField
        label="Full name"
        type="text"
        placeholder="Ada Lovelace"
        value={form.name}
        onChange={(v) => setForm((f) => ({ ...f, name: v }))}
        dark={isDance}
        disabled={isSubmitting}
      />
      <InputField
        label="Email"
        type="email"
        placeholder="ada@example.com"
        value={form.email}
        onChange={(v) => setForm((f) => ({ ...f, email: v }))}
        dark={isDance}
        disabled={isSubmitting}
      />
      <InputField
        label="Phone"
        type="tel"
        placeholder="+1 555 000 0000"
        value={form.phone}
        onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
        dark={isDance}
        required={false}
        disabled={isSubmitting}
      />

      {/* File upload */}
      <div className="flex flex-col gap-1.5">
        <label
          className={`text-[10px] font-black uppercase tracking-[0.15em] ${isDance ? "text-white/50" : "text-black/40"}`}
        >
          {isDance ? "Upload dance video" : "Upload music file"}
        </label>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl border-2 border-dashed transition-all disabled:opacity-50"
          style={{
            borderColor: fileError
              ? "#ef4444"
              : form.file
                ? "#FACC15"
                : isDance
                  ? "rgba(255,255,255,0.18)"
                  : "rgba(0,0,0,0.12)",
            background: fileError
              ? "rgba(239,68,68,0.08)"
              : form.file
                ? "rgba(250,204,21,0.15)"
                : isDance
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.02)",
            color: fileError
              ? "#ef4444"
              : form.file
                ? "#FACC15"
                : isDance
                  ? "rgba(255,255,255,0.35)"
                  : "rgba(0,0,0,0.3)",
          }}
        >
          {isDance ? (
            <svg
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <rect x="2" y="7" width="15" height="10" rx="2" />
              <path
                d="M17 9l5-3v12l-5-3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <path
                d="M9 18V5l12-2v13"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          )}
          <span className="truncate text-xs font-black uppercase tracking-wider">
            {form.file ? form.file.name : "Choose a file…"}
          </span>
          {form.file && (
            <span
              className={`ml-auto text-[10px] font-medium shrink-0 ${isDance ? "text-white/40" : "text-black/30"}`}
            >
              {(form.file.size / (1024 * 1024)).toFixed(1)} MB
            </span>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={isDance ? "video/*" : "audio/*"}
          className="hidden"
          onChange={handleFileChange}
        />
        <p
          className={`text-[10px] ${isDance ? "text-white/30" : "text-black/30"}`}
        >
          {isDance
            ? "MP4, MOV, WEBM · max 100 MB"
            : "MP3, WAV, AAC, FLAC · max 100 MB"}
        </p>

        {/* File validation error */}
        <AnimatePresence>
          {fileError && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg"
            >
              {fileError}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Upload progress bar */}
      <AnimatePresence>
        {isSubmitting && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-col gap-2"
          >
            <div className="flex justify-between items-center">
              <span
                className={`text-[10px] font-black uppercase tracking-wider ${isDance ? "text-white/50" : "text-black/40"}`}
              >
                {uploadProgress < 100 ? "Uploading…" : "Saving submission…"}
              </span>
              <span className="text-[10px] font-black text-[#FACC15]">
                {uploadProgress}%
              </span>
            </div>
            <div
              className={`w-full h-1.5 rounded-full ${isDance ? "bg-white/10" : "bg-black/8"}`}
            >
              <motion.div
                className="h-full rounded-full bg-[#FACC15]"
                animate={{ width: `${uploadProgress}%` }}
                transition={{ ease: "easeOut", duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submission error */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <motion.button
        disabled={isSubmitting}
        whileHover={!isSubmitting ? { scale: 1.01 } : {}}
        whileTap={!isSubmitting ? { scale: 0.98 } : {}}
        type="submit"
        className={`w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-[0.15em] mt-1 transition-colors flex items-center justify-center gap-2 ${isSubmitting ? "opacity-70 cursor-not-allowed" : ""}`}
        style={{ background: "#FACC15", color: "#000" }}
      >
        {isSubmitting ? (
          <>
            <svg
              className="animate-spin"
              width="14"
              height="14"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Processing…
          </>
        ) : (
          "Submit entry"
        )}
      </motion.button>
    </form>
  );
}

// ─── IDLE PANELS ──────────────────────────────────────────────────────────────
function SongIdlePanel({
  onClick,
  hasSubmission,
}: {
  onClick: () => void;
  hasSubmission?: boolean;
}) {
  return (
    <div className="relative flex flex-col items-center justify-center h-full gap-6 px-10 overflow-hidden">
      <SongBackground />
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
        className="relative z-10"
      >
        <div className="w-20 h-20 rounded-2xl bg-black flex items-center justify-center shadow-lg">
          <svg
            width="36"
            height="36"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
          >
            <path
              d="M9 18V5l12-2v13"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>
        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#FACC15]" />
      </motion.div>
      <div className="text-center relative z-10">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40 mb-1">
          Register for
        </p>
        <h2 className="text-4xl font-black uppercase tracking-tight text-black">
          Song
        </h2>
        {hasSubmission && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[10px] font-black uppercase tracking-widest text-[#22c55e] mt-1.5"
          >
            Entry submitted ✓
          </motion.p>
        )}
      </div>
      <motion.button
        whileHover={{ scale: 1.06, boxShadow: "0 10px 36px rgba(0,0,0,0.22)" }}
        whileTap={{ scale: 0.96 }}
        onClick={onClick}
        className="relative z-10 px-7 py-3 rounded-full bg-black text-white text-xs font-black uppercase tracking-[0.15em]"
      >
        {hasSubmission ? "View status" : "Enter Song"}
      </motion.button>
    </div>
  );
}

function DanceIdlePanel({
  onClick,
  hasSubmission,
}: {
  onClick: () => void;
  hasSubmission?: boolean;
}) {
  return (
    <div
      className="relative flex flex-col items-center justify-center h-full gap-6 px-10 overflow-hidden"
      style={{
        background:
          "linear-gradient(160deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
      }}
    >
      <DanceBackground />
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{
          repeat: Infinity,
          duration: 3.5,
          ease: "easeInOut",
          delay: 0.5,
        }}
        className="relative z-10"
      >
        <div className="w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
          <svg
            width="36"
            height="36"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="4" r="2" />
            <path
              d="M8 10c1.5-1.5 5-1.5 6 0l2 6-3 1-1-3-1 3-3-1z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M9 17l-1.5 4M15 17l1.5 4" strokeLinecap="round" />
          </svg>
        </div>
        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#FACC15]" />
      </motion.div>
      <div className="text-center relative z-10">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45 mb-1">
          Register for
        </p>
        <h2 className="text-4xl font-black uppercase tracking-tight text-white">
          Dance
        </h2>
        {hasSubmission && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[10px] font-black uppercase tracking-widest text-[#22c55e] mt-1.5"
          >
            Entry submitted ✓
          </motion.p>
        )}
      </div>
      <motion.button
        whileHover={{
          scale: 1.06,
          boxShadow: "0 10px 36px rgba(129,140,248,0.4)",
        }}
        whileTap={{ scale: 0.96 }}
        onClick={onClick}
        className="relative z-10 px-7 py-3 rounded-full text-xs font-black uppercase tracking-[0.15em] border border-white/20"
        style={{ background: "#FACC15", color: "#000" }}
      >
        {hasSubmission ? "View status" : "Enter Dance"}
      </motion.button>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function ParticipantPage() {
  const [active, setActive] = useState<Section | null>(null);
  const { status: sessionStatus } = useSession();
  const queryClient = useQueryClient();

  // Use React Query so the SSE hook can invalidate ["participant-status"]
  // and trigger an automatic re-fetch when an admin approves/rejects —
  // no manual refresh needed.
  const { data: existing = {}, isLoading: loadingStatus } =
    useQuery<ExistingSubmissions>({
      queryKey: ["participant-status"],
      queryFn: async () => {
        const res = await fetch("/api/participants/status");
        if (!res.ok) return {};
        return res.json();
      },
      enabled: sessionStatus === "authenticated",
      staleTime: 30_000,
    });

  // fetchStatus is kept as a stable callback for the onClose handlers that
  // need to manually re-fetch after a new submission is created.
  const fetchStatus = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["participant-status"] });
  }, [queryClient]);

  return (
    <main className="min-h-[calc(100vh-5rem)] w-full flex flex-col">
      {/* Header */}
      <div className="border-b border-black/8 px-8 py-8">
        <div className="max-w-6xl mx-auto flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/35 mb-1.5">
              Tilt your music session
            </p>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-black leading-none">
              Participants
            </h1>
          </div>
          <div className="hidden sm:flex items-center gap-2 pb-1">
            <motion.div
              className="w-2 h-2 rounded-full bg-[#22c55e]"
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-xs font-black uppercase tracking-widest text-black/40">
              Entries open
            </span>
          </div>
        </div>
      </div>

      {/* Main panels */}
      <div className="flex-1 flex" style={{ minHeight: 560 }}>
        {/* SONG */}
        <motion.div
          layout
          className="relative overflow-hidden flex flex-col border-r border-black/8"
          animate={{
            width:
              active === "song" ? "62%" : active === "dance" ? "38%" : "50%",
          }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          style={{ background: "#f9f9f7" }}
        >
          <AnimatePresence mode="wait">
            {active === "song" ? (
              <motion.div
                key="song-form"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.35 }}
                className="w-full h-full"
              >
                <ParticipantForm
                  type="song"
                  onClose={() => {
                    setActive(null);
                    fetchStatus();
                  }}
                  existingSubmission={existing.song}
                />
              </motion.div>
            ) : (
              <motion.div
                key="song-idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: active === "dance" ? 0.4 : 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full"
              >
                {!loadingStatus && (
                  <SongIdlePanel
                    onClick={() => setActive("song")}
                    hasSubmission={!!existing.song}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* DANCE */}
        <motion.div
          layout
          className="relative overflow-hidden flex flex-col"
          animate={{
            width:
              active === "dance" ? "62%" : active === "song" ? "38%" : "50%",
          }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          <AnimatePresence mode="wait">
            {active === "dance" ? (
              <motion.div
                key="dance-form"
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                transition={{ duration: 0.35 }}
                className="w-full h-full"
                style={{
                  background:
                    "linear-gradient(160deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
                }}
              >
                <ParticipantForm
                  type="dance"
                  onClose={() => {
                    setActive(null);
                    fetchStatus();
                  }}
                  existingSubmission={existing.dance}
                />
              </motion.div>
            ) : (
              <motion.div
                key="dance-idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: active === "song" ? 0.4 : 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full"
              >
                {!loadingStatus && (
                  <DanceIdlePanel
                    onClick={() => setActive("dance")}
                    hasSubmission={!!existing.dance}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="border-t border-black/8 px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/25">
            Arbitrary × Tuborg
          </p>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/25">
            {existing.song && existing.dance
              ? "Both entries submitted"
              : "Select a category to register"}
          </p>
        </div>
      </div>
    </main>
  );
}
