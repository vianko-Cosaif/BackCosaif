// reporteria/modelos/cliente-carga-operativa-pdf.ts
// PDF de carga operativa por empresa.

import type { ReporteClienteCargaOperativa } from './cliente-carga-operativa-model';
import { getBrowser } from './pdf-browser';
import { baseCss, escapeHtml, fmtNum, safeFilename, svgBar, svgLine } from './pdf-helpers';

export type PdfFile = { filename: string; contentType: 'application/pdf'; buffer: Buffer };

function shortLabel(value: string | number | null | undefined, max = 18) {
  const s = String(value ?? '—');
  return s.length > max ? `${s.slice(0, Math.max(0, max - 3))}...` : s;
}

function serviceRows(r: ReporteClienteCargaOperativa) {
  const total = Math.max(1, r.resumen.totalMovimientos);
  const rows = [
    ['Torno', r.resumen.servicios.torno],
    ['Lavado', r.resumen.servicios.lavado],
    ['Torno + Lavado', r.resumen.servicios.tornoLavado],
    ['Sin servicio', r.resumen.servicios.sinServicio],
  ];

  return rows
    .map(([label, value]) => {
      const n = Number(value);
      return `
        <div class="bar-row mini">
          <div class="bar-label">${escapeHtml(label)}</div>
          <div class="bar-track"><div class="bar-fill teal" style="width:${Math.max(5, Math.round((n / total) * 100))}%"></div></div>
          <div class="bar-val">${fmtNum(n)}</div>
        </div>
      `;
    })
    .join('');
}

function estadosRows(r: ReporteClienteCargaOperativa) {
  const total = Math.max(1, r.resumen.totalMovimientos);
  return Object.entries(r.resumen.estados)
    .map(([estado, value]) => {
      const n = Number(value);
      return `
        <div class="bar-row mini">
          <div class="bar-label">${escapeHtml(estado)}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${Math.max(5, Math.round((n / total) * 100))}%"></div></div>
          <div class="bar-val">${fmtNum(n)}</div>
        </div>
      `;
    })
    .join('');
}

function heatmap(r: ReporteClienteCargaOperativa) {
  const max = Math.max(1, ...r.matrizDiaHora.flatMap((row) => row.horas));
  const head = Array.from({ length: 24 }, (_, h) => `<div class="hm-head">${String(h).padStart(2, '0')}</div>`).join('');

  const rows = r.matrizDiaHora
    .map((row) => {
      const cells = row.horas
        .map((value) => {
          const alpha = value ? Math.max(0.16, Math.min(0.92, value / max)) : 0.04;
          const color = value ? `rgba(14, 116, 144, ${alpha})` : 'rgba(148, 163, 184, 0.10)';
          return `<div class="hm-cell" style="background:${color}">${value ? fmtNum(value) : ''}</div>`;
        })
        .join('');

      return `
        <div class="hm-row-label">${escapeHtml(row.dia)}</div>
        ${cells}
      `;
    })
    .join('');

  return `
    <div class="heatmap">
      <div></div>
      ${head}
      ${rows}
    </div>
  `;
}

