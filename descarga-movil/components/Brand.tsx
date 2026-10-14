import { ArrowUpRight } from "lucide-react";

export function Brand({ light = false }: { light?: boolean }) {
  return <a href="/" className={`brand ${light ? "brand-light" : ""}`} aria-label="COSAIF, inicio"><img src="/cosaif-logo.png" alt="COSAIF Logistics" width="148" height="75" /><span className="brand-divider" /><span className="brand-label">descargas</span></a>;
}

export function Footer() {
  return <footer className="footer shell"><Brand /><p>COSAIF Logistics · Aplicación para Android</p><a href="/admin">Administración <ArrowUpRight size={15} /></a></footer>;
}
