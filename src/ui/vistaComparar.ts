import { formatoCientifico, formatoVector } from '../metodos/formato'
import { resolverGaussJordan } from '../metodos/gaussJordan'
import { resolverLU } from '../metodos/lu'
import { $ } from './dom'
import { alCambiarEstado, estado } from './estado'
import { COLORES, conAlfa, dibujar, disenoBase, graficaVacia } from './graficas'

let costoDibujado = false

export function iniciarComparar(): void {
  alCambiarEstado(actualizar)
  graficaVacia($('#cp-newton'), 'Sin cálculo de Newton todavía')
}

// se llama cada vez que se abre la pestana, las graficas de Plotly necesitan estar visibles para medir
export function mostrarComparar(): void {
  if (!costoDibujado) {
    costoDibujado = true
    dibujarCosto()
  }
  actualizar()
}

function dibujarCosto(): void {
  const tamanos = [2, 4, 6, 8, 10, 14, 18, 24, 30, 36, 44, 52, 60]
  const opsGJ: number[] = []
  const opsLU: number[] = []
  for (const n of tamanos) {
    // matriz aleatoria con diagonal dominante para que nunca sea singular
    const A = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? n + 5 : Math.random() * 2 - 1)))
    const b = Array.from({ length: n }, () => Math.random())
    opsGJ.push(resolverGaussJordan(A, b).operaciones)
    opsLU.push(resolverLU(A, b).operaciones)
  }
  void dibujar($('#cp-operaciones'), [
    {
      type: 'scatter', mode: 'lines+markers', name: 'Gauss-Jordan', x: tamanos, y: opsGJ,
      line: { color: COLORES[1], width: 3, shape: 'spline' }, marker: { size: 7 }, fill: 'tozeroy', fillcolor: conAlfa(COLORES[1], 0.07)
    },
    {
      type: 'scatter', mode: 'lines+markers', name: 'LU', x: tamanos, y: opsLU,
      line: { color: COLORES[0], width: 3, shape: 'spline' }, marker: { size: 7 }, fill: 'tozeroy', fillcolor: conAlfa(COLORES[0], 0.07)
    },
    {
      type: 'scatter', mode: 'lines', name: 'n³/3 teórico', x: tamanos, y: tamanos.map((n) => n ** 3 / 3),
      line: { color: '#94a3b8', width: 1.5, dash: 'dot' }
    }
  ], disenoBase({
    xaxis: { title: { text: 'tamaño n' }, gridcolor: 'rgba(148,163,184,0.10)' },
    yaxis: { title: { text: 'operaciones' }, gridcolor: 'rgba(148,163,184,0.10)' }
  }))
}

function actualizar(): void {
  const nw = estado.newton
  const ln = estado.lineal

  if (nw && nw.resultado.pasos.length) {
    const pasos = nw.resultado.pasos
    // digitos correctos aproximados a partir de la correccion
    const digitos = pasos.map((p) => Math.max(0, -Math.log10(Math.max(p.normaDelta, 1e-16))))
    void dibujar($('#cp-newton'), [
      {
        type: 'bar', name: 'Dígitos correctos ≈ −log₁₀‖δₖ‖', x: pasos.map((p) => p.k), y: digitos,
        marker: { color: digitos.map((_, i) => COLORES[i % 2 === 0 ? 0 : 4]), line: { width: 0 } }, yaxis: 'y'
      },
      {
        type: 'scatter', mode: 'lines+markers', name: '‖δₖ‖∞', x: pasos.map((p) => p.k), y: pasos.map((p) => Math.max(p.normaDelta, 1e-17)),
        line: { color: COLORES[1], width: 2.5, shape: 'spline' }, marker: { size: 6 }, yaxis: 'y2'
      }
    ], disenoBase({
      bargap: 0.4,
      xaxis: { title: { text: 'iteración k' }, dtick: 1, gridcolor: 'rgba(148,163,184,0.10)' },
      yaxis: { title: { text: 'dígitos' }, gridcolor: 'rgba(148,163,184,0.10)' },
      yaxis2: { type: 'log', overlaying: 'y', side: 'right', exponentformat: 'power', showgrid: false, tickfont: { color: '#f472b6', size: 11 } }
    }))
    const p = nw.resultado.ordenConvergencia
    $('#cp-newton-nota').textContent = p
      ? `Orden estimado p ≈ ${p.toFixed(2)}. Con p cerca de 2 los dígitos correctos se duplican en cada iteración.`
      : 'Hay muy pocas iteraciones para estimar el orden, prueba un x₀ más lejano.'
  }

  const cajas: string[] = []
  if (nw) {
    const r = nw.resultado
    cajas.push(`
      <div class="resumen-caja">
        <h4><span class="chip chip-cian">Newton</span> ${r.estado === 'convergio' ? 'convergió' : r.estado === 'diverge' ? 'divergió' : 'no convergió'}</h4>
        <dl>
          <dt>Sistema</dt><dd>${nw.ecuaciones.length} ecuaciones</dd>
          <dt>Iteraciones</dt><dd>${r.iteraciones}</dd>
          <dt>Sistemas lineales resueltos</dt><dd>${r.iteraciones} (uno por iteración)</dd>
          <dt>Residuo final</dt><dd>${formatoCientifico(r.residuoFinal)}</dd>
          <dt>Tiempo</dt><dd>${r.tiempoMs.toFixed(2)} ms</dd>
          <dt>Raíz</dt><dd>${formatoVector(r.raiz, 6)}</dd>
        </dl>
      </div>`)
  }
  if (ln) {
    cajas.push(`
      <div class="resumen-caja">
        <h4><span class="chip chip-magenta">Gauss-Jordan</span> ${ln.n}×${ln.n}</h4>
        <dl>
          <dt>Operaciones de fila</dt><dd>${ln.gaussJordan.pasos.length - 2}</dd>
          <dt>Multiplicaciones y divisiones</dt><dd>${ln.gaussJordan.operaciones}</dd>
          <dt>Residuo</dt><dd>${formatoCientifico(ln.gaussJordan.residuo)}</dd>
          <dt>Tiempo</dt><dd>${ln.gaussJordan.tiempoMs.toFixed(3)} ms</dd>
        </dl>
      </div>
      <div class="resumen-caja">
        <h4><span class="chip chip-lima">LU</span> ${ln.n}×${ln.n}</h4>
        <dl>
          <dt>Intercambios de fila</dt><dd>${ln.lu.intercambios}</dd>
          <dt>Multiplicaciones y divisiones</dt><dd>${ln.lu.operaciones}</dd>
          <dt>Residuo</dt><dd>${formatoCientifico(ln.lu.residuo)}</dd>
          <dt>Tiempo</dt><dd>${ln.lu.tiempoMs.toFixed(3)} ms</dd>
        </dl>
      </div>`)
  }
  $('#cp-resumen').innerHTML = cajas.length
    ? cajas.join('')
    : '<p class="tenue" style="margin:0">Resuelve algo en las pestañas Newton y Sistemas lineales para comparar aquí.</p>'
}
