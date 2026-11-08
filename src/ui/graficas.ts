import Plotly from 'plotly.js-dist-min'

// envoltura de Plotly con el tema oscuro de la app

export type Traza = Record<string, unknown>
export type Diseno = Record<string, unknown>

export const COLORES = ['#22d3ee', '#f472b6', '#a3e635', '#fbbf24', '#a78bfa', '#fb923c']
export const COLOR_RECORRIDO = '#fbbf24'

const EJE = {
  gridcolor: 'rgba(148,163,184,0.10)',
  zerolinecolor: 'rgba(148,163,184,0.35)',
  zerolinewidth: 1.5,
  linecolor: 'rgba(148,163,184,0.2)',
  tickfont: { color: '#94a3b8', size: 11 },
  titlefont: { color: '#94a3b8' }
}

const EJE_3D = {
  ...EJE,
  backgroundcolor: 'rgba(0,0,0,0)',
  showbackground: false,
  zerolinecolor: 'rgba(148,163,184,0.4)'
}

export function disenoBase(extra: Diseno = {}): Diseno {
  return {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { family: 'Inter, Segoe UI, system-ui, sans-serif', color: '#cbd5e1', size: 12 },
    margin: { l: 52, r: 18, t: 16, b: 44 },
    hoverlabel: { bgcolor: '#0f1320', bordercolor: '#334155', font: { family: 'Cascadia Code, Consolas, monospace', size: 12 } },
    legend: { orientation: 'h', x: 0, y: 1.08, bgcolor: 'rgba(0,0,0,0)', font: { size: 11.5 } },
    xaxis: { ...EJE },
    yaxis: { ...EJE },
    ...extra
  }
}

export function escena3D(extra: Diseno = {}): Diseno {
  return {
    xaxis: { ...EJE_3D, title: { text: 'x' } },
    yaxis: { ...EJE_3D, title: { text: 'y' } },
    zaxis: { ...EJE_3D, title: { text: 'z' } },
    aspectmode: 'cube',
    camera: { eye: { x: 1.25, y: 1.15, z: 0.85 } },
    ...extra
  }
}

const CONFIG = {
  responsive: true,
  displaylogo: false,
  modeBarButtonsToRemove: ['select2d', 'lasso2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian'],
  toImageButtonOptions: { format: 'png', scale: 2 }
}

export function dibujar(contenedor: HTMLElement, trazas: Traza[], diseno: Diseno): Promise<unknown> {
  return Plotly.react(contenedor, trazas as unknown as Plotly.Data[], diseno as Partial<Plotly.Layout>, CONFIG as Partial<Plotly.Config>)
}

export function actualizarTraza(contenedor: HTMLElement, cambios: Traza, indices: number[]): Promise<unknown> {
  return Plotly.restyle(contenedor, cambios as Plotly.Data, indices)
}

export function descargarPng(contenedor: HTMLElement, nombre: string): void {
  void Plotly.downloadImage(contenedor, { format: 'png', filename: nombre, width: 1400, height: 900, scale: 1 } as Plotly.DownloadImgopts)
}

export function limpiar(contenedor: HTMLElement): void {
  Plotly.purge(contenedor)
}

// mensaje centrado cuando todavia no hay datos
export function graficaVacia(contenedor: HTMLElement, texto: string): void {
  void dibujar(contenedor, [], disenoBase({
    xaxis: { visible: false },
    yaxis: { visible: false },
    annotations: [{ text: texto, showarrow: false, font: { color: '#64748b', size: 13 }, xref: 'paper', yref: 'paper', x: 0.5, y: 0.5 }]
  }))
}

// colores con transparencia para escalas de un solo tono
export function conAlfa(hex: string, alfa: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alfa})`
}
