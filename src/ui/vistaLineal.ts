import { ErrorNumerico, normaInf, type Matriz, type Vector } from '../metodos/algebra'
import { EJEMPLOS_LINEALES } from '../metodos/ejemplos'
import { formatoCientifico, formatoNumero, formatoVector } from '../metodos/formato'
import { resolverGaussJordan, type ResultadoGaussJordan } from '../metodos/gaussJordan'
import { resolverLU, type ResultadoLU } from '../metodos/lu'
import { alerta } from './alertas'
import { $, $$, animarNumero, copiarTexto, esperar, marcarInvalido, matrizTex, tex } from './dom'
import { avisarCambio, codificarEnlace, estado, leerEnlace } from './estado'
import { COLORES, conAlfa, descargarPng, dibujar, disenoBase, escena3D, graficaVacia, type Traza } from './graficas'

interface DatosEnlace {
  A: number[][]
  b: number[]
}

const MIN = 2
const MAX = 8

let n = 3
let gj: ResultadoGaussJordan | null = null
let lu: ResultadoLU | null = null
let paso = 0
let reproduciendo: number | null = null

export function iniciarLineal(): void {
  const select = $<HTMLSelectElement>('#ln-ejemplo')
  const academicos = EJEMPLOS_LINEALES.map((e, i) => [e, i] as const).filter(([e]) => !e.aplicacion)
  const aplicaciones = EJEMPLOS_LINEALES.map((e, i) => [e, i] as const).filter(([e]) => e.aplicacion)
  const opciones = (lista: typeof academicos) =>
    lista.map(([e, i]) => `<option value="${i}">${e.nombre} (${e.A.length}×${e.A.length})</option>`).join('')
  select.innerHTML = `
    <optgroup label="Ejercicios académicos">${opciones(academicos)}</optgroup>
    <optgroup label="Aplicaciones reales">${opciones(aplicaciones)}</optgroup>
    <option value="propio">Sistema propio…</option>`

  select.addEventListener('change', () => {
    if (select.value !== 'propio') cargarEjemplo(Number(select.value))
  })
  $('#ln-menos').addEventListener('click', () => cambiarTamano(n - 1))
  $('#ln-mas').addEventListener('click', () => cambiarTamano(n + 1))
  $('#ln-editor').addEventListener('input', () => (select.value = 'propio'))
  $('#ln-resolver').addEventListener('click', () => void resolver())
  $('#ln-aleatorio').addEventListener('click', aleatorio)
  $('#ln-importar').addEventListener('click', importarMatlab)
  $('#ln-compartir').addEventListener('click', compartir)
  $('#ln-png').addEventListener('click', () => descargarPng($('#ln-grafica'), 'sistema-lineal'))
  $('#ln-copiar').addEventListener('click', async () => {
    if (!lu) return alerta('info', 'Todavía no hay solución', 'Resuelve primero el sistema.')
    const ok = await copiarTexto(formatoVector(lu.x, 12))
    alerta(ok ? 'exito' : 'aviso', ok ? 'Solución copiada' : 'No se pudo copiar')
  })

  // controles del reproductor de pasos
  $$<HTMLButtonElement>('.reproductor [data-control]').forEach((b) =>
    b.addEventListener('click', () => {
      if (!gj) return
      const total = gj.pasos.length - 1
      const accion = b.dataset.control
      if (accion === 'reproducir') return alternarReproduccion()
      detener()
      if (accion === 'inicio') irAPaso(0)
      if (accion === 'atras') irAPaso(Math.max(0, paso - 1))
      if (accion === 'adelante') irAPaso(Math.min(total, paso + 1))
      if (accion === 'fin') irAPaso(total)
    })
  )
  $<HTMLInputElement>('#ln-deslizador').addEventListener('input', (e) => {
    detener()
    irAPaso(Number((e.target as HTMLInputElement).value))
  })

  const enlace = leerEnlace<DatosEnlace>('lineal')
  if (enlace?.A?.length) {
    select.value = 'propio'
    ponerMatriz(enlace.A, enlace.b)
    void resolver()
  } else {
    cargarEjemplo(0)
  }
  graficaVacia($('#ln-grafica'), 'La interpretación geométrica aparece al resolver')
}

