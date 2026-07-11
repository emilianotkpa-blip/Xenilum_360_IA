import React, { useState, useRef, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ============================================================
// XENILUM · Consola de Inteligencia — Autónoma System
// Sistema de bloques v2: text, kpis, chart, table, list,
// checklist, accordion, diagram, progress, callout, svg
// ============================================================

const NAVY = "#0A2342";
const NAVY_DEEP = "#04101F";
const GOLD = "#C9A24A";
const GOLD_LIGHT = "#E4B95B";
const INK = "#EAF0F7";
const MUTED = "#9FB0C6";
const GREEN = "#7FD6A4";
const AMBER = "#E8A96B";

const GOLD_SERIES = ["#C9A24A", "#E4B95B", "#8A6D2F", "#F0D48A", "#6E5626"];

// ---------- Datos de demostración ----------
const MOCK_RESPONSES = {
  ingresos: {
    blocks: [
      { type: "text", content: "Aquí está el resumen financiero de junio. Fue un buen mes: Grupo ORVE sigue siendo el ancla, pero El Tianguis creció 18% contra mayo." },
      {
        type: "kpis",
        items: [
          { label: "Ingresos del mes", value: "$86,500", trend: "+12%", up: true },
          { label: "MRR (retainers)", value: "$34,000", trend: "+$6k", up: true },
          { label: "Por cobrar", value: "$18,200", trend: "2 facturas", up: false },
        ],
      },
      {
        type: "chart",
        chartType: "bar",
        title: "Ingresos por cliente · Junio 2026",
        data: [
          { name: "Grupo ORVE", value: 52000 },
          { name: "El Tianguis", value: 16500 },
          { name: "Events Prod.", value: 11000 },
          { name: "Otros", value: 7000 },
        ],
      },
      { type: "callout", variant: "warning", content: "Las 2 facturas pendientes de ORVE suman $18,200 y vencen el día 15. Puedo generar el recordatorio de cobro." },
    ],
  },
  proyectos: {
    blocks: [
      { type: "text", content: "Estado actual de los proyectos activos. El sistema de contratos de ORVE es el que necesita atención esta semana." },
      {
        type: "progress",
        title: "Avance por proyecto",
        items: [
          { label: "Diamantes de las Ventas", value: 81 },
          { label: "Orvito Admin Center", value: 72 },
          { label: "CRM Autónoma", value: 68 },
          { label: "Contratos ORVE", value: 63 },
          { label: "Events Producer", value: 45 },
        ],
      },
      {
        type: "table",
        title: "Detalle",
        columns: ["Proyecto", "Cliente", "Responsable", "Estado"],
        rows: [
          ["Orvito Admin Center", "Grupo ORVE", "Emiliano", "En curso"],
          ["Sistema de contratos", "Grupo ORVE", "Dariana", "Atención"],
          ["Diamantes de las Ventas", "Grupo ORVE", "Bruno", "En curso"],
          ["CRM Autónoma", "Interno", "Emiliano", "En curso"],
          ["Identidad botánica", "Events Producer", "Dariana", "En pausa"],
        ],
      },
      { type: "callout", variant: "info", content: "El sistema de contratos lleva 9 días sin commits. Sugiero agendar sesión con Dariana antes del viernes." },
    ],
  },
  equipo: {
    blocks: [
      { type: "text", content: "Rendimiento del equipo esta semana, junto con los pendientes críticos. Puedes palomear directo aquí y lo sincronizo con NocoDB." },
      {
        type: "kpis",
        items: [
          { label: "Tareas cerradas", value: "47", trend: "+9 vs sem. ant.", up: true },
          { label: "En bloqueo", value: "3", trend: "Contratos ORVE", up: false },
          { label: "Tiempo resp. Orvito", value: "1.8s", trend: "-0.4s", up: true },
        ],
      },
      {
        type: "chart",
        chartType: "bar",
        title: "Tareas completadas por persona · Semana 28",
        data: [
          { name: "Bruno", value: 16 },
          { name: "Dariana", value: 12 },
          { name: "Saday", value: 9 },
          { name: "Victoria", value: 6 },
          { name: "Emiliano", value: 4 },
        ],
      },
      {
        type: "checklist",
        title: "Pendientes críticos de la semana",
        items: [
          { label: "Revisar bloqueo del sistema de contratos con Dariana", done: false },
          { label: "Aprobar presentación de Victoria para ORVE", done: false },
          { label: "Deploy del dashboard de métricas (Admin Center Fase 3)", done: false },
          { label: "Enviar cotización de Soporte Autónoma 360", done: true },
          { label: "Recalcular heat map de Diamantes (WF nocturno)", done: true },
        ],
      },
    ],
  },
  flujo: {
    blocks: [
      { type: "text", content: "Este es el flujo actual de Orvito IA después de la migración a Cloud API. Cada mensaje entra por Chatwoot y se enruta según el tipo de usuario." },
      {
        type: "diagram",
        title: "Arquitectura de Orvito IA · Flujo de mensajes",
        nodes: [
          { id: "wa", label: "WhatsApp Cloud API", kind: "start" },
          { id: "cw", label: "Chatwoot", kind: "process" },
          { id: "n8n", label: "n8n Router", kind: "process" },
          { id: "dec", label: "¿Usuario público?", kind: "decision" },
          { id: "haiku", label: "Agente Haiku", kind: "process" },
          { id: "sonnet", label: "Agente Sonnet", kind: "process" },
          { id: "redis", label: "Redis Debounce", kind: "process" },
          { id: "resp", label: "Respuesta al usuario", kind: "end" },
        ],
        edges: [
          { from: "wa", to: "cw" },
          { from: "cw", to: "n8n" },
          { from: "n8n", to: "dec" },
          { from: "dec", to: "haiku", label: "Sí" },
          { from: "dec", to: "sonnet", label: "No · interno" },
          { from: "haiku", to: "redis" },
          { from: "sonnet", to: "redis" },
          { from: "redis", to: "resp" },
        ],
      },
      {
        type: "accordion",
        sections: [
          {
            title: "Capa de entrada (WhatsApp → Chatwoot)",
            blocks: [
              { type: "list", style: "bullet", items: [
                "Webhook de Cloud API valida firma de Meta antes de procesar",
                "Chatwoot funciona como bandeja compartida para el equipo de ORVE",
                "Los adjuntos (imágenes, audios) se suben a Supabase Storage",
              ]},
            ],
          },
          {
            title: "Enrutamiento dual de agentes",
            blocks: [
              { type: "list", style: "numbered", items: [
                "El router identifica el número contra la tabla de asesores en NocoDB",
                "Público → Haiku (rápido, económico, con blocklist de confidencialidad)",
                "Interno → Sonnet (acceso a RAG completo y herramientas de consulta)",
              ]},
              { type: "callout", variant: "info", content: "El RAG usa chunks con título antepuesto en Supabase pgvector — eso fue lo que arregló la precisión de las respuestas." },
            ],
          },
          {
            title: "Capa de salida (Redis → respuesta)",
            blocks: [
              { type: "list", style: "bullet", items: [
                "Redis agrupa mensajes consecutivos del usuario (debounce de 8s)",
                "La respuesta se envía vía Chatwoot para mantener historial unificado",
              ]},
            ],
          },
        ],
      },
      { type: "callout", variant: "success", content: "Desde la migración a Cloud API: 0 desconexiones en 34 días. Con Baileys el promedio era 2 por semana." },
    ],
  },
};

const SUGGESTIONS = [
  { key: "ingresos", label: "Reporte de ingresos" },
  { key: "proyectos", label: "Estado de proyectos" },
  { key: "equipo", label: "Equipo y pendientes" },
  { key: "flujo", label: "Diagrama de Orvito IA" },
];

function pickResponse(text) {
  const t = text.toLowerCase();
  if (t.includes("diagrama") || t.includes("flujo") || t.includes("orvito") || t.includes("arquitect") || t.includes("workflow"))
    return MOCK_RESPONSES.flujo;
  if (t.includes("ingreso") || t.includes("finan") || t.includes("factur") || t.includes("mrr") || t.includes("dinero"))
    return MOCK_RESPONSES.ingresos;
  if (t.includes("equipo") || t.includes("pendiente") || t.includes("tarea") || t.includes("checklist") || t.includes("rendimiento"))
    return MOCK_RESPONSES.equipo;
  return MOCK_RESPONSES.proyectos;
}

// ---------- Exportación de visuales (SVG / PNG) ----------
const slug = (s) =>
  (s || "visual")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "visual";

function prepareSvgClone(svgEl) {
  const clone = svgEl.cloneNode(true);
  const vb = svgEl.viewBox && svgEl.viewBox.baseVal && svgEl.viewBox.baseVal.width
    ? svgEl.viewBox.baseVal : null;
  const rect = svgEl.getBoundingClientRect();
  const w = vb ? vb.width : rect.width || 800;
  const h = vb ? vb.height : rect.height || 500;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", w);
  clone.setAttribute("height", h);
  if (!clone.getAttribute("viewBox")) clone.setAttribute("viewBox", `0 0 ${w} ${h}`);
  // Fondo navy para que la descarga no salga transparente
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("x", vb ? vb.x : 0);
  bg.setAttribute("y", vb ? vb.y : 0);
  bg.setAttribute("width", w);
  bg.setAttribute("height", h);
  bg.setAttribute("fill", NAVY_DEEP);
  clone.insertBefore(bg, clone.firstChild);
  return { clone, w, h };
}

function triggerDownload(href, filename) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function downloadAsSvg(svgEl, filename) {
  const { clone } = prepareSvgClone(svgEl);
  const source = new XMLSerializer().serializeToString(clone);
  const blob = new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n' + source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, `${filename}.svg`);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function downloadAsPng(svgEl, filename, scale = 2) {
  const { clone, w, h } = prepareSvgClone(svgEl);
  const source = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    canvas.toBlob((png) => {
      if (!png) return;
      const pngUrl = URL.createObjectURL(png);
      triggerDownload(pngUrl, `${filename}.png`);
      setTimeout(() => URL.revokeObjectURL(pngUrl), 2000);
    }, "image/png");
  };
  img.src = url;
}

