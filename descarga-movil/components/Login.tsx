"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import { Brand } from "./Brand";
import { messageOf, requestJSON } from "../lib/client";

export default function Login() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    const data = new FormData(event.currentTarget);
    try {
      await requestJSON("/api/auth/login", { method: "POST", body: JSON.stringify({ nombre: data.get("nombre"), contrasena: data.get("contrasena") }) });
      window.location.assign("/admin");
    } catch (error) { setError(messageOf(error)); setBusy(false); }
  }
  return <main className="login-page"><section className="login-form-side"><Brand /><a className="back-link" href="/"><ArrowLeft size={17} /> Volver a descargas</a><div className="login-form-wrap"><div className="login-icon"><LockKeyhole size={25} /></div><div className="eyebrow muted">ACCESO ADMINISTRADOR</div><h1>Todo bajo<br />tu control.</h1><p className="login-description">Ingresa con tu cuenta de COSAIF para administrar las versiones de la aplicación.</p><form onSubmit={submit}><label htmlFor="nombre">Usuario</label><input id="nombre" name="nombre" autoComplete="username" maxLength={100} placeholder="Tu nombre de usuario" required disabled={busy} /><label htmlFor="contrasena">Contraseña</label><div className="password-input"><input id="contrasena" name="contrasena" type={visible ? "text" : "password"} autoComplete="current-password" maxLength={512} placeholder="Tu contraseña" required disabled={busy} /><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-primary full-width" type="submit" disabled={busy}>{busy ? <><span className="spinner" /> Validando acceso…</> : <>Iniciar sesión <ArrowRight size={18} /></>}</button></form><p className="login-note"><ShieldCheck size={16} /> Acceso exclusivo para administradores.</p></div><small>COSAIF Logistics · Centro de descargas</small></section><section className="login-art"><div className="visual-grid" /><div className="login-art-mark">C<span /></div><div className="login-art-copy"><div className="eyebrow">CONTINUIDAD EN CADA VERSIÓN</div><h2>Publica.<br />Conserva.<br /><span>Continúa.</span></h2><p>Cada versión tiene su lugar.<br />Tu operación, un camino de regreso.</p></div><span className="login-art-footer">COSAIF / CONTROL DE VERSIONES <ArrowRight size={20} /></span></section></main>;
}