// ---------- editor ----------

function armarEditor(A?: Matriz, b?: Vector): void {
  const editor = $('#ln-editor')
  const previos = leerCrudo()
  editor.style.gridTemplateColumns = `repeat(${n}, minmax(46px, 1fr)) 2px minmax(52px, 1fr)`
  let html = ''
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const valor = A?.[i]?.[j] ?? previos.A[i]?.[j] ?? (i === j ? '1' : '0')
      html += `<input class="mono" data-i="${i}" data-j="${j}" value="${valor}" inputmode="decimal" aria-label="a${i + 1}${j + 1}" />`
    }
    html += '<span class="separador"></span>'
    const valorB = b?.[i] ?? previos.b[i] ?? '0'
    html += `<input class="mono col-b" data-b="${i}" value="${valorB}" inputmode="decimal" aria-label="b${i + 1}" />`
  }
  editor.innerHTML = html
  $('#ln-tamano').textContent = `${n} × ${n}`
}

function leerCrudo(): { A: string[][]; b: string[] } {
  const A: string[][] = []
  const b: string[] = []
  $$<HTMLInputElement>('#ln-editor input').forEach((c) => {
    if (c.dataset.b !== undefined) b[Number(c.dataset.b)] = c.value
    else (A[Number(c.dataset.i)] ??= [])[Number(c.dataset.j)] = c.value
  })
  return { A, b }
}

function leerSistema(): { A: Matriz; b: Vector } {
  const A: Matriz = Array.from({ length: n }, () => new Array(n).fill(0))
  const b: Vector = new Array(n).fill(0)
  let primeroMalo: HTMLInputElement | null = null
  $$<HTMLInputElement>('#ln-editor input').forEach((c) => {
    const texto = c.value.trim()
    const valor = Number(texto)
    if (texto === '' || !Number.isFinite(valor)) {
      marcarInvalido(c)
      primeroMalo ??= c
      return
    }
    if (c.dataset.b !== undefined) b[Number(c.dataset.b)] = valor
    else A[Number(c.dataset.i)][Number(c.dataset.j)] = valor
  })
  if (primeroMalo) throw new ErrorNumerico('Hay casillas vacías o con texto que no es número, quedaron marcadas en rojo.')
  return { A, b }
}

function ponerMatriz(A: Matriz, b: Vector): void {
  n = Math.min(MAX, Math.max(MIN, A.length))
  $('#ln-editor').innerHTML = ''
  armarEditor(A, b)
}

function cambiarTamano(nuevo: number): void {
  if (nuevo < MIN || nuevo > MAX) {
    alerta('info', `El editor acepta de ${MIN}×${MIN} a ${MAX}×${MAX}`)
    return
  }
  n = nuevo
  $<HTMLSelectElement>('#ln-ejemplo').value = 'propio'
  armarEditor()
}

function cargarEjemplo(indice: number): void {
  const ej = EJEMPLOS_LINEALES[indice]
  $<HTMLSelectElement>('#ln-ejemplo').value = String(indice)
  $('#ln-descripcion').innerHTML = `${ej.aplicacion ? '<span class="chip chip-ambar">Aplicación real</span>' : ''}${ej.descripcion}`
  ponerMatriz(ej.A, ej.b)
}

function aleatorio(): void {
  // diagonal dominante para que siempre tenga solucion unica
  const A = Array.from({ length: n }, (_, i) => {
    const fila = Array.from({ length: n }, () => Math.round(Math.random() * 18 - 9))
    fila[i] = fila.reduce((s, v, j) => (j === i ? s : s + Math.abs(v)), 0) + Math.ceil(Math.random() * 6) + 1
    if (Math.random() < 0.5) fila[i] *= -1
    return fila
  })
  const b = Array.from({ length: n }, () => Math.round(Math.random() * 40 - 20))
  $<HTMLSelectElement>('#ln-ejemplo').value = 'propio'
  $('#ln-descripcion').textContent = 'Sistema aleatorio con diagonal dominante, siempre tiene solución única.'
  ponerMatriz(A, b)
}

