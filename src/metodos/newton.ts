import { ErrorNumerico, esFinito, normaInf, sumar, type Matriz, type Vector } from './algebra'
import { factorizarLU, sustituir } from './lu'
import type { SistemaNoLineal } from './sistema'

// Newton-Raphson multivariable
// en cada vuelta se resuelve J(xk) delta = -F(xk) y luego x(k+1) = xk + delta
// el sistema lineal de cada iteracion se resuelve con la misma LU del modulo lineal

export interface IteracionNewton {
  k: number
  x: Vector
  fx: Vector
  jacobiana: Matriz
  delta: Vector
  normaDelta: number
  errorRelativo: number
  residuo: number
}

export type EstadoNewton = 'convergio' | 'max-iteraciones' | 'diverge'

export interface ResultadoNewton {
  raiz: Vector
  estado: EstadoNewton
  iteraciones: number
  pasos: IteracionNewton[]
  // puntos visitados empezando por x0
  historial: Vector[]
  residuoFinal: number
  ordenConvergencia: number | null
  tiempoMs: number
}

export interface OpcionesNewton {
  tolerancia: number
  maxIteraciones: number
}

const LIMITE_DIVERGENCIA = 1e12

export function validarOpciones({ tolerancia, maxIteraciones }: OpcionesNewton): void {
  if (!Number.isFinite(tolerancia) || tolerancia <= 0) throw new ErrorNumerico('La tolerancia debe ser un número positivo, por ejemplo 1e-6.')
  if (tolerancia >= 1) throw new ErrorNumerico('La tolerancia es muy grande, usa algo menor que 1, por ejemplo 1e-6.')
  if (!Number.isInteger(maxIteraciones) || maxIteraciones < 1 || maxIteraciones > 1000) {
    throw new ErrorNumerico('El máximo de iteraciones debe ser un entero entre 1 y 1000.')
  }
}

// orden p estimado con las ultimas tres correcciones
// p = ln(e3 / e2) / ln(e2 / e1), en Newton se espera algo cerca de 2
export function estimarOrden(pasos: IteracionNewton[]): number | null {
  const e = pasos.map((p) => p.normaDelta).filter((v) => v > 1e-14)
  if (e.length < 3) return null
  const [e1, e2, e3] = e.slice(-3)
  const p = Math.log(e3 / e2) / Math.log(e2 / e1)
  return Number.isFinite(p) && p > 0 ? p : null
}

export function newtonMultivariable(sistema: SistemaNoLineal, x0: Vector, opciones: OpcionesNewton): ResultadoNewton {
  validarOpciones(opciones)
  const n = sistema.variables.length
  if (x0.length !== n) {
    throw new ErrorNumerico(`El vector inicial debe tener ${n} componentes (${sistema.variables.join(', ')}).`)
  }
  if (!esFinito(x0)) throw new ErrorNumerico('El vector inicial solo puede tener números finitos.')

  const inicio = performance.now()
  let x = [...x0]
  const historial: Vector[] = [[...x]]
  const pasos: IteracionNewton[] = []
  let estado: EstadoNewton = 'max-iteraciones'

  for (let k = 1; k <= opciones.maxIteraciones; k++) {
    const F = sistema.evaluar(x)
    const J = sistema.jacobiana(x)

    let delta: Vector
    try {
      delta = sustituir(factorizarLU(J), F.map((f) => -f)).x
    } catch {
      throw new ErrorNumerico(
        `La Jacobiana es singular en la iteración ${k}. Newton no puede seguir desde ese punto, prueba otro vector inicial.`
      )
    }

    const xNuevo = sumar(x, delta)
    if (!esFinito(xNuevo) || normaInf(xNuevo) > LIMITE_DIVERGENCIA) {
      estado = 'diverge'
      break
    }

    const fNuevo = sistema.evaluar(xNuevo)
    const normaDelta = normaInf(delta)
    const errorRelativo = normaDelta / Math.max(1, normaInf(xNuevo))
    const residuo = normaInf(fNuevo)

    pasos.push({ k, x: xNuevo, fx: fNuevo, jacobiana: J, delta, normaDelta, errorRelativo, residuo })
    historial.push([...xNuevo])
    x = xNuevo

    // mismo criterio de paro que la version en MATLAB
    if (errorRelativo < opciones.tolerancia || residuo < opciones.tolerancia) {
      estado = 'convergio'
      break
    }
  }

  return {
    raiz: x,
    estado,
    iteraciones: pasos.length,
    pasos,
    historial,
    residuoFinal: normaInf(sistema.evaluar(x)),
    ordenConvergencia: estimarOrden(pasos),
    tiempoMs: performance.now() - inicio
  }
}

// cuenca de atraccion, para cada punto de una malla se ve a que raiz llega Newton
// sirve para el mapa de convergencia en sistemas de 2 variables
export interface MapaConvergencia {
  xs: number[]
  ys: number[]
  // indice de la raiz alcanzada o -1 si no converge
  raizDe: number[][]
  // iteraciones que tardo cada punto
  vueltas: number[][]
  raices: Vector[]
}

export function mapaConvergencia(
  sistema: SistemaNoLineal,
  rangoX: [number, number],
  rangoY: [number, number],
  resolucion = 120,
  maxIteraciones = 40
): MapaConvergencia {
  const xs = Array.from({ length: resolucion }, (_, i) => rangoX[0] + ((rangoX[1] - rangoX[0]) * i) / (resolucion - 1))
  const ys = Array.from({ length: resolucion }, (_, i) => rangoY[0] + ((rangoY[1] - rangoY[0]) * i) / (resolucion - 1))
  const raices: Vector[] = []
  const raizDe: number[][] = []
  const vueltas: number[][] = []

  const buscarRaiz = (r: Vector): number => {
    const tolerancia = 1e-4 * Math.max(1, normaInf(r))
    let indice = raices.findIndex((conocida) => normaInf(conocida.map((c, i) => c - r[i])) < tolerancia)
    if (indice === -1) {
      raices.push(r)
      indice = raices.length - 1
    }
    return indice
  }

  for (const y of ys) {
    const filaRaiz: number[] = []
    const filaVueltas: number[] = []
    for (const x of xs) {
      let punto = [x, y]
      let resultado = -1
      let k = 0
      try {
        for (k = 1; k <= maxIteraciones; k++) {
          const F = sistema.evaluar(punto)
          const d = sustituir(factorizarLU(sistema.jacobiana(punto)), F.map((f) => -f)).x
          punto = sumar(punto, d)
          if (!esFinito(punto) || normaInf(punto) > 1e8) break
          if (normaInf(d) < 1e-9) {
            if (normaInf(sistema.evaluar(punto)) < 1e-6) resultado = buscarRaiz(punto)
            break
          }
        }
      } catch {
        // jacobiana singular o valor complejo, ese punto queda sin raiz
      }
      filaRaiz.push(resultado)
      filaVueltas.push(k)
    }
    raizDe.push(filaRaiz)
    vueltas.push(filaVueltas)
  }

  return { xs, ys, raizDe, vueltas, raices }
}
