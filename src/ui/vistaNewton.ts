import { ErrorNumerico, type Vector } from '../metodos/algebra'
import { EJEMPLOS_NEWTON } from '../metodos/ejemplos'
import { formatoCientifico, formatoNumero, formatoVector } from '../metodos/formato'
import { newtonMultivariable, type MapaConvergencia, type ResultadoNewton } from '../metodos/newton'
import { crearSistema, type SistemaNoLineal } from '../metodos/sistema'
import { alerta } from './alertas'
import { $, $$, animarNumero, copiarTexto, descargar, esperar, marcarInvalido, matrizTex, tex } from './dom'
import { estado, avisarCambio, codificarEnlace, leerEnlace } from './estado'
import {
  COLORES,
  COLOR_RECORRIDO,
  actualizarTraza,
  conAlfa,
  descargarPng,
  dibujar,
  disenoBase,
  escena3D,
  graficaVacia,
  type Traza
} from './graficas'
import { TablaPaginada } from './tabla'
import type { PedidoMapa } from './trabajadorMapa'

interface DatosEnlace {
  e: string
  x0: number[]
  t: string
  m: number
}

// lo que queda del ultimo calculo para redibujar o seleccionar filas
let sistemaActual: SistemaNoLineal | null = null
let resultadoActual: ResultadoNewton | null = null
let rangoActual: { x: [number, number]; y: [number, number]; z: [number, number] } | null = null
let modoGrafica: 'curvas' | 'mapa' = 'curvas'
let indiceSeleccion = -1
let animacion = 0
let trabajador: Worker | null = null

const el = {
  ejemplo: () => $<HTMLSelectElement>('#nw-ejemplo'),
  ecuaciones: () => $<HTMLTextAreaElement>('#nw-ecuaciones'),
  tolerancia: () => $<HTMLInputElement>('#nw-tolerancia'),
  max: () => $<HTMLInputElement>('#nw-max'),
  grafica: () => $('#nw-grafica')
}

let tabla: TablaPaginada<ResultadoNewton['pasos'][number]>

export function iniciarNewton(): void {
  const select = el.ejemplo()
  const academicos = EJEMPLOS_NEWTON.map((e, i) => [e, i] as const).filter(([e]) => !e.aplicacion)
  const aplicaciones = EJEMPLOS_NEWTON.map((e, i) => [e, i] as const).filter(([e]) => e.aplicacion)
  const opciones = (lista: typeof academicos) => lista.map(([e, i]) => `<option value="${i}">${e.nombre}</option>`).join('')
  select.innerHTML = `
    <optgroup label="Ejercicios académicos">${opciones(academicos)}</optgroup>
    <optgroup label="Aplicaciones reales">${opciones(aplicaciones)}</optgroup>
    <option value="propio">Sistema propio…</option>`

  tabla = new TablaPaginada($('#nw-tabla'), [
    { titulo: 'k', valor: (p) => String(p.k), mono: true },
    { titulo: 'x(k)', valor: (p) => formatoVector(p.x, 8), mono: true },
    { titulo: 'F(x(k))', valor: (p) => formatoVector(p.fx.map((v) => Number(v.toExponential(2))), 3), mono: true },
    { titulo: '‖δ‖∞', valor: (p) => formatoCientifico(p.normaDelta), mono: true },
    { titulo: 'Error relativo', valor: (p) => formatoCientifico(p.errorRelativo), mono: true },
    {
      titulo: 'Residuo',
      mono: true,
      html: true,
      valor: (p) => {
        // barra en escala log para ver como cae el residuo
        const ancho = Math.max(4, Math.min(90, 6 * (Math.log10(Math.max(p.residuo, 1e-16)) + 16)))
        return `${formatoCientifico(p.residuo)}<span class="barra-error" style="width:${ancho}px"></span>`
      }
    }
  ], {
    alSeleccionar: (_, i) => seleccionarIteracion(i)
  })
  tabla.vaciar('Aquí aparece cada iteración de Newton paso a paso.')

  select.addEventListener('change', () => {
    if (select.value !== 'propio') cargarEjemplo(Number(select.value))
    else $('#nw-descripcion').textContent = 'Escribe tus propias ecuaciones, la vista previa te avisa si algo está mal.'
  })
  el.ecuaciones().addEventListener('input', () => {
    select.value = 'propio'
    actualizarVistaPrevia()
  })
  $('#nw-resolver').addEventListener('click', () => void resolver())
  $('#nw-limpiar').addEventListener('click', limpiar)
  $('#nw-csv').addEventListener('click', exportarCsv)
  $('#nw-png').addEventListener('click', () => descargarPng(el.grafica(), 'newton-raphson'))
  $('#nw-copiar-raiz').addEventListener('click', async () => {
    if (!resultadoActual) return alerta('info', 'Todavía no hay raíz', 'Resuelve primero un sistema.')
    const ok = await copiarTexto(formatoVector(resultadoActual.raiz, 12))
    alerta(ok ? 'exito' : 'aviso', ok ? 'Raíz copiada' : 'No se pudo copiar')
  })
  $('#nw-compartir').addEventListener('click', compartir)
  $$<HTMLButtonElement>('#nw-modo-grafica button').forEach((b) =>
    b.addEventListener('click', () => {
      if (b.disabled || b.dataset.modo === modoGrafica) return
      modoGrafica = b.dataset.modo as typeof modoGrafica
      $$('#nw-modo-grafica button').forEach((o) => o.classList.toggle('activo', o === b))
      void redibujar()
    })
  )

  const enlace = leerEnlace<DatosEnlace>('newton')
  if (enlace) {
    select.value = 'propio'
    el.ecuaciones().value = enlace.e
    el.tolerancia().value = enlace.t
    el.max().value = String(enlace.m)
    actualizarVistaPrevia(enlace.x0)
    void resolver()
  } else {
    cargarEjemplo(0)
  }
  graficaVacia(el.grafica(), 'Resuelve un sistema para ver las curvas y el recorrido de Newton')
  graficaVacia($('#nw-convergencia'), 'Sin datos todavía')
}