function leerFormatoMatlab(texto: string): number[][] {
  const limpio = texto.trim().replace(/^\[|\]$/g, '').trim()
  if (!limpio) return []
  return limpio
    .split(/;|\n/)
    .map((f) => f.trim())
    .filter(Boolean)
    .map((f) => f.split(/[\s,]+/).filter(Boolean).map(Number))
}

function importarMatlab(): void {
  const campoA = $<HTMLTextAreaElement>('#ln-importar-a')
  const campoB = $<HTMLInputElement>('#ln-importar-b')
  const A = leerFormatoMatlab(campoA.value)
  const b = leerFormatoMatlab(campoB.value).flat()
  if (!A.length || A.some((f) => f.length !== A.length) || A.flat().some((v) => !Number.isFinite(v))) {
    marcarInvalido(campoA)
    return alerta('error', 'Matriz A inválida', 'Debe ser cuadrada, por ejemplo [4 -1; -1 4].')
  }
  if (A.length > MAX) return alerta('error', `Máximo ${MAX}×${MAX}`, 'El editor no acepta matrices más grandes.')
  if (b.length !== A.length || b.some((v) => !Number.isFinite(v))) {
    marcarInvalido(campoB)
    return alerta('error', 'Vector b inválido', `Debe tener ${A.length} números, por ejemplo [1; 2].`)
  }
  $<HTMLSelectElement>('#ln-ejemplo').value = 'propio'
  ponerMatriz(A, b)
  alerta('exito', 'Sistema cargado', `${A.length}×${A.length}`)
}

// ---------- resolver ----------

function ponerEstado(tipo: string, titulo: string, texto: string): void {
  $('#ln-estado').className = `estado ${tipo}`
  $('#ln-estado-titulo').textContent = titulo
  $('#ln-estado-texto').textContent = texto
}

async function resolver(): Promise<void> {
  detener()
  try {
    const { A, b } = leerSistema()
    ponerEstado('calculando', 'Resolviendo…', 'Gauss-Jordan y LU al mismo tiempo')
    await esperar(20)
    gj = resolverGaussJordan(A, b)
    lu = resolverLU(A, b)
    estado.lineal = { n: A.length, gaussJordan: gj, lu }
    avisarCambio()
    mostrar(A, b)
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error)
    limpiarResultados()
    ponerEstado('error', 'No se pudo resolver', mensaje)
    alerta('error', 'Sistema sin solución única', mensaje, 7000)
  }
}

// borra lo calculado para que no quede un resultado viejo junto a un error nuevo
function limpiarResultados(): void {
  gj = null
  lu = null
  $$('#ln-metricas strong').forEach((s) => (s.textContent = '—'))
  $$('#ln-metricas .metrica').forEach((x) => x.classList.remove('lleno'))
  $('#ln-solucion').innerHTML = '<span class="tenue">Aún no hay resultado</span>'
  $('#ln-lu').innerHTML = '<span class="tenue">Se muestra al resolver</span>'
  $('#ln-comparacion').innerHTML = ''
  $('#ln-matriz-animada').innerHTML = ''
  $('#ln-operacion').className = 'operacion'
  $('#ln-operacion').textContent = 'Resuelve un sistema para ver cómo [A | b] se convierte en [I | x].'
  $('#ln-paso-contador').textContent = '0 / 0'
  $<HTMLInputElement>('#ln-deslizador').max = '0'
  graficaVacia($('#ln-grafica'), 'La interpretación geométrica aparece al resolver')
}

