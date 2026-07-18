import React, { useState, useRef, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { authHeaders, getUserEmail, getUserRole, signOut } from "./session.js";
import AmbientBackground from "./AmbientBackground.jsx";

// ============================================================
// XENILUM · Consola de Inteligencia — Autónoma System
// Bloques v2 (Fase 1) + Fase 2: gauge, timeline, heatmap, image, code
// ============================================================

const NAVY = "#0A2342";
const NAVY_DEEP = "#04101F";
const GOLD = "#C9A24A";
const GOLD_LIGHT = "#E4B95B";
const INK = "#EAF0F7";
const MUTED = "#9FB0C6";
const GREEN = "#7FD6A4";
const AMBER = "#E8A96B";
const RED = "#E88B8B";

const GOLD_SERIES = ["#C9A24A", "#E4B95B", "#8A6D2F", "#F0D48A", "#6E5626"];

// ---------- Config backend ----------
const API_BASE = import.meta.env.VITE_API_BASE || "https://prueba-n8n-prueba.urdzg3.easypanel.host/webhook/api";
// authHeaders (JWT Supabase) y getUserEmail vienen de session.js.

const SUGGESTIONS = [
  { key: "ingresos", label: "¿Cuánto facturamos este mes?", dir: true }, // dir: solo dirección
  { key: "proyectos", label: "Avance de proyectos" },
  { key: "equipo", label: "Equipo y pendientes" },
];

// Demo local de los bloques de Fase 2 (se ve sin backend)
const DEMO_FASE2 = [
  { type: "text", content: "Estos son los bloques nuevos de la Fase 2: gauge, timeline, heatmap, image y code. Datos de ejemplo." },
  { type: "gauge", title: "Meta de ingresos · Julio", value: 65000, target: 120000, unit: "MXN" },
  {
    type: "timeline", title: "Próximos hitos",
    items: [
      { date: "10 jul", label: "Deploy Xenilum Fase 1", status: "done" },
      { date: "15 jul", label: "Cobro facturas ORVE", status: "late" },
      { date: "22 jul", label: "Entrega landing Events Producer", status: "pending" },
      { date: "31 jul", label: "Cierre de mes", status: "pending" },
    ],
  },
  {
    type: "heatmap", title: "Actividad del equipo · últimos 5 días",
    xLabels: ["Lun", "Mar", "Mié", "Jue", "Vie"],
    yLabels: ["Bruno", "Dariana", "Saday", "Victoria", "Emiliano"],
    values: [
      [3, 5, 2, 4, 6],
      [2, 3, 4, 1, 3],
      [1, 2, 2, 3, 2],
      [0, 1, 2, 1, 2],
      [2, 1, 3, 2, 4],
    ],
  },
  { type: "code", language: "bash", code: "curl -X POST $API/xenilum/chat \\\n  -H 'x-xenilum-key: ***' \\\n  -d '{\"message\":\"¿Cuánto facturamos?\"}'" },
  { type: "callout", variant: "success", content: "Los 16 tipos de bloque renderizan con el mismo estilo liquid glass." },
];

// ---------- Exportación de visuales (SVG / PNG) ----------
const slug = (s) =>
  (s || "visual").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "visual";

function prepareSvgClone(svgEl) {
  const clone = svgEl.cloneNode(true);
  const vb = svgEl.viewBox && svgEl.viewBox.baseVal && svgEl.viewBox.baseVal.width ? svgEl.viewBox.baseVal : null;
  const rect = svgEl.getBoundingClientRect();
  const w = vb ? vb.width : rect.width || 800;
  const h = vb ? vb.height : rect.height || 500;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", w); clone.setAttribute("height", h);
  if (!clone.getAttribute("viewBox")) clone.setAttribute("viewBox", `0 0 ${w} ${h}`);
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("x", vb ? vb.x : 0); bg.setAttribute("y", vb ? vb.y : 0);
  bg.setAttribute("width", w); bg.setAttribute("height", h); bg.setAttribute("fill", NAVY_DEEP);
  clone.insertBefore(bg, clone.firstChild);
  return { clone, w, h };
}
function triggerDownload(href, filename) {
  const a = document.createElement("a");
  a.href = href; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
}
function downloadAsSvg(svgEl, filename) {
  const { clone } = prepareSvgClone(svgEl);
  const source = new XMLSerializer().serializeToString(clone);
  const blob = new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n' + source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, `${filename}.svg`); setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function downloadAsPng(svgEl, filename, scale = 2) {
  const { clone, w, h } = prepareSvgClone(svgEl);
  const source = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = w * scale; canvas.height = h * scale;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height); URL.revokeObjectURL(url);
    canvas.toBlob((png) => {
      if (!png) return;
      const pngUrl = URL.createObjectURL(png);
      triggerDownload(pngUrl, `${filename}.png`); setTimeout(() => URL.revokeObjectURL(pngUrl), 2000);
    }, "image/png");
  };
  img.src = url;
}
function ExportButtons({ targetRef, filename }) {
  const getSvg = () => targetRef.current && targetRef.current.querySelector("svg");
  const btnStyle = {
    fontFamily: "Inter", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.05em",
    color: GOLD_LIGHT, background: "rgba(201,162,74,0.08)", border: "1px solid rgba(201,162,74,0.35)",
    borderRadius: 8, padding: "4px 10px", cursor: "pointer",
  };
  return (
    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
      <button className="xen-export" title="Descargar vectorial" style={btnStyle}
        onClick={() => { const s = getSvg(); if (s) downloadAsSvg(s, filename); }}>↓ SVG</button>
      <button className="xen-export" title="Descargar imagen (2x)" style={btnStyle}
        onClick={() => { const s = getSvg(); if (s) downloadAsPng(s, filename); }}>↓ PNG</button>
    </div>
  );
}

// ---------- Contextos ----------
const PresentCtx = React.createContext(() => {});
const ActionCtx = React.createContext(async () => ({ success: false }));
const SendCtx = React.createContext(() => {}); // drill-down: enviar un mensaje al chat
function PresentButton({ block }) {
  const present = React.useContext(PresentCtx);
  return (
    <button className="xen-export" title="Modo presentación" style={{
      fontFamily: "Inter", fontSize: 11.5, fontWeight: 600, color: GOLD_LIGHT,
      background: "rgba(201,162,74,0.08)", border: "1px solid rgba(201,162,74,0.35)",
      borderRadius: 8, padding: "4px 10px", cursor: "pointer", lineHeight: 1,
    }} onClick={() => present(block)}>⛶</button>
  );
}

