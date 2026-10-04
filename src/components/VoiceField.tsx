import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

/** Original parametric ribbon. Decorative; no microphone, audio or network access. */
export function VoiceField({ compact = false }: { compact?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let last = 0;
    let time = 0;
    let width = 0;
    let height = 0;
    let reduced = motion.matches;
    const points = Array.from({ length: compact ? 2500 : 5200 }, (_, i) => ({
      u: (i / (compact ? 2500 : 5200)) * Math.PI * 2,
      v: ((i * 0.61803398875) % 1) * Math.PI * 2,
      bright: i % 5 === 0,
    }));
    function draw() {
      if (!context || !canvas) return;
      context.clearRect(0, 0, width, height);
      const size = Math.min(width * 0.43, height * 0.68);
      const spin = time * 0.13;
      for (const point of points) {
        const u = point.u;
        const v = point.v;
        const band = 0.22 + 0.055 * Math.sin(3 * u + time * 0.6);
        const r = 0.78 + band * Math.cos(v);
        const x = r * Math.cos(u);
        const y = r * Math.sin(u);
        const z = band * Math.sin(v) + 0.2 * Math.sin(2 * u + time * 0.35);
        const rx = x * Math.cos(spin) + z * Math.sin(spin);
        const rz = z * Math.cos(spin) - x * Math.sin(spin);
        const tiltY = y * 0.65 + rz * 0.76;
        const depth = rz * 0.65 - y * 0.76;
        const screenX = width / 2 + (rx * 0.87 - tiltY * 0.49) * size;
        const screenY = height / 2 + (rx * 0.49 + tiltY * 0.87) * size;
        context.globalAlpha = 0.18 + (depth + 1) * 0.3;
        context.fillStyle = point.bright ? "#e0ff95" : "#a2ad88";
        const dot = point.bright ? 1.5 : 1;
        context.fillRect(screenX, screenY, dot, dot);
      }
      context.globalAlpha = 1;
    }
    function tick(now: number) {
      if (now - last >= 32) {
        time += Math.min((now - last) / 1000, 0.05);
        last = now;
        draw();
      }
      frame = requestAnimationFrame(tick);
    }
    function sync() {
      cancelAnimationFrame(frame);
      draw();
      if (!paused && !reduced && !document.hidden) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    }
    const resize = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width;
      height = entry.contentRect.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      sync();
    });
    const onMotion = () => { reduced = motion.matches; sync(); };
    resize.observe(canvas);
    motion.addEventListener("change", onMotion);
    document.addEventListener("visibilitychange", sync);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      motion.removeEventListener("change", onMotion);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [paused, compact]);
  return <div className={`voice-field${compact ? " voice-field-compact" : ""}`}>
    <canvas ref={canvasRef} aria-hidden="true" />
    <button className="motion-toggle" onClick={() => setPaused(!paused)}
      aria-label={paused ? "Reanudar animación de fondo" : "Pausar animación de fondo"}>
      {paused ? <Play size={14} /> : <Pause size={14} />}
    </button>
  </div>;
}
