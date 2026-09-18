import type { RequestHandler } from 'express';
import { prisma } from '../lib/prisma';
import { prismaTorno } from '../lib/servicePrisma';
import { buildAuthorizationProfile, PERMISSIONS } from './accessPolicy';
import { resourceFitsAuthorizationScope } from './resourceScope';
import type { AuthenticatedUser } from '../types/auth';

const models: Record<string, string> = {
  'rueda-solicitudes': 'ruedaSolicitud', 'ruedas-finales': 'ruedasFinal',
  'rondas-servicio': 'rondaServicio', 'torno-g': 'tornoG', 'torno-ruedas': 'tornoRuedaTrabajo',
  incidentes: 'incidenteTorno', 'incidentes-hijos': 'incidenteTornoHijo',
  navajas: 'nava', 'cambios-navaja': 'cambio', 'torno/agendados': 'tornoAgendado',
};
const include: Record<string, any> = {
  ruedasFinal: { ruedaSolicitud: true }, rondaServicio: { ruedaSolicitud: true },
  tornoG: { ruedaSolicitud: true, rondaServicio: { include: { ruedaSolicitud: true } } },
  tornoRuedaTrabajo: { tornoG: { include: { ruedaSolicitud: true, rondaServicio: { include: { ruedaSolicitud: true } } } } },
  incidenteTorno: { ruedaSolicitud: true, rondaServicio: { include: { ruedaSolicitud: true } } },
  incidenteTornoHijo: { incidenteTorno: { include: { ruedaSolicitud: true, rondaServicio: { include: { ruedaSolicitud: true } } } } },
};
const failure = (status: number, message: string): never => { throw Object.assign(new Error(message), { status }); };
function idsFromRow(row: any): { movimientoId?: number; localidadId?: number } {
  if (!row) return {};
  const inner = row.incidenteTorno ?? row.tornoG ?? row;
  return {
    movimientoId: inner.movimientoId ?? inner.idMovimiento ?? inner.ruedaSolicitud?.movimientoId ?? inner.rondaServicio?.ruedaSolicitud?.movimientoId,
    localidadId: inner.localidadId ?? inner.localidad ?? inner.rondaServicio?.localidadId,
  };
}
function scopeAllows(user: AuthenticatedUser, scope: { empresaId?: number; localidadId?: number }) {
  const auth = buildAuthorizationProfile(user);
  if (auth.scope.mode === 'GLOBAL') return true;
  if (auth.scope.mode === 'LOCALITY') return Boolean(auth.scope.localidadId && auth.scope.localidadId === scope.localidadId);
  return Boolean(scope.empresaId && scope.localidadId && resourceFitsAuthorizationScope(auth, scope as { empresaId: number; localidadId: number }));
}
async function rowsWithScope(model: string, ids: number[]) {
  const rows = await prismaTorno[model].findMany({ where: { id: { in: ids } }, ...(include[model] ? { include: include[model] } : {}) });
  const movementIds = [...new Set<number>(rows.map((r: any) => idsFromRow(r).movimientoId).filter(Boolean))];
  const movements = await prisma.movimiento.findMany({ where: { id: { in: movementIds } }, select: { id: true, empresaId: true, localidadId: true } });
  const byId = new Map(movements.map(row => [row.id, row]));
  return rows.map((row: any) => ({ row, scope: byId.get(idsFromRow(row).movimientoId!) ?? idsFromRow(row) }));
}

function rowIdForScope(model: string, row: any) {
  const raw =
    row?.id ??
    (model === 'rondaServicio' ? row?.rondaServicioId ?? row?.servicioId : null) ??
    (model === 'ruedaSolicitud' ? row?.ruedaSolicitudId : null) ??
    (model === 'tornoG' ? row?.tornoGId ?? row?.torno?.id : null);
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
export function tornoResource(path: string) {
  const match = path.match(/^\/(torno\/agendados|[^/]+)(?:\/(\d+))?/);
  return { kind: match?.[1] ?? '', id: match?.[2] ? Number(match[2]) : null };
}
function allowedRoute(method: string, path: string) {
  const read = method === 'GET' || method === 'HEAD';
  if (read && /^\/(imagenes|health|cambios-navaja\/estadisticas|rondas-servicio\/historial|incidentes\/\d+\/(hijos|resumen-resolucion)|torno\/agendados(?:\/activable)?)$/.test(path)) return true;
  if (/^\/torno\/agendados$/.test(path)) return method === 'POST';
  if (/^\/torno\/agendados\/\d+$/.test(path)) return method === 'DELETE';
  if (/^\/rondas-servicio\/\d+\/(iniciar|concluir|ejes\/\d+\/(iniciar|finalizar))$/.test(path)) return method === 'POST';
  if (/^\/incidentes(?:-hijos)?\/\d+\/resolver$/.test(path)) return method === 'POST' || method === 'PATCH';
  if (/^\/incidentes\/\d+\/ronda-status$/.test(path)) return method === 'PATCH';
  if (/^\/incidentes\/\d+\/hijos$/.test(path)) return method === 'POST';
  const match = path.match(/^\/([^/]+)(\/\d+)?$/);
  return Boolean(match && models[match[1]] && (read || (match[2] ? ['PATCH', 'DELETE'].includes(method) : method === 'POST')));
}
export async function filterTornoResponse(data: any, path: string, user: AuthenticatedUser): Promise<any> {
  if (buildAuthorizationProfile(user).scope.mode === 'GLOBAL') return data;
  const { kind } = tornoResource(path);
  const model = path.match(/^\/incidentes\/\d+\/hijos/) ? 'incidenteTornoHijo' : models[kind];
  if (!model) return data;
  if (kind === 'torno/agendados' && data?.scheduled) {
    const found = (await rowsWithScope(model, [Number(data.scheduled.id)]))[0];
    return found && scopeAllows(user, found.scope) ? data : { activable: false, scheduled: null };
  }
  const rows = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.items) ? data.items : null;
  if (!rows) return data; // Detail and all references are authorized before forwarding.
  const ids = rows.map((r: any) => rowIdForScope(model, r)).filter((id: number | null): id is number => id != null);
  const allowed = new Set((await rowsWithScope(model, ids)).filter((r: any) => scopeAllows(user, r.scope)).map((r: any) => r.row.id));
  const filtered = rows.filter((r: any) => {
    const id = rowIdForScope(model, r);
    return id != null && allowed.has(id);
  });
  return Array.isArray(data) ? filtered : { ...data, [Array.isArray(data.items) ? 'items' : 'data']: filtered, ...(data.meta ? { meta: { page: data.meta.page, pageSize: data.meta.pageSize, hasNextPage: data.meta.hasNextPage } } : {}) };
}