// ---------- Base visual ----------
function GlassCard({ children, style }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.045)", border: "1px solid rgba(201,162,74,0.22)",
      borderRadius: 16, backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)",
      padding: 18, ...style,
    }}>{children}</div>
  );
}
// ---------- Helpers de animación ----------
function prefersReduced() {
  return typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Cuenta desde 0 hasta el valor (easeOut).
function useCountUp(target, duration = 1100) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (prefersReduced()) { setV(target); return; }
    let raf, start = null;
    const tick = (t) => {
      if (start == null) start = t;
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick); else setV(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

// Anima un valor (número o string tipo "$65,000 MXN" / "85%") contando desde 0, preservando prefijo/sufijo.
function CountUp({ value, style }) {
  const s = String(value == null ? "" : value);
  const m = s.match(/^(\D*)([\d.,]+)(.*)$/s);
  const numStr = m ? m[2] : "";
  const num = m ? parseFloat(numStr.replace(/,/g, "")) : NaN;
  const dec = numStr.includes(".") ? (numStr.split(".")[1] || "").length : 0;
  const cur = useCountUp(isFinite(num) ? num : 0);
  if (!m || !isFinite(num)) return <span style={style}>{s}</span>;
  const formatted = cur.toLocaleString("es-MX", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  return <span style={style}>{m[1]}{formatted}{m[3]}</span>;
}

// Escribe el texto carácter por carácter (solo si animate). Se ejecuta una vez al montar.
function TypeText({ text, animate, style }) {
  const full = String(text == null ? "" : text);
  const [shown, setShown] = useState(animate ? 0 : full.length);
  const started = useRef(false);
  useEffect(() => {
    if (!animate || started.current) return;
    started.current = true;
    if (prefersReduced()) { setShown(full.length); return; }
    let i = 0;
    const step = Math.max(1, Math.round(full.length / 90));
    const id = setInterval(() => {
      i += step;
      if (i >= full.length) { setShown(full.length); clearInterval(id); }
      else setShown(i);
    }, 16);
    return () => clearInterval(id);
  }, []);
  const done = shown >= full.length;
  return <p style={style}>{full.slice(0, shown)}{!done && <span className="xen-caret">▍</span>}</p>;
}

function BlockTitle({ children }) {
  return (
    <div style={{
      fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 600, letterSpacing: "0.06em",
      textTransform: "uppercase", color: GOLD_LIGHT, marginBottom: 12,
    }}>{children}</div>
  );
}

// ---------- Bloques ----------
function toNum(v) {
  if (typeof v === "number") return v;
  if (typeof v === "string") { const n = parseFloat(v.replace(/[^0-9.\-]/g, "")); return isNaN(n) ? 0 : n; }
  return 0;
}
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: "rgba(4,16,31,0.92)", border: "1px solid rgba(201,162,74,0.4)", borderRadius: 10,
      padding: "8px 12px", fontFamily: "'Inter', sans-serif", fontSize: 12, color: INK, backdropFilter: "blur(8px)", minWidth: 110,
    }}>
      <div style={{ color: MUTED, marginBottom: 4 }}>{label || payload[0].name}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 14, color: p.color || GOLD_LIGHT, fontWeight: 600 }}>
          {payload.length > 1 && <span>{p.name}</span>}
          <span style={{ marginLeft: "auto" }}>{typeof p.value === "number" ? p.value.toLocaleString("es-MX") : p.value}</span>
        </div>
      ))}
    </div>
  );
}
function ChartBlock({ block }) {
  const h = 260; const wrapRef = useRef(null);
  const drill = React.useContext(SendCtx);
  const onDrill = (d) => { const n = d && (d.payload ? d.payload.name : d.name); if (n) drill("Desglósame " + n); };
  const raw = Array.isArray(block.data) ? block.data : [];
  // Series a graficar: explícitas (block.series) o autodetectadas (multi-serie), o "value" (una sola)
  let series = Array.isArray(block.series) && block.series.length ? block.series.slice() : null;
  if (!series) {
    const keys = raw.length ? Object.keys(raw[0]).filter((k) => k !== "name") : [];
    const numeric = keys.filter((k) => raw.some((r) => typeof r[k] === "number" || (typeof r[k] === "string" && r[k].trim() !== "" && !isNaN(parseFloat(r[k])))));
    series = numeric.includes("value") ? ["value"] : (numeric.length ? numeric : ["value"]);
  }
  const multi = !(series.length === 1 && series[0] === "value");
  const data = raw.map((r) => { const o = { name: r.name }; series.forEach((s) => (o[s] = toNum(r[s]))); return o; });
  const legend = multi ? (
    <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: MUTED, fontSize: 12, fontFamily: "Inter" }}>{v}</span>} />
  ) : null;
  return (
    <GlassCard>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <BlockTitle>{block.title}</BlockTitle>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <ExportButtons targetRef={wrapRef} filename={slug(block.title)} /><PresentButton block={block} />
        </div>
      </div>
      <div ref={wrapRef} style={{ width: "100%", height: h }}>
        <ResponsiveContainer>
          {block.chartType === "bar" ? (
            <BarChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 11, fontFamily: "Inter" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: MUTED, fontSize: 11, fontFamily: "Inter" }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(201,162,74,0.08)" }} />
              {legend}
              {multi
                ? series.map((s, i) => <Bar key={s} dataKey={s} name={s} fill={GOLD_SERIES[i % GOLD_SERIES.length]} radius={[5, 5, 0, 0]} cursor="pointer" onClick={onDrill} />)
                : (
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} cursor="pointer" onClick={onDrill}>
                    {data.map((_, i) => (<Cell key={i} fill={GOLD_SERIES[i % GOLD_SERIES.length]} />))}
                  </Bar>
                )}
            </BarChart>
          ) : block.chartType === "line" ? (
            <LineChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 11, fontFamily: "Inter" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: MUTED, fontSize: 11, fontFamily: "Inter" }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              {legend}
              {(multi ? series : ["value"]).map((s, i) => (
                <Line key={s} type="monotone" dataKey={s} name={s === "value" ? (block.title || "valor") : s}
                  stroke={GOLD_SERIES[i % GOLD_SERIES.length]} strokeWidth={2.5}
                  dot={{ fill: GOLD_SERIES[i % GOLD_SERIES.length], r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
              ))}
            </LineChart>
          ) : (
            <PieChart>
              <Pie data={data.map((d) => ({ name: d.name, value: d[series[0]] }))} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85}
                paddingAngle={3} stroke="rgba(4,16,31,0.6)" cursor="pointer" onClick={onDrill}>
                {data.map((_, i) => (<Cell key={i} fill={GOLD_SERIES[i % GOLD_SERIES.length]} />))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              <Legend iconType="circle" iconSize={8}
                formatter={(v) => <span style={{ color: MUTED, fontSize: 12, fontFamily: "Inter" }}>{v}</span>} />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
function KpiBlock({ block }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
      {block.items.map((k, i) => (
        <GlassCard key={i} style={{ padding: 16 }}>
          <div style={{ fontFamily: "Inter", fontSize: 11, color: MUTED, letterSpacing: "0.04em", textTransform: "uppercase" }}>{k.label}</div>
          <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 26, fontWeight: 700, color: INK, margin: "6px 0 4px" }}><CountUp value={k.value} /></div>
          {k.trend && (
            <div style={{ fontFamily: "Inter", fontSize: 12, fontWeight: 600, color: k.up ? GREEN : AMBER }}>
              {k.up ? "▲ " : "● "}{k.trend}
            </div>
          )}
        </GlassCard>
      ))}
    </div>
  );
}
function TableBlock({ block }) {
  const statusColor = (s) => s === "Atención" ? AMBER : s === "En pausa" ? MUTED : GREEN;
  return (
    <GlassCard style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "16px 18px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <BlockTitle>{block.title}</BlockTitle><PresentButton block={block} />
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter", fontSize: 13 }}>
          <thead><tr>
            {block.columns.map((c, i) => (
              <th key={i} style={{
                textAlign: "left", padding: "10px 18px", color: GOLD_LIGHT, fontWeight: 600, fontSize: 11,
                letterSpacing: "0.05em", textTransform: "uppercase", borderBottom: "1px solid rgba(201,162,74,0.25)", whiteSpace: "nowrap",
              }}>{c}</th>
            ))}
          </tr></thead>
          <tbody>
            {block.rows.map((r, i) => (
              <tr key={i} className="xen-row">
                {r.map((cell, j) => (
                  <td key={j} style={{
                    padding: "11px 18px", color: j === r.length - 1 ? statusColor(cell) : INK,
                    fontWeight: j === r.length - 1 ? 600 : 400,
                    borderBottom: i < block.rows.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", whiteSpace: "nowrap",
                  }}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
function ListBlock({ block }) {
  const numbered = block.style === "numbered";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9, paddingLeft: 2 }}>
      {block.items.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          {numbered ? (
            <span style={{
              fontFamily: "'Sora', sans-serif", fontSize: 12, fontWeight: 700, color: NAVY_DEEP,
              background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`, width: 22, height: 22, borderRadius: 7,
              flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1,
            }}>{i + 1}</span>
          ) : (
            <span style={{
              width: 7, height: 7, borderRadius: "50%", flexShrink: 0, marginTop: 7,
              background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`, boxShadow: "0 0 6px rgba(201,162,74,0.5)",
            }} />
          )}
          <span style={{ fontFamily: "Inter", fontSize: 14, lineHeight: 1.6, color: INK }}>{item}</span>
        </div>
      ))}
    </div>
  );
}
function ChecklistBlock({ block, onToggle }) {
  const [items, setItems] = useState(block.items);
  useEffect(() => { setItems(block.items); }, [block]);
  const toggle = (i) => {
    const it = items[i];
    const next = !it.done;
    setItems((prev) => prev.map((x, j) => (j === i ? { ...x, done: next } : x)));
    if (onToggle && it.id) onToggle(it.id, next);
  };
  const doneCount = items.filter((i) => i.done).length;
  return (
    <GlassCard>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <BlockTitle>{block.title}</BlockTitle>
        <span style={{ fontFamily: "Inter", fontSize: 12, color: MUTED }}>{doneCount}/{items.length}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map((item, i) => (
          <button key={i} onClick={() => toggle(i)} className="xen-check" style={{
            display: "flex", gap: 12, alignItems: "flex-start", textAlign: "left",
            background: "transparent", border: "none", cursor: "pointer", padding: "8px 10px", borderRadius: 10, width: "100%",
          }}>
            <span style={{
              width: 20, height: 20, borderRadius: 7, flexShrink: 0, marginTop: 1,
              border: item.done ? "none" : `1.5px solid rgba(201,162,74,0.5)`,
              background: item.done ? `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})` : "rgba(255,255,255,0.03)",
              display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease",
            }}>
              {item.done && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6.5L5 9L9.5 3.5" stroke={NAVY_DEEP} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span style={{
              fontFamily: "Inter", fontSize: 14, lineHeight: 1.55, color: item.done ? "rgba(159,176,198,0.6)" : INK,
              textDecoration: item.done ? "line-through" : "none", transition: "all 0.2s ease",
            }}>{item.label}</span>
          </button>
        ))}
      </div>
    </GlassCard>
  );
}
function AccordionBlock({ block, onToggle }) {
  const [open, setOpen] = useState(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {block.sections.map((sec, i) => {
        const isOpen = open === i;
        return (
          <GlassCard key={i} style={{ padding: 0, overflow: "hidden", borderColor: isOpen ? "rgba(228,185,91,0.45)" : "rgba(201,162,74,0.22)" }}>
            <button onClick={() => setOpen(isOpen ? null : i)} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%",
              background: "transparent", border: "none", cursor: "pointer", padding: "15px 18px", textAlign: "left",
            }}>
              <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 600, color: isOpen ? GOLD_LIGHT : INK }}>{sec.title}</span>
              <span style={{ color: GOLD_LIGHT, fontSize: 13, transition: "transform 0.3s ease", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0, marginLeft: 12 }}>▾</span>
            </button>
            <div style={{ display: "grid", gridTemplateRows: isOpen ? "1fr" : "0fr", transition: "grid-template-rows 0.35s cubic-bezier(0.22,1,0.36,1)" }}>
              <div style={{ overflow: "hidden" }}>
                <div style={{ padding: "2px 18px 16px", borderTop: "1px solid rgba(201,162,74,0.15)", paddingTop: 14 }}>
                  <BlockRenderer blocks={sec.blocks} onToggle={onToggle} />
                </div>
              </div>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}
function ProgressBlock({ block }) {
  return (
    <GlassCard>
      <BlockTitle>{block.title}</BlockTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {block.items.map((item, i) => (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontFamily: "Inter", fontSize: 13.5, color: INK }}>{item.label}</span>
              <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 700, color: GOLD_LIGHT }}>{item.value}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 99, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${item.value}%`, borderRadius: 99,
                background: `linear-gradient(90deg, #8A6D2F, ${GOLD} 60%, ${GOLD_LIGHT})`,
                boxShadow: "0 0 10px rgba(201,162,74,0.4)", transition: "width 1s cubic-bezier(0.22,1,0.36,1)",
              }} />
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
function CalloutBlock({ block }) {
  const cfg = {
    info: { color: GOLD_LIGHT, icon: "◆", bg: "rgba(201,162,74,0.08)", border: "rgba(201,162,74,0.35)" },
    warning: { color: AMBER, icon: "▲", bg: "rgba(232,169,107,0.08)", border: "rgba(232,169,107,0.35)" },
    success: { color: GREEN, icon: "●", bg: "rgba(127,214,164,0.07)", border: "rgba(127,214,164,0.3)" },
  }[block.variant || "info"];
  return (
    <div style={{
      display: "flex", gap: 12, alignItems: "flex-start", background: cfg.bg, border: `1px solid ${cfg.border}`,
      borderRadius: 14, padding: "13px 16px", backdropFilter: "blur(10px)",
    }}>
      <span style={{ color: cfg.color, fontSize: 12, marginTop: 3, flexShrink: 0 }}>{cfg.icon}</span>
      <span style={{ fontFamily: "Inter", fontSize: 13.5, lineHeight: 1.6, color: INK }}>{block.content}</span>
    </div>
  );
}

// --- Diagrama ---
function layoutDiagram(nodes, edges) {
  const level = {}; nodes.forEach((n) => (level[n.id] = 0));
  for (let k = 0; k < nodes.length; k++) {
    edges.forEach((e) => { if (level[e.to] < level[e.from] + 1) level[e.to] = level[e.from] + 1; });
  }
  const rows = {}; nodes.forEach((n) => { (rows[level[n.id]] = rows[level[n.id]] || []).push(n); });
  return { level, rows };
}
function DiagramBlock({ block }) {
  const { rows } = layoutDiagram(block.nodes, block.edges);
  const NODE_W = 168, NODE_H = 48, ROW_H = 104, GAP_X = 28;
  const numRows = Object.keys(rows).length;
  const maxCols = Math.max(...Object.values(rows).map((r) => r.length));
  const svgW = Math.max(maxCols * (NODE_W + GAP_X) + GAP_X, 480);
  const svgH = numRows * ROW_H + 20;
  const pos = {};
  Object.entries(rows).forEach(([lvl, list]) => {
    const totalW = list.length * NODE_W + (list.length - 1) * GAP_X;
    const startX = (svgW - totalW) / 2;
    list.forEach((n, i) => { pos[n.id] = { x: startX + i * (NODE_W + GAP_X), y: 14 + Number(lvl) * ROW_H }; });
  });
  const kindStyle = (kind) => {
    if (kind === "start") return { fill: "rgba(201,162,74,0.18)", stroke: GOLD_LIGHT, rx: 24 };
    if (kind === "end") return { fill: "rgba(127,214,164,0.12)", stroke: GREEN, rx: 24 };
    if (kind === "decision") return { fill: "rgba(232,169,107,0.1)", stroke: AMBER, rx: 12 };
    return { fill: "rgba(255,255,255,0.05)", stroke: "rgba(201,162,74,0.5)", rx: 12 };
  };
  const wrapRef = useRef(null);
  return (
    <GlassCard>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <BlockTitle>{block.title}</BlockTitle>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <ExportButtons targetRef={wrapRef} filename={slug(block.title)} /><PresentButton block={block} />
        </div>
      </div>
      <div ref={wrapRef} style={{ overflowX: "auto" }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: "100%", minWidth: Math.min(svgW, 560), display: "block" }}>
          <defs>
            <marker id="xen-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9 z" fill={GOLD} />
            </marker>
          </defs>
          {block.edges.map((e, i) => {
            const a = pos[e.from], b = pos[e.to]; if (!a || !b) return null;
            const x1 = a.x + NODE_W / 2, y1 = a.y + NODE_H, x2 = b.x + NODE_W / 2, y2 = b.y - 3, midY = (y1 + y2) / 2;
            const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
            return (
              <g key={i}>
                <path d={d} fill="none" stroke="rgba(201,162,74,0.55)" strokeWidth="1.8" markerEnd="url(#xen-arrow)" />
                {e.label && (<>
                  <rect x={(x1 + x2) / 2 - e.label.length * 3.6 - 6} y={midY - 10} width={e.label.length * 7.2 + 12} height={19} rx={9} fill={NAVY_DEEP} stroke="rgba(201,162,74,0.35)" strokeWidth="1" />
                  <text x={(x1 + x2) / 2} y={midY + 3.5} textAnchor="middle" style={{ fontFamily: "Inter", fontSize: 10.5, fontWeight: 600, fill: GOLD_LIGHT }}>{e.label}</text>
                </>)}
              </g>
            );
          })}
          {block.nodes.map((n) => {
            const p = pos[n.id]; const s = kindStyle(n.kind);
            return (
              <g key={n.id}>
                <rect x={p.x} y={p.y} width={NODE_W} height={NODE_H} rx={s.rx} fill={s.fill} stroke={s.stroke} strokeWidth="1.4" />
                <text x={p.x + NODE_W / 2} y={p.y + NODE_H / 2 + 4.5} textAnchor="middle" style={{ fontFamily: "'Sora', sans-serif", fontSize: 12.5, fontWeight: 600, fill: INK }}>{n.label}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </GlassCard>
  );
}
function SvgBlock({ block }) {
  const wrapRef = useRef(null);
  return (
    <GlassCard>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        {block.title ? <BlockTitle>{block.title}</BlockTitle> : <span />}
        <ExportButtons targetRef={wrapRef} filename={slug(block.title)} />
      </div>
      <div ref={wrapRef} style={{ width: "100%" }} dangerouslySetInnerHTML={{ __html: block.code }} />
    </GlassCard>
  );
}

// ============================================================
// BLOQUES FASE 2
// ============================================================

// --- gauge: semicírculo métrica vs meta ---
function GaugeBlock({ block }) {
  const wrapRef = useRef(null);
  const value = Number(block.value) || 0;
  const target = Number(block.target) || 0;
  const pct = target > 0 ? Math.max(0, Math.min(value / target, 1)) : 0;
  const animVal = useCountUp(value);
  const animPct = target > 0 ? Math.max(0, Math.min(animVal / target, 1)) : 0;
  const endDegA = 180 - 180 * animPct;
  const W = 320, H = 190, cx = 160, cy = 166, r = 128, sw = 20;
  const polar = (deg) => { const a = (Math.PI * deg) / 180; return [cx + r * Math.cos(a), cy - r * Math.sin(a)]; };
  // Semicírculo 180°(izq) -> 0°(der). large-arc siempre 0 (nunca supera 180°).
  const arc = (fromDeg, toDeg) => {
    const [x1, y1] = polar(fromDeg), [x2, y2] = polar(toDeg);
    const large = Math.abs(fromDeg - toDeg) > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };
  const endDeg = 180 - 180 * pct;
  const color = pct >= 0.99 ? GREEN : pct >= 0.6 ? GOLD_LIGHT : AMBER;
  const fmt = (n) => Number(n).toLocaleString("es-MX");
  const [lx] = polar(180), [rx] = polar(0);
  return (
    <GlassCard>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <BlockTitle>{block.title}</BlockTitle>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <ExportButtons targetRef={wrapRef} filename={slug(block.title)} /><PresentButton block={block} />
        </div>
      </div>
      <div ref={wrapRef} style={{ display: "flex", justifyContent: "center" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 360 }}>
          <path d={arc(180, 0)} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={sw} strokeLinecap="round" />
          {animPct > 0 && (
            <path d={arc(180, endDegA)} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 7px ${color}66)` }} />
          )}
          <text x={cx} y={cy - 36} textAnchor="middle" style={{ fontFamily: "'Sora', sans-serif", fontSize: 34, fontWeight: 800, fill: INK }}>{fmt(Math.round(animVal))}</text>
          <text x={cx} y={cy - 14} textAnchor="middle" style={{ fontFamily: "Inter", fontSize: 12.5, fill: MUTED }}>de {fmt(target)}{block.unit ? " " + block.unit : ""}</text>
          <text x={cx} y={cy + 6} textAnchor="middle" style={{ fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 700, fill: color }}>{Math.round(animPct * 100)}%</text>
          <text x={lx} y={cy + 18} textAnchor="middle" style={{ fontFamily: "Inter", fontSize: 10, fill: MUTED }}>0</text>
          <text x={rx} y={cy + 18} textAnchor="middle" style={{ fontFamily: "Inter", fontSize: 10, fill: MUTED }}>{fmt(target)}</text>
        </svg>
      </div>
    </GlassCard>
  );
}

// --- timeline: hitos verticales ---
function TimelineBlock({ block }) {
  const dot = { done: GREEN, pending: GOLD_LIGHT, late: RED, "en curso": AMBER };
  return (
    <GlassCard>
      <BlockTitle>{block.title}</BlockTitle>
      <div style={{ position: "relative", paddingLeft: 8 }}>
        {block.items.map((it, i) => {
          const c = dot[(it.status || "pending").toLowerCase()] || GOLD_LIGHT;
          const last = i === block.items.length - 1;
          return (
            <div key={i} style={{ display: "flex", gap: 14, position: "relative" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ width: 13, height: 13, borderRadius: "50%", background: c, boxShadow: `0 0 8px ${c}`, flexShrink: 0, marginTop: 3, border: "2px solid rgba(4,16,31,0.8)" }} />
                {!last && <span style={{ width: 2, flex: 1, background: "rgba(201,162,74,0.25)", marginTop: 2, marginBottom: 2 }} />}
              </div>
              <div style={{ paddingBottom: last ? 0 : 18 }}>
                <div style={{ fontFamily: "Inter", fontSize: 11.5, color: GOLD_LIGHT, fontWeight: 600, letterSpacing: "0.04em" }}>{it.date}</div>
                <div style={{ fontFamily: "Inter", fontSize: 14, color: INK, marginTop: 2 }}>{it.label}</div>
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

// --- heatmap: actividad por persona/día ---
function HeatmapBlock({ block }) {
  const wrapRef = useRef(null);
  const flat = block.values.flat();
  const max = Math.max(1, ...flat);
  const cell = (v) => {
    const t = v / max;
    return `rgba(201,162,74,${(0.08 + t * 0.85).toFixed(3)})`;
  };
  return (
    <GlassCard>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <BlockTitle>{block.title}</BlockTitle><PresentButton block={block} />
      </div>
      <div ref={wrapRef} style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "separate", borderSpacing: 5, fontFamily: "Inter" }}>
          <thead>
            <tr>
              <th />
              {block.xLabels.map((x, i) => (
                <th key={i} style={{ fontSize: 10.5, color: MUTED, fontWeight: 600, padding: "0 2px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{x}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.yLabels.map((y, r) => (
              <tr key={r}>
                <td style={{ fontSize: 12, color: INK, paddingRight: 8, whiteSpace: "nowrap", textAlign: "right" }}>{y}</td>
                {block.xLabels.map((_, c) => {
                  const v = (block.values[r] && block.values[r][c]) || 0;
                  return (
                    <td key={c} title={`${y} · ${block.xLabels[c]}: ${v}`} style={{
                      width: 34, height: 34, borderRadius: 8, background: cell(v),
                      textAlign: "center", verticalAlign: "middle", fontSize: 12, fontWeight: 600,
                      color: v / max > 0.5 ? NAVY_DEEP : MUTED, border: "1px solid rgba(201,162,74,0.15)",
                    }}>{v || ""}</td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}

// --- image: asset con marco glass ---
function ImageBlock({ block }) {
  return (
    <GlassCard>
      {block.title && <BlockTitle>{block.title}</BlockTitle>}
      <img src={block.url} alt={block.caption || block.title || "imagen"} style={{ width: "100%", borderRadius: 12, display: "block", border: "1px solid rgba(201,162,74,0.2)" }} />
      {block.caption && (
        <div style={{ fontFamily: "Inter", fontSize: 12, color: MUTED, marginTop: 8, textAlign: "center" }}>{block.caption}</div>
      )}
    </GlassCard>
  );
}

// --- code: snippet monospaced ---
function CodeBlock({ block }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(block.code || ""); setCopied(true); setTimeout(() => setCopied(false), 1400); };
  return (
    <GlassCard style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid rgba(201,162,74,0.18)", background: "rgba(4,16,31,0.4)" }}>
        <span style={{ fontFamily: "Inter", fontSize: 11, color: GOLD_LIGHT, letterSpacing: "0.08em", textTransform: "uppercase" }}>{block.language || "code"}</span>
        <button onClick={copy} className="xen-export" style={{ fontFamily: "Inter", fontSize: 10.5, fontWeight: 600, color: GOLD_LIGHT, background: "rgba(201,162,74,0.08)", border: "1px solid rgba(201,162,74,0.35)", borderRadius: 8, padding: "3px 10px", cursor: "pointer" }}>{copied ? "✓ copiado" : "copiar"}</button>
      </div>
      <pre style={{ margin: 0, padding: "14px 16px", overflowX: "auto" }}>
        <code style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 12.5, lineHeight: 1.6, color: INK, whiteSpace: "pre" }}>{block.code}</code>
      </pre>
    </GlassCard>
  );
}

// --- actions: botones que disparan acciones ejecutables (Fase 3a) ---
function ActionsBlock({ block }) {
  const runAction = React.useContext(ActionCtx);
  const [st, setSt] = useState({});   // idx -> 'idle'|'confirm'|'running'|'done'|'error'
  const [res, setRes] = useState({}); // idx -> mensaje
  const items = block.items || [];
  const fire = async (i, item) => {
    setSt((s) => ({ ...s, [i]: "running" }));
    const r = await runAction(item.actionId, item.params || {});
    setSt((s) => ({ ...s, [i]: r && r.success ? "done" : "error" }));
    setRes((x) => ({ ...x, [i]: (r && r.message) || (r && r.success ? "Listo" : "No se pudo") }));
  };
  const click = (i, item) => {
    const s = st[i] || "idle";
    if (s === "running" || s === "done") return;
    if (item.confirm && s !== "confirm") { setSt((x) => ({ ...x, [i]: "confirm" })); return; }
    fire(i, item);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((item, i) => {
        const s = st[i] || "idle";
        const danger = item.style === "danger";
        const done = s === "done", error = s === "error", running = s === "running", confirming = s === "confirm";
        const base = {
          fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 13.5, borderRadius: 12,
          padding: "11px 18px", cursor: running || done ? "default" : "pointer", border: "none",
          transition: "all 0.2s ease", display: "flex", alignItems: "center", gap: 8, opacity: running ? 0.7 : 1,
        };
        const style = done
          ? { ...base, background: "rgba(127,214,164,0.15)", color: GREEN, border: `1px solid ${GREEN}` }
          : error
          ? { ...base, background: "rgba(232,139,139,0.12)", color: RED, border: `1px solid ${RED}` }
          : danger
          ? { ...base, background: "rgba(232,139,139,0.12)", color: RED, border: "1px solid rgba(232,139,139,0.5)" }
          : { ...base, background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`, color: NAVY_DEEP, boxShadow: "0 4px 14px rgba(201,162,74,0.3)" };
        return (
          <div key={i}>
            {confirming ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontFamily: "Inter", fontSize: 13, color: AMBER }}>{item.confirm || "¿Confirmar?"}</span>
                <button className="xen-send" style={{ ...base, background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`, color: NAVY_DEEP, padding: "8px 14px" }} onClick={() => fire(i, item)}>Sí, ejecutar</button>
                <button style={{ ...base, background: "transparent", color: MUTED, border: "1px solid rgba(159,176,198,0.35)", padding: "8px 14px" }} onClick={() => setSt((x) => ({ ...x, [i]: "idle" }))}>Cancelar</button>
              </div>
            ) : (
              <button className={done || running ? "" : "xen-send"} style={style} onClick={() => click(i, item)} disabled={running || done}>
                {done ? "✓ " : error ? "✕ " : running ? "◌ " : danger ? "▲ " : "→ "}
                {running ? "Ejecutando…" : item.label}
              </button>
            )}
            {(done || error) && res[i] && (
              <div style={{ fontFamily: "Inter", fontSize: 12, color: done ? GREEN : RED, marginTop: 5, paddingLeft: 4 }}>{res[i]}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// --- presentation: deck liquid glass generado (Fase 5) ---
function PresentationBlock({ block }) {
  const [busy, setBusy] = useState(false);
  const download = async () => {
    setBusy(true);
    try {
      const r = await fetch(block.downloadUrl || block.url);
      const html = await r.text();
      const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
      const a = document.createElement("a"); a.href = url; a.download = (slug(block.title) || "presentacion") + ".html";
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) { window.open(block.downloadUrl || block.url, "_blank"); }
    setBusy(false);
  };
  const btn = { fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 13, borderRadius: 12, padding: "10px 18px", cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 7 };
  return (
    <GlassCard>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <div style={{
          width: 84, height: 58, borderRadius: 12, flexShrink: 0, position: "relative", overflow: "hidden",
          background: `linear-gradient(150deg, ${NAVY} 0%, ${NAVY_DEEP} 100%)`, border: "1px solid rgba(201,162,74,0.35)",
          boxShadow: "inset 0 6px 10px -8px rgba(255,240,205,0.5)",
        }}>
          <div style={{ position: "absolute", width: 40, height: 40, borderRadius: "50%", top: -12, left: -10, background: "radial-gradient(circle,rgba(201,162,74,0.6),transparent 70%)", filter: "blur(6px)" }} />
          <div style={{ position: "absolute", left: 12, top: 16, width: 44, height: 5, borderRadius: 3, background: `linear-gradient(90deg,${GOLD_LIGHT},${GOLD})` }} />
          <div style={{ position: "absolute", left: 12, top: 27, width: 30, height: 4, borderRadius: 3, background: "rgba(255,255,255,0.25)" }} />
          <div style={{ position: "absolute", left: 12, top: 35, width: 36, height: 4, borderRadius: 3, background: "rgba(255,255,255,0.18)" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: GOLD_LIGHT }}>Presentación</div>
          <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 700, color: INK, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{block.title || "Deck"}</div>
          <div style={{ fontFamily: "Inter", fontSize: 12, color: MUTED, marginTop: 2 }}>{block.slideCount ? block.slideCount + " slides · " : ""}liquid glass</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <a href={block.url} target="_blank" rel="noreferrer" className="xen-send" style={{ ...btn, color: NAVY_DEEP, background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`, boxShadow: "0 4px 14px rgba(201,162,74,0.3)" }}>Ver presentación ↗</a>
        <button onClick={download} disabled={busy} className="xen-export" style={{ ...btn, color: GOLD_LIGHT, background: "rgba(201,162,74,0.1)", border: "1px solid rgba(201,162,74,0.4)" }}>{busy ? "Descargando…" : "Descargar HTML"}</button>
      </div>
    </GlassCard>
  );
}

function ButtonsBlock({ block }) {
  const drill = React.useContext(SendCtx);
  const opts = (block.options || block.buttons || block.choices || [])
    .map((o) => (typeof o === "string" ? { label: o } : o))
    .filter((o) => o && (o.label || o.value));
  if (!opts.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {opts.map((o, i) => (
        <button
          key={i}
          className="xen-chip"
          onClick={() => drill(o.value || o.label)}
          style={{
            fontFamily: "Inter", fontSize: 13, fontWeight: 500, color: GOLD_LIGHT,
            background: "rgba(201,162,74,0.08)", border: "1px solid rgba(201,162,74,0.35)",
            borderRadius: 999, padding: "8px 15px", cursor: "pointer",
          }}
        >
          {o.label || o.value}
        </button>
      ))}
    </div>
  );
}

function BlockRenderer({ blocks, onToggle, animate }) {
  const renderOne = (b) => {
    switch (b.type) {
      case "text": return <TypeText text={b.content} animate={animate} style={{ fontFamily: "Inter", fontSize: 14.5, lineHeight: 1.65, color: INK, margin: 0 }} />;
      case "actions": return <ActionsBlock block={b} />;
      case "buttons": case "options": case "choices": return <ButtonsBlock block={b} />;
      case "presentation": return <PresentationBlock block={b} />;
      case "kpis": return <KpiBlock block={b} />;
      case "chart": return <ChartBlock block={b} />;
      case "table": return <TableBlock block={b} />;
      case "list": return <ListBlock block={b} />;
      case "checklist": return <ChecklistBlock block={b} onToggle={onToggle} />;
      case "accordion": return <AccordionBlock block={b} onToggle={onToggle} />;
      case "progress": return <ProgressBlock block={b} />;
      case "callout": return <CalloutBlock block={b} />;
      case "diagram": return <DiagramBlock block={b} />;
      case "svg": return <SvgBlock block={b} />;
      case "gauge": return <GaugeBlock block={b} />;
      case "timeline": return <TimelineBlock block={b} />;
      case "heatmap": return <HeatmapBlock block={b} />;
      case "image": return <ImageBlock block={b} />;
      case "code": return <CodeBlock block={b} />;
      default: return null;
    }
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {blocks.map((b, i) => {
        const el = renderOne(b);
        if (el == null) return null;
        return (
          <div key={i} className={animate ? "xen-block" : undefined} style={animate ? { animationDelay: `${Math.min(i * 0.09, 0.7)}s` } : undefined}>
            {el}
          </div>
        );
      })}
    </div>
  );
}

// ---------- Chat ----------
function ThinkingDots({ label }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "4px 2px" }}>
      {[0, 1, 2].map((i) => (<span key={i} className="xen-dot" style={{ animationDelay: `${i * 0.18}s` }} />))}
      <span style={{ fontFamily: "Inter", fontSize: 12.5, color: MUTED, marginLeft: 8 }}>{label || "Xenilum consultando el CRM…"}</span>
    </div>
  );
}
// --- Isotipo Prisma (spec canónica: dos chevrones, gradientes oro) ---
const PRISMA_TOP = "M22 20 L50 44 L78 20 L78 34 L50 58 L22 34 Z";
const PRISMA_BOT = "M22 80 L50 56 L78 80 L78 66 L50 42 L22 66 Z";
// motion: "think" (convergen) | "idle" (barrido dorado) | "notify" (deslizan) | undefined
function XenilumLogo({ size = 40, variant = "principal", motion }) {
  const uid = React.useId().replace(/[:]/g, "");
  const top = "xt-" + uid, bot = "xb-" + uid, sheen = "xs-" + uid;
  const think = motion === "think", notify = motion === "notify", idle = motion === "idle";
  const tc = think ? "xen-think-top" : notify ? "xen-rep-top" : undefined;
  const bc = think ? "xen-think-bot" : notify ? "xen-rep-bot" : undefined;
  if (variant === "mono") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" aria-label="Xenilum" style={{ overflow: "visible" }}>
        <path className={tc} d={PRISMA_TOP} fill="#EAF0F8" />
        <path className={bc} d={PRISMA_BOT} fill="#EAF0F8" opacity={0.6} />
      </svg>
    );
  }
  if (idle) {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" aria-label="Xenilum" style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id={sheen} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#C9A24A" /><stop offset="0.4" stopColor="#DDB255" /><stop offset="0.5" stopColor="#FFF3D6" /><stop offset="0.6" stopColor="#DDB255" /><stop offset="1" stopColor="#8A6D2E" />
            <animateTransform attributeName="gradientTransform" type="translate" from="-1 0" to="1 0" dur="3.4s" repeatCount="indefinite" />
          </linearGradient>
        </defs>
        <path d={PRISMA_TOP} fill={`url(#${sheen})`} />
        <path d={PRISMA_BOT} fill={`url(#${sheen})`} opacity={0.92} />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-label="Xenilum" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={top} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F5E3B3" /><stop offset="0.5" stopColor="#E4B95B" /><stop offset="1" stopColor="#C9A24A" />
        </linearGradient>
        <linearGradient id={bot} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C9A24A" /><stop offset="1" stopColor="#8A6D2E" />
        </linearGradient>
      </defs>
      {variant === "outline" ? (
        <>
          <path className={tc} d={PRISMA_TOP} fill="none" stroke={`url(#${top})`} strokeWidth={2.5} strokeLinejoin="round" />
          <path className={bc} d={PRISMA_BOT} fill="none" stroke={`url(#${bot})`} strokeWidth={2.5} strokeLinejoin="round" />
        </>
      ) : (
        <>
          <path className={tc} d={PRISMA_TOP} fill={`url(#${top})`} />
          <path className={bc} d={PRISMA_BOT} fill={`url(#${bot})`} opacity={0.92} />
        </>
      )}
    </svg>
  );
}

