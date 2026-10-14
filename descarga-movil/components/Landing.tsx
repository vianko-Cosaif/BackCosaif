"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowDownToLine, ArrowRight, ArrowUpRight, Check, ChevronDown, Copy, FileCheck2, LockKeyhole, MonitorDown, Package, ShieldCheck, Smartphone } from "lucide-react";
import { Brand, Footer } from "./Brand";
import type { Release } from "../lib/contracts";
import { formatBytes, formatDate } from "../lib/contracts";
import { messageOf, requestJSON } from "../lib/client";

export default function Landing() {
  const [release, setRelease] = useState<Release | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const load = () => { setLoading(true); setError(""); requestJSON<{ release: Release | null }>("/api/current").then((data) => setRelease(data.release)).catch((error) => setError(messageOf(error))).finally(() => setLoading(false)); };
  useEffect(load, []);

  async function copyChecksum() {
    if (!release) return;
    try { await navigator.clipboard.writeText(release.sha256); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { setError("No se pudo copiar. Puedes seleccionar la huella que aparece en los detalles."); }
  }

  return <>
    <header className="site-header shell"><Brand /><nav aria-label="Navegación principal"><a className="nav-install" href="#instalacion">Cómo instalar</a><a className="button button-quiet" href="/admin"><LockKeyhole size={15} /> Acceso administrador <ArrowUpRight size={15} /></a></nav></header>
    <main>
      <section className="hero shell">
        <div className="hero-copy"><div className="eyebrow"><span className="status-dot" /> CENTRO DE DESCARGAS</div><h1>Tu operación.<br />Siempre<br /><span>en movimiento.</span></h1><p className="hero-description">Lleva COSAIF contigo. Descarga la aplicación para Android directamente desde aquí.</p><a href="#descarga" className="button button-primary">Descargar aplicación <ArrowDownToLine size={19} /></a><div className="hero-caption"><Smartphone size={15} /><span>Android</span><span className="tiny-divider" /> <span>Archivo APK</span></div></div>
        <div className="hero-visual" aria-hidden="true"><div className="visual-grid" /><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="visual-label"><span className="status-dot" /> COSAIF / ANDROID</div><div className="phone"><div className="phone-notch" /><div className="phone-screen"><div className="phone-time">9:41 <span>▮▮▮ ▰</span></div><div className="phone-icon">C<span /></div><div className="phone-title">COSAIF</div><div className="phone-subtitle">Logistics</div><div className="phone-line" /><div className="phone-message">Todo empieza<br />con una conexión.</div><div className="phone-download"><ArrowDownToLine size={24} /><span>Listo para Android</span><Check size={15} /></div><div className="phone-home" /></div></div><div className="floating-tag"><Package size={21} /><div><strong>Una app. Tu operación.</strong><span>Donde lo necesitas.</span></div></div><div className="visual-bottom"><span>CONÉCTATE. CONTINÚA.</span><ArrowUpRight size={18} /></div></div>
      </section>

      <div className="section-rule shell"><span>01 / DESCARGA</span><ArrowDown size={17} /></div>
      <section id="descarga" className="download-section shell">
        <div className="section-intro"><div className="eyebrow muted">LISTO PARA TU DISPOSITIVO</div><h2>La versión actual.<br />A un clic de distancia.</h2><p>Aquí encontrarás la APK que el administrador ha publicado para su distribución.</p><div className="download-assurance"><FileCheck2 size={20} /><span>Descarga directa desde<br />el centro de COSAIF.</span></div></div>
        <div className="download-card"><div className="download-card-top"><span className="app-square">C<span /></span><div><h3>COSAIF para Android</h3><p>Aplicación móvil · Archivo APK</p></div>{release && <span className="badge badge-green">Actual</span>}</div>
          {loading ? <div className="release-loading" role="status"><span className="spinner" /> Consultando la versión disponible…</div> : error ? <div className="empty-release" role="alert"><p>{error}</p><button className="text-button" onClick={load}>Volver a intentar <ArrowRight size={15} /></button></div> : release ? <><div className="version-grid"><div><span>VERSIÓN</span><strong>{release.version}</strong></div><div><span>TAMAÑO</span><strong>{formatBytes(release.size)}</strong></div><div><span>COMPATIBILIDAD</span><strong>{release.minAndroid}</strong></div></div><a className="button button-primary download-button" href="/api/download" download>Descargar APK <ArrowDownToLine size={19} /></a><p className="release-date">Publicada el {formatDate(release.publishedAt ?? release.createdAt)} · Compilación {release.versionCode}</p><details className="release-details"><summary>Notas y detalles del archivo <ChevronDown size={16} /></summary><div><p className="preserve-lines">{release.notes || "Esta versión no tiene notas adicionales."}</p><span className="detail-label">SHA-256 del archivo</span><code>{release.sha256}</code><button className="text-button" onClick={copyChecksum}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Copiada" : "Copiar huella"}</button></div></details></> : <div className="empty-release"><div className="empty-icon"><Package size={25} /></div><h4>Tu próxima descarga estará aquí.</h4><p>El administrador aún no ha publicado una APK. Vuelve cuando esté disponible.</p><button className="text-button" onClick={load}>Consultar de nuevo <ArrowRight size={15} /></button></div>}
          <div className="card-footnote"><ShieldCheck size={15} /> Solo el administrador puede publicar versiones.</div>
        </div>
      </section>

      <section id="instalacion" className="install-section"><div className="shell"><div className="install-heading"><div><div className="eyebrow muted">02 / INSTALACIÓN</div><h2>En tu Android,<br />en unos pasos.</h2></div><p>Instala la aplicación directamente<br />desde el archivo descargado.</p></div><div className="steps"><article><span className="step-number">01</span><MonitorDown size={26} /><h3>Descarga la APK</h3><p>Abre esta página en tu Android y descarga la versión disponible.</p></article><article><span className="step-number">02</span><ShieldCheck size={26} /><h3>Autoriza la instalación</h3><p>Si Android lo solicita, permite instalar aplicaciones desde el navegador que utilizaste.</p></article><article><span className="step-number">03</span><Smartphone size={26} /><h3>Abre COSAIF</h3><p>Busca el archivo en Descargas, toca Instalar y abre la aplicación al terminar.</p></article></div><details className="faq"><summary>¿Android no me permite instalar la aplicación?<ChevronDown size={18} /></summary><p>Revisa que tu dispositivo cumpla con la versión de Android indicada en la descarga y que tenga espacio disponible. Si ya tienes COSAIF, una actualización necesita la misma firma que la versión instalada. Android también puede impedir instalar una compilación con un código de versión menor; consulta al administrador antes de desinstalar para evitar perder datos locales.</p></details></div></section>
    </main><Footer />
  </>;
}
