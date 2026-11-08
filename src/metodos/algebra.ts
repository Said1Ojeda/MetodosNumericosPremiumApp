// utilidades chicas de vectores y matrices que usan todos los metodos

export type Vector = number[]
export type Matriz = number[][]

// error con mensaje pensado para mostrarse tal cual al usuario
export class ErrorNumerico extends Error {
  constructor(mensaje: string) {
    super(mensaje)
    this.name = 'ErrorNumerico'
  }
}

export const copiarMatriz = (A: Matriz): Matriz => A.map((fila) => [...fila])

export const identidad = (n: number): Matriz =>
  Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)))

export const multiplicarMatrizVector = (A: Matriz, v: Vector): Vector =>
  A.map((fila) => fila.reduce((suma, a, j) => suma + a * v[j], 0))

export const restar = (a: Vector, b: Vector): Vector => a.map((ai, i) => ai - b[i])

export const sumar = (a: Vector, b: Vector): Vector => a.map((ai, i) => ai + b[i])

export const normaInf = (v: Vector): number => v.reduce((max, vi) => Math.max(max, Math.abs(vi)), 0)

export const normaInfMatriz = (A: Matriz): number =>
  A.reduce((max, fila) => Math.max(max, fila.reduce((s, a) => s + Math.abs(a), 0)), 0)

export const residuo = (A: Matriz, x: Vector, b: Vector): number => normaInf(restar(multiplicarMatrizVector(A, x), b))

export const esFinito = (v: Vector): boolean => v.every((vi) => Number.isFinite(vi))

export function validarSistemaLineal(A: Matriz, b: Vector): void {
  const n = A.length
  if (n === 0) throw new ErrorNumerico('La matriz A está vacía.')
  if (A.some((fila) => fila.length !== n)) throw new ErrorNumerico('La matriz A debe ser cuadrada para resolver Ax = b.')
  if (b.length !== n) throw new ErrorNumerico(`El vector b debe tener ${n} componentes, igual que las filas de A.`)
  if (!A.every(esFinito) || !esFinito(b)) throw new ErrorNumerico('A y b solo pueden tener números finitos.')
}