function mostrar(A: Matriz, b: Vector): void {
  if (!gj || !lu) return
  const diferencia = normaInf(gj.x.map((v, i) => v - lu!.x[i]))
  const malCondicionada = lu.numeroCondicion > 1e6

  if (malCondicionada) {
    ponerEstado('alerta', 'Resuelto, pero la matriz está mal condicionada', `cond∞(A) = ${formatoCientifico(lu.numeroCondicion)}, los resultados pueden ser sensibles a errores de redondeo.`)
    alerta('aviso', 'Matriz mal condicionada', 'Pequeños cambios en los datos pueden mover mucho la solución.', 6500)
  } else {
    ponerEstado('ok', 'Sistema resuelto con los dos métodos', `Las soluciones coinciden con una diferencia de ${formatoCientifico(diferencia)}`)
    alerta('exito', 'Sistema resuelto', `${gj.pasos.length - 1} operaciones de fila en Gauss-Jordan`, 3500)
  }

  const m = (nombre: string) => $(`#ln-metricas [data-metrica="${nombre}"]`)
  const det = lu.determinante
  if (Math.abs(det) < 1e6 && Math.abs(det) > 1e-3) animarNumero(m('det'), det, (v) => formatoNumero(v, 4))
  else m('det').textContent = formatoCientifico(det, 2)
  m('cond').innerHTML = `${formatoNumero(lu.numeroCondicion, 2)}<small style="color:${malCondicionada ? 'var(--ambar)' : 'var(--lima)'}">${malCondicionada ? 'mal' : 'bien'}</small>`
  m('resgj').textContent = formatoCientifico(gj.residuo, 2)
  m('reslu').textContent = formatoCientifico(lu.residuo, 2)
  m('dif').textContent = formatoCientifico(diferencia, 2)
  $$('#ln-metricas .metrica').forEach((x) => x.classList.add('lleno'))

  $('#ln-solucion').innerHTML = lu.x
    .map((v, i) => `<div class="raiz-componente" style="animation-delay:${i * 70}ms"><b>x${subindice(i + 1)}</b><span>${formatoNumero(v, 10)}</span></div>`)
    .join('')

  // factorizacion
  const f = (v: number) => formatoNumero(v, 4)
  $('#ln-lu').innerHTML = `
    <div class="lu-grid">
      <div><div class="etiqueta-matriz">Permutación</div>${tex(`P = ${matrizTex(lu.P, f)}`, true)}</div>
      <div><div class="etiqueta-matriz">Triangular inferior</div>${tex(`L = ${matrizTex(lu.L, f)}`, true)}</div>
      <div><div class="etiqueta-matriz">Triangular superior</div>${tex(`U = ${matrizTex(lu.U, f)}`, true)}</div>
      <div><div class="etiqueta-matriz">Ly = Pb</div>${tex(`y = ${matrizTex(lu.y.map((v) => [v]), f)}`, true)}</div>
    </div>
    <p class="nota" style="margin-top:8px">${lu.intercambios} intercambio(s) de fila · det(A) = (−1)<sup>${lu.intercambios}</sup> · ∏ uᵢᵢ</p>`

  comparar()
  armarMatrizAnimada(A.length)
  irAPaso(0)
  graficar(A, b, lu.x)
  // arranca la animacion sola la primera vez
  alternarReproduccion()
}

function comparar(): void {
  if (!gj || !lu) return
  const filas: [string, number, number, (v: number) => string][] = [
    ['Operaciones (× y ÷)', gj.operaciones, lu.operaciones, (v) => String(v)],
    ['Tiempo', gj.tiempoMs, lu.tiempoMs, (v) => `${v.toFixed(3)} ms`],
    ['Residuo ‖Ax − b‖∞', gj.residuo, lu.residuo, (v) => formatoCientifico(v)]
  ]
  $('#ln-comparacion').innerHTML = `
    <table class="tabla">
      <thead><tr><th>Métrica</th><th>Gauss-Jordan</th><th>LU</th></tr></thead>
      <tbody>
        ${filas
          .map(([nombre, a, b, fmt]) => `<tr><td>${nombre}</td><td class="mono ${a < b ? 'gana' : ''}">${fmt(a)}</td><td class="mono ${b < a ? 'gana' : ''}">${fmt(b)}</td></tr>`)
          .join('')}
        <tr><td>Solución</td><td class="mono">${formatoVector(gj.x, 6)}</td><td class="mono">${formatoVector(lu.x, 6)}</td></tr>
        <tr><td>Reutilizable para otro b</td><td>No, se repite todo</td><td class="gana">Sí, solo sustitución O(n²)</td></tr>
      </tbody>
    </table>`
}

const subindice = (k: number) => String(k).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[Number(d)])

// ---------- reproductor de gauss jordan ----------