function ExportButtons({ targetRef, filename }) {
  const getSvg = () => targetRef.current && targetRef.current.querySelector("svg");
  const btnStyle = {
    fontFamily: "Inter", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.05em",
    color: GOLD_LIGHT, background: "rgba(201,162,74,0.08)",
    border: "1px solid rgba(201,162,74,0.35)", borderRadius: 8,
    padding: "4px 10px", cursor: "pointer",
  };
  return (
    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
      <button className="xen-export" title="Descargar vectorial (editable)" style={btnStyle}
        onClick={() => { const s = getSvg(); if (s) downloadAsSvg(s, filename); }}>
        ↓ SVG
      </button>
      <button className="xen-export" title="Descargar imagen (2x)" style={btnStyle}
        onClick={() => { const s = getSvg(); if (s) downloadAsPng(s, filename); }}>
        ↓ PNG
      </button>
    </div>
  );
}

// ---------- Modo presentación (fullscreen por bloque) ----------
const PresentCtx = React.createContext(() => {});

function PresentButton({ block }) {
  const present = React.useContext(PresentCtx);
  return (
    <button className="xen-export" title="Modo presentación (pantalla completa)" style={{
      fontFamily: "Inter", fontSize: 11.5, fontWeight: 600,
      color: GOLD_LIGHT, background: "rgba(201,162,74,0.08)",
      border: "1px solid rgba(201,162,74,0.35)", borderRadius: 8,
      padding: "4px 10px", cursor: "pointer", lineHeight: 1,
    }} onClick={() => present(block)}>⛶</button>
  );
}