function cargarEjemplo(indice: number): void {
  const ej = EJEMPLOS_NEWTON[indice]
  el.ejemplo().value = String(indice)
  el.ecuaciones().value = ej.ecuaciones
  el.tolerancia().value = ej.tolerancia.toExponential()
  el.max().value = String(ej.maxIteraciones)
  $('#nw-descripcion').innerHTML = `${ej.aplicacion ? '<span class="chip chip-ambar">Aplicación real</span>' : ''}${ej.descripcion}`
  actualizarVistaPrevia(ej.x0)
}

// vista previa en LaTeX mientras se escribe, tambien arma las casillas del vector inicial
function actualizarVistaPrevia(valores?: number[]): SistemaNoLineal | null {
  const previa = $('#nw-vista-previa')
  try {
    const sistema = crearSistema(el.ecuaciones().value)
    previa.classList.remove('error')
    previa.innerHTML = tex(`\\begin{cases} ${sistema.ecuacionesTex.map((e) => `${e} = 0`).join(' \\\\ ')} \\end{cases}`, true)
    armarVectorInicial(sistema.variables, valores)
    return sistema
  } catch (error) {
    previa.classList.add('error')
    previa.textContent = error instanceof Error ? error.message : String(error)
    return null
  }
}

function armarVectorInicial(variables: string[], valores?: number[]): void {
  const contenedor = $('#nw-x0')
  const anteriores = $$<HTMLInputElement>('input', contenedor).map((i) => i.value)
  if (!valores && anteriores.length === variables.length) return
  contenedor.innerHTML = variables
    .map((v, i) => {
      const valor = valores?.[i] ?? anteriores[i] ?? '1'
      return `<label><span>${v}₀</span><input data-i="${i}" value="${valor}" inputmode="decimal" aria-label="${v} inicial" /></label>`
    })
    .join('')
}

function leerEntradas(sistema: SistemaNoLineal): { x0: Vector; tolerancia: number; maxIteraciones: number } {
  const casillas = $$<HTMLInputElement>('#nw-x0 input')
  const x0 = casillas.map((c) => Number(c.value.trim()))
  const malo = casillas.find((c, i) => c.value.trim() === '' || !Number.isFinite(x0[i]))
  if (malo) {
    marcarInvalido(malo)
    throw new ErrorNumerico(`Cada componente de x₀ debe ser un número (${sistema.variables.join(', ')}).`)
  }

  const tolerancia = Number(el.tolerancia().value.trim())
  if (!Number.isFinite(tolerancia) || tolerancia <= 0 || tolerancia >= 1) {
    marcarInvalido(el.tolerancia())
    throw new ErrorNumerico('La tolerancia debe ser un número entre 0 y 1, por ejemplo 1e-6.')
  }

  const maxIteraciones = Number(el.max().value)
  if (!Number.isInteger(maxIteraciones) || maxIteraciones < 1 || maxIteraciones > 1000) {
    marcarInvalido(el.max())
    throw new ErrorNumerico('El máximo de iteraciones debe ser un entero entre 1 y 1000.')
  }
  return { x0, tolerancia, maxIteraciones }
}