export const requireTornoScope: RequestHandler = (req, res, next) => {
  void (async () => {
    const user = req.user as AuthenticatedUser;
    const auth = req.authorization ?? buildAuthorizationProfile(user);
    const read = req.method === 'GET' || req.method === 'HEAD';
    const path = req.path.replace(/\/+$/, '') || '/';
    const { kind, id } = tornoResource(path);
    const model = models[kind];
    if (!allowedRoute(req.method, path)) return failure(404, 'Ruta de torno no disponible');
    const permissions = new Set(auth.permissions);
    const clientMeasurement = kind === 'rueda-solicitudes' && ['POST', 'PATCH'].includes(req.method);
    if (!permissions.has(PERMISSIONS.TORNO_READ) || (!read && !permissions.has(PERMISSIONS.TORNO_OPERATE) && !(clientMeasurement && permissions.has(PERMISSIONS.MOVEMENTS_CREATE)))) {
      return failure(403, 'No autorizado para esta operación de torno');
    }
    if (path.endsWith('/cancelar-externo') || path.endsWith('/vencidos')) return failure(403, 'Operación reservada al servicio interno');
    if (read && auth.scope.mode !== 'GLOBAL') {
      if (['LOCALITY', 'COMPANY_LOCALITY'].includes(auth.scope.mode)) {
        if (!auth.scope.localidadId) return failure(403, 'Localidad requerida');
        req.query[kind === 'torno/agendados' ? 'localidad' : 'localidadId'] = String(auth.scope.localidadId);
      }
      if (path === '/cambios-navaja/estadisticas' && auth.scope.mode !== 'LOCALITY') return failure(403, 'Estadísticas reservadas a operación de localidad');
    }
    const scopes: any[] = [];
    const check = async (resourceModel: string, resourceId: unknown) => {
      const n = Number(resourceId);
      if (!Number.isSafeInteger(n) || n <= 0) return failure(400, 'Referencia inválida');
      const found = resourceModel === 'movimiento'
        ? await prisma.movimiento.findUnique({ where: { id: n }, select: { empresaId: true, localidadId: true } })
        : (await rowsWithScope(resourceModel, [n]))[0]?.scope;
      if (!found) return failure(404, 'Recurso no encontrado');
      if (!scopeAllows(user, found)) return failure(403, 'Recurso fuera de tu alcance');
      scopes.push(found);
    };
    if (id) await check(kind === 'torno/agendados' ? 'movimiento' : model, id);
    for (const [key, target] of Object.entries({ movimientoId: 'movimiento', idMovimiento: 'movimiento', ruedaSolicitudId: 'ruedaSolicitud', ruedasFinalId: 'ruedasFinal', rondaServicioId: 'rondaServicio', tornoGId: 'tornoG', incidenteTornoId: 'incidenteTorno', detenidoPorIncidenteId: 'incidenteTorno', canceladoPorIncidenteId: 'incidenteTorno' })) {
      for (const source of [req.body, req.query]) if (source?.[key] != null) await check(target, source[key]);
    }
    if (path === '/imagenes') {
      const ruta = String(req.query.ruta ?? '');
      if (!ruta || ruta.includes('..')) return failure(400, 'Ruta inválida');
      let found = false;
      for (const imageModel of ['incidenteTorno', 'incidenteTornoHijo', 'cambio']) {
        const image = await prismaTorno[imageModel].findFirst({ where: { OR: ['imagen1', 'imagen2', 'imagen3'].map(key => ({ [key]: ruta })) }, select: { id: true } });
        if (image) { await check(imageModel, image.id); found = true; break; }
      }
      if (!found) return failure(404, 'Imagen no encontrada');
    }
    if (!read) {
      const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : (req.body = {});
      const locality = Number(body.localidadId ?? body.localidad ?? scopes[0]?.localidadId ?? auth.scope.localidadId);
      if (!scopeAllows(user, { localidadId: locality, empresaId: scopes[0]?.empresaId }) && !scopes.length) return failure(403, 'Debes indicar un recurso dentro de tu alcance');
      if (scopes.some(s => s.localidadId && locality && s.localidadId !== locality)) return failure(403, 'Las referencias pertenecen a localidades diferentes');
      if (body.localidadId != null && !scopeAllows(user, { localidadId: locality, empresaId: scopes[0]?.empresaId })) return failure(403, 'Localidad fuera de tu alcance');
      for (const field of ['creadoPorId', 'atendidoPorId', 'torneroId', 'resueltoPorId']) if (field in body) body[field] = user.id;
    }
    next();
  })().catch(error => { if (!res.headersSent) res.status(error.status ?? 503).json({ error: error.status ? error.message : 'No se pudo validar el alcance de torno' }); });
};
