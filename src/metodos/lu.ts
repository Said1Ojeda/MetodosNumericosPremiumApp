import {
  ErrorNumerico,
  copiarMatriz,
  identidad,
  normaInfMatriz,
  residuo,
  validarSistemaLineal,
  type Matriz,
  type Vector
} from './algebra'

// factorizacion PA = LU con pivoteo parcial
// L guarda los multiplicadores y U queda triangular superior

export interface FactorizacionLU {
  L: Matriz
  U: Matriz
  P: Matriz
  // orden de las filas despues de los intercambios
  permutacion: number[]
  intercambios: number
  operaciones: number
}

export interface ResultadoLU extends FactorizacionLU {
  x: Vector
  // solucion intermedia de Ly = Pb
  y: Vector
  residuo: number
  determinante: number
  numeroCondicion: number
  tiempoMs: number
}

// tolerancia relativa para decidir si un pivote es practicamente cero
const TOLERANCIA_PIVOTE = 1e-13

export function factorizarLU(A: Matriz): FactorizacionLU {
  const n = A.length
  const U = copiarMatriz(A)
  const L = identidad(n)
  const permutacion = Array.from({ length: n }, (_, i) => i)
  const escala = Math.max(normaInfMatriz(A), 1)
  let intercambios = 0
  let operaciones = 0

  for (let k = 0; k < n; k++) {
    // buscar la fila con el pivote mas grande en la columna k
    let filaPivote = k
    for (let i = k + 1; i < n; i++) {
      if (Math.abs(U[i][k]) > Math.abs(U[filaPivote][k])) filaPivote = i
    }

    if (Math.abs(U[filaPivote][k]) < TOLERANCIA_PIVOTE * escala) {
      throw new ErrorNumerico('La matriz es singular o casi singular, no tiene solución única.')
    }

    if (filaPivote !== k) {
      ;[U[k], U[filaPivote]] = [U[filaPivote], U[k]]
      ;[permutacion[k], permutacion[filaPivote]] = [permutacion[filaPivote], permutacion[k]]
      // los multiplicadores ya calculados tambien se cambian de fila
      for (let j = 0; j < k; j++) {
        ;[L[k][j], L[filaPivote][j]] = [L[filaPivote][j], L[k][j]]
      }
      intercambios++
    }

    for (let i = k + 1; i < n; i++) {
      const m = U[i][k] / U[k][k]
      L[i][k] = m
      operaciones++
      for (let j = k; j < n; j++) {
        U[i][j] -= m * U[k][j]
        operaciones++
      }
      U[i][k] = 0
    }
  }

  const P = permutacion.map((fila) => Array.from({ length: n }, (_, j) => (j === fila ? 1 : 0)))
  return { L, U, P, permutacion, intercambios, operaciones }
}

// Ly = Pb hacia adelante y luego Ux = y hacia atras
export function sustituir(fact: FactorizacionLU, b: Vector): { x: Vector; y: Vector; operaciones: number } {
  const { L, U, permutacion } = fact
  const n = L.length
  const y: Vector = new Array(n).fill(0)
  const x: Vector = new Array(n).fill(0)
  let operaciones = 0

  for (let i = 0; i < n; i++) {
    let suma = b[permutacion[i]]
    for (let j = 0; j < i; j++) {
      suma -= L[i][j] * y[j]
      operaciones++
    }
    y[i] = suma
  }

  for (let i = n - 1; i >= 0; i--) {
    let suma = y[i]
    for (let j = i + 1; j < n; j++) {
      suma -= U[i][j] * x[j]
      operaciones++
    }
    x[i] = suma / U[i][i]
    operaciones++
  }

  return { x, y, operaciones }
}

// numero de condicion en norma infinito usando la inversa que sale de la misma LU
export function numeroCondicion(A: Matriz, fact: FactorizacionLU): number {
  const n = A.length
  const columnas = identidad(n).map((e) => sustituir(fact, e).x)
  const inversa = Array.from({ length: n }, (_, i) => columnas.map((col) => col[i]))
  return normaInfMatriz(A) * normaInfMatriz(inversa)
}

export function resolverLU(A: Matriz, b: Vector): ResultadoLU {
  validarSistemaLineal(A, b)
  const inicio = performance.now()
  const fact = factorizarLU(A)
  const { x, y, operaciones } = sustituir(fact, b)
  const tiempoMs = performance.now() - inicio

  // det(A) es el producto de la diagonal de U con el signo de los intercambios
  const signo = fact.intercambios % 2 === 0 ? 1 : -1
  const determinante = signo * fact.U.reduce((prod, fila, i) => prod * fila[i], 1)

  return {
    ...fact,
    operaciones: fact.operaciones + operaciones,
    x,
    y,
    residuo: residuo(A, x, b),
    determinante,
    numeroCondicion: numeroCondicion(A, fact),
    tiempoMs
  }
}