function ponerEstado(tipo: 'ok' | 'alerta' | 'error' | 'calculando' | 'vacio', titulo: string, texto: string): void {
  const caja = $('#nw-estado')
  caja.className = `estado ${tipo}`
  $('#nw-estado-titulo').textContent = titulo
  $('#nw-estado-texto').textContent = texto
}

async function resolver(): Promise<void> {
  const boton = $('#nw-resolver')
  const sistema = actualizarVistaPrevia()
  if (!sistema) {
    marcarInvalido(el.ecuaciones())
    limpiarResultados()
    const mensaje = $('#nw-vista-previa').textContent ?? ''
    ponerEstado('error', 'Revisa las ecuaciones', mensaje)
    alerta('error', 'Las ecuaciones tienen un problema', mensaje)
    return
  }

  try {
    const entradas = leerEntradas(sistema)
    boton.classList.add('cargando')
    ponerEstado('calculando', 'Calculando…', 'Iterando J(xₖ) δ = −F(xₖ)')
    // deja que el navegador pinte el estado antes de calcular
    await esperar(30)

    const resultado = newtonMultivariable(sistema, entradas.x0, entradas)
    sistemaActual = sistema
    resultadoActual = resultado
    indiceSeleccion = -1
    estado.newton = { ecuaciones: sistema.ecuaciones, resultado }
    avisarCambio()

    mostrarResultado(sistema, resultado)
    await redibujar($<HTMLInputElement>('#nw-animar').checked)
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error)
    limpiarResultados()
    ponerEstado('error', 'No se pudo completar el cálculo', mensaje)
    alerta('error', 'Newton se detuvo', mensaje, 7000)
  } finally {
    boton.classList.remove('cargando')
  }
}

function mostrarResultado(sistema: SistemaNoLineal, r: ResultadoNewton): void {
  if (r.estado === 'convergio') {
    ponerEstado('ok', `Convergió en ${r.iteraciones} ${r.iteraciones === 1 ? 'iteración' : 'iteraciones'}`, `‖F(x*)‖∞ = ${formatoCientifico(r.residuoFinal)}`)
    alerta('exito', 'Raíz encontrada', `${r.iteraciones} iteraciones en ${r.tiempoMs.toFixed(2)} ms`, 3500)
  } else if (r.estado === 'diverge') {
    ponerEstado('error', 'El método diverge', 'Los valores crecieron sin control. Prueba con un vector inicial más cercano a la raíz.')
    alerta('error', 'Newton divergió', 'Usa el mapa de convergencia para escoger un mejor x₀.', 7000)
  } else {
    ponerEstado('alerta', 'No convergió en el máximo de iteraciones', `Último residuo ${formatoCientifico(r.residuoFinal)}. Sube el máximo o cambia x₀.`)
    alerta('aviso', 'No convergió', 'Se llegó al máximo de iteraciones sin cumplir la tolerancia.', 6500)
  }

  // metricas
  const m = (nombre: string) => $(`#nw-metricas [data-metrica="${nombre}"]`)
  animarNumero(m('iteraciones'), r.iteraciones, (v) => String(Math.round(v)))
  m('residuo').textContent = formatoCientifico(r.residuoFinal, 2)
  m('orden').innerHTML = r.ordenConvergencia
    ? `${r.ordenConvergencia.toFixed(2)}<small class="${r.ordenConvergencia > 1.7 ? 'chip-lima' : 'chip-ambar'}" style="background:none;border:0">${r.ordenConvergencia > 1.7 ? 'cuadrática' : 'lenta'}</small>`
    : '—'
  m('tiempo').textContent = `${r.tiempoMs.toFixed(2)} ms`
  $$('#nw-metricas .metrica').forEach((x) => x.classList.add('lleno'))

  // raiz
  $('#nw-raiz').innerHTML = r.raiz
    .map((v, i) => `<div class="raiz-componente" style="animation-delay:${i * 90}ms"><b>${sistema.variables[i]}*</b><span>${formatoNumero(v, 10)}</span></div>`)
    .join('')

  // jacobiana
  const chip = $('#nw-tipo-jacobiana')
  chip.textContent = sistema.jacobianaAnalitica ? 'simbólica' : 'diferencias finitas'
  const Jraiz = sistema.jacobiana(r.raiz)
  const simbolica = sistema.jacobianaTex
    ? tex(`J(${sistema.variables.join(',')}) = \\begin{bmatrix} ${sistema.jacobianaTex.map((f) => f.join(' & ')).join(' \\\\ ')} \\end{bmatrix}`, true)
    : ''
  $('#nw-jacobiana').innerHTML = `${simbolica}${tex(`J(x^*) = ${matrizTex(Jraiz, (v) => formatoNumero(v, 4))}`, true)}`

  tabla.cargar(r.pasos)
  graficarConvergencia(r)
}

