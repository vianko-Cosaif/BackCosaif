import { DateTime } from 'luxon';
import type { Snapshot } from './service';
import type { Group, ReportRow } from './analytics';
import { ZONE, BAND_LABELS } from './analytics';
import { escapeHtml } from '../modelos/pdf-helpers';

const num = (v: number | null, decimals = 1) => v === null ? 'Sin datos' : v.toLocaleString('es-MX', { maximumFractionDigits: decimals });
const mins = (v: number | null) => v === null ? 'Sin datos' : `${num(v)} min`;
const dualTime = (v: number | null) => v === null ? 'Sin datos' : `${v > 0 && v / 1440 < .01 ? '<0.01' : num(v / 1440, 2)} ${v === 1440 ? 'día' : 'días'}\n${mins(v)}`;
const dayNote = '1 día = 1,440 minutos (24 horas). Días y minutos expresan el mismo tiempo acumulado de movimientos; no son días naturales distintos ni días completos de paro del patio.';
const pct = (v: number | null) => v === null ? 'Sin datos' : `${num(v)}%`;
const local = (v: string | null) => v ? DateTime.fromISO(v, { zone: ZONE }).toFormat('dd/LL/yyyy HH:mm') : 'Sin registro';
const chunks = <T>(rows: T[], size: number): T[][] => {
  const pages = Math.ceil(rows.length / size), base = Math.floor(rows.length / Math.max(1, pages)), extra = rows.length % Math.max(1, pages);
  return Array.from({ length: pages }, (_, i) => { const start = i * base + Math.min(i, extra); return rows.slice(start, start + base + (i < extra ? 1 : 0)); });
};
const excerpt = (v: string, length = 180) => v.length > length ? `${v.slice(0, length)}… [texto completo en Excel]` : v;

