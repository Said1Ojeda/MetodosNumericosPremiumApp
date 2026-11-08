import katex from 'katex'

// atajos para el DOM y para pintar formulas

export function $<T extends HTMLElement = HTMLElement>(selector: string, raiz: ParentNode = document): T {
  const elemento = raiz.querySelector<T>(selector)
  if (!elemento) throw new Error(`No existe el elemento ${selector}`)
  return elemento
}

export const $$ = <T extends HTMLElement = HTMLElement>(selector: string, raiz: ParentNode = document): T[] => [
  ...raiz.querySelectorAll<T>(selector)
]

export function escaparHtml(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

export function tex(formula: string, bloque = false): string {
  return katex.renderToString(formula, { displayMode: bloque, throwOnError: false, output: 'html' })
}

// pinta todos los elementos que traen data-tex o data-tex-bloque
export function pintarFormulas(raiz: ParentNode = document): void {
  $$('[data-tex]', raiz).forEach((el) => (el.innerHTML = tex(el.dataset.tex!)))
  $$('[data-tex-bloque]', raiz).forEach((el) => (el.innerHTML = tex(el.dataset.texBloque!, true)))
}

export function matrizTex(M: number[][], formato: (v: number) => string): string {
  const filas = M.map((fila) => fila.map(formato).join(' & ')).join(' \\\\ ')
  return `\\begin{bmatrix} ${filas} \\end{bmatrix}`
}

export function marcarInvalido(elemento: HTMLElement): void {
  elemento.classList.remove('invalido')
  // fuerza el reflow para que la animacion corra otra vez
  void elemento.offsetWidth
  elemento.classList.add('invalido')
  elemento.addEventListener('input', () => elemento.classList.remove('invalido'), { once: true })
}

export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    return false
  }
}

export function descargar(nombre: string, contenido: string, tipo = 'text/csv;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob(['﻿' + contenido], { type: tipo }))
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  enlace.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// cuenta hacia arriba el numero de una metrica para darle vida
export function animarNumero(elemento: HTMLElement, destino: number, formato: (v: number) => string, duracion = 700): void {
  const inicio = performance.now()
  const paso = (ahora: number) => {
    const t = Math.min(1, (ahora - inicio) / duracion)
    const suave = 1 - Math.pow(1 - t, 3)
    elemento.textContent = formato(destino * suave)
    if (t < 1) requestAnimationFrame(paso)
    else elemento.textContent = formato(destino)
  }
  requestAnimationFrame(paso)
}

export const esperar = (ms: number) => new Promise<void>((resolver) => setTimeout(resolver, ms))
