import React, { useRef, useEffect } from "react";

// Fondo ambiental de Xenilum (compartido por la consola y el login):
// orbes suaves + luces exteriores (haces dorados) + cenizas doradas que suben.

function prefersReduced() {
  return typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Cenizas doradas: partículas pequeñas y tenues que suben por toda la altura,
// brillan más en la base y se apagan al subir.
function EmbersCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || prefersReduced()) return;
    const ctx = canvas.getContext("2d");
    let w = 0, h = 0, raf;
    const parts = [];
    const COUNT = 250;
    const RISE = 1; // suben por toda la altura
    const rnd = (a, b) => a + Math.random() * (b - a);
    const spawn = (initial) => {
      const hh = h || window.innerHeight;
      return {
        x: Math.random() * (w || window.innerWidth),
        y: initial ? rnd(hh * (1 - RISE), hh) : hh + rnd(2, 24),
        r: rnd(0.3, 1.15),
        vy: rnd(0.10, 0.38),
        vx: rnd(-0.10, 0.10),
        sway: rnd(0.004, 0.012),
        swayAmp: rnd(0.04, 0.14),
        phase: Math.random() * Math.PI * 2,
        hue: rnd(38, 47),
      };
    };
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + "px"; canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    for (let i = 0; i < COUNT; i++) parts.push(spawn(true));
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      const travel = h * RISE;
      for (const p of parts) {
        p.phase += p.sway;
        p.y -= p.vy;
        p.x += p.vx + Math.sin(p.phase) * p.swayAmp;
        const prog = Math.max(0, Math.min((h - p.y) / travel, 1));
        if (prog >= 1) { Object.assign(p, spawn(false)); continue; }
        const fadeIn = Math.min(prog / 0.05, 1);
        const falloff = Math.pow(1 - prog, 1.4);
        const flicker = 0.92 + 0.08 * Math.sin(p.phase * 2.1);
        const alpha = fadeIn * falloff * flicker * 0.72;
        if (alpha <= 0.01) continue;
        const rad = p.r * 2.5;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
        g.addColorStop(0, `hsla(${p.hue}, 92%, 66%, ${alpha})`);
        g.addColorStop(0.45, `hsla(${p.hue}, 85%, 55%, ${alpha * 0.5})`);
        g.addColorStop(1, `hsla(${p.hue}, 80%, 48%, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(draw);
    };
    draw();
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }} />;
}

export default function AmbientBackground() {
  return (
    <>
      <style>{`
        .xen-orb { position: absolute; border-radius: 50%; filter: blur(70px); opacity: 0.5; pointer-events: none; }
        @keyframes xenFloat1 { 0%,100% { transform: translate(0,0);} 50% { transform: translate(60px,-40px);} }
        @keyframes xenFloat2 { 0%,100% { transform: translate(0,0);} 50% { transform: translate(-50px,50px);} }
        @keyframes xenFloat3 { 0%,100% { transform: translate(0,0);} 50% { transform: translate(30px,60px);} }
        .xen-beam { position: absolute; pointer-events: none; filter: blur(42px); mix-blend-mode: screen; }
        @keyframes xenBeamA { 0%,100% { transform: translateX(-4%) rotate(18deg); opacity: .45; } 50% { transform: translateX(4%) rotate(21deg); opacity: .8; } }
        @keyframes xenBeamB { 0%,100% { transform: translateX(3%) rotate(-13deg); opacity: .38; } 50% { transform: translateX(-4%) rotate(-16deg); opacity: .68; } }
        @keyframes xenBeamC { 0%,100% { opacity: .32; } 50% { opacity: .58; } }
        @media (prefers-reduced-motion: reduce) { .xen-orb, .xen-beam { animation: none !important; } }
      `}</style>

      <div className="xen-orb" style={{ width: 380, height: 380, top: "-8%", left: "-6%", background: "radial-gradient(circle, rgba(201,162,74,0.5), transparent 70%)", animation: "xenFloat1 22s ease-in-out infinite" }} />
      <div className="xen-orb" style={{ width: 300, height: 300, bottom: "-10%", right: "-4%", background: "radial-gradient(circle, rgba(228,185,91,0.4), transparent 70%)", animation: "xenFloat2 28s ease-in-out infinite" }} />
      <div className="xen-orb" style={{ width: 220, height: 220, top: "40%", right: "22%", background: "radial-gradient(circle, rgba(201,162,74,0.3), transparent 70%)", animation: "xenFloat3 26s ease-in-out infinite" }} />

      {/* Luces exteriores: haces dorados suaves que entran desde arriba */}
      <div className="xen-beam" style={{ top: "-25%", left: "5%", width: 240, height: "150%", background: "linear-gradient(180deg, rgba(228,185,91,0.22), rgba(228,185,91,0.05) 42%, transparent 76%)", animation: "xenBeamA 17s ease-in-out infinite" }} />
      <div className="xen-beam" style={{ top: "-25%", left: "40%", width: 190, height: "150%", background: "linear-gradient(180deg, rgba(245,227,179,0.18), rgba(245,227,179,0.04) 46%, transparent 80%)", animation: "xenBeamB 21s ease-in-out infinite" }} />
      <div className="xen-beam" style={{ top: "-25%", right: "8%", width: 210, height: "150%", background: "linear-gradient(180deg, rgba(201,162,74,0.2), rgba(201,162,74,0.04) 44%, transparent 78%)", animation: "xenBeamA 24s ease-in-out infinite reverse" }} />
      <div style={{ position: "absolute", top: "-15%", left: "14%", right: "14%", height: "52%", pointerEvents: "none", background: "radial-gradient(60% 100% at 50% 0%, rgba(228,185,91,0.13), transparent 70%)", filter: "blur(26px)", mixBlendMode: "screen", animation: "xenBeamC 14s ease-in-out infinite" }} />

      <EmbersCanvas />
    </>
  );
}
