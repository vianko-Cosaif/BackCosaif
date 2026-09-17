export function torreonClientKind(role?: string | null): "NATURAL" | "ARRASTRE" | null {
  if (role === "ARRASTRE_TORREON") return "ARRASTRE";
  return ["CLIENTE", "CLIENTE_ADMIN", "CLIENTE_COOR"].includes(role ?? "") ? "NATURAL" : null;
}

/** This separates domains; company/locality and resource state are checked separately. */
export function canClientUseTorreonPath(role: string, method: string, rest: string) {
  const kind = torreonClientKind(role);
  if (!kind) return true;
  const [rawPath, query = ""] = rest.split("?");
  const path = `/${rawPath.replace(/^\/+|\/+$/g, "")}`;
  const verb = method.toUpperCase();
  const incident = /^\/incidentes(?:\/|$)/.test(path);
  if (incident) {
    const tipo = new URLSearchParams(query).get("tipo");
    if (tipo && tipo.toUpperCase() !== kind) return false;
  }
  if (["GET", "HEAD"].includes(verb)) {
    return incident || (kind === "NATURAL"
      ? /^\/(movimientos|rondas)(?:\/|$)/.test(path)
      : /^\/arrastres(?:\/|$)/.test(path) || path === "/catalogos/arrastre");
  }
  if (["PATCH", "PUT", "POST"].includes(verb) && /^\/incidentes\/\d+\/(resolver|cerrar)$/.test(path)) return true;
  if (kind === "NATURAL") {
    return (verb === "POST" && path === "/movimientos")
      || (verb === "PATCH" && path === "/rondas/movimientos/orden");
  }
  return (verb === "POST" && path === "/arrastres")
    || (verb === "PATCH" && /^\/arrastres\/(?:orden-solicitudes|\d+(?:\/cancelar|\/vagones\/(?:orden|\d+))?)$/.test(path))
    || (["PATCH", "PUT", "POST"].includes(verb) && /^\/arrastres\/\d+\/incidentes\/\d+\/resolver$/.test(path));
}

/** An omitted incident type must never expose the other domain. */
export function scopeTorreonClientPath(role: string, rest: string) {
  const kind = torreonClientKind(role);
  const [path, query = ""] = rest.split("?");
  if (!kind || !/^\/incidentes(?:\/|$)/.test(path)) return rest;
  const params = new URLSearchParams(query);
  params.set("tipo", kind);
  return `${path}?${params.toString()}`;
}
