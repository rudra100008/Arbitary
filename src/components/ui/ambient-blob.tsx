"use client";

import { useEffect, useRef } from "react";

type Props = {
  className?: string;
  color?: string;
  count?: number;
  speed?: number;
};

export default function AmbientBlob({ className = "", color = "#FACC15", count = 1, speed = 1 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const blobs = Array.from({ length: count }, () => ({
      cx: 0.3 + Math.random() * 0.4,
      cy: 0.3 + Math.random() * 0.4,
      baseRadius: 120 + Math.random() * 180,
      points: Array.from({ length: 8 }, (_, i) => ({
        angle: (i / 8) * Math.PI * 2,
        phaseR: Math.random() * Math.PI * 2,
        freqR: 0.3 + Math.random() * 0.4,
        phaseX: Math.random() * Math.PI * 2,
        freqX: 0.1 + Math.random() * 0.2,
        phaseY: Math.random() * Math.PI * 2,
        freqY: 0.1 + Math.random() * 0.2,
        driftAmp: 10 + Math.random() * 20,
      })),
    }));

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    };

    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const start = performance.now();

    const draw = (now: number) => {
      const elapsed = ((now - start) / 1000) * speed;
      const dpr = devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      for (const blob of blobs) {
        const cx = blob.cx * w + Math.sin(elapsed * 0.1 + blob.cx) * 10;
        const cy = blob.cy * h + Math.cos(elapsed * 0.13 + blob.cy) * 10;
        const radius = blob.baseRadius + Math.sin(elapsed * 0.15) * 20;

        const pts = blob.points.map((p) => {
          const r = radius + Math.sin(elapsed * p.freqR + p.phaseR) * p.driftAmp;
          const xOff = Math.sin(elapsed * p.freqX + p.phaseX) * p.driftAmp;
          const yOff = Math.cos(elapsed * p.freqY + p.phaseY) * p.driftAmp;
          return {
            x: cx + Math.cos(p.angle) * r + xOff,
            y: cy + Math.sin(p.angle) * r + yOff,
          };
        });

        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);

        for (let i = 0; i < pts.length; i++) {
          const a = pts[i];
          const b = pts[(i + 1) % pts.length];
          const cpx = (a.x + b.x) / 2 + (Math.sin(elapsed * 0.2 + i) * 5);
          const cpy = (a.y + b.y) / 2 + (Math.cos(elapsed * 0.23 + i) * 5);
          ctx.quadraticCurveTo(a.x, a.y, cpx, cpy);
        }

        ctx.closePath();

        ctx.fillStyle = color;
        ctx.globalAlpha = 0.25;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, [color, count, speed]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
}
