import 'katex/dist/katex.min.css'
import './estilos.css'
import { $, $$, pintarFormulas } from './ui/dom'
import { iniciarComparar, mostrarComparar } from './ui/vistaComparar'
import { detenerReproduccion, iniciarLineal, resolverLineal } from './ui/vistaLineal'
import { iniciarNewton, resolverNewton } from './ui/vistaNewton'

type Vista = 'newton' | 'lineal' | 'comparar' | 'teoria'
const VISTAS: Vista[] = ['newton', 'lineal', 'comparar', 'teoria']

let vistaActual: Vista = 'newton'

function moverIndicador(): void {
  const activa = document.querySelector<HTMLElement>('.pestana.activa')
  const indicador = $('.pestanas-indicador')
  if (!activa) return
  indicador.style.width = `${activa.offsetWidth}px`
  indicador.style.transform = `translateX(${activa.offsetLeft}px)`
}

function mostrarVista(vista: Vista, actualizarUrl = true): void {
  vistaActual = vista
  $$('.vista').forEach((v) => v.classList.toggle('visible', v.dataset.vista === vista))
  $$('.pestana').forEach((p) => {
    const activa = p.dataset.vista === vista
    p.classList.toggle('activa', activa)
    p.setAttribute('aria-selected', String(activa))
  })
  moverIndicador()
  if (vista !== 'lineal') detenerReproduccion()
  if (vista === 'comparar') mostrarComparar()
  // Plotly necesita recalcular el tamano cuando su contenedor estaba oculto
  window.dispatchEvent(new Event('resize'))
  if (actualizarUrl) history.replaceState(null, '', `#${vista}`)
}

function vistaDesdeUrl(): Vista {
  const nombre = window.location.hash.slice(1).split('?')[0] as Vista
  return VISTAS.includes(nombre) ? nombre : 'newton'
}

function iniciar(): void {
  pintarFormulas()
  const inicial = vistaDesdeUrl()
  // la vista se muestra antes de iniciar para que Plotly mida bien
  mostrarVista(inicial, false)
  iniciarNewton()
  iniciarLineal()
  iniciarComparar()
  if (inicial === 'comparar') mostrarComparar()

  $$('.pestana').forEach((p) => p.addEventListener('click', () => mostrarVista(p.dataset.vista as Vista)))
  window.addEventListener('resize', moverIndicador)
  window.addEventListener('hashchange', () => mostrarVista(vistaDesdeUrl(), false))
  document.fonts?.ready.then(moverIndicador)

  // atajo para resolver desde cualquier campo
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      if (vistaActual === 'newton') resolverNewton()
      if (vistaActual === 'lineal') resolverLineal()
    }
  })
}

iniciar()