// ---------- Base visual ----------
function GlassCard({ children, style }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.045)",
        border: "1px solid rgba(201,162,74,0.22)",
        borderRadius: 16,
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)",
        padding: 18,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function BlockTitle({ children }) {
  return (
    <div
      style={{
        fontFamily: "'Sora', sans-serif",
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: GOLD_LIGHT,
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

// ---------- Bloques ----------
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      style={{
        background: "rgba(4,16,31,0.92)",
        border: "1px solid rgba(201,162,74,0.4)",
        borderRadius: 10,
        padding: "8px 12px",
        fontFamily: "'Inter', sans-serif",
        fontSize: 12,
        color: INK,
        backdropFilter: "blur(8px)",
      }}
    >
      <div style={{ color: MUTED, marginBottom: 2 }}>{label || payload[0].name}</div>
      <div style={{ color: GOLD_LIGHT, fontWeight: 600 }}>
        {typeof payload[0].value === "number" ? payload[0].value.toLocaleString() : payload[0].value}
      </div>
    </div>
  );
}

function ChartBlock({ block }) {
  const h = 240;
  const wrapRef = useRef(null);
  return (
    <GlassCard>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <BlockTitle>{block.title}</BlockTitle>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <ExportButtons targetRef={wrapRef} filename={slug(block.title)} />
          <PresentButton block={block} />
        </div>
      </div>
      <div ref={wrapRef} style={{ width: "100%", height: h }}>
        <ResponsiveContainer>
          {block.chartType === "bar" ? (
            <BarChart data={block.data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 11, fontFamily: "Inter" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: MUTED, fontSize: 11, fontFamily: "Inter" }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(201,162,74,0.08)" }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {block.data.map((_, i) => (
                  <Cell key={i} fill={GOLD_SERIES[i % GOLD_SERIES.length]} />
                ))}
              </Bar>
            </BarChart>
          ) : block.chartType === "line" ? (
            <LineChart data={block.data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 11, fontFamily: "Inter" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: MUTED, fontSize: 11, fontFamily: "Inter" }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="value" stroke={GOLD_LIGHT} strokeWidth={2.5}
                dot={{ fill: GOLD, r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: GOLD_LIGHT }} />
            </LineChart>
          ) : (
            <PieChart>
              <Pie data={block.data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85}
                paddingAngle={3} stroke="rgba(4,16,31,0.6)">
                {block.data.map((_, i) => (
                  <Cell key={i} fill={GOLD_SERIES[i % GOLD_SERIES.length]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              <Legend
                iconType="circle" iconSize={8}
                formatter={(v) => <span style={{ color: MUTED, fontSize: 12, fontFamily: "Inter" }}>{v}</span>}
              />
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
          <div style={{ fontFamily: "Inter", fontSize: 11, color: MUTED, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            {k.label}
          </div>
          <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 26, fontWeight: 700, color: INK, margin: "6px 0 4px" }}>
            {k.value}
          </div>
          <div style={{ fontFamily: "Inter", fontSize: 12, fontWeight: 600, color: k.up ? GREEN : AMBER }}>
            {k.up ? "▲ " : "● "}{k.trend}
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

function TableBlock({ block }) {
  const statusColor = (s) =>
    s === "Atención" ? AMBER : s === "En pausa" ? MUTED : GREEN;
  return (
    <GlassCard style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "16px 18px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <BlockTitle>{block.title}</BlockTitle>
        <PresentButton block={block} />
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter", fontSize: 13 }}>
          <thead>
            <tr>
              {block.columns.map((c, i) => (
                <th key={i} style={{
                  textAlign: "left", padding: "10px 18px", color: GOLD_LIGHT, fontWeight: 600,
                  fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase",
                  borderBottom: "1px solid rgba(201,162,74,0.25)", whiteSpace: "nowrap",
                }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((r, i) => (
              <tr key={i} className="xen-row">
                {r.map((cell, j) => (
                  <td key={j} style={{
                    padding: "11px 18px", color: j === r.length - 1 ? statusColor(cell) : INK,
                    fontWeight: j === r.length - 1 ? 600 : 400,
                    borderBottom: i < block.rows.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                    whiteSpace: "nowrap",
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
              background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`,
              width: 22, height: 22, borderRadius: 7, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1,
            }}>{i + 1}</span>
          ) : (
            <span style={{
              width: 7, height: 7, borderRadius: "50%", flexShrink: 0, marginTop: 7,
              background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`,
              boxShadow: "0 0 6px rgba(201,162,74,0.5)",
            }} />
          )}
          <span style={{ fontFamily: "Inter", fontSize: 14, lineHeight: 1.6, color: INK }}>{item}</span>
        </div>
      ))}
    </div>
  );
}

function ChecklistBlock({ block }) {
  const [items, setItems] = useState(block.items);
  const toggle = (i) => {
    setItems((prev) => prev.map((it, j) => (j === i ? { ...it, done: !it.done } : it)));
    // En producción: PATCH al webhook de n8n → actualiza NocoDB
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
            background: "transparent", border: "none", cursor: "pointer",
            padding: "8px 10px", borderRadius: 10, width: "100%",
          }}>
            <span style={{
              width: 20, height: 20, borderRadius: 7, flexShrink: 0, marginTop: 1,
              border: item.done ? "none" : `1.5px solid rgba(201,162,74,0.5)`,
              background: item.done ? `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})` : "rgba(255,255,255,0.03)",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s ease",
            }}>
              {item.done && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6.5L5 9L9.5 3.5" stroke={NAVY_DEEP} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span style={{
              fontFamily: "Inter", fontSize: 14, lineHeight: 1.55,
              color: item.done ? "rgba(159,176,198,0.6)" : INK,
              textDecoration: item.done ? "line-through" : "none",
              transition: "all 0.2s ease",
            }}>{item.label}</span>
          </button>
        ))}
      </div>
    </GlassCard>
  );
}

function AccordionBlock({ block }) {
  const [open, setOpen] = useState(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {block.sections.map((sec, i) => {
        const isOpen = open === i;
        return (
          <GlassCard key={i} style={{ padding: 0, overflow: "hidden", borderColor: isOpen ? "rgba(228,185,91,0.45)" : "rgba(201,162,74,0.22)" }}>
            <button onClick={() => setOpen(isOpen ? null : i)} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              width: "100%", background: "transparent", border: "none", cursor: "pointer",
              padding: "15px 18px", textAlign: "left",
            }}>
              <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 600, color: isOpen ? GOLD_LIGHT : INK }}>
                {sec.title}
              </span>
              <span style={{
                color: GOLD_LIGHT, fontSize: 13, transition: "transform 0.3s ease",
                transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0, marginLeft: 12,
              }}>▾</span>
            </button>
            <div style={{
              display: "grid", gridTemplateRows: isOpen ? "1fr" : "0fr",
              transition: "grid-template-rows 0.35s cubic-bezier(0.22,1,0.36,1)",
            }}>
              <div style={{ overflow: "hidden" }}>
                <div style={{ padding: "2px 18px 16px", borderTop: "1px solid rgba(201,162,74,0.15)", paddingTop: 14 }}>
                  <BlockRenderer blocks={sec.blocks} />
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
                boxShadow: "0 0 10px rgba(201,162,74,0.4)",
                transition: "width 1s cubic-bezier(0.22,1,0.36,1)",
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
      display: "flex", gap: 12, alignItems: "flex-start",
      background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 14,
      padding: "13px 16px", backdropFilter: "blur(10px)",
    }}>
      <span style={{ color: cfg.color, fontSize: 12, marginTop: 3, flexShrink: 0 }}>{cfg.icon}</span>
      <span style={{ fontFamily: "Inter", fontSize: 13.5, lineHeight: 1.6, color: INK }}>{block.content}</span>
    </div>
  );
}

// --- Diagrama de flujo con auto-layout por niveles ---
function layoutDiagram(nodes, edges) {
  const level = {};
  nodes.forEach((n) => (level[n.id] = 0));
  for (let k = 0; k < nodes.length; k++) {
    edges.forEach((e) => {
      if (level[e.to] < level[e.from] + 1) level[e.to] = level[e.from] + 1;
    });
  }
  const rows = {};
  nodes.forEach((n) => {
    (rows[level[n.id]] = rows[level[n.id]] || []).push(n);
  });
  return { level, rows };
}

function DiagramBlock({ block }) {
  const { level, rows } = layoutDiagram(block.nodes, block.edges);
  const NODE_W = 168, NODE_H = 48, ROW_H = 104, GAP_X = 28;
  const numRows = Object.keys(rows).length;
  const maxCols = Math.max(...Object.values(rows).map((r) => r.length));
  const svgW = Math.max(maxCols * (NODE_W + GAP_X) + GAP_X, 480);
  const svgH = numRows * ROW_H + 20;

  const pos = {};
  Object.entries(rows).forEach(([lvl, list]) => {
    const totalW = list.length * NODE_W + (list.length - 1) * GAP_X;
    const startX = (svgW - totalW) / 2;
    list.forEach((n, i) => {
      pos[n.id] = {
        x: startX + i * (NODE_W + GAP_X),
        y: 14 + Number(lvl) * ROW_H,
      };
    });
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
          <ExportButtons targetRef={wrapRef} filename={slug(block.title)} />
          <PresentButton block={block} />
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
            const a = pos[e.from], b = pos[e.to];
            if (!a || !b) return null;
            const x1 = a.x + NODE_W / 2, y1 = a.y + NODE_H;
            const x2 = b.x + NODE_W / 2, y2 = b.y - 3;
            const midY = (y1 + y2) / 2;
            const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
            return (
              <g key={i}>
                <path d={d} fill="none" stroke="rgba(201,162,74,0.55)" strokeWidth="1.8" markerEnd="url(#xen-arrow)" />
                {e.label && (
                  <>
                    <rect x={(x1 + x2) / 2 - e.label.length * 3.6 - 6} y={midY - 10} width={e.label.length * 7.2 + 12} height={19}
                      rx={9} fill={NAVY_DEEP} stroke="rgba(201,162,74,0.35)" strokeWidth="1" />
                    <text x={(x1 + x2) / 2} y={midY + 3.5} textAnchor="middle"
                      style={{ fontFamily: "Inter", fontSize: 10.5, fontWeight: 600, fill: GOLD_LIGHT }}>
                      {e.label}
                    </text>
                  </>
                )}
              </g>
            );
          })}
          {block.nodes.map((n) => {
            const p = pos[n.id];
            const s = kindStyle(n.kind);
            return (
              <g key={n.id}>
                <rect x={p.x} y={p.y} width={NODE_W} height={NODE_H} rx={s.rx}
                  fill={s.fill} stroke={s.stroke} strokeWidth="1.4" />
                <text x={p.x + NODE_W / 2} y={p.y + NODE_H / 2 + 4.5} textAnchor="middle"
                  style={{ fontFamily: "'Sora', sans-serif", fontSize: 12.5, fontWeight: 600, fill: INK }}>
                  {n.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </GlassCard>
  );
}

// --- Escape total: SVG libre generado por Xenilum ---
function SvgBlock({ block }) {
  // ⚠ Producción: sanitizar con DOMPurify antes de renderizar
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

function BlockRenderer({ blocks }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {blocks.map((b, i) => {
        switch (b.type) {
          case "text":
            return (
              <p key={i} style={{ fontFamily: "Inter", fontSize: 14.5, lineHeight: 1.65, color: INK, margin: 0 }}>
                {b.content}
              </p>
            );
          case "kpis": return <KpiBlock key={i} block={b} />;
          case "chart": return <ChartBlock key={i} block={b} />;
          case "table": return <TableBlock key={i} block={b} />;
          case "list": return <ListBlock key={i} block={b} />;
          case "checklist": return <ChecklistBlock key={i} block={b} />;
          case "accordion": return <AccordionBlock key={i} block={b} />;
          case "progress": return <ProgressBlock key={i} block={b} />;
          case "callout": return <CalloutBlock key={i} block={b} />;
          case "diagram": return <DiagramBlock key={i} block={b} />;
          case "svg": return <SvgBlock key={i} block={b} />;
          default: return null;
        }
      })}
    </div>
  );
}

// ---------- Chat ----------
function ThinkingDots() {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "4px 2px" }}>
      {[0, 1, 2].map((i) => (
        <span key={i} className="xen-dot" style={{ animationDelay: `${i * 0.18}s` }} />
      ))}
      <span style={{ fontFamily: "Inter", fontSize: 12.5, color: MUTED, marginLeft: 8 }}>
        Xenilum consultando NocoDB…
      </span>
    </div>
  );
}

function XenAvatar() {
  return (
    <div style={{
      width: 34, height: 34, borderRadius: 12, flexShrink: 0,
      background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_LIGHT} 50%, #8A6D2F 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 15, color: NAVY_DEEP,
      boxShadow: "0 4px 14px rgba(201,162,74,0.35)",
    }}>X</div>
  );
}

export default function XenilumChat() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      blocks: [{ type: "text", content: "Hola Emiliano. Ahora manejo 11 tipos de bloques: gráficas, tablas, diagramas de flujo, checklists interactivos, secciones desplegables, barras de avance y más. Prueba «Diagrama de Orvito IA» para ver los nuevos." }],
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [presented, setPresented] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setPresented(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, thinking]);

  const send = (text) => {
    const msg = (text ?? input).trim();
    if (!msg || thinking) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: msg }]);
    setThinking(true);
    // En producción: fetch al webhook de n8n → { blocks: [...] }
    setTimeout(() => {
      const res = pickResponse(msg);
      setMessages((m) => [...m, { role: "assistant", blocks: res.blocks }]);
      setThinking(false);
    }, 1600);
  };

  return (
    <PresentCtx.Provider value={setPresented}>
    <div style={{ position: "fixed", inset: 0, background: `linear-gradient(160deg, ${NAVY} 0%, ${NAVY_DEEP} 70%)`, overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap');

        .xen-orb { position: absolute; border-radius: 50%; filter: blur(70px); opacity: 0.5; pointer-events: none; }
        @keyframes xenFloat1 { 0%,100% { transform: translate(0,0);} 50% { transform: translate(60px,-40px);} }
        @keyframes xenFloat2 { 0%,100% { transform: translate(0,0);} 50% { transform: translate(-50px,50px);} }
        @keyframes xenFloat3 { 0%,100% { transform: translate(0,0);} 50% { transform: translate(30px,60px);} }
        @keyframes xenShimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes xenPulse { 0%,80%,100% { opacity: 0.25; transform: scale(0.85);} 40% { opacity: 1; transform: scale(1);} }
        @keyframes xenRise { from { opacity: 0; transform: translateY(14px);} to { opacity: 1; transform: translateY(0);} }

        .xen-dot { width: 7px; height: 7px; border-radius: 50%; background: ${GOLD_LIGHT}; display:inline-block; animation: xenPulse 1.2s ease-in-out infinite; }
        .xen-msg { animation: xenRise 0.45s cubic-bezier(0.22,1,0.36,1) both; }
        .xen-row:hover td { background: rgba(201,162,74,0.05); }
        .xen-check:hover { background: rgba(201,162,74,0.06) !important; }
        .xen-export { transition: all 0.2s ease; }
        .xen-export:hover { background: rgba(201,162,74,0.18) !important; border-color: rgba(228,185,91,0.7) !important; transform: translateY(-1px); }
        .xen-chip { transition: all 0.25s ease; cursor: pointer; }
        .xen-chip:hover { border-color: rgba(228,185,91,0.7) !important; background: rgba(201,162,74,0.12) !important; transform: translateY(-1px); }
        .xen-send { transition: all 0.2s ease; }
        .xen-send:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(201,162,74,0.45) !important; }
        .xen-input:focus { outline: none; border-color: rgba(228,185,91,0.6) !important; }
        .xen-scroll::-webkit-scrollbar { width: 8px; }
        .xen-scroll::-webkit-scrollbar-thumb { background: rgba(201,162,74,0.25); border-radius: 8px; }
        .xen-scroll::-webkit-scrollbar-track { background: transparent; }

        @media (prefers-reduced-motion: reduce) {
          .xen-orb, .xen-msg, .xen-dot { animation: none !important; }
        }
      `}</style>

      {/* Orbes dorados */}
      <div className="xen-orb" style={{ width: 380, height: 380, top: "-8%", left: "-6%", background: "radial-gradient(circle, rgba(201,162,74,0.5), transparent 70%)", animation: "xenFloat1 22s ease-in-out infinite" }} />
      <div className="xen-orb" style={{ width: 300, height: 300, bottom: "-10%", right: "-4%", background: "radial-gradient(circle, rgba(228,185,91,0.4), transparent 70%)", animation: "xenFloat2 28s ease-in-out infinite" }} />
      <div className="xen-orb" style={{ width: 220, height: 220, top: "40%", right: "22%", background: "radial-gradient(circle, rgba(201,162,74,0.3), transparent 70%)", animation: "xenFloat3 26s ease-in-out infinite" }} />

      <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", maxWidth: 860, margin: "0 auto", padding: "0 16px" }}>
        {/* Header */}
        <header style={{
          display: "flex", alignItems: "center", gap: 14, padding: "18px 4px 14px",
          borderBottom: "1px solid rgba(201,162,74,0.18)",
        }}>
          <XenAvatar />
          <div>
            <div style={{
              fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 20, lineHeight: 1.1,
              background: `linear-gradient(90deg, ${GOLD} 0%, #F5E3B3 25%, ${GOLD_LIGHT} 50%, ${GOLD} 75%, #F5E3B3 100%)`,
              backgroundSize: "200% auto", WebkitBackgroundClip: "text", backgroundClip: "text",
              WebkitTextFillColor: "transparent", animation: "xenShimmer 6s linear infinite",
            }}>
              XENILUM
            </div>
            <div style={{ fontFamily: "Inter", fontSize: 11.5, color: MUTED, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Consola de inteligencia · Autónoma System
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: GREEN, boxShadow: "0 0 8px rgba(127,214,164,0.8)" }} />
            <span style={{ fontFamily: "Inter", fontSize: 12, color: MUTED }}>Conectado</span>
          </div>
        </header>

        {/* Mensajes */}
        <div ref={scrollRef} className="xen-scroll" style={{ flex: 1, overflowY: "auto", padding: "22px 4px", display: "flex", flexDirection: "column", gap: 20 }}>
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="xen-msg" style={{ alignSelf: "flex-end", maxWidth: "78%" }}>
                <div style={{
                  fontFamily: "Inter", fontSize: 14.5, lineHeight: 1.55, color: NAVY_DEEP,
                  background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`,
                  padding: "11px 16px", borderRadius: "16px 16px 4px 16px", fontWeight: 500,
                  boxShadow: "0 4px 16px rgba(201,162,74,0.3)",
                }}>{m.text}</div>
              </div>
            ) : (
              <div key={i} className="xen-msg" style={{ display: "flex", gap: 12, maxWidth: "100%" }}>
                <XenAvatar />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <BlockRenderer blocks={m.blocks} />
                </div>
              </div>
            )
          )}
          {thinking && (
            <div className="xen-msg" style={{ display: "flex", gap: 12 }}>
              <XenAvatar />
              <GlassCard style={{ padding: "12px 16px" }}>
                <ThinkingDots />
              </GlassCard>
            </div>
          )}
        </div>

        {/* Sugerencias */}
        {messages.length <= 1 && !thinking && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", paddingBottom: 12 }}>
            {SUGGESTIONS.map((s) => (
              <button key={s.key} className="xen-chip" onClick={() => send(s.label)} style={{
                fontFamily: "Inter", fontSize: 13, color: GOLD_LIGHT, fontWeight: 500,
                background: "rgba(201,162,74,0.07)", border: "1px solid rgba(201,162,74,0.3)",
                borderRadius: 999, padding: "9px 16px", backdropFilter: "blur(10px)",
              }}>{s.label}</button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ paddingBottom: 20 }}>
          <div style={{
            display: "flex", gap: 10, alignItems: "center",
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(201,162,74,0.28)",
            borderRadius: 18, padding: "8px 8px 8px 18px",
            backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}>
            <input
              className="xen-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Pregúntale a Xenilum sobre la agencia…"
              style={{
                flex: 1, background: "transparent", border: "none",
                fontFamily: "Inter", fontSize: 14.5, color: INK, padding: "8px 0",
              }}
            />
            <button className="xen-send" onClick={() => send()} disabled={thinking} style={{
              fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 13.5,
              color: NAVY_DEEP, background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`,
              border: "none", borderRadius: 12, padding: "11px 20px", cursor: "pointer",
              boxShadow: "0 4px 14px rgba(201,162,74,0.35)", opacity: thinking ? 0.6 : 1,
            }}>
              Enviar
            </button>
          </div>
          <div style={{ fontFamily: "Inter", fontSize: 11, color: "rgba(159,176,198,0.55)", textAlign: "center", marginTop: 10 }}>
            Prototipo · Los datos son simulados — conecta el webhook de n8n para datos reales de NocoDB
          </div>
        </div>
      </div>

      {/* Modo presentación */}
      {presented && (
        <div className="xen-msg" style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: `linear-gradient(160deg, ${NAVY} 0%, ${NAVY_DEEP} 80%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "5vh 4vw",
        }}>
          <div className="xen-orb" style={{ width: 420, height: 420, top: "-10%", left: "-8%", background: "radial-gradient(circle, rgba(201,162,74,0.45), transparent 70%)", animation: "xenFloat1 22s ease-in-out infinite" }} />
          <div className="xen-orb" style={{ width: 320, height: 320, bottom: "-12%", right: "-6%", background: "radial-gradient(circle, rgba(228,185,91,0.35), transparent 70%)", animation: "xenFloat2 28s ease-in-out infinite" }} />
          <button onClick={() => setPresented(null)} className="xen-export" style={{
            position: "absolute", top: 20, right: 24, zIndex: 51,
            fontFamily: "Inter", fontSize: 13, fontWeight: 600, color: GOLD_LIGHT,
            background: "rgba(201,162,74,0.1)", border: "1px solid rgba(201,162,74,0.4)",
            borderRadius: 10, padding: "9px 18px", cursor: "pointer",
          }}>✕ Salir · Esc</button>
          <div className="xen-scroll" style={{ position: "relative", width: "100%", maxWidth: 1100, maxHeight: "88vh", overflowY: "auto" }}>
            <BlockRenderer blocks={[presented]} />
          </div>
        </div>
      )}
    </div>
    </PresentCtx.Provider>
  );
}
