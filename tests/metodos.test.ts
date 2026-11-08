import { describe, expect, it } from 'vitest'
import { ErrorNumerico, multiplicarMatrizVector, normaInf } from '../src/metodos/algebra'
import { EJEMPLOS_LINEALES, EJEMPLOS_NEWTON } from '../src/metodos/ejemplos'
import { resolverGaussJordan } from '../src/metodos/gaussJordan'
import { factorizarLU, resolverLU } from '../src/metodos/lu'
import { mapaConvergencia, newtonMultivariable } from '../src/metodos/newton'
import { crearSistema } from '../src/metodos/sistema'

const multiplicar = (A: number[][], B: number[][]) => A.map((fila) => B[0].map((_, j) => fila.reduce((s, a, k) => s + a * B[k][j], 0)))

describe('sistemas lineales', () => {
  it.each(EJEMPLOS_LINEALES.map((e) => [e.nombre, e] as const))('%s da la misma solucion con Gauss-Jordan y LU', (_, ej) => {
    const gj = resolverGaussJordan(ej.A, ej.b)
    const lu = resolverLU(ej.A, ej.b)
    expect(gj.residuo).toBeLessThan(1e-10)
    expect(lu.residuo).toBeLessThan(1e-10)
    expect(normaInf(gj.x.map((v, i) => v - lu.x[i]))).toBeLessThan(1e-10)
  })

  it('cumple PA = LU', () => {
    const { A } = EJEMPLOS_LINEALES.find((e) => e.nombre === 'Requiere pivoteo')!
    const { L, U, P, intercambios } = factorizarLU(A)
    expect(intercambios).toBeGreaterThan(0)
    const PA = multiplicar(P, A)
    const LU = multiplicar(L, U)
    PA.forEach((fila, i) => fila.forEach((v, j) => expect(LU[i][j]).toBeCloseTo(v, 12)))
  })

  it('resuelve el 2x2 conocido', () => {
    const r = resolverLU([[2, 1], [1, -1]], [5, 1])
    expect(r.x[0]).toBeCloseTo(2, 12)
    expect(r.x[1]).toBeCloseTo(1, 12)
    expect(r.determinante).toBeCloseTo(-3, 12)
  })

  it('avisa si la matriz es singular', () => {
    const A = [[1, 2], [2, 4]]
    expect(() => resolverGaussJordan(A, [1, 2])).toThrow(ErrorNumerico)
    expect(() => resolverLU(A, [1, 2])).toThrow(ErrorNumerico)
  })

  it('valida tamanos', () => {
    expect(() => resolverLU([[1, 2], [3, 4]], [1, 2, 3])).toThrow(/3|2/)
    expect(() => resolverLU([[1, 2, 3], [3, 4, 5]], [1, 2])).toThrow(/cuadrada/)
  })

  it('Gauss-Jordan termina en la identidad', () => {
    const ej = EJEMPLOS_LINEALES[0]
    const final = resolverGaussJordan(ej.A, ej.b).pasos.at(-1)!.matriz
    final.forEach((fila, i) => fila.slice(0, -1).forEach((v, j) => expect(v).toBeCloseTo(i === j ? 1 : 0, 12)))
  })
})

