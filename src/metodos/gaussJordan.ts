import { ErrorNumerico, normaInfMatriz, residuo, validarSistemaLineal, type Matriz, type Vector } from './algebra'
import { formatoNumero } from './formato'

// Gauss-Jordan con pivoteo parcial
// lleva la matriz aumentada [A | b] hasta [I | x] y guarda cada paso para animarlo

export type TipoPaso = 'inicio' | 'intercambio' | 'normalizar' | 'eliminar' | 'final'

export interface PasoGaussJordan {
  tipo: TipoPaso
  descripcion: string
  // foto de la matriz aumentada despues de la operacion
  matriz: Matriz
  // fila y columna del pivote actual
  pivote: [number, number] | null
  // filas que cambiaron en este paso
  filasCambiadas: number[]
}

export interface ResultadoGaussJordan {
  x: Vector
  pasos: PasoGaussJordan[]
  operaciones: number
  residuo: number
  tiempoMs: number
}

const TOLERANCIA_PIVOTE = 1e-13

const foto = (M: Matriz): Matriz => M.map((fila) => [...fila])

export function resolverGaussJordan(A: Matriz, b: Vector): ResultadoGaussJordan {
  validarSistemaLineal(A, b)
  const inicio = performance.now()
  const n = A.length
  const aumentada: Matriz = A.map((fila, i) => [...fila, b[i]])
  const escala = Math.max(normaInfMatriz(A), 1)
  const pasos: PasoGaussJordan[] = []
  let operaciones = 0

  pasos.push({
    tipo: 'inicio',
    descripcion: 'Matriz aumentada inicial [A | b]',
    matriz: foto(aumentada),
    pivote: null,
    filasCambiadas: []
  })

  for (let k = 0; k < n; k++) {
    // pivoteo parcial para no dividir entre numeros chiquitos
    let filaPivote = k
    for (let i = k + 1; i < n; i++) {
      if (Math.abs(aumentada[i][k]) > Math.abs(aumentada[filaPivote][k])) filaPivote = i
    }

    if (Math.abs(aumentada[filaPivote][k]) < TOLERANCIA_PIVOTE * escala) {
      throw new ErrorNumerico(`No hay pivote válido en la columna ${k + 1}. La matriz es singular o casi singular.`)
    }

    if (filaPivote !== k) {
      ;[aumentada[k], aumentada[filaPivote]] = [aumentada[filaPivote], aumentada[k]]
      pasos.push({
        tipo: 'intercambio',
        descripcion: `F${k + 1} ↔ F${filaPivote + 1}  (pivoteo parcial, el mayor |a| de la columna ${k + 1})`,
        matriz: foto(aumentada),
        pivote: [k, k],
        filasCambiadas: [k, filaPivote]
      })
    }

    const pivote = aumentada[k][k]
    if (Math.abs(pivote - 1) > 1e-15) {
      for (let j = k; j <= n; j++) {
        aumentada[k][j] /= pivote
        operaciones++
      }
      pasos.push({
        tipo: 'normalizar',
        descripcion: `F${k + 1} ← F${k + 1} / ${formatoNumero(pivote)}  (pivote igual a 1)`,
        matriz: foto(aumentada),
        pivote: [k, k],
        filasCambiadas: [k]
      })
    }

    // se hacen ceros arriba y abajo del pivote
    for (let i = 0; i < n; i++) {
      if (i === k) continue
      const factor = aumentada[i][k]
      if (factor === 0) continue
      for (let j = k; j <= n; j++) {
        aumentada[i][j] -= factor * aumentada[k][j]
        operaciones++
      }
      aumentada[i][k] = 0
      pasos.push({
        tipo: 'eliminar',
        descripcion: `F${i + 1} ← F${i + 1} − (${formatoNumero(factor)})·F${k + 1}`,
        matriz: foto(aumentada),
        pivote: [k, k],
        filasCambiadas: [i]
      })
    }
  }

  const x = aumentada.map((fila) => fila[n])
  const tiempoMs = performance.now() - inicio

  pasos.push({
    tipo: 'final',
    descripcion: 'Forma [I | x] alcanzada, la última columna es la solución',
    matriz: foto(aumentada),
    pivote: null,
    filasCambiadas: []
  })

  return { x, pasos, operaciones, residuo: residuo(A, x, b), tiempoMs }
}
