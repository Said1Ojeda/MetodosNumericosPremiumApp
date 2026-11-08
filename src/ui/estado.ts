import type { ResultadoGaussJordan } from '../metodos/gaussJordan'
import type { ResultadoLU } from '../metodos/lu'
import type { ResultadoNewton } from '../metodos/newton'

// ultimos resultados compartidos entre pestanas para la vista de comparar

export interface UltimoNewton {
  ecuaciones: string[]
  resultado: ResultadoNewton
}

export interface UltimoLineal {
  n: number
  gaussJordan: ResultadoGaussJordan
  lu: ResultadoLU
}

export const estado: { newton: UltimoNewton | null; lineal: UltimoLineal | null } = {
  newton: null,
  lineal: null
}

type Oyente = () => void
const oyentes: Oyente[] = []

export const alCambiarEstado = (oyente: Oyente) => oyentes.push(oyente)
export const avisarCambio = () => oyentes.forEach((o) => o())

// el estado de los formularios se puede guardar en el enlace para compartirlo
export function codificarEnlace(vista: string, datos: unknown): string {
  const json = JSON.stringify(datos)
  const base64 = btoa(String.fromCharCode(...new TextEncoder().encode(json)))
  const url = new URL(window.location.href)
  url.hash = `${vista}?d=${base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`
  return url.toString()
}

export function leerEnlace<T>(vista: string): T | null {
  const [nombre, consulta] = window.location.hash.slice(1).split('?')
  if (nombre !== vista || !consulta) return null
  const d = new URLSearchParams(consulta).get('d')
  if (!d) return null
  try {
    const base64 = d.replace(/-/g, '+').replace(/_/g, '/')
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes)) as T
  } catch {
    return null
  }
}