describe('Newton-Raphson multivariable', () => {
  it.each(EJEMPLOS_NEWTON.map((e) => [e.nombre, e] as const))('%s converge', (_, ej) => {
    const sistema = crearSistema(ej.ecuaciones)
    const r = newtonMultivariable(sistema, ej.x0, { tolerancia: ej.tolerancia, maxIteraciones: ej.maxIteraciones })
    expect(r.estado).toBe('convergio')
    expect(r.residuoFinal).toBeLessThan(1e-5)
  })

  it('encuentra la interseccion de la circunferencia y la recta', () => {
    const sistema = crearSistema('x^2 + y^2 = 25\ny = 0.75*x + 1')
    const r = newtonMultivariable(sistema, [4, 4], { tolerancia: 1e-10, maxIteraciones: 50 })
    expect(r.raiz[0] ** 2 + r.raiz[1] ** 2).toBeCloseTo(25, 8)
    expect(r.raiz[1]).toBeCloseTo(0.75 * r.raiz[0] + 1, 8)
  })

  it('el brazo robotico llega al punto pedido', () => {
    const ej = EJEMPLOS_NEWTON.find((e) => e.nombre.startsWith('Brazo'))!
    const [a, b] = newtonMultivariable(crearSistema(ej.ecuaciones), ej.x0, ej).raiz
    expect(2 * Math.cos(a) + 1.5 * Math.cos(a + b)).toBeCloseTo(2.5, 7)
    expect(2 * Math.sin(a) + 1.5 * Math.sin(a + b)).toBeCloseTo(1.5, 7)
  })

  it('la jacobiana simbolica coincide con la numerica', () => {
    const sistema = crearSistema('sin(x) + y^2 - 1\nx^2 + y - 1')
    expect(sistema.jacobianaAnalitica).toBe(true)
    const J = sistema.jacobiana([0.7, 0.5])
    expect(J[0][0]).toBeCloseTo(Math.cos(0.7), 12)
    expect(J[0][1]).toBeCloseTo(1, 12)
    expect(J[1][0]).toBeCloseTo(1.4, 12)
    expect(J[1][1]).toBeCloseTo(1, 12)
  })

  it('tiene convergencia cuadratica', () => {
    const sistema = crearSistema('x^2 + y^2 - 4\nx*y - 1')
    const r = newtonMultivariable(sistema, [2, 0.5], { tolerancia: 1e-14, maxIteraciones: 30 })
    expect(r.ordenConvergencia).not.toBeNull()
    expect(r.ordenConvergencia!).toBeGreaterThan(1.6)
  })

  it('cada delta resuelve J delta = -F', () => {
    const sistema = crearSistema('x^3 - y + 1\nx^2 + y^2 - 4')
    const r = newtonMultivariable(sistema, [1, 1.5], { tolerancia: 1e-8, maxIteraciones: 30 })
    const anterior = [[1, 1.5], ...r.pasos.map((p) => p.x)]
    r.pasos.forEach((p, i) => {
      const F = sistema.evaluar(anterior[i])
      const Jd = multiplicarMatrizVector(p.jacobiana, p.delta)
      Jd.forEach((v, j) => expect(v).toBeCloseTo(-F[j], 9))
    })
  })

  it('reporta errores entendibles', () => {
    expect(() => crearSistema('')).toThrow(/al menos una/)
    expect(() => crearSistema('x + 1')).toThrow(/al menos 2/)
    expect(() => crearSistema('x + a\ny - 1')).toThrow(/"a"/)
    expect(() => crearSistema('x + (y\ny - 1')).toThrow(ErrorNumerico)
    expect(() => crearSistema('x = y = 1\ny')).toThrow(/más de un signo/)
    const s = crearSistema('x^2 + y^2 - 4\nx - y')
    expect(() => newtonMultivariable(s, [1], { tolerancia: 1e-6, maxIteraciones: 10 })).toThrow(/2 componentes/)
    expect(() => newtonMultivariable(s, [1, 1], { tolerancia: -1, maxIteraciones: 10 })).toThrow(/tolerancia/)
    expect(() => newtonMultivariable(s, [0, 0], { tolerancia: 1e-6, maxIteraciones: 10 })).toThrow(/singular/)
  })

  it('detecta valores complejos', () => {
    const s = crearSistema('sqrt(x) - 1\ny - 1')
    expect(() => newtonMultivariable(s, [-4, 0], { tolerancia: 1e-6, maxIteraciones: 10 })).toThrow(/complejo/)
  })

  it('el mapa de convergencia encuentra varias raices', () => {
    const s = crearSistema('x^2 + y^2 - 4\nx*y - 1')
    const mapa = mapaConvergencia(s, [-3, 3], [-3, 3], 40)
    expect(mapa.raices.length).toBe(4)
  })
})
