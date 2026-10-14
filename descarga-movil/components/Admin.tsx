"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronLeft, ChevronRight, CloudUpload, FileArchive, History, LogOut, Package, Plus, RotateCcw, Search, ShieldCheck, X } from "lucide-react";
import { Brand } from "./Brand";
import type { AdminUser, Release } from "../lib/contracts";
import { CHUNK_BYTES, MAX_APK_BYTES, formatBytes, formatDate } from "../lib/contracts";
import { messageOf, RequestError, requestJSON } from "../lib/client";

type Catalog = { releases: Release[]; current: Release | null; total: number; page: number };

function sendPart(id: string, number: number, part: Blob, progress: (bytes: number) => void, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const stop = () => xhr.abort();
    if (signal.aborted) { reject(new DOMException("Carga cancelada", "AbortError")); return; }
    signal.addEventListener("abort", stop, { once: true });
    xhr.open("PUT", `/api/admin/uploads/${id}/parts/${number}`);
    xhr.setRequestHeader("x-cosaif-request", "1");
    xhr.setRequestHeader("content-type", "application/octet-stream");
    xhr.timeout = 90_000;
    xhr.upload.onprogress = (event) => progress(event.loaded);
    xhr.onload = () => {
      signal.removeEventListener("abort", stop);
      if (xhr.status >= 200 && xhr.status < 300) { resolve(); return; }
      let message = "No fue posible cargar el archivo.";
      try { message = JSON.parse(xhr.responseText).error || message; } catch { /* Keep a useful error if a proxy returned HTML. */ }
      reject(new RequestError(message, xhr.status));
    };
    xhr.onerror = xhr.ontimeout = () => { signal.removeEventListener("abort", stop); reject(new RequestError("La carga se interrumpió. Revisa tu conexión.", 0)); };
    xhr.onabort = () => { signal.removeEventListener("abort", stop); reject(new DOMException("Carga cancelada", "AbortError")); };
    xhr.send(part);
  });
}

