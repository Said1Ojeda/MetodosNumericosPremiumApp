import { escaparHtml } from './dom'

// tabla paginada de 10 en 10, igual que en los modulos del trabajo

export interface Columna<T> {
  titulo: string
  valor: (fila: T, indice: number) => string
  mono?: boolean
  // si es true el valor ya viene como html seguro
  html?: boolean
}

export interface OpcionesTabla<T> {
  porPagina?: number
  alSeleccionar?: (fila: T, indice: number) => void
}

export class TablaPaginada<T> {
  private filas: T[] = []
  private pagina = 0
  private seleccionada = -1
  private readonly porPagina: number

  constructor(
    private readonly contenedor: HTMLElement,
    private readonly columnas: Columna<T>[],
    private readonly opciones: OpcionesTabla<T> = {}
  ) {
    this.porPagina = opciones.porPagina ?? 10
    this.contenedor.addEventListener('click', (evento) => this.alClic(evento))
  }

  cargar(filas: T[]): void {
    this.filas = filas
    this.pagina = 0
    this.seleccionada = -1
    this.pintar()
  }

  vaciar(mensaje: string): void {
    this.filas = []
    this.contenedor.innerHTML = `<p class="tenue" style="margin:0">${escaparHtml(mensaje)}</p>`
  }

  seleccionar(indice: number): void {
    this.seleccionada = indice
    this.pagina = Math.floor(indice / this.porPagina)
    this.pintar()
  }

  private get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.filas.length / this.porPagina))
  }

  private pintar(): void {
    const desde = this.pagina * this.porPagina
    const visibles = this.filas.slice(desde, desde + this.porPagina)
    const clic = this.opciones.alSeleccionar ? 'clic' : ''

    const cuerpo = visibles
      .map((fila, i) => {
        const indice = desde + i
        const clases = [clic, indice === this.seleccionada ? 'seleccionada' : ''].join(' ').trim()
        const celdas = this.columnas
          .map((c) => {
            const valor = c.valor(fila, indice)
            return `<td class="${c.mono ? 'mono' : ''}">${c.html ? valor : escaparHtml(valor)}</td>`
          })
          .join('')
        return `<tr data-indice="${indice}" class="${clases}" style="animation-delay:${i * 30}ms">${celdas}</tr>`
      })
      .join('')

    const botones = Array.from({ length: this.totalPaginas }, (_, p) =>
      `<button class="boton-chico ${p === this.pagina ? 'activo' : ''}" data-pagina="${p}">${p + 1}</button>`
    ).join('')

    this.contenedor.innerHTML = `
      <table class="tabla">
        <thead><tr>${this.columnas.map((c) => `<th>${escaparHtml(c.titulo)}</th>`).join('')}</tr></thead>
        <tbody>${cuerpo}</tbody>
      </table>
      <div class="paginacion">
        <span>Mostrando ${this.filas.length ? desde + 1 : 0}–${desde + visibles.length} de ${this.filas.length}</span>
        <div>
          <button class="boton-chico" data-pagina="${this.pagina - 1}" ${this.pagina === 0 ? 'disabled' : ''}>‹</button>
          ${botones}
          <button class="boton-chico" data-pagina="${this.pagina + 1}" ${this.pagina >= this.totalPaginas - 1 ? 'disabled' : ''}>›</button>
        </div>
      </div>`
  }

  private alClic(evento: Event): void {
    const objetivo = evento.target as HTMLElement
    const boton = objetivo.closest<HTMLButtonElement>('[data-pagina]')
    if (boton && !boton.disabled) {
      this.pagina = Number(boton.dataset.pagina)
      this.pintar()
      return
    }
    const fila = objetivo.closest<HTMLTableRowElement>('tr[data-indice]')
    if (fila && this.opciones.alSeleccionar) {
      const indice = Number(fila.dataset.indice)
      this.seleccionada = indice
      this.pintar()
      this.opciones.alSeleccionar(this.filas[indice], indice)
    }
  }
}