function graficarConvergencia(r: ResultadoNewton): void {
  const k = r.pasos.map((p) => p.k)
  const tol = Number(el.tolerancia().value)
  void dibujar($('#nw-convergencia'), [
    {
      type: 'scatter', mode: 'lines+markers', name: '‖F(xₖ)‖∞', x: k, y: r.pasos.map((p) => Math.max(p.residuo, 1e-17)),
      line: { color: COLORES[0], width: 3, shape: 'spline' }, marker: { size: 7 },
      fill: 'tozeroy', fillcolor: conAlfa(COLORES[0], 0.08)
    },
    {
      type: 'scatter', mode: 'lines+markers', name: '‖δₖ‖∞', x: k, y: r.pasos.map((p) => Math.max(p.normaDelta, 1e-17)),
      line: { color: COLORES[1], width: 2.5, dash: 'dot', shape: 'spline' }, marker: { size: 6, symbol: 'diamond' }
    },
    {
      type: 'scatter', mode: 'lines', name: 'tolerancia', x: [Math.min(...k, 1), Math.max(...k, 1)], y: [tol, tol],
      line: { color: COLORES[2], width: 1.5, dash: 'dash' }, hoverinfo: 'skip'
    }
  ], disenoBase({
    yaxis: { type: 'log', exponentformat: 'power', gridcolor: 'rgba(148,163,184,0.10)', tickfont: { color: '#94a3b8', size: 11 } },
    xaxis: { title: { text: 'iteración k' }, dtick: k.length > 12 ? undefined : 1, gridcolor: 'rgba(148,163,184,0.10)', tickfont: { color: '#94a3b8', size: 11 } }
  }))
}

// ---------- graficas del sistema ----------

function calcularRango(puntosNewton: Vector[], dimension: number): [number, number][] {
  // si la raiz anda cerca del origen se incluye para ver las curvas completas
  const cercaOrigen = puntosNewton.every((p) => p.every((v) => Math.abs(v) < 12))
  const puntos = cercaOrigen ? [...puntosNewton, new Array(dimension).fill(0)] : puntosNewton
  return Array.from({ length: dimension }, (_, d) => {
    const valores = puntos.map((p) => p[d]).filter(Number.isFinite)
    const min = Math.min(...valores)
    const max = Math.max(...valores)
    return [min, max] as [number, number]
  }).map(([min, max], _, todos) => {
    // mismo tamano en todos los ejes para no deformar circulos y esferas
    const mitad = Math.min(60, (Math.max(...todos.map(([a, b]) => b - a)) / 2) * 1.6 + 2.5)
    const centro = (min + max) / 2
    return [centro - mitad, centro + mitad]
  })
}

const malla = (rango: [number, number], n: number) =>
  Array.from({ length: n }, (_, i) => rango[0] + ((rango[1] - rango[0]) * i) / (n - 1))

async function redibujar(animar = false): Promise<void> {
  const sistema = sistemaActual
  const r = resultadoActual
  if (!sistema || !r) return
  const n = sistema.variables.length
  const botonMapa = $<HTMLButtonElement>('#nw-modo-grafica [data-modo="mapa"]')
  botonMapa.disabled = n !== 2
  if (n !== 2 && modoGrafica === 'mapa') {
    modoGrafica = 'curvas'
    $$('#nw-modo-grafica button').forEach((b) => b.classList.toggle('activo', b.dataset.modo === 'curvas'))
  }

  const id = ++animacion
  if (n === 2) {
    const [rx, ry] = calcularRango([...r.historial, r.raiz], 2)
    rangoActual = { x: rx, y: ry, z: [0, 0] }
    if (modoGrafica === 'mapa') await graficarMapa(sistema, r)
    else await graficar2D(sistema, r, animar, id)
  } else if (n === 3) {
    const [rx, ry, rz] = calcularRango([...r.historial, r.raiz], 3)
    rangoActual = { x: rx, y: ry, z: rz }
    await graficar3D(sistema, r, animar, id)
  } else {
    await graficarVariables(sistema, r)
  }
}