export function reportHtml(r: Snapshot) {
  const e = escapeHtml, k = r.summary, inc = r.incidents;
  const pages: { title: string; subtitle: string; body: string }[] = [];
  const table = (headers: string[], rows: unknown[][], firstWide = true) => `<table class="${firstWide ? 'wide' : ''}"><thead><tr>${headers.map(h => `<th>${e(h)}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.map(row => `<tr>${row.map(v => `<td>${e(v)}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${headers.length}">Sin registros para estos filtros.</td></tr>`}</tbody></table>`;
  const note = (text: string) => `<p class="note">${e(text)}</p>`;
  const add = (title: string, subtitle: string, body: string) => pages.push({ title, subtitle, body });
  const scope = `${r.meta.from} al ${r.meta.to} · ${r.meta.company} · ${r.meta.client} · ${r.meta.locality}`;
  const bandTable = (groups: Group[]) => table(['Grupo', 'Solicitudes', '<10 min', '10–30 min', '>30 min', 'Detenidos / cancelados', '% en rango'], groups.map(g => [excerpt(g.label, 80), num(g.total, 0), num(g.durationShort, 0), num(g.durationAcceptable, 0), num(g.durationLong, 0), `${num(g.stopped, 0)} / ${num(g.cancelled, 0)}`, pct(g.acceptableRate)]));
  const impactTable = (groups: Group[]) => table(['Grupo', 'Espera promedio', 'Duración promedio', 'Con incidentes', 'Retraso cliente', 'Fechas pendientes'], groups.map(g => [excerpt(g.label, 80), mins(g.waitAverage), mins(g.executionAverage), `${num(g.affected, 0)} / ${num(g.total, 0)} (${pct(g.incidentRate)})`, dualTime(g.clientDelayDays === null ? null : g.clientDelayMinutes), num(g.clientDelayMissing, 0)]));
  const groupNote = 'En rango = 10 a 30 / concluidos, detenidos y cancelados con duración válida. El estado se conserva: una duración en rango no significa haber concluido. Menos de 10 requiere revisión; más de 30 requiere atención.';
  const impactNote = 'Retraso del cliente: inicio → detención/cancelación, según criterio administrativo. La espera se muestra aparte. Fechas pendientes indica intentos detenidos/cancelados sin intervalo calculable.';
  const groupPages = (title: string, subtitle: string, groups: Group[], size = 6) => {
    const batches = chunks(groups, size);
    if (!batches.length) { add(title, subtitle, note('No hay registros para estos filtros.')); return; }
    batches.forEach((batch, index) => add(title, `${subtitle} · Parte ${index + 1} de ${batches.length}`, `<h2>Duración de los movimientos</h2>${bandTable(batch)}${note(groupNote)}<h2>Espera, incidentes y tiempo por revisar</h2>${impactTable(batch)}${note(impactNote)}`));
  };

  const cards = [
    [num(k.total, 0), 'Solicitudes', `${num(k.concluded, 0)} concluidas · ${num(k.cancelled, 0)} canceladas`],
    [pct(k.acceptableRate), 'Duración aceptable', `${num(k.durationAcceptable, 0)} de ${num(k.executionN, 0)} evaluados: 10 a 30 min`],
    [mins(k.waitAverage), 'Espera promedio', `${num(k.waitN, 0)} intervalos válidos entre solicitud e inicio`],
    [pct(k.incidentRate), 'Movimientos con incidentes', `${num(k.affected, 0)} de ${num(k.total, 0)} solicitudes`],
  ];
  add('Resumen de la operación', scope,
    `<div class="cards">${cards.map(([value, label, text]) => `<div class="card"><strong>${e(value)}</strong><b>${e(label)}</b><span>${e(text)}</span></div>`).join('')}</div>` +
    `<h2>Qué conviene revisar primero</h2>${r.insights.slice(0, 2).map(i => `<div class="callout"><h3>${e(i.title)}</h3><p>${e(i.action)}</p></div>`).join('') || note('No hay hallazgos con estos filtros.')}` +
    r.meta.warnings.map(w => note(w)).join('') + note('El PDF incluye el desglose completo de empresas y clientes, más selecciones de vías, usuarios y movimientos. El Excel contiene todo el detalle. Fechas y horas en Ciudad de México.')
  );

  add('Duración: lo aceptable y lo que se revisa', 'Desde el inicio hasta el fin. Los límites 10 y 30 están incluidos en el rango aceptable.',
    table(['Criterio', 'Seleccionado', 'Anterior'], [
      [BAND_LABELS.short, num(k.durationShort, 0), num(r.baseline.durationShort, 0)],
      [BAND_LABELS.acceptable, num(k.durationAcceptable, 0), num(r.baseline.durationAcceptable, 0)],
      [BAND_LABELS.long, num(k.durationLong, 0), num(r.baseline.durationLong, 0)],
      ['Fechas pendientes de completar', num(k.durationMissing, 0), num(r.baseline.durationMissing, 0)],
      ['Proporción aceptable', pct(k.acceptableRate), pct(r.baseline.acceptableRate)],
      ['Duración promedio', mins(k.executionAverage), mins(r.baseline.executionAverage)],
      ['Duración habitual (mediana)', mins(k.executionMedian), mins(r.baseline.executionMedian)],
    ]) + note(groupNote) + note(`${num(k.durationOpen, 0)} abiertos sin corte. ${num(k.durationMissing, 0)} registros cerrados requieren completar o corregir fechas; conservan su estado y conteo.`) +
    `<h2>¿Cuánto tiempo requiere explicación?</h2><div class="callout"><b>${e(mins(k.excessMinutes))} sobre los 30 minutos</b><p>Exceso acumulado en ${num(k.durationLong, 0)} intentos concluidos, detenidos o cancelados.</p></div><div class="callout"><b>${e(mins(k.incidentMinutes))} coincidentes con incidentes</b><p>En los intervalos observados, incluidos abiertos hasta la consulta. Estos minutos pueden coincidir con el exceso y el retraso del cliente; no se suman.</p></div>` + note(impactNote) +
    note(`Anterior: ${local(r.meta.previousStart)} a ${local(r.meta.previousEndExclusive)}, fin exclusivo. ${r.meta.comparisonCovered ? 'La primera solicitud precede al periodo anterior.' : 'Historial insuficiente para interpretar el comparativo como mejora o deterioro.'}`)
  );

  add('Espera antes de comenzar', `Objetivo de espera: ${r.meta.target} minutos. Es distinto del rango de duración de 10 a 30.`,
    table(['Medida', 'Seleccionado', 'Anterior'], [
      ['Espera promedio', mins(k.waitAverage), mins(r.baseline.waitAverage)],
      ['Espera habitual (mediana)', mins(k.waitMedian), mins(r.baseline.waitMedian)],
      ['Espera para 9 de cada 10', mins(k.waitP90), mins(r.baseline.waitP90)],
      ['Comenzaron dentro del objetivo', pct(k.targetRate), pct(r.baseline.targetRate)],
      ['Intervalos válidos', num(k.waitN, 0), num(r.baseline.waitN, 0)],
      ['Sin espera válida', num(k.missingWait, 0), num(r.baseline.missingWait, 0)],
    ]) + `<h2>Turnos según la hora de solicitud</h2>` + table(['Turno', 'Solicitudes', 'Espera promedio', 'Duración promedio', 'Con incidentes'], r.shifts.map(g => [g.label, num(g.total, 0), mins(g.waitAverage), mins(g.executionAverage), pct(g.incidentRate)])) +
    note('El promedio es la suma de minutos / intervalos válidos. La mediana describe un caso habitual. Una espera larga puede incluir programación y preparación; requiere revisar la secuencia antes de atribuir una causa.') +
    note(`${num(k.pending, 0)} solicitudes del periodo siguen pendientes. Las que no tienen inicio no entran en el porcentaje del objetivo.`)
  );


  add('Retraso del cliente', 'Detenidos y cancelados conservan el tiempo que consumieron.',
    table(['Indicador', 'Valor', 'Cómo leerlo'], [
      ['Retraso del cliente', dualTime(k.clientDelayDays === null ? null : k.clientDelayMinutes), 'Inicio → detención o cancelación'],
      ['Tiempo coincidente con incidentes', dualTime(k.incidentDays === null ? null : k.incidentMinutes), 'Intervalos de incidentes dentro del movimiento; puede solaparse con el retraso'],
      ['Detenidos', num(k.stopped, 0), 'Pueden reprogramarse como otro intento'],
      ['Cancelados', num(k.cancelled, 0), 'No se cuentan como operación concluida'],
      ['Intentos con retraso calculable', num(k.clientDelayN, 0), 'Inicio y corte válidos'],
      ['Intentos con fechas pendientes', num(k.clientDelayMissing, 0), 'Se conservan; no se inventan minutos'],
      ['Cancelación por límite identificada', num(k.cancelledByIncidentLimit, 0), 'Referencia explícita a 3 o más incidentes'],
    ]) + note('Criterio operativo definido por la administración: el tiempo de detenidos y cancelados se atribuye al cliente asociado al movimiento. La espera antes del inicio y la duración de concluidos se muestran por separado. En un detenido sin fin, la fecha de pausa es el corte.') +
    '<h2>Retraso por empresa</h2>' + table(['Empresa', 'Detenidos', 'Cancelados', 'Retraso cliente', 'Fechas pendientes'], [...r.companies].sort((a, b) => b.clientDelayMinutes - a.clientDelayMinutes).map(c => [c.label, c.stopped, c.cancelled, dualTime('clientDelayDays' in c && c.clientDelayDays === null ? null : c.clientDelayMinutes), c.clientDelayMissing])) +
    note(dayNote) + note('El retraso del cliente puede coincidir con exceso sobre 30 o tiempo con incidentes; no se suman a esas lecturas.')
  );
  add('Reintentos que acumularon retraso', 'Hasta 8 cadenas / referencias con mayor retraso del cliente; todas en Excel.',
    table(['Empresa / cliente', 'Intentos visibles', 'Último estado visible', 'Retraso cliente', 'Espera acumulada'], r.retries.slice(0, 8).map(c => [excerpt(c.company + ' / ' + c.client, 70), c.ids.map(id => '#' + id).join(' → '), c.state + (c.cancelledByIncidentLimit ? ' · límite de incidentes' : ''), dualTime('clientDelayDays' in c && c.clientDelayDays === null ? null : c.clientDelayMinutes), mins(c.waitMinutes)])) +
    note('Se enlazan solo referencias explícitas entre IDs. Cada intento visible cuenta una vez. Las cadenas pueden ser parciales por periodo o filtros. Un detenido reprogramado conserva su tiempo anterior. Excel identifica continuaciones fuera de esta selección y fechas pendientes.')
  );
  for (const d of r.destinations) {
    add('Entradas a ' + d.label.toLowerCase(), 'Solo movimientos concluidos se cuentan como entradas. Los intentos fallidos se separan.',
      table(['Indicador', 'Valor'], [
        ['Entradas concluidas', num(d.concluded, 0)], ['Identificadas por vía de destino', num(d.completedVia, 0)], ['Identificadas por servicio marcado', num(d.completedService, 0)], ['Detenidos / cancelados', d.stopped + ' / ' + d.cancelled],
        ['Retraso del cliente hacia esta vía', dualTime(d.clientDelayDays === null ? null : d.clientDelayMinutes)], ['Detenidos/cancelados con fechas pendientes', num(d.clientDelayMissing, 0)],
        ['Espera promedio de entradas concluidas', mins(d.completed.waitAverage)], ['Ejecución promedio de entradas concluidas', mins(d.completed.executionAverage)],
        ['Entradas con ejecución calculable', num(d.completed.executionN, 0)],
      ]) + note('Destino ' + d.label + ' identificado por la vía o, cuando falta, por el servicio marcado en la solicitud. Cada movimiento cuenta una vez. Se excluye misma vía de origen y destino. Los tiempos describen el traslado, no el trabajo del servicio.') +
      '<h2>Por empresa</h2>' + table(['Empresa', 'Entradas', 'Detenidos', 'Cancelados', 'Retraso cliente'], d.companies.map(c => [c.label, c.concluded, c.stopped, c.cancelled, dualTime('clientDelayDays' in c && c.clientDelayDays === null ? null : c.clientDelayMinutes)]))
    );
    chunks([...d.clients].sort((a, b) => b.clientDelayMinutes - a.clientDelayMinutes), 9).forEach((batch, i) => add(d.label + ': entradas y retraso por cliente', 'Todos los grupos empresa / cliente del filtro · Parte ' + (i + 1),
      table(['Empresa / cliente', 'Entradas concluidas', 'Detenidos / cancelados', 'Retraso cliente', 'Ejecución prom. entradas'], batch.map(c => [excerpt(c.label, 80), c.concluded, c.stopped + ' / ' + c.cancelled, dualTime('clientDelayDays' in c && c.clientDelayDays === null ? null : c.clientDelayMinutes), mins(c.completed.executionAverage)])) +
      note('Incluye destinos identificados por vía y por servicio marcado. Las entradas concluidas y los intentos detenidos/cancelados son conteos distintos. El retraso corresponde al cliente del intento detenido o cancelado. Excel incluye las fechas y los casos pendientes de completar.')
    ));
  }

  groupPages('Desglose por empresa', `${r.companies.length} empresas incluidas · Todas las empresas del filtro`, r.companies);
  for (const company of r.companies) {
    const clients = r.clients.filter(c => String(c.companyId) === company.key).map(c => ({ ...c, label: c.client }));
    const ordered = [...clients].sort((a, b) => b.incidentMinutes - a.incidentMinutes || b.clientDelayMinutes - a.clientDelayMinutes);
    chunks(ordered, 7).forEach((batch, i) => add('Retrasos e incidentes por cliente', company.label + ' · Ordenado por tiempo con incidentes · Parte ' + (i + 1),
      table(['Cliente', 'Con incidentes', 'Tiempo con incidentes', 'Retraso del cliente', 'Fechas pendientes'], batch.map(c => [
        excerpt(c.client, 85), num(c.affected, 0) + ' movimientos\n' + pct(c.incidentRate) + ' del total',
        dualTime(c.incidentDays === null ? null : c.incidentMinutes),
        dualTime(c.clientDelayDays === null ? null : c.clientDelayMinutes),
        num(c.incidentTimeMissing, 0) + ' de incidentes\n' + num(c.clientDelayMissing, 0) + ' de retraso',
      ])) + note(dayNote) +
      note('Tiempo con incidentes: coincidencia entre el intervalo del movimiento y sus incidentes registrados; los simultáneos se cuentan una vez por movimiento. No demuestra por sí sola que todo ese tiempo haya sido causado por el incidente.') +
      note('Retraso del cliente: inicio → detención/cancelación, según el criterio administrativo. Las dos lecturas pueden solaparse y no se suman. Con fechas pendientes, el tiempo calculado es parcial; sin ningún intervalo válido se muestra Sin datos.')
    ));
    groupPages(`Clientes de ${company.label}`, `${num(company.total, 0)} solicitudes de la empresa · ${clients.length} clientes / grupos`, clients, 6);
  }
  groupPages('Vías más utilizadas', `Hasta 12 de ${r.vias.length} vías, por solicitudes. Una vez por movimiento y vía; no mide ocupación ni permanencia.`, r.vias.slice(0, 12));
  groupPages('Recorridos más frecuentes', `Hasta 6 de ${r.routes.length} recorridos por volumen de solicitudes`, r.routes.slice(0, 6));
  groupPages('Operadores y movimientos con incidentes', `Hasta 12 de ${r.operators.length} operadores, ordenados por movimientos con incidentes. Asignación registrada, no causalidad.`, [...r.operators].sort((a, b) => b.affected - a.affected || b.total - a.total).slice(0, 12));

  add('Incidentes: cierre y resolución', 'Un cierre automático no se presenta como una resolución.',
    table(['Indicador', 'Valor', 'Base / interpretación'], [
      ['Abiertos', num(inc.open, 0), 'Estado ABIERTO'], ['Resueltos', num(inc.resolved, 0), 'Estado RESUELTO'], ['Cerrados', num(inc.closed, 0), 'Estado CERRADO; puede incluir cierre automático'],
      ['Resolución promedio', mins(inc.resolutionAverage), `${inc.resolutionN} resoluciones válidas`], ['Resolución habitual', mins(inc.resolutionMedian), 'Mediana de resueltos con duración válida'], ['Resolución para 9 de cada 10', mins(inc.resolutionP90), `${inc.resolutionMissing} resueltos sin intervalo válido`],
    ]) + `<h2>Descripciones más repetidas (hasta 7)</h2>` + table(['Descripción registrada', 'Incidentes', 'Movimientos'], inc.frequent.slice(0, 7).map(i => [excerpt(i.description), i.count, i.movements])) + note('Se agrupan textos iguales ignorando mayúsculas y espacios repetidos. Son descripciones registradas; no clasifican automáticamente causas ni responsables.')
  );
  chunks(inc.reporters.slice(0, 16), 10).forEach((rows, index) => add('Usuarios que registraron más incidentes', `Informantes · Hasta 16 de ${inc.reporters.length} · Parte ${index + 1}`,
    table(['Informante', 'Incidentes', 'Movimientos', 'Abiertos', 'Resueltos', 'Cerrados', 'Resolución prom.'], rows.map(i => [excerpt(i.label, 70), i.total, i.movements, i.open, i.resolved, i.closed, mins(i.resolutionAverage)])) + note('El usuario del incidente es el informante registrado. No se interpreta como causante ni como quien lo resolvió. Para revisar usuarios asociados a la solicitud consulta Clientes; para responsables asignados, Operadores.') + note('La atribución de retraso al cliente sigue la regla administrativa de detenidos y cancelados. El informante del incidente se conserva por separado.')
  ));

  const cases = (title: string, subtitle: string, rows: ReportRow[], metric: 'wait' | 'execution') => add(title, subtitle,
    table(['Movimiento / locomotora', 'Empresa / cliente', metric === 'wait' ? 'Espera' : 'Duración', 'Incidentes', 'Min. con incidentes'], rows.map(m => [`#${m.id} / ${m.locomotive} · ${m.stateLabel}`, `${excerpt(m.company, 40)} / ${excerpt(m.client, 50)}`, mins(m[metric]), m.incidentCount, mins(m.incidentMinutes)]), false) + note('Casos seleccionados para contrastar con la bitácora. En Excel están todas las solicitudes, sus fechas, responsables y descripciones de incidentes.')
  );
  cases('Duraciones menores de 10: revisar', 'Hasta 10 movimientos, empezando por los más cortos. El tiempo corto requiere explicación.', r.rows.filter(m => m.durationBand === 'short').sort((a, b) => a.execution! - b.execution! || b.id - a.id).slice(0, 10), 'execution');
  cases('Duraciones mayores de 30: atención', 'Hasta 10 movimientos, empezando por los más largos.', r.rows.filter(m => m.durationBand === 'long').sort((a, b) => b.execution! - a.execution! || b.id - a.id).slice(0, 10), 'execution');
  cases('Mayores esperas antes de iniciar', `Hasta 10 movimientos con espera mayor de ${r.meta.target} minutos.`, r.rows.filter(m => m.wait !== null && m.wait > r.meta.target).sort((a, b) => b.wait! - a.wait! || b.id - a.id).slice(0, 10), 'wait');

  add('Calidad de los registros', 'Las revisiones ayudan a comprobar los datos con la operación.', table(['Revisión', 'Movimientos'], r.quality.map(q => [q.label, num(q.count, 0)])) + note('Un movimiento puede aparecer en varias revisiones. Una ausencia puede ser legítima según la maniobra; no se corrige automáticamente.') + note(`Primera solicitud observable: ${local(r.meta.firstRequest)}. Última: ${local(r.meta.lastRequest)}.`));
  chunks(r.methodology, 5).forEach((items, index) => add('Cómo leer e interpretar el reporte', `Guía de lectura · Parte ${index + 1} de ${Math.ceil(r.methodology.length / 5)}`,
    items.map(m => `<div class="method"><h2>${e(m.label)}</h2><p>${e(m.text)}</p></div>`).join('')
  ));

  const destinations = ['Retraso del cliente', 'Entradas a torno', 'Entradas a lavado', 'Desglose por empresa', 'Retrasos e incidentes por cliente', 'Vías más utilizadas', 'Incidentes: cierre y resolución', 'Calidad de los registros', 'Cómo leer e interpretar el reporte'];
  pages[0].body += '<h2>Guía rápida del documento</h2>' + note(destinations.map(title => title + ': página ' + (pages.findIndex(p => p.title === title) + 1)).join(' · '));
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Cosaif | Reporte administrativo</title><style>
    *{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;font-size:10pt;line-height:1.45;color:#142c45}section{break-before:page}section:first-child{break-before:auto}.eyebrow{font-size:9pt;letter-spacing:1.4px;color:#167d9a;font-weight:bold}h1{font-size:24pt;line-height:1.15;margin:12px 0}h2{font-size:13pt;margin:18px 0 8px;break-after:avoid}h3{font-size:11pt;margin:0 0 6px}.subtitle,.note{color:#506174}.subtitle{font-size:10pt;margin:8px 0 16px}.stamp{font-size:8pt;color:#657488;margin:0 0 15px}.note{font-size:9pt;margin:10px 0}.cards{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:18px 0}.card{padding:15px;border:1px solid #dce5ec;border-radius:8px;display:flex;flex-direction:column;gap:5px}.card strong{font-size:25pt;line-height:1.2}.card b{font-size:10pt}.card span{font-size:9pt;color:#506174}.callout{padding:12px 15px;background:#edf7fa;border-left:3px solid #167d9a;margin:12px 0;break-inside:avoid}.callout p{margin:4px 0 0}table{border-collapse:collapse;width:100%;table-layout:fixed;font-size:9pt;margin:10px 0}table.wide th:first-child{width:28%}th{background:#142c45;color:white;text-align:left;font-size:8.5pt;padding:8px 6px}td{padding:8px 6px;border-bottom:1px solid #dce5ec;vertical-align:top;white-space:pre-line;overflow-wrap:anywhere}tr{break-inside:avoid}tr:nth-child(even) td{background:#f4f7fa}thead{display:table-header-group}.method{break-inside:avoid;margin:20px 0}.method p{margin:8px 0;line-height:1.6}
  </style></head><body>${pages.map((p, index) => `<section><div class="eyebrow">COSAIF / ADMINISTRACIÓN / ${String(index + 1).padStart(2, '0')}</div><h1>${e(p.title)}</h1><p class="subtitle">${e(p.subtitle)}</p><p class="stamp">Consulta ${e(r.meta.id.slice(0, 8))} · ${e(r.meta.from)} al ${e(r.meta.to)} · Generado ${e(local(r.meta.generatedAt))} (${ZONE})</p>${p.body}</section>`).join('')}</body></html>`;
}