function UploadDialog({ current, onSaved }: { current: Release | null; onSaved: (message: string, warning?: boolean) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");

  function choose(candidate?: File) {
    if (!candidate) return;
    if (!/\.apk$/i.test(candidate.name) || candidate.size < 22 || candidate.size > MAX_APK_BYTES) { setError("Selecciona una APK válida de hasta 512 MB."); return; }
    setFile(candidate); setError("");
  }
  function open() { setFile(null); setError(""); setProgress(0); dialog.current?.querySelector("form")?.reset(); dialog.current?.showModal(); }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) { setError("Selecciona la APK que quieres guardar."); return; }
    const fields = new FormData(event.currentTarget);
    const shouldPublish = fields.get("publish") === "on";
    const abort = new AbortController(); controller.current = abort;
    let id: string | undefined;
    let saved = false;
    setBusy(true); setError(""); setProgress(0); setStage("Preparando la carga…");
    try {
      const upload = await requestJSON<{ id: string; chunkBytes: number; partCount: number }>("/api/admin/uploads", { method: "POST", body: JSON.stringify({ version: fields.get("version"), versionCode: Number(fields.get("versionCode")), minAndroid: fields.get("minAndroid"), notes: fields.get("notes"), fileName: file.name, size: file.size }), signal: abort.signal });
      id = upload.id;
      const chunkSize = upload.chunkBytes || CHUNK_BYTES;
      setStage("Subiendo APK…");
      for (let number = 1; number <= upload.partCount; number++) {
        const offset = (number - 1) * chunkSize;
        const part = file.slice(offset, Math.min(offset + chunkSize, file.size));
        for (let attempt = 0; ; attempt++) {
          try { await sendPart(id, number, part, (bytes) => setProgress(Math.min(99, Math.round((offset + Math.min(bytes, part.size)) / file.size * 100))), abort.signal); break; }
          catch (error) {
            if (abort.signal.aborted || attempt >= 2 || !(error instanceof RequestError) || (error.status > 0 && error.status < 500)) throw error;
            setStage(`Reintentando parte ${number}…`);
            await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
          }
        }
      }
      setProgress(100); setStage("Validando el archivo y guardando la versión…");
      const completed = await requestJSON<{ release: Release }>(`/api/admin/uploads/${id}/complete`, { method: "POST", signal: abort.signal });
      saved = true;
      if (shouldPublish) {
        setStage("Publicando la versión…");
        try { await requestJSON(`/api/admin/releases/${completed.release.id}/publish`, { method: "POST", body: JSON.stringify({ expectedCurrentId: current?.id ?? null }) }); }
        catch (error) { dialog.current?.close(); onSaved(`La APK quedó guardada como respaldo. No se publicó: ${messageOf(error)}`, true); return; }
      }
      dialog.current?.close(); onSaved(shouldPublish ? "APK guardada y publicada. La descarga ya usa esta versión." : "APK guardada como respaldo. Puedes publicarla desde el historial.");
    } catch (error) {
      setError(abort.signal.aborted ? "Carga cancelada. La versión activa sigue disponible." : messageOf(error));
      if (id && !saved) await requestJSON(`/api/admin/uploads/${id}`, { method: "DELETE" }).catch(() => undefined);
    } finally { setBusy(false); controller.current = null; }
  }

  return <><button className="button button-primary" onClick={open}><Plus size={18} /> Nueva versión</button><dialog ref={dialog} className="modal upload-modal" onCancel={(event) => { if (busy) event.preventDefault(); }}><form onSubmit={submit}><div className="modal-heading"><div><div className="eyebrow muted">ARCHIVO / ANDROID</div><h2>Subir una nueva versión</h2></div><button className="icon-button" type="button" disabled={busy} onClick={() => dialog.current?.close()} aria-label="Cerrar"><X size={20} /></button></div><p className="modal-description">Guarda una nueva compilación sin perder las anteriores.</p><input ref={input} type="file" accept=".apk,application/vnd.android.package-archive" className="visually-hidden" aria-label="Seleccionar APK" onChange={(event) => choose(event.target.files?.[0])} disabled={busy} /><button type="button" className={`file-drop ${dragging ? "dragging" : ""} ${file ? "selected" : ""}`} onClick={() => input.current?.click()} onDragOver={(event) => { event.preventDefault(); if (!busy) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); if (!busy) choose(event.dataTransfer.files[0]); }} disabled={busy}>{file ? <><FileArchive size={30} /><strong>{file.name}</strong><span>{formatBytes(file.size)} · Haz clic para cambiar el archivo</span></> : <><CloudUpload size={32} /><strong>Arrastra tu APK aquí</strong><span>o haz clic para seleccionar · Máximo 512 MB</span></>}</button><div className="form-grid"><div><label htmlFor="version">Versión visible</label><input id="version" name="version" placeholder="Ej. 1.2.0" pattern="[A-Za-z0-9][A-Za-z0-9.+_\-]*" maxLength={60} required disabled={busy} /></div><div><label htmlFor="versionCode">Código de versión</label><input id="versionCode" name="versionCode" type="number" min={1} max={2100000000} step={1} placeholder="versionCode de la APK" required disabled={busy} /></div></div><label htmlFor="minAndroid">Android mínimo</label><input id="minAndroid" name="minAndroid" maxLength={50} placeholder="Ej. Android 8.0 o superior" required disabled={busy} /><label htmlFor="notes">Notas de esta versión <span className="optional">Opcional</span></label><textarea id="notes" name="notes" rows={3} maxLength={4000} placeholder="Cambios, correcciones o motivos para conservar esta compilación…" disabled={busy} /><label className="checkbox-label"><input name="publish" type="checkbox" defaultChecked disabled={busy} /><span><strong>Publicar al terminar</strong><small>Esta APK será la descarga activa. La anterior se conserva.</small></span></label>{busy && <div className="upload-progress" role="status"><div><span>{stage}</span><strong>{progress}%</strong></div><progress max={100} value={progress} /></div>}{error && <p className="form-error" role="alert">{error}</p>}<div className="modal-actions">{busy ? <><button type="button" className="button button-outline" onClick={() => controller.current?.abort()}>Cancelar carga</button><button className="button button-primary" disabled><span className="spinner" /> Procesando</button></> : <><button type="button" className="button button-outline" onClick={() => dialog.current?.close()}>Cancelar</button><button type="submit" className="button button-primary"><CloudUpload size={17} /> Guardar APK</button></>}</div></form></dialog></>;
}