function trazasCurvas(sistema: SistemaNoLineal, rx: [number, number], ry: [number, number], resolucion: number, sobreMapa = false): Traza[] {
  // la malla es mas grande que la vista para que al mover la grafica las curvas sigan
  const extender = (r: [number, number]): [number, number] => {
    const extra = (r[1] - r[0]) * (sobreMapa ? 0 : 0.5)
    return [r[0] - extra, r[1] + extra]
  }
  const xs = malla(extender(rx), resolucion)
  const ys = malla(extender(ry), resolucion)
  const zs = sistema.ecuaciones.map(() => ys.map(() => new Array<number>(resolucion)))
  ys.forEach((y, i) =>
    xs.forEach((x, j) => {
      const F = sistema.evaluarSeguro([x, y])
      F.forEach((f, e) => (zs[e][i][j] = f))
    })
  )
  return zs.map((z, e) => {
    const color = sobreMapa ? 'rgba(255,255,255,0.92)' : COLORES[e % COLORES.length]
    return {
      type: 'contour', x: xs, y: ys, z,
      name: `f${e + 1}(x, y) = 0`, showlegend: !sobreMapa, showscale: false, hoverinfo: 'skip',
      contours: { start: 0, end: 0, size: 1, coloring: 'lines' },
      line: { width: sobreMapa ? 1.6 : 3.2, color, dash: sobreMapa && e === 1 ? 'dot' : 'solid' },
      colorscale: [[0, color], [1, color]]
    }
  })
}

function trazasPuntos(r: ResultadoNewton, tres = false): Traza[] {
  const tipo = tres ? 'scatter3d' : 'scatter'
  const coord = (p: Vector) => (tres ? { x: [p[0]], y: [p[1]], z: [p[2]] } : { x: [p[0]], y: [p[1]] })
  const x0 = r.historial[0]
  return [
    // recorrido, arranca vacio y se llena con la animacion
    {
      type: tipo, mode: 'lines+markers', name: 'Recorrido de Newton', x: [], y: [], ...(tres ? { z: [] } : {}),
      line: { color: COLOR_RECORRIDO, width: tres ? 6 : 2.6 },
      marker: { size: tres ? 4 : 8, color: COLOR_RECORRIDO, line: { color: '#0b0f1a', width: 1.5 } },
      hovertemplate: tres ? 'x=%{x:.6f}<br>y=%{y:.6f}<br>z=%{z:.6f}<extra>iteración</extra>' : 'x=%{x:.6f}<br>y=%{y:.6f}<extra>iteración</extra>'
    },
    // brillo del punto actual
    {
      type: tipo, mode: 'markers', showlegend: false, hoverinfo: 'skip', ...coord(x0),
      marker: { size: tres ? 14 : 26, color: conAlfa(COLOR_RECORRIDO, 0.28), line: { width: 0 } }
    },
    {
      type: tipo, mode: 'markers', name: 'x₀', ...coord(x0),
      marker: { size: tres ? 7 : 12, color: '#ffffff', symbol: 'diamond', line: { color: '#0b0f1a', width: 1.5 } },
      hovertemplate: 'Punto inicial<extra></extra>'
    },
    // raiz, invisible hasta que termina la animacion
    {
      type: tipo, mode: 'markers', name: 'Raíz x*', ...coord(r.raiz), visible: false,
      marker: { size: tres ? 9 : 20, color: COLORES[2], symbol: tres ? 'diamond' : 'star', line: { color: '#0b0f1a', width: 1.5 } },
      hovertemplate: 'Raíz<br>%{x:.8f}<br>%{y:.8f}<extra></extra>'
    },
    // marca de la fila seleccionada en la tabla
    {
      type: tipo, mode: 'markers', showlegend: false, hoverinfo: 'skip', x: [], y: [], ...(tres ? { z: [] } : {}),
      marker: { size: tres ? 12 : 22, color: 'rgba(0,0,0,0)', line: { color: COLORES[0], width: 3 } }
    }
  ]
}