function armarMatrizAnimada(tamano: number): void {
  const contenedor = $('#ln-matriz-animada')
  contenedor.style.gridTemplateColumns = `auto repeat(${tamano}, minmax(70px, auto)) 2px minmax(70px, auto)`
  let html = ''
  for (let i = 0; i < tamano; i++) {
    html += `<span class="etiqueta-fila">F${i + 1}</span>`
    for (let j = 0; j <= tamano; j++) {
      if (j === tamano) html += '<span class="separador"></span>'
      html += `<div class="celda ${j === tamano ? 'col-b' : ''}" data-i="${i}" data-j="${j}"></div>`
    }
  }
  contenedor.innerHTML = html
  const deslizador = $<HTMLInputElement>('#ln-deslizador')
  deslizador.max = String(gj!.pasos.length - 1)
}

function irAPaso(k: number): void {
  if (!gj) return
  paso = k
  const actual = gj.pasos[k]
  const tamano = actual.matriz.length
  $$<HTMLDivElement>('#ln-matriz-animada .celda').forEach((celda) => {
    const i = Number(celda.dataset.i)
    const j = Number(celda.dataset.j)
    const valor = actual.matriz[i][j]
    celda.textContent = formatoNumero(Math.abs(valor) < 1e-12 ? 0 : valor, 4)
    celda.classList.toggle('cero', Math.abs(valor) < 1e-12 && j < tamano)
    celda.classList.toggle('uno-diagonal', i === j && Math.abs(valor - 1) < 1e-12)
    celda.classList.toggle('pivote', !!actual.pivote && actual.pivote[0] === i && actual.pivote[1] === j)
    celda.classList.remove('fila-cambiada')
    if (actual.filasCambiadas.includes(i)) {
      void celda.offsetWidth
      celda.classList.add('fila-cambiada')
    }
  })
  const operacion = $('#ln-operacion')
  operacion.className = `operacion tipo-${actual.tipo}`
  operacion.textContent = actual.descripcion
  $('#ln-paso-contador').textContent = `${k} / ${gj.pasos.length - 1}`
  $<HTMLInputElement>('#ln-deslizador').value = String(k)
}

function alternarReproduccion(): void {
  if (!gj) return
  if (reproduciendo !== null) return detener()
  if (paso >= gj.pasos.length - 1) irAPaso(0)
  $('.reproductor .reproducir').textContent = '⏸'
  reproduciendo = window.setInterval(() => {
    if (!gj || paso >= gj.pasos.length - 1) return detener()
    irAPaso(paso + 1)
  }, 950)
}

function detener(): void {
  if (reproduciendo !== null) clearInterval(reproduciendo)
  reproduciendo = null
  const boton = document.querySelector('.reproductor .reproducir')
  if (boton) boton.textContent = '▶'
}

// ---------- grafica ----------