export default function Admin() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [catalog, setCatalog] = useState<Catalog>({ releases: [], current: null, total: 0, page: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [warning, setWarning] = useState(false);
  const [pending, setPending] = useState<Release | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const restoreDialog = useRef<HTMLDialogElement>(null);

  const fail = useCallback((error: unknown) => {
    if (error instanceof RequestError && [401, 403].includes(error.status)) { window.location.replace("/login"); return; }
    setError(messageOf(error));
  }, []);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setCatalog(await requestJSON<Catalog>(`/api/admin/releases?page=${page}&q=${encodeURIComponent(query)}`)); }
    catch (error) { fail(error); }
    finally { setLoading(false); }
  }, [page, query, fail]);
  useEffect(() => { requestJSON<{ user: AdminUser }>("/api/auth/session").then((data) => setUser(data.user)).catch((error) => { fail(error); setLoading(false); }); }, [fail]);
  useEffect(() => { if (user) void load(); }, [user, load]);
  useEffect(() => { const timer = setTimeout(() => { setQuery(search); setPage(1); }, 300); return () => clearTimeout(timer); }, [search]);
  useEffect(() => { if (pending) restoreDialog.current?.showModal(); }, [pending]);

  async function logout() {
    setSigningOut(true);
    try { await requestJSON("/api/auth/logout", { method: "POST" }); window.location.assign("/"); }
    catch (error) { fail(error); setSigningOut(false); }
  }
  async function publish() {
    if (!pending) return;
    setPublishing(true); setError("");
    try {
      await requestJSON(`/api/admin/releases/${pending.id}/publish`, { method: "POST", body: JSON.stringify({ expectedCurrentId: catalog.current?.id ?? null }) });
      setNotice(`La versión ${pending.version} ya está disponible para descargar.`); setWarning(false); restoreDialog.current?.close(); setPending(null); await load();
    } catch (error) { restoreDialog.current?.close(); setPending(null); await load(); fail(error); }
    finally { setPublishing(false); }
  }

  if (!user) return <main className="admin-gate shell"><Brand /><div className="gate-card"><ShieldCheck size={35} /><h1>{error ? "No pudimos verificar el acceso" : "Verificando tu sesión…"}</h1>{error ? <><p role="alert">{error}</p><a className="button button-primary" href="/login">Ir al acceso <ArrowRight size={17} /></a></> : <span className="spinner" />}<a className="back-link" href="/"><ArrowLeft size={16} /> Volver a descargas</a></div></main>;

  return <div className="admin-page"><header className="site-header shell"><Brand /><div className="admin-header-right"><span className="admin-user"><span className="avatar">{user.nombre.slice(0, 1).toUpperCase()}</span><span>{user.nombre}<small>Administrador</small></span></span><button className="icon-button" onClick={logout} disabled={signingOut} aria-label="Cerrar sesión" title="Cerrar sesión"><LogOut size={19} /></button></div></header><main className="shell admin-main"><div className="admin-topline"><div><div className="eyebrow muted">CENTRO DE CONTROL</div><h1>Versiones de la aplicación<span>.</span></h1><p>Publica una APK, conserva su historia y vuelve atrás cuando lo necesites.</p></div><UploadDialog current={catalog.current} onSaved={(message, warning = false) => { setNotice(message); setWarning(warning); void load(); }} /></div>{notice && <div className={`notice ${warning ? "notice-warning" : ""}`} role="status"><Check size={18} /><p>{notice}</p><button className="icon-button" onClick={() => setNotice("")} aria-label="Cerrar aviso"><X size={17} /></button></div>}{error && <div className="form-error" role="alert">{error} <button className="text-button" onClick={load}>Volver a intentar</button></div>}<div className="admin-overview"><section className="current-card"><div className="current-card-label"><span className="status-dot" /> DESCARGA ACTIVA <a href="/" target="_blank" rel="noreferrer">Ver landing <ArrowUpRight size={16} /></a></div>{catalog.current ? <><div className="current-version"><span>v{catalog.current.version}</span><span className="badge badge-light">Publicada</span></div><p>{formatBytes(catalog.current.size)} <span>·</span> Compilación {catalog.current.versionCode} <span>·</span> {catalog.current.minAndroid}</p><div className="current-card-bottom"><span>Publicada el {formatDate(catalog.current.publishedAt ?? catalog.current.createdAt)}</span><a href={`/api/admin/releases/${catalog.current.id}/download`} download aria-label="Descargar versión activa"><ArrowDownToLine size={19} /></a></div></> : <><h2>Aún no hay una versión activa.</h2><p>Sube una APK y publícala para habilitar la descarga.</p></>}</section><section className="archive-card"><div className="archive-card-head"><History size={21} /><span>HISTORIAL CONSERVADO</span></div><div className="archive-total">{catalog.total.toLocaleString("es-MX")}<span>{catalog.total === 1 ? "versión guardada" : "versiones guardadas"}{query ? " en la búsqueda" : ""}</span></div><p>Las versiones anteriores permanecen disponibles para descargarlas o volver a publicarlas.</p></section></div><section className="history-panel"><div className="history-heading"><div><h2>Historial de versiones</h2><p>Un respaldo para cada publicación.</p></div><label className="search-input"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar versión o notas…" aria-label="Buscar en el historial" /></label></div><div className="table-scroll"><table><thead><tr><th>VERSIÓN</th><th>FECHA DE CARGA</th><th>ARCHIVO</th><th>ESTADO</th><th className="text-right">ACCIONES</th></tr></thead><tbody>{loading ? <tr><td colSpan={5} className="table-empty"><span className="spinner" /> Cargando historial…</td></tr> : catalog.releases.length ? catalog.releases.map((item) => <tr key={item.id}><td><strong className="table-version">v{item.version}</strong><span className="cell-secondary">Compilación {item.versionCode}</span></td><td>{formatDate(item.createdAt)}<span className="cell-secondary">{item.createdByName}</span></td><td><span className="file-cell"><FileArchive size={17} /><span title={item.fileName}>{item.fileName}</span></span><span className="cell-secondary">{formatBytes(item.size)}</span></td><td><span className={`badge ${item.isCurrent ? "badge-green" : "badge-grey"}`}>{item.isCurrent ? <><span className="status-dot" /> Actual</> : "Respaldo"}</span></td><td><div className="row-actions"><a className="icon-button" href={`/api/admin/releases/${item.id}/download`} download aria-label={`Descargar versión ${item.version}`} title="Descargar APK"><ArrowDownToLine size={18} /></a>{!item.isCurrent && <button className="button button-small button-outline" onClick={() => setPending(item)}><RotateCcw size={14} /> {catalog.current ? "Restaurar" : "Publicar"}</button>}</div></td></tr>) : <tr><td colSpan={5} className="table-empty"><Package size={32} /><h3>{query ? "No hay coincidencias" : "El historial empieza con tu primera APK"}</h3><p>{query ? "Prueba con otra versión o una palabra de las notas." : "Usa Nueva versión para guardar tu primera compilación."}</p></td></tr>}</tbody></table></div><div className="table-footer"><span>{catalog.total ? `${(page - 1) * 20 + 1}–${Math.min(page * 20, catalog.total)} de ${catalog.total} versiones` : "Las APKs se conservan al cambiar la versión activa."}</span><div><button className="icon-button" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1 || loading} aria-label="Página anterior"><ChevronLeft size={17} /></button><button className="icon-button" onClick={() => setPage(page + 1)} disabled={page * 20 >= catalog.total || loading} aria-label="Página siguiente"><ChevronRight size={17} /></button></div></div></section><div className="admin-bottom-note"><ShieldCheck size={16} /><span>Administración exclusiva de COSAIF. Cada APK mantiene su archivo y sus notas.</span></div></main><dialog className="modal restore-modal" ref={restoreDialog} onCancel={(event) => { if (publishing) event.preventDefault(); else setPending(null); }}><div className="restore-icon"><RotateCcw size={27} /></div><h2>{catalog.current ? "Restaurar esta versión" : "Publicar esta versión"}</h2><p>La versión <strong>{pending?.version}</strong> será la descarga activa en la landing. {catalog.current && <>La versión {catalog.current.version} seguirá guardada en el historial.</>}</p>{pending && catalog.current && pending.versionCode < catalog.current.versionCode && <p className="restore-note">Android puede impedir instalar un código de versión menor sobre una aplicación más reciente. Conserva los datos locales y verifica la instalación antes de distribuirla.</p>}<div className="modal-actions"><button className="button button-outline" disabled={publishing} onClick={() => { restoreDialog.current?.close(); setPending(null); }}>Cancelar</button><button className="button button-primary" disabled={publishing} onClick={publish}>{publishing ? <><span className="spinner" /> Publicando…</> : <><RotateCcw size={16} /> Confirmar publicación</>}</button></div></dialog></div>;
}