async function animarRecorrido(r: ResultadoNewton, inicio: number, tres: boolean, animar: boolean, id: number): Promise<void> {
  const contenedor = el.grafica()
  const h = r.historial
  const [iRecorrido, iBrillo, , iRaiz] = [inicio, inicio + 1, inicio + 2, inicio + 3]
  const datos = (hasta: number) => {
    const parte = h.slice(0, hasta + 1)
    const base: Traza = { x: [parte.map((p) => p[0])], y: [parte.map((p) => p[1])] }
    if (tres) base.z = [parte.map((p) => p[2])]
    return base
  }
  const brillo = (p: Vector): Traza => (tres ? { x: [[p[0]]], y: [[p[1]]], z: [[p[2]]] } : { x: [[p[0]]], y: [[p[1]]] })

  if (animar) {
    const pausa = Math.max(110, Math.min(420, 2600 / h.length))
    for (let i = 0; i < h.length; i++) {
      if (id !== animacion) return
      await actualizarTraza(contenedor, datos(i), [iRecorrido])
      await actualizarTraza(contenedor, brillo(h[i]), [iBrillo])
      await esperar(pausa)
    }
  } else {
    await actualizarTraza(contenedor, datos(h.length - 1), [iRecorrido])
    await actualizarTraza(contenedor, brillo(h[h.length - 1]), [iBrillo])
  }
  if (id === animacion && r.estado === 'convergio') await actualizarTraza(contenedor, { visible: true }, [iRaiz])
}

async function graficar2D(sistema: SistemaNoLineal, r: ResultadoNewton, animar: boolean, id: number): Promise<void> {
  const { x: rx, y: ry } = rangoActual!
  $('#nw-grafica-titulo').textContent = 'Curvas fᵢ(x, y) = 0 y recorrido de Newton'
  $('#nw-grafica-nota').textContent = 'Cada curva es una ecuación igualada a cero, la raíz está donde se cruzan. Toca una fila de la tabla para ubicar esa iteración.'
  const curvas = trazasCurvas(sistema, rx, ry, 220)
  await dibujar(el.grafica(), [...curvas, ...trazasPuntos(r)], disenoBase({
    xaxis: { range: rx, constrain: 'domain', title: { text: 'x' }, gridcolor: 'rgba(148,163,184,0.10)', zerolinecolor: 'rgba(148,163,184,0.35)', tickfont: { color: '#94a3b8', size: 11 } },
    yaxis: { range: ry, title: { text: 'y' }, scaleanchor: 'x', gridcolor: 'rgba(148,163,184,0.10)', zerolinecolor: 'rgba(148,163,184,0.35)', tickfont: { color: '#94a3b8', size: 11 } }
  }))
  await animarRecorrido(r, curvas.length, false, animar, id)
}

async function graficar3D(sistema: SistemaNoLineal, r: ResultadoNewton, animar: boolean, id: number): Promise<void> {
  const { x: rx, y: ry, z: rz } = rangoActual!
  $('#nw-grafica-titulo').textContent = 'Superficies fᵢ(x, y, z) = 0 y recorrido de Newton'
  $('#nw-grafica-nota').textContent = 'Cada superficie es una ecuación, la raíz es el punto común. Arrastra para girar la escena.'
  const n = 30
  const [xs, ys, zs] = [malla(rx, n), malla(ry, n), malla(rz, n)]
  const X: number[] = []
  const Y: number[] = []
  const Z: number[] = []
  const valores: number[][] = sistema.ecuaciones.map(() => [])
  for (const x of xs) for (const y of ys) for (const z of zs) {
    X.push(x)
    Y.push(y)
    Z.push(z)
    sistema.evaluarSeguro([x, y, z]).forEach((f, e) => valores[e].push(f))
  }
  const superficies: Traza[] = valores.map((value, e) => ({
    type: 'isosurface', x: X, y: Y, z: Z, value,
    isomin: 0, isomax: 0, surface: { count: 1 }, caps: { x: { show: false }, y: { show: false }, z: { show: false } },
    colorscale: [[0, COLORES[e]], [1, COLORES[e]]], showscale: false, opacity: 0.38,
    name: `f${e + 1}(x, y, z) = 0`, showlegend: true, hoverinfo: 'skip',
    lighting: { ambient: 0.7, diffuse: 0.6, specular: 0.25, roughness: 0.6 }
  }))
  await dibujar(el.grafica(), [...superficies, ...trazasPuntos(r, true)], disenoBase({
    margin: { l: 0, r: 0, t: 10, b: 0 },
    scene: escena3D({ xaxis: { ...escena3D().xaxis as object, range: rx }, yaxis: { ...escena3D().yaxis as object, range: ry }, zaxis: { ...escena3D().zaxis as object, range: rz } })
  }))
  await animarRecorrido(r, superficies.length, true, animar, id)
}