function graficar(A: Matriz, b: Vector, x: Vector): void {
  const contenedor = $('#ln-grafica')
  const tamano = A.length
  const titulo = $('#ln-grafica-titulo')

  if (tamano === 2) {
    titulo.textContent = 'Dos rectas, un punto de cruce'
    const span = Math.max(4, normaInf(x) * 0.8 + 3)
    const rango: [number, number] = [x[0] - span, x[0] + span]
    const trazas: Traza[] = A.map((fila, i) => {
      const [a1, a2] = fila
      const nombre = `${formatoNumero(a1)}x ${a2 < 0 ? '−' : '+'} ${formatoNumero(Math.abs(a2))}y = ${formatoNumero(b[i])}`
      if (Math.abs(a2) < 1e-12) {
        const xv = b[i] / a1
        return { type: 'scatter', mode: 'lines', name: nombre, x: [xv, xv], y: [x[1] - span, x[1] + span], line: { color: COLORES[i], width: 3 } }
      }
      return {
        type: 'scatter', mode: 'lines', name: nombre, x: rango, y: rango.map((xv) => (b[i] - a1 * xv) / a2),
        line: { color: COLORES[i], width: 3 }
      }
    })
    trazas.push(
      { type: 'scatter', mode: 'markers', showlegend: false, hoverinfo: 'skip', x: [x[0]], y: [x[1]], marker: { size: 30, color: conAlfa(COLORES[2], 0.25) } },
      { type: 'scatter', mode: 'markers', name: 'Solución', x: [x[0]], y: [x[1]], marker: { size: 16, color: COLORES[2], symbol: 'star', line: { color: '#0b0f1a', width: 1.5 } } }
    )
    void dibujar(contenedor, trazas, disenoBase({
      xaxis: { range: rango, title: { text: 'x₁' }, gridcolor: 'rgba(148,163,184,0.10)', zerolinecolor: 'rgba(148,163,184,0.35)' },
      yaxis: { range: [x[1] - span, x[1] + span], title: { text: 'x₂' }, scaleanchor: 'x', gridcolor: 'rgba(148,163,184,0.10)', zerolinecolor: 'rgba(148,163,184,0.35)' }
    }))
    return
  }

  if (tamano === 3) {
    titulo.textContent = 'Tres planos que se cortan en la solución'
    const span = Math.max(4, normaInf(x) * 0.5 + 3)
    const ejes = [0, 1, 2].map((d) => [x[d] - span, x[d] + span] as [number, number])
    const puntos = 24
    const lineal = (r: [number, number]) => Array.from({ length: puntos }, (_, i) => r[0] + ((r[1] - r[0]) * i) / (puntos - 1))
    const planos: Traza[] = A.map((fila, i) => {
      // se despeja la variable con el coeficiente mas grande para que el plano no explote
      const d = fila.reduce((mejor, v, j) => (Math.abs(v) > Math.abs(fila[mejor]) ? j : mejor), 0)
      const [p, q] = [0, 1, 2].filter((j) => j !== d)
      const us = lineal(ejes[p])
      const vs = lineal(ejes[q])
      const malla = vs.map((v) => us.map((u) => {
        const punto = [0, 0, 0]
        punto[p] = u
        punto[q] = v
        punto[d] = (b[i] - fila[p] * u - fila[q] * v) / fila[d]
        return punto
      }))
      const comp = (k: number) => malla.map((f) => f.map((pt) => pt[k]))
      return {
        type: 'surface', x: comp(0), y: comp(1), z: comp(2), showscale: false, opacity: 0.55,
        colorscale: [[0, COLORES[i]], [1, COLORES[i]]], name: `Plano ${i + 1}`, showlegend: true, hoverinfo: 'skip',
        contours: { x: { show: false }, y: { show: false }, z: { show: false } }
      }
    })
    planos.push({
      type: 'scatter3d', mode: 'markers', name: 'Solución', x: [x[0]], y: [x[1]], z: [x[2]],
      marker: { size: 8, color: '#ffffff', symbol: 'diamond', line: { color: '#0b0f1a', width: 2 } }
    })
    const escena = escena3D()
    void dibujar(contenedor, planos, disenoBase({
      margin: { l: 0, r: 0, t: 10, b: 0 },
      scene: {
        ...escena,
        xaxis: { ...(escena.xaxis as object), range: ejes[0], title: { text: 'x₁' } },
        yaxis: { ...(escena.yaxis as object), range: ejes[1], title: { text: 'x₂' } },
        zaxis: { ...(escena.zaxis as object), range: ejes[2], title: { text: 'x₃' } }
      }
    }))
    return
  }

  titulo.textContent = `Componentes de la solución (${tamano} incógnitas)`
  void dibujar(contenedor, [{
    type: 'bar', x: x.map((_, i) => `x${subindice(i + 1)}`), y: x,
    marker: { color: x.map((_, i) => COLORES[i % COLORES.length]), line: { width: 0 } },
    text: x.map((v) => formatoNumero(v, 4)), textposition: 'outside', hovertemplate: '%{x} = %{y:.8f}<extra></extra>'
  }], disenoBase({ bargap: 0.35, yaxis: { gridcolor: 'rgba(148,163,184,0.10)', zerolinecolor: 'rgba(148,163,184,0.35)' } }))
}

async function compartir(): Promise<void> {
  try {
    const { A, b } = leerSistema()
    const ok = await copiarTexto(codificarEnlace('lineal', { A, b } satisfies DatosEnlace))
    alerta(ok ? 'exito' : 'aviso', ok ? 'Enlace copiado' : 'No se pudo copiar el enlace')
  } catch (error) {
    alerta('error', 'Revisa la matriz', error instanceof Error ? error.message : String(error))
  }
}

export const resolverLineal = () => void resolver()
export const detenerReproduccion = detener