function buildHtml(r: ReporteClienteCargaOperativa) {
  const empresa = escapeHtml(r.meta.empresaNombre ?? `Empresa ${r.meta.empresaId}`);
  const periodo = escapeHtml(r.meta.periodo);
  const periodoLabel = escapeHtml(r.meta.periodoLabel);
  const rango = escapeHtml(r.meta.rangoTexto);
  const tz = escapeHtml(r.meta.tz);
  const total = r.resumen.totalMovimientos;

  const dayLabels = r.movimientosPorDia.map((d) => d.fecha.slice(5));
  const dayValues = r.movimientosPorDia.map((d) => d.movimientos);
  const dayChart = svgLine({
    title: 'Movimientos por dia',
    subtitle: 'Fecha de solicitud',
    labels: dayLabels,
    values: dayValues,
    height: 320,
    stroke: '#0F766E',
    fill: 'rgba(15, 118, 110, 0.16)',
    xLabelEvery: Math.max(1, Math.ceil(dayLabels.length / 12)),
  });

  const hourChart = svgBar({
    title: 'Carga por hora',
    subtitle: 'Hora local de solicitud',
    labels: r.movimientosPorHora.map((h) => String(h.hora).padStart(2, '0')),
    values: r.movimientosPorHora.map((h) => h.movimientos),
    height: 320,
    fill: '#2563EB',
  });

  const topVias = r.vias.slice(0, 10);
  const viasChart = svgBar({
    title: 'Vias y servicios con mayor carga',
    subtitle: 'Origen + destino + servicios',
    labels: topVias.map((v) => shortLabel(v.via, 16)),
    values: topVias.map((v) => v.totalUsos),
    height: 340,
    fill: '#7C3AED',
  });

  const topLocos = r.locomotoras.slice(0, 10);
  const locosChart = svgBar({
    title: 'Locomotoras mas movidas',
    subtitle: 'Frecuencia del periodo',
    labels: topLocos.map((l) => `L-${l.locomotiveNumber}`),
    values: topLocos.map((l) => l.movimientos),
    height: 340,
    fill: '#EA580C',
  });

  const viaRows = topVias
    .map((v, idx) => `
      <tr>
        <td class="mono right">${idx + 1}</td>
        <td>${escapeHtml(v.via)}</td>
        <td>${escapeHtml(v.localidad)}</td>
        <td class="mono right">${fmtNum(v.totalUsos)}</td>
        <td class="mono right">${fmtNum(v.comoOrigen)}</td>
        <td class="mono right">${fmtNum(v.comoDestino)}</td>
        <td class="mono right">${fmtNum(v.locomotorasUnicas)}</td>
        <td class="mono right">${fmtNum(v.cargaRelativaPct)}%</td>
      </tr>
    `)
    .join('') || `<tr><td colspan="8" class="muted">Sin datos.</td></tr>`;

  const locoRows = r.locomotoras.slice(0, 15)
    .map((l, idx) => `
      <tr>
        <td class="mono right">${idx + 1}</td>
        <td class="mono">L-${escapeHtml(l.locomotiveNumber)}</td>
        <td class="mono right">${fmtNum(l.movimientos)}</td>
        <td class="mono right">${fmtNum(l.viasUsadas)}</td>
        <td class="mono right">${fmtNum(l.diasActivos)}</td>
        <td class="mono right">${fmtNum(l.estados.CONCLUIDO)}</td>
        <td class="mono right">${fmtNum(l.estados.CANCELADO)}</td>
      </tr>
    `)
    .join('') || `<tr><td colspan="7" class="muted">Sin datos.</td></tr>`;

  const diaRows = r.movimientosPorDia
    .slice()
    .sort((a, b) => b.movimientos - a.movimientos || a.fecha.localeCompare(b.fecha))
    .slice(0, 15)
    .map((d, idx) => `
      <tr>
        <td class="mono right">${idx + 1}</td>
        <td class="mono">${escapeHtml(d.fecha)}</td>
        <td>${escapeHtml(d.diaSemana)}</td>
        <td class="mono right">${fmtNum(d.movimientos)}</td>
        <td class="mono right">${fmtNum(d.locomotorasUnicas)}</td>
        <td class="mono right">${fmtNum(d.viasRelacionadas)}</td>
      </tr>
    `)
    .join('') || `<tr><td colspan="6" class="muted">Sin datos.</td></tr>`;

  const userRows = r.usuariosSolicitantes.slice(0, 15)
    .map((u, idx) => `
      <tr>
        <td class="mono right">${idx + 1}</td>
        <td>${escapeHtml(u.nombre)}</td>
        <td>${escapeHtml(u.rol)}</td>
        <td class="mono right">${fmtNum(u.solicitudes)}</td>
        <td class="mono right">${fmtNum(u.locomotorasUnicas)}</td>
        <td class="mono right">${fmtNum(u.viasRelacionadas)}</td>
        <td class="mono right">${fmtNum(u.estados.CANCELADO)}</td>
      </tr>
    `)
    .join('') || `<tr><td colspan="7" class="muted">Sin datos.</td></tr>`;

  const turnoRows = r.movimientosPorTurno
    .map((t) => `
      <tr>
        <td>${escapeHtml(t.turnoLabel)}</td>
        <td class="mono">${escapeHtml(t.turnoRango)}</td>
        <td class="mono right">${fmtNum(t.movimientos)}</td>
        <td class="mono right">${fmtNum(t.pct)}%</td>
      </tr>
    `)
    .join('');

  const detalleRows = r.detalle
    .map((m) => `
      <tr>
        <td class="mono right">${fmtNum(m.id)}</td>
        <td class="mono">L-${escapeHtml(m.locomotiveNumber)}</td>
        <td>${escapeHtml(m.estado)}</td>
        <td class="mono">${escapeHtml(m.fechaSolicitudMX)}</td>
        <td>${escapeHtml(m.diaSemana)}</td>
        <td>${escapeHtml(m.turnoLabel)}</td>
        <td>${escapeHtml(m.viaOrigen ?? '—')}</td>
        <td>${escapeHtml(m.viaDestino ?? '—')}</td>
        <td>${escapeHtml(m.servicio)}</td>
        <td>${escapeHtml(m.solicitadoPor)}</td>
      </tr>
    `)
    .join('') || `<tr><td colspan="10" class="muted">Sin datos.</td></tr>`;

  const css = `
    ${baseCss()}
    @page { margin: 10mm; }
    body { padding: 0; background: #f8fafc; }
    .hero {
      padding: 18px;
      border-radius: 16px;
      color: #fff;
      background: linear-gradient(135deg, #0f766e, #1d4ed8 58%, #7c3aed);
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);
    }
    .hero .title { font-size: 30px; font-weight: 900; }
    .hero .subtitle, .hero .meta { color: rgba(255,255,255,0.86); }
    .hero .pill { color: #0f172a; border: 0; background: rgba(255,255,255,0.90); }
    .kpi-grid { margin-top: 12px; grid-template-columns: repeat(3, 1fr); }
    .kpi { border-radius: 10px; }
    .grid-2.cols { align-items: start; }
    .card { border-radius: 10px; }
    .bar-row.mini { grid-template-columns: 132px 1fr 52px; }
    .bar-fill.teal { background: linear-gradient(90deg, #0f766e, #5eead4); }
    .stat-note { margin-top: 8px; color: var(--muted); font-size: 11px; }
    .tag {
      display: inline-block;
      padding: 3px 7px;
      border-radius: 999px;
      background: #ecfeff;
      border: 1px solid #a5f3fc;
      color: #155e75;
      font-weight: 800;
      font-size: 10px;
    }
    .heatmap {
      display: grid;
      grid-template-columns: 38px repeat(24, 1fr);
      gap: 2px;
      align-items: stretch;
    }
    .hm-head {
      text-align: center;
      color: var(--muted);
      font-size: 8px;
      font-weight: 800;
    }
    .hm-row-label {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 5px;
      color: var(--muted);
      font-size: 10px;
      font-weight: 800;
    }
    .hm-cell {
      min-height: 19px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 8px;
      font-weight: 900;
      font-variant-numeric: tabular-nums;
    }
    .hm-cell:empty { color: transparent; }
    .table-tight th, .table-tight td { font-size: 9px; padding: 4px 3px; }
    .footer-note {
      margin-top: 8px;
      color: var(--muted);
      font-size: 10px;
    }
  `;

  return `
    <html>
      <head><style>${css}</style></head>
      <body>
        <div class="page">
          <div class="hero">
            <div>
              <div class="pill">Cliente · Carga operativa</div>
              <div class="title">${empresa}</div>
              <div class="subtitle">${periodo} · ${periodoLabel} · ${rango}</div>
            </div>
            <div class="meta">
              <div><b>Base</b>: fecha de solicitud</div>
              <div>TZ: ${tz}</div>
            </div>
          </div>

          <div class="kpi-grid">
            <div class="kpi">
              <div class="label">Movimientos</div>
              <div class="value">${fmtNum(total)}</div>
              <div class="sub">Total del periodo</div>
            </div>
            <div class="kpi">
              <div class="label">Locomotoras</div>
              <div class="value">${fmtNum(r.resumen.totalLocomotoras)}</div>
              <div class="sub">Unicas con movimiento</div>
            </div>
            <div class="kpi">
              <div class="label">Vias tocadas</div>
              <div class="value">${fmtNum(r.resumen.totalVias)}</div>
              <div class="sub">Origen o destino</div>
            </div>
            <div class="kpi">
              <div class="label">Via con mas carga</div>
              <div class="value">${escapeHtml(shortLabel(r.resumen.viaMasCargada?.via ?? '—', 16))}</div>
              <div class="sub">${fmtNum(r.resumen.viaMasCargada?.movimientos ?? 0)} usos</div>
            </div>
            <div class="kpi">
              <div class="label">Hora pico</div>
              <div class="value">${escapeHtml(r.resumen.horaPico?.label ?? '—')}</div>
              <div class="sub">${fmtNum(r.resumen.horaPico?.movimientos ?? 0)} movimientos</div>
            </div>
            <div class="kpi">
              <div class="label">Locomotora top</div>
              <div class="value">${r.resumen.locomotoraMasMovida ? `L-${escapeHtml(r.resumen.locomotoraMasMovida.locomotiveNumber)}` : '—'}</div>
              <div class="sub">${fmtNum(r.resumen.locomotoraMasMovida?.movimientos ?? 0)} movimientos</div>
            </div>
          </div>

          <div class="grid-2">
            <div class="card">${dayChart}</div>
            <div class="card">${hourChart}</div>
          </div>

          <div class="grid-2 cols">
            <div class="card">
              <h3>Servicios solicitados</h3>
              ${serviceRows(r)}
              <div class="stat-note">No incluye tiempos; solo frecuencia por servicio.</div>
            </div>
            <div class="card">
              <h3>Estados</h3>
              ${estadosRows(r)}
            </div>
          </div>
        </div>

        <div class="page break">
          <div class="section-title">Carga por vias y locomotoras</div>
          <div class="grid-2">
            <div class="card">${viasChart}</div>
            <div class="card">${locosChart}</div>
          </div>

          <div class="grid-2 cols">
            <div class="card">
              <h3>Top vias</h3>
              <table class="table-tight">
                <thead>
                  <tr>
                    <th class="right">#</th>
                    <th>Via</th>
                    <th>Localidad</th>
                    <th class="right">Usos</th>
                    <th class="right">Origen</th>
                    <th class="right">Destino</th>
                    <th class="right">Loc.</th>
                    <th class="right">Carga</th>
                  </tr>
                </thead>
                <tbody>${viaRows}</tbody>
              </table>
            </div>
            <div class="card">
              <h3>Top locomotoras</h3>
              <table class="table-tight">
                <thead>
                  <tr>
                    <th class="right">#</th>
                    <th>Locomotora</th>
                    <th class="right">Mov.</th>
                    <th class="right">Vias</th>
                    <th class="right">Dias</th>
                    <th class="right">Conc.</th>
                    <th class="right">Canc.</th>
                  </tr>
                </thead>
                <tbody>${locoRows}</tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="page break">
          <div class="section-title">Dias, horas y turnos</div>
          <div class="card">
            <h3>Mapa de carga dia-hora</h3>
            ${heatmap(r)}
          </div>

          <div class="grid-2 cols">
            <div class="card">
              <h3>Dias con mayor carga</h3>
              <table>
                <thead>
                  <tr>
                    <th class="right">#</th>
                    <th>Fecha</th>
                    <th>Dia</th>
                    <th class="right">Mov.</th>
                    <th class="right">Loc.</th>
                    <th class="right">Vias</th>
                  </tr>
                </thead>
                <tbody>${diaRows}</tbody>
              </table>
            </div>
            <div class="card">
              <h3>Movimientos por turno</h3>
              <table>
                <thead>
                  <tr>
                    <th>Turno</th>
                    <th>Rango</th>
                    <th class="right">Mov.</th>
                    <th class="right">%</th>
                  </tr>
                </thead>
                <tbody>${turnoRows}</tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="page break">
          <div class="section-title">Usuarios y detalle</div>
          <div class="card">
            <h3>Usuarios solicitantes</h3>
            <table>
              <thead>
                <tr>
                  <th class="right">#</th>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th class="right">Solicitudes</th>
                  <th class="right">Loc.</th>
                  <th class="right">Vias</th>
                  <th class="right">Canc.</th>
                </tr>
              </thead>
              <tbody>${userRows}</tbody>
            </table>
          </div>

          <div class="section-title">Detalle de movimientos</div>
          <div class="card">
            <table class="table-tight">
              <thead>
                <tr>
                  <th class="right">ID</th>
                  <th>Loc.</th>
                  <th>Estado</th>
                  <th>Solicitud</th>
                  <th>Dia</th>
                  <th>Turno</th>
                  <th>Via origen</th>
                  <th>Via destino</th>
                  <th>Servicio</th>
                  <th>Solicito</th>
                </tr>
              </thead>
              <tbody>${detalleRows}</tbody>
            </table>
            <div class="footer-note">
              Detalle incluido: ${fmtNum(r.detalleMeta.incluidos)} de ${fmtNum(r.detalleMeta.totalMovimientos)} movimientos${r.detalleMeta.truncado ? `. Limite aplicado: ${fmtNum(r.detalleMeta.limit)}.` : '.'}
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function exportarClienteCargaOperativaPDF(reporte: ReporteClienteCargaOperativa): Promise<PdfFile> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  const empresa = reporte.meta.empresaNombre ?? 'Empresa';
  const filename = `Reporte_Carga_${safeFilename(empresa)}_${safeFilename(reporte.meta.periodo)}_${safeFilename(reporte.meta.rangoTexto)}.pdf`;

  try {
    page.setDefaultTimeout(30000);
    await page.setViewport({ width: 1600, height: 2200, deviceScaleFactor: 2 });
    await page.emulateMediaType('screen');
    await page.setContent(buildHtml(reporte), { waitUntil: 'domcontentloaded' });
    const buffer = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
    return { filename, contentType: 'application/pdf', buffer: Buffer.from(buffer) };
  } finally {
    await page.close();
  }
}