async function graficarVariables(sistema: SistemaNoLineal, r: ResultadoNewton): Promise<void> {
  $('#nw-grafica-titulo').textContent = 'Evolución de cada variable'
  $('#nw-grafica-nota').textContent = `Con ${sistema.variables.length} variables no hay dibujo geométrico, aquí se ve cómo cada componente se estabiliza en su valor final.`
  const k = r.historial.map((_, i) => i)
  await dibujar(el.grafica(), sistema.variables.map((v, i) => ({
    type: 'scatter', mode: 'lines+markers', name: v, x: k, y: r.historial.map((p) => p[i]),
    line: { color: COLORES[i % COLORES.length], width: 3, shape: 'spline' }, marker: { size: 7 }
  })), disenoBase({ xaxis: { title: { text: 'iteración k' }, dtick: 1, gridcolor: 'rgba(148,163,184,0.10)' } }))
}

// cuencas de atraccion calculadas en un web worker
async function graficarMapa(sistema: SistemaNoLineal, r: ResultadoNewton): Promise<void> {
  const { x: rx, y: ry } = rangoActual!
  $('#nw-grafica-titulo').textContent = 'Mapa de convergencia (cuencas de atracción)'
  $('#nw-grafica-nota').textContent =
    'Cada color indica a qué raíz llega Newton si empieza en ese punto, lo oscuro es donde no converge. Así se elige un buen x₀.'
  const barra = $('#nw-progreso')
  barra.classList.remove('oculto')
  const relleno = barra.querySelector('div') as HTMLDivElement
  relleno.style.width = '0%'

  trabajador?.terminate()
  trabajador = new Worker(new URL('./trabajadorMapa.ts', import.meta.url), { type: 'module' })
  const pedido: PedidoMapa = { ecuaciones: sistema.ecuaciones.join('\n'), rangoX: rx, rangoY: ry, resolucion: 130 }

  const mapa = await new Promise<MapaConvergencia | null>((resolver) => {
    trabajador!.onmessage = (evento) => {
      const datos = evento.data
      if (datos.tipo === 'avance') relleno.style.width = `${Math.round(datos.fraccion * 100)}%`
      else if (datos.tipo === 'listo') resolver(datos.mapa)
      else {
        alerta('error', 'No se pudo calcular el mapa', datos.mensaje)
        resolver(null)
      }
    }
    trabajador!.postMessage(pedido)
  })
  barra.classList.add('oculto')
  if (!mapa) return

  const R = mapa.raices.length
  // escala discreta, -1 es oscuro y cada raiz tiene su color
  const escala: [number, string][] = []
  const total = R + 1
  ;['#0b0f1a', ...mapa.raices.map((_, i) => COLORES[i % COLORES.length])].forEach((c, i) => {
    escala.push([i / total, c], [(i + 1) / total, c])
  })
  // las iteraciones oscurecen un poco cada punto para dar profundidad
  const z = mapa.raizDe.map((fila, i) => fila.map((v, j) => (v < 0 ? -1 : v + Math.min(0.85, mapa.vueltas[i][j] / 30))))

  await dibujar(el.grafica(), [
    {
      type: 'heatmap', x: mapa.xs, y: mapa.ys, z, zmin: -1, zmax: R, colorscale: escala, showscale: false, opacity: 0.78,
      zsmooth: 'best', hoverinfo: 'skip'
    },
    ...trazasCurvas(sistema, rx, ry, 150, true),
    {
      type: 'scatter', mode: 'markers', name: 'Raíces del sistema', x: mapa.raices.map((p) => p[0]), y: mapa.raices.map((p) => p[1]),
      marker: { size: 13, color: '#ffffff', symbol: 'star', line: { color: '#0b0f1a', width: 1.5 } },
      hovertemplate: 'x=%{x:.6f}<br>y=%{y:.6f}<extra>raíz</extra>'
    },
    {
      type: 'scatter', mode: 'lines+markers', name: 'Recorrido de tu x₀', x: r.historial.map((p) => p[0]), y: r.historial.map((p) => p[1]),
      line: { color: COLOR_RECORRIDO, width: 2.4 }, marker: { size: 7, color: COLOR_RECORRIDO }
    }
  ], disenoBase({
    xaxis: { range: rx, constrain: 'domain', title: { text: 'x₀' }, gridcolor: 'rgba(0,0,0,0)' },
    yaxis: { range: ry, title: { text: 'y₀' }, scaleanchor: 'x', gridcolor: 'rgba(0,0,0,0)' }
  }))
  alerta('info', `Se encontraron ${R} ${R === 1 ? 'raíz' : 'raíces'} en la región`, 'Haz clic en el mapa para usar ese punto como x₀.', 4500)

  // clic en el mapa para tomar ese punto como nuevo vector inicial
  const div = el.grafica() as HTMLElement & { on?: (evento: string, fn: (d: { points: { x: number; y: number }[] }) => void) => void; removeAllListeners?: (e: string) => void }
  div.removeAllListeners?.('plotly_click')
  div.on?.('plotly_click', (d) => {
    const p = d.points[0]
    if (!p || modoGrafica !== 'mapa') return
    const casillas = $$<HTMLInputElement>('#nw-x0 input')
    casillas[0].value = formatoNumero(p.x, 4)
    casillas[1].value = formatoNumero(p.y, 4)
    alerta('info', 'Nuevo x₀', `(${formatoNumero(p.x, 4)}, ${formatoNumero(p.y, 4)}), presiona Resolver.`, 3000)
  })
}