function XenAvatar({ size = 34, motion }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: Math.round(size * 0.32), flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(160deg, #123158, #04101F)",
      border: "1px solid rgba(201,162,74,0.4)",
      boxShadow: "0 0 0 2px rgba(201,162,74,0.1), 0 4px 12px rgba(0,0,0,0.4)",
    }}>
      <XenilumLogo size={Math.round(size * 0.58)} motion={motion} />
    </div>
  );
}

// Splash de apertura (#18 Ensamble + #11 escalonado)
function Splash() {
  return (
    <div className="splash-overlay" style={{ position: "fixed", inset: 0, zIndex: 100, background: `linear-gradient(160deg, ${NAVY} 0%, ${NAVY_DEEP} 78%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
      <svg width={132} height={132} viewBox="0 0 100 100" style={{ overflow: "visible" }} aria-label="Xenilum">
        <defs>
          <linearGradient id="spl-t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F5E3B3" /><stop offset="0.5" stopColor="#E4B95B" /><stop offset="1" stopColor="#C9A24A" /></linearGradient>
          <linearGradient id="spl-b" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#C9A24A" /><stop offset="1" stopColor="#8A6D2E" /></linearGradient>
        </defs>
        <path className="spl-top" d={PRISMA_TOP} fill="url(#spl-t)" />
        <path className="spl-bot" d={PRISMA_BOT} fill="url(#spl-b)" opacity={0.92} />
      </svg>
      <div className="spl-word" style={{
        fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 26, letterSpacing: "0.26em", paddingLeft: "0.26em",
        background: `linear-gradient(90deg, ${GOLD} 0%, #F5E3B3 25%, ${GOLD_LIGHT} 50%, ${GOLD} 75%, #F5E3B3 100%)`,
        backgroundSize: "200% auto", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", animation: "xenShimmer 6s linear infinite",
      }}>XENILUM</div>
      <div className="spl-tag" style={{ fontFamily: "Inter", fontSize: 11, letterSpacing: "0.3em", color: MUTED, textTransform: "uppercase" }}>Consola de Inteligencia</div>
    </div>
  );
}

export default function XenilumChat() {
  const [messages, setMessages] = useState([
    { role: "assistant", blocks: [{ type: "text", content: "Hola. Estoy conectado al CRM en vivo. Pregúntame por proyectos, tareas, bloques, avances o equipo — o dime «registra un avance en …»." }] },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [presented, setPresented] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 760);
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window === "undefined" || window.innerWidth >= 760);
  const [reportCount, setReportCount] = useState(0);
  const [showSplash, setShowSplash] = useState(true);
  const [recording, setRecording] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);
  const baseInputRef = useRef("");
  const [atBottom, setAtBottom] = useState(true);
  const [hasNew, setHasNew] = useState(false);
  const [flashKey, setFlashKey] = useState(0);
  const prevLenRef = useRef(1);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setPresented(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 760);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  useEffect(() => {
    const el = scrollRef.current; if (!el) return;
    const last = messages[messages.length - 1];
    const grew = messages.length > prevLenRef.current;
    prevLenRef.current = messages.length;
    if ((last && last.role === "user") || atBottom) {
      el.scrollTop = el.scrollHeight;
      setHasNew(false);
    } else if (grew && last && last.role === "assistant") {
      setHasNew(true);
    }
    if (grew && last && last.role === "assistant") setFlashKey((k) => k + 1);
  }, [messages]);
  useEffect(() => {
    const el = scrollRef.current;
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 200) el.scrollTop = el.scrollHeight;
  }, [thinking]);
  const onScroll = () => {
    const el = scrollRef.current; if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setAtBottom(near);
    if (near) setHasNew(false);
  };
  const jumpToBottom = () => {
    const el = scrollRef.current; if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setHasNew(false);
  };

  const loadConversations = async () => {
    try {
      const res = await fetch(`${API_BASE}/xenilum/conversations?user=${encodeURIComponent(getUserEmail())}`, { headers: authHeaders() });
      const data = await res.json();
      if (data && data.conversations) setConversations(data.conversations);
    } catch (e) { /* offline */ }
  };
  const openConversation = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/xenilum/messages?conversationId=${id}`, { headers: authHeaders() });
      const data = await res.json();
      const msgs = (data.messages || []).map((m) => m.role === "user"
        ? { role: "user", text: (m.blocks && m.blocks[0] && m.blocks[0].content) || "" }
        : { role: "assistant", blocks: m.blocks || [] });
      setMessages(msgs.length ? msgs : [{ role: "assistant", blocks: [{ type: "text", content: "(conversación vacía)" }] }]);
      setConversationId(Number(id));
      if (window.innerWidth < 760) setSidebarOpen(false);
    } catch (e) { /* ignore */ }
  };
  const newConversation = () => {
    setConversationId(null);
    setMessages([{ role: "assistant", blocks: [{ type: "text", content: "Nueva conversación. ¿En qué te ayudo? Proyectos, tareas, bloques, avances o equipo." }] }]);
    if (window.innerWidth < 760) setSidebarOpen(false);
  };
  const markReportRead = async (id) => {
    try { await fetch(`${API_BASE}/xenilum/report-read`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ reportId: id }) }); } catch (e) {}
    setReportCount((c) => Math.max(0, c - 1));
    setMessages((m) => m.map((x) => (x.report && x.report.id === id ? { ...x, report: { ...x.report, read: true } } : x)));
  };
  useEffect(() => {
    loadConversations();
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/xenilum/reports?unread=true`, { headers: authHeaders() });
        const data = await res.json();
        const reps = (data && data.reports) || [];
        if (reps.length) {
          setMessages((prev) => [...reps.map((r) => ({ role: "assistant", blocks: r.blocks || [], report: { id: r.id, titulo: r.titulo } })), ...prev]);
          setReportCount(reps.length);
        }
      } catch (e) {}
    })();
  }, []);

  const toggleTask = async (taskId, done) => {
    try {
      await fetch(`${API_BASE}/xenilum/task-toggle`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ taskId, done }) });
    } catch (e) { /* la UI ya reflejó el cambio optimista */ }
  };

  const runAction = async (actionId, params) => {
    try {
      const res = await fetch(`${API_BASE}/xenilum/action`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ actionId, params, userId: getUserEmail() }) });
      const data = await res.json();
      if (data.url) {
        setMessages((m) => [...m, { role: "assistant", blocks: [
          { type: "text", content: data.message || "Tu presentación está lista." },
          { type: "presentation", title: data.deckTitle || "Presentación", url: data.url, downloadUrl: data.downloadUrl || data.url, slideCount: data.slideCount },
        ] }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", blocks: [{ type: "callout", variant: data.success ? "success" : "warning", content: data.message || (data.success ? "Acción realizada." : "No se pudo realizar la acción.") }] }]);
      }
      return data;
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", blocks: [{ type: "callout", variant: "warning", content: "No pude ejecutar la acción (error de conexión con n8n)." }] }]);
      return { success: false };
    }
  };

  // Reconocimiento de voz en vivo del navegador (Chrome/Edge/Android). Si no existe → fallback Whisper.
  const SpeechRec = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

  // Fallback: sube el audio, transcribe y RELLENA el input (no envía). El usuario revisa y manda.
  const transcribeToInput = async (base64, format) => {
    setTranscribing(true);
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 45000);
    try {
      const res = await fetch(`${API_BASE}/xenilum/chat`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ type: "audio", data: base64, format, transcribeOnly: true, userId: getUserEmail(), conversationId }), signal: ctrl.signal });
      const data = await res.json();
      const t = (data.transcription || "").trim();
      if (t) setInput((prev) => (prev ? prev.replace(/\s+$/, "") + " " : "") + t);
    } catch (e) { /* silencioso */ } finally { clearTimeout(to); setTranscribing(false); }
  };

  const startWhisperRecording = async () => {
    if (thinking) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => { const b64 = String(reader.result).split(",")[1]; if (b64) transcribeToInput(b64, "webm"); };
        reader.readAsDataURL(blob);
        setRecording(false);
      };
      recorderRef.current = rec; rec.start(); setRecording(true);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", blocks: [{ type: "callout", variant: "warning", content: "No pude acceder al micrófono. Revisa los permisos del navegador." }] }]);
    }
  };

  const toggleMic = () => {
    // Dictado en vivo (preferido): escribe en el input mientras hablas; revisas/editas y TÚ envías.
    if (SpeechRec) {
      if (listening) { try { recognitionRef.current && recognitionRef.current.stop(); } catch (e) {} return; }
      if (thinking) return;
      try {
        const rec = new SpeechRec();
        rec.lang = "es-MX";
        rec.continuous = true;
        rec.interimResults = true;
        baseInputRef.current = input ? input.replace(/\s+$/, "") + " " : "";
        rec.onresult = (ev) => {
          let finalT = "", interim = "";
          for (let i = 0; i < ev.results.length; i++) {
            const r = ev.results[i];
            if (r.isFinal) finalT += r[0].transcript;
            else interim += r[0].transcript;
          }
          setInput(baseInputRef.current + finalT + interim);
        };
        rec.onerror = () => setListening(false);
        rec.onend = () => { setListening(false); recognitionRef.current = null; };
        recognitionRef.current = rec;
        rec.start();
        setListening(true);
      } catch (e) { setListening(false); startWhisperRecording(); }
      return;
    }
    // Fallback (navegadores sin Web Speech): grabar → transcribir → rellenar input.
    if (recording) { try { recorderRef.current && recorderRef.current.stop(); } catch (e) {} return; }
    startWhisperRecording();
  };

  const send = async (text) => {
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch (e) {} recognitionRef.current = null; setListening(false); }
    const msg = (text ?? input).trim();
    if (!msg || thinking) return;
    if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) {} }
    if (msg === "✦ Bloques nuevos (demo)") {
      setMessages((m) => [...m, { role: "user", text: "Muéstrame los bloques nuevos" }, { role: "assistant", blocks: DEMO_FASE2 }]);
      return;
    }
    setInput("");
    setMessages((m) => [...m, { role: "user", text: msg }]);
    setThinking(true);
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 30000);
    try {
      const res = await fetch(`${API_BASE}/xenilum/chat`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ message: msg, userId: getUserEmail(), conversationId }), signal: ctrl.signal,
      });
      const data = await res.json();
      if (data.conversationId) setConversationId(data.conversationId);
      setMessages((m) => [...m, { role: "assistant", blocks: (data.blocks && data.blocks.length) ? data.blocks : [{ type: "text", content: "Respuesta vacía del servidor." }] }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", blocks: [{ type: "callout", variant: "warning", content: e.name === "AbortError" ? "La consulta tardó demasiado (timeout 30s). Reintenta." : "No pude conectar con el webhook de n8n. Revisa que el workflow esté activo." }] }]);
    } finally { clearTimeout(to); setThinking(false); loadConversations(); }
  };

  return (
    <PresentCtx.Provider value={setPresented}>
    <ActionCtx.Provider value={runAction}>
    <SendCtx.Provider value={send}>
    <div style={{ position: "fixed", inset: 0, background: `linear-gradient(160deg, ${NAVY} 0%, ${NAVY_DEEP} 70%)`, overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        .xen-orb { position: absolute; border-radius: 50%; filter: blur(70px); opacity: 0.5; pointer-events: none; }
        .xen-beam { position: absolute; pointer-events: none; filter: blur(42px); mix-blend-mode: screen; }
        @keyframes xenBeamA { 0%,100% { transform: translateX(-4%) rotate(18deg); opacity: .45; } 50% { transform: translateX(4%) rotate(21deg); opacity: .8; } }
        @keyframes xenBeamB { 0%,100% { transform: translateX(3%) rotate(-13deg); opacity: .38; } 50% { transform: translateX(-4%) rotate(-16deg); opacity: .68; } }
        @keyframes xenBeamC { 0%,100% { opacity: .32; } 50% { opacity: .58; } }
        @keyframes xenFloat1 { 0%,100% { transform: translate(0,0);} 50% { transform: translate(60px,-40px);} }
        @keyframes xenFloat2 { 0%,100% { transform: translate(0,0);} 50% { transform: translate(-50px,50px);} }
        @keyframes xenFloat3 { 0%,100% { transform: translate(0,0);} 50% { transform: translate(30px,60px);} }
        @keyframes xenShimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes xenPulse { 0%,80%,100% { opacity: 0.25; transform: scale(0.85);} 40% { opacity: 1; transform: scale(1);} }
        @keyframes xenRise { from { opacity: 0; transform: translateY(14px);} to { opacity: 1; transform: translateY(0);} }
        .xen-dot { width: 7px; height: 7px; border-radius: 50%; background: ${GOLD_LIGHT}; display:inline-block; animation: xenPulse 1.2s ease-in-out infinite; }
        .xen-msg { animation: xenRise 0.45s cubic-bezier(0.22,1,0.36,1) both; }
        @keyframes xenInRight { from { opacity: 0; transform: translateX(26px) translateY(6px) scale(0.96); } 55% { opacity: 1; } to { opacity: 1; transform: none; } }
        @keyframes xenInLeft { from { opacity: 0; transform: translateX(-18px) translateY(8px); } to { opacity: 1; transform: none; } }
        .xen-msg-user { animation: xenInRight 0.44s cubic-bezier(0.34,1.42,0.5,1) both; }
        .xen-msg-bot { animation: xenInLeft 0.5s cubic-bezier(0.22,1,0.36,1) both; }
        @keyframes xenBlockIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .xen-block { animation: xenBlockIn 0.5s cubic-bezier(0.22,1,0.36,1) both; }
        .xen-caret { color: ${GOLD_LIGHT}; margin-left: 1px; animation: xenBlink 0.9s step-end infinite; }
        @keyframes xenBlink { 50% { opacity: 0; } }
        .xen-flash { position: absolute; top: 64px; left: 0; right: 0; height: 120px; pointer-events: none; z-index: 6; background: radial-gradient(60% 100% at 50% 0%, rgba(228,185,91,0.30), transparent 72%); animation: xenFlashK 0.95s ease-out forwards; }
        @keyframes xenFlashK { 0% { opacity: 0; } 22% { opacity: 1; } 100% { opacity: 0; } }
        .xen-jump { transition: all 0.2s ease; }
        .xen-jump:hover { transform: translateX(-50%) translateY(-2px) !important; box-shadow: 0 8px 24px rgba(0,0,0,0.5) !important; }
        .xen-jump-new { animation: xenJumpPulse 1.4s ease-in-out infinite; }
        @keyframes xenJumpPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(228,185,91,0.5); } 50% { box-shadow: 0 0 0 9px rgba(228,185,91,0); } }
        .xen-row:hover td { background: rgba(201,162,74,0.05); }
        .xen-check:hover { background: rgba(201,162,74,0.06) !important; }
        .xen-export { transition: all 0.2s ease; }
        .xen-export:hover { background: rgba(201,162,74,0.18) !important; border-color: rgba(228,185,91,0.7) !important; transform: translateY(-1px); }
        .xen-chip { transition: all 0.25s ease; cursor: pointer; }
        .xen-chip:hover { border-color: rgba(228,185,91,0.7) !important; background: rgba(201,162,74,0.12) !important; transform: translateY(-1px); }
        .xen-send { transition: all 0.2s ease; }
        .xen-send:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(201,162,74,0.45) !important; }
        .xen-send:active { transform: scale(0.94); }
        .xen-chip:active { transform: scale(0.97); }
        @keyframes xenMic { 0%,100% { box-shadow: 0 0 0 0 rgba(232,139,139,0.55); } 50% { box-shadow: 0 0 0 7px rgba(232,139,139,0); } }
        .xen-mic-rec { animation: xenMic 1.1s ease-in-out infinite; }
        .xen-input:focus { outline: none; border-color: rgba(228,185,91,0.6) !important; }
        /* Scrollbars doradas en TODA la app (vertical y horizontal) */
        * { scrollbar-color: rgba(201,162,74,0.5) transparent; scrollbar-width: thin; }
        ::-webkit-scrollbar { width: 9px; height: 9px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); border-radius: 8px; }
        ::-webkit-scrollbar-thumb { background: linear-gradient(180deg, ${GOLD_LIGHT}, ${GOLD} 55%, #8A6D2F); border-radius: 8px; border: 2px solid transparent; background-clip: padding-box; }
        ::-webkit-scrollbar-thumb:hover { background: ${GOLD_LIGHT}; }
        ::-webkit-scrollbar-corner { background: transparent; }
        .xen-think-top { animation: xenTop 1.8s ease-in-out infinite; transform-box: fill-box; }
        .xen-think-bot { animation: xenBot 1.8s ease-in-out infinite; transform-box: fill-box; }
        @keyframes xenTop { 0%,100% { transform: translateY(0); } 50% { transform: translateY(5px); } }
        @keyframes xenBot { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        .xen-rep-top { animation: xenRepT 1.4s ease-in-out 4; transform-box: fill-box; }
        .xen-rep-bot { animation: xenRepB 1.4s ease-in-out 4; transform-box: fill-box; }
        @keyframes xenRepT { 0%,100% { transform: translateX(0); } 50% { transform: translateX(6px); } }
        @keyframes xenRepB { 0%,100% { transform: translateX(0); } 50% { transform: translateX(-6px); } }
        .splash-overlay { animation: splOut 2s forwards; }
        @keyframes splOut { 0%,74% { opacity: 1; } 100% { opacity: 0; } }
        .spl-top { animation: splTop 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.15s both; transform-box: fill-box; }
        .spl-bot { animation: splBot 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.15s both; transform-box: fill-box; }
        @keyframes splTop { from { transform: translateY(-40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes splBot { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .spl-word { animation: splUp 0.6s ease 0.55s both; } .spl-tag { animation: splUp 0.6s ease 0.8s both; }
        @keyframes splUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .xen-orb, .xen-beam, .xen-msg, .xen-msg-user, .xen-msg-bot, .xen-block, .xen-caret, .xen-flash, .xen-jump-new, .xen-dot, .xen-think-top, .xen-think-bot, .xen-rep-top, .xen-rep-bot, .spl-top, .spl-bot, .spl-word, .spl-tag, .splash-overlay { animation: none !important; } }
      `}</style>

      <AmbientBackground />

      <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex" }}>
        {/* Sidebar de conversaciones — en móvil es un drawer que flota sobre el chat */}
        <aside style={{
          ...(isMobile
            ? { position: "absolute", top: 0, bottom: 0, left: 0, width: 284, zIndex: 45,
                transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
                transition: "transform 0.28s cubic-bezier(0.22,1,0.36,1)",
                borderRight: "1px solid rgba(201,162,74,0.16)",
                boxShadow: sidebarOpen ? "0 0 50px rgba(0,0,0,0.55)" : "none",
                background: "rgba(6,16,30,0.97)" }
            : { width: sidebarOpen ? 264 : 0, flexShrink: 0,
                transition: "width 0.28s cubic-bezier(0.22,1,0.36,1)",
                borderRight: sidebarOpen ? "1px solid rgba(201,162,74,0.16)" : "none",
                background: "rgba(4,16,31,0.35)" }),
          overflow: "hidden", display: "flex", flexDirection: "column",
          backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
        }}>
          <div style={{ padding: "16px 14px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED }}>Conversaciones</span>
            <button className="xen-send" onClick={newConversation} title="Nueva conversación" style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 12.5, color: NAVY_DEEP, background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`, border: "none", borderRadius: 9, padding: "5px 11px", cursor: "pointer", whiteSpace: "nowrap" }}>+ Nueva</button>
          </div>
          <div className="xen-scroll" style={{ flex: 1, overflowY: "auto", padding: "4px 10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
            {conversations.length === 0 && <div style={{ fontFamily: "Inter", fontSize: 12, color: "rgba(159,176,198,0.5)", padding: "8px 6px", lineHeight: 1.5 }}>Aún no hay conversaciones. Escribe algo para empezar.</div>}
            {conversations.map((c) => {
              const active = Number(c.id) === Number(conversationId);
              return (
                <button key={c.id} onClick={() => openConversation(c.id)} className="xen-chip" style={{
                  textAlign: "left", width: "100%", cursor: "pointer", borderRadius: 12, padding: "9px 11px",
                  background: active ? "rgba(201,162,74,0.14)" : "rgba(255,255,255,0.03)",
                  border: active ? "1px solid rgba(228,185,91,0.55)" : "1px solid rgba(201,162,74,0.16)",
                }}>
                  <div style={{ fontFamily: "Inter", fontSize: 12.5, fontWeight: 600, color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.titulo || "Conversación"}</div>
                  <div style={{ fontFamily: "Inter", fontSize: 11, color: MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>{c.last_message || ""}</div>
                </button>
              );
            })}
          </div>
        </aside>
        {isMobile && sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)} style={{ position: "absolute", inset: 0, zIndex: 40, background: "rgba(2,6,14,0.5)" }} />
        )}
        {/* Columna principal */}
        <div style={{ position: "relative", flex: 1, minWidth: 0, height: "100%", display: "flex", flexDirection: "column", maxWidth: 860, margin: "0 auto", padding: isMobile ? "0 12px" : "0 16px" }}>
        <header style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12, padding: isMobile ? "14px 2px 12px" : "18px 4px 14px", borderBottom: "1px solid rgba(201,162,74,0.18)" }}>
          <button onClick={() => setSidebarOpen((v) => !v)} title="Mostrar/ocultar conversaciones" className="xen-export" style={{ fontSize: 17, lineHeight: 1, color: GOLD_LIGHT, background: "rgba(201,162,74,0.1)", border: "1px solid rgba(201,162,74,0.35)", borderRadius: 9, padding: "7px 10px", cursor: "pointer", flexShrink: 0 }}>☰</button>
          <XenAvatar size={isMobile ? 36 : 46} motion="idle" />
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: isMobile ? 17 : 20, lineHeight: 1.1,
              background: `linear-gradient(90deg, ${GOLD} 0%, #F5E3B3 25%, ${GOLD_LIGHT} 50%, ${GOLD} 75%, #F5E3B3 100%)`,
              backgroundSize: "200% auto", WebkitBackgroundClip: "text", backgroundClip: "text",
              WebkitTextFillColor: "transparent", animation: "xenShimmer 6s linear infinite",
            }}>XENILUM</div>
            {!isMobile && <div style={{ fontFamily: "Inter", fontSize: 11.5, color: MUTED, letterSpacing: "0.08em", textTransform: "uppercase" }}>Consola de inteligencia · Autónoma System</div>}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: isMobile ? 8 : 12 }}>
            {reportCount > 0 && (
              <span title={`${reportCount} reporte(s) nuevo(s)`} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "'Sora', sans-serif", fontSize: 12, fontWeight: 700, color: NAVY_DEEP, background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`, borderRadius: 999, padding: "3px 10px", boxShadow: "0 2px 10px rgba(201,162,74,0.4)" }}>📊 {reportCount}</span>
            )}
            <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: GREEN, boxShadow: "0 0 8px rgba(127,214,164,0.8)" }} />
              {!isMobile && <span style={{ fontFamily: "Inter", fontSize: 12, color: MUTED }}>Conectado</span>}
            </span>
            <button onClick={() => signOut()} title="Cerrar sesión" className="xen-export" style={{ fontFamily: "Inter", fontSize: 12, color: MUTED, background: "rgba(201,162,74,0.08)", border: "1px solid rgba(201,162,74,0.28)", borderRadius: 9, padding: "6px 10px", cursor: "pointer", flexShrink: 0 }}>Salir</button>
          </div>
        </header>

        {flashKey > 0 && <div key={flashKey} className="xen-flash" />}

        <div ref={scrollRef} onScroll={onScroll} className="xen-scroll" style={{ flex: 1, overflowY: "auto", padding: "22px 4px", display: "flex", flexDirection: "column", gap: 20 }}>
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="xen-msg xen-msg-user" style={{ alignSelf: "flex-end", maxWidth: "82%" }}>
                <div style={{
                  fontFamily: "Inter", fontSize: 14.5, lineHeight: 1.55, color: NAVY_DEEP,
                  background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`, padding: "11px 16px",
                  borderRadius: "16px 16px 4px 16px", fontWeight: 500, boxShadow: "0 4px 16px rgba(201,162,74,0.3)",
                }}>{m.text}</div>
              </div>
            ) : (
              <div key={i} className="xen-msg xen-msg-bot" style={{ display: "flex", gap: 12, maxWidth: "100%" }}>
                <XenAvatar size={38} motion={m.report ? "notify" : undefined} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  {m.report && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10, padding: "8px 12px", borderRadius: 12, background: "rgba(201,162,74,0.1)", border: "1px solid rgba(201,162,74,0.3)" }}>
                      <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 12.5, fontWeight: 700, color: GOLD_LIGHT, letterSpacing: "0.03em" }}>📊 {m.report.titulo}</span>
                      {m.report.read
                        ? <span style={{ fontFamily: "Inter", fontSize: 11.5, color: GREEN, fontWeight: 600 }}>✓ leído</span>
                        : <button onClick={() => markReportRead(m.report.id)} className="xen-export" style={{ fontFamily: "Inter", fontSize: 11, fontWeight: 600, color: GOLD_LIGHT, background: "rgba(201,162,74,0.08)", border: "1px solid rgba(201,162,74,0.35)", borderRadius: 8, padding: "4px 10px", cursor: "pointer", whiteSpace: "nowrap" }}>marcar leído</button>}
                    </div>
                  )}
                  <BlockRenderer blocks={m.blocks} onToggle={toggleTask} animate={i === messages.length - 1} />
                </div>
              </div>
            )
          )}
          {thinking && (
            <div className="xen-msg" style={{ display: "flex", gap: 12 }}>
              <XenAvatar size={38} motion="think" /><GlassCard style={{ padding: "12px 16px" }}><ThinkingDots label={transcribing ? "Transcribiendo tu audio…" : undefined} /></GlassCard>
            </div>
          )}
        </div>

        {!atBottom && (
          <button onClick={jumpToBottom} title="Ir al último mensaje" className={hasNew ? "xen-jump xen-jump-new" : "xen-jump"} style={{
            position: "absolute", bottom: 104, left: "50%", transform: "translateX(-50%)", zIndex: 8,
            width: 42, height: 42, borderRadius: "50%", border: "1px solid rgba(201,162,74,0.5)",
            background: "rgba(10,20,36,0.92)", color: GOLD_LIGHT, fontSize: 18, lineHeight: 1, cursor: "pointer",
            boxShadow: "0 6px 20px rgba(0,0,0,0.45)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
          }}>↓</button>
        )}

        {messages.length <= 1 && !thinking && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", paddingBottom: 12 }}>
            {SUGGESTIONS.filter((s) => !s.dir || getUserRole() !== "equipo").map((s) => (
              <button key={s.key} className="xen-chip" onClick={() => send(s.label)} style={{
                fontFamily: "Inter", fontSize: 13, color: GOLD_LIGHT, fontWeight: 500,
                background: "rgba(201,162,74,0.07)", border: "1px solid rgba(201,162,74,0.3)",
                borderRadius: 999, padding: "9px 16px", backdropFilter: "blur(10px)",
              }}>{s.label}</button>
            ))}
          </div>
        )}

        <div style={{ paddingBottom: 20 }}>
          <div style={{
            display: "flex", gap: isMobile ? 7 : 10, alignItems: "center", background: "rgba(255,255,255,0.05)",
            border: `1px solid ${listening ? "rgba(232,139,139,0.55)" : "rgba(201,162,74,0.28)"}`, borderRadius: 18,
            padding: isMobile ? "7px 7px 7px 14px" : "8px 8px 8px 18px",
            backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            transition: "border-color 0.2s ease",
          }}>
            <input className="xen-input" value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={listening ? "Escuchando… habla 🎙️" : (transcribing ? "Transcribiendo…" : "Pregúntale a Xenilum…")}
              style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", fontFamily: "Inter", fontSize: 14.5, color: INK, padding: "8px 0" }} />
            <button className={(listening || recording) ? "xen-mic-rec" : "xen-send"} onClick={toggleMic} disabled={thinking && !(listening || recording)}
              title={(listening || recording) ? "Detener dictado" : (SpeechRec ? "Dictar por voz" : "Grabar voz")} style={{
                fontFamily: "Inter", fontWeight: 700, fontSize: 15, lineHeight: 1, flexShrink: 0,
                color: (listening || recording) ? "#fff" : GOLD_LIGHT, background: (listening || recording) ? RED : "rgba(201,162,74,0.12)",
                border: (listening || recording) ? "none" : "1px solid rgba(201,162,74,0.4)", borderRadius: 12,
                padding: isMobile ? "9px 11px" : "10px 13px", cursor: thinking && !(listening || recording) ? "default" : "pointer", opacity: thinking && !(listening || recording) ? 0.5 : 1,
              }}>{(listening || recording) ? "■" : "🎤"}</button>
            <button className="xen-send" onClick={() => send()} disabled={thinking} title="Enviar" style={{
              fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: isMobile ? 16 : 13.5, color: NAVY_DEEP,
              background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`, border: "none", borderRadius: 12, flexShrink: 0,
              padding: isMobile ? "10px 14px" : "11px 20px", cursor: "pointer", boxShadow: "0 4px 14px rgba(201,162,74,0.35)", opacity: thinking ? 0.6 : 1,
            }}>{isMobile ? "➤" : "Enviar"}</button>
          </div>
          <div style={{ fontFamily: "Inter", fontSize: 11, color: "rgba(159,176,198,0.55)", textAlign: "center", marginTop: 10 }}>
            Conectado a n8n · datos reales de NocoDB + Supabase
          </div>
        </div>
        </div>
      </div>

      {showSplash && <Splash />}

      {presented && (
        <div className="xen-msg" style={{
          position: "fixed", inset: 0, zIndex: 50, background: `linear-gradient(160deg, ${NAVY} 0%, ${NAVY_DEEP} 80%)`,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "5vh 4vw",
        }}>
          <div className="xen-orb" style={{ width: 420, height: 420, top: "-10%", left: "-8%", background: "radial-gradient(circle, rgba(201,162,74,0.45), transparent 70%)", animation: "xenFloat1 22s ease-in-out infinite" }} />
          <button onClick={() => setPresented(null)} className="xen-export" style={{
            position: "absolute", top: 20, right: 24, zIndex: 51, fontFamily: "Inter", fontSize: 13, fontWeight: 600,
            color: GOLD_LIGHT, background: "rgba(201,162,74,0.1)", border: "1px solid rgba(201,162,74,0.4)",
            borderRadius: 10, padding: "9px 18px", cursor: "pointer",
          }}>✕ Salir · Esc</button>
          <div className="xen-scroll" style={{ position: "relative", width: "100%", maxWidth: 1100, maxHeight: "88vh", overflowY: "auto" }}>
            <BlockRenderer blocks={[presented]} onToggle={toggleTask} />
          </div>
        </div>
      )}
    </div>
    </SendCtx.Provider>
    </ActionCtx.Provider>
    </PresentCtx.Provider>
  );
}