function seleccionarIteracion(i: number): void {
  if (!resultadoActual || !sistemaActual || modoGrafica === 'mapa') return
  const n = sistemaActual.variables.length
  if (n > 3) return
  indiceSeleccion = i
  const p = resultadoActual.pasos[indiceSeleccion].x
  const datos: Traza = n === 3 ? { x: [[p[0]]], y: [[p[1]]], z: [[p[2]]] } : { x: [[p[0]]], y: [[p[1]]] }
  // la marca de seleccion es la ultima traza
  const total = (el.grafica() as HTMLElement & { data?: unknown[] }).data?.length ?? 0
  if (total > 0) void actualizarTraza(el.grafica(), datos, [total - 1])
}

function exportarCsv(): void {
  if (!resultadoActual || !sistemaActual) return alerta('info', 'No hay iteraciones', 'Resuelve primero un sistema.')
  const v = sistemaActual.variables
  const encabezado = ['k', ...v, ...v.map((_, i) => `f${i + 1}`), 'norma_delta', 'error_relativo', 'residuo']
  const filas = resultadoActual.pasos.map((p) => [p.k, ...p.x, ...p.fx, p.normaDelta, p.errorRelativo, p.residuo].join(','))
  descargar('iteraciones-newton.csv', [encabezado.join(','), ...filas].join('\n'))
  alerta('exito', 'CSV descargado', `${filas.length} iteraciones`)
}

async function compartir(): Promise<void> {
  const datos: DatosEnlace = {
    e: el.ecuaciones().value,
    x0: $$<HTMLInputElement>('#nw-x0 input').map((c) => Number(c.value)),
    t: el.tolerancia().value,
    m: Number(el.max().value)
  }
  const ok = await copiarTexto(codificarEnlace('newton', datos))
  alerta(ok ? 'exito' : 'aviso', ok ? 'Enlace copiado' : 'No se pudo copiar el enlace', ok ? 'Quien lo abra verá este mismo sistema resuelto.' : '')
}

function limpiar(): void {
  animacion++
  trabajador?.terminate()
  el.ejemplo().value = 'propio'
  el.ecuaciones().value = ''
  el.tolerancia().value = '1e-6'
  el.max().value = '50'
  $('#nw-x0').innerHTML = ''
  $('#nw-vista-previa').classList.remove('error')
  $('#nw-vista-previa').innerHTML = '<span class="tenue">La vista previa aparece al escribir</span>'
  $('#nw-descripcion').textContent = ''
  limpiarResultados()
  ponerEstado('vacio', 'Listo para calcular', 'Escribe tu sistema y presiona Resolver.')
  el.ecuaciones().focus()
}

// borra lo calculado para que no quede un resultado viejo junto a un error nuevo
function limpiarResultados(): void {
  animacion++
  trabajador?.terminate()
  $('#nw-raiz').innerHTML = '<span class="tenue">Aún no hay resultado</span>'
  $('#nw-jacobiana').innerHTML = '<span class="tenue">Se muestra al resolver</span>'
  $$('#nw-metricas strong').forEach((s) => (s.textContent = '—'))
  $$('#nw-metricas .metrica').forEach((x) => x.classList.remove('lleno'))
  sistemaActual = null
  resultadoActual = null
  $('#nw-progreso').classList.add('oculto')
  tabla.vaciar('Aquí aparece cada iteración de Newton paso a paso.')
  graficaVacia(el.grafica(), 'Resuelve un sistema para ver las curvas y el recorrido de Newton')
  graficaVacia($('#nw-convergencia'), 'Sin datos todavía')
}

export const resolverNewton = () => void resolver()
