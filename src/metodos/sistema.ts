import { derivative, parse, type EvalFunction, type MathNode } from 'mathjs'
import { ErrorNumerico, type Matriz, type Vector } from './algebra'

// convierte el texto del usuario en un sistema F(x) = 0 que se puede evaluar
// las variables se asignan en orden x, y, z, w, v, u segun el numero de ecuaciones

export const NOMBRES_VARIABLES = ['x', 'y', 'z', 'w', 'v', 'u'] as const

const CONSTANTES = new Set(['pi', 'PI', 'e', 'E', 'Infinity'])

export interface SistemaNoLineal {
  ecuaciones: string[]
  variables: string[]
  // version en LaTeX para mostrar bonito
  ecuacionesTex: string[]
  evaluar(x: Vector): Vector
  // igual que evaluar pero devuelve NaN donde no hay valor real, para graficar
  evaluarSeguro(x: Vector): Vector
  jacobiana(x: Vector): Matriz
  // derivadas parciales simbolicas, null si se usan diferencias finitas
  jacobianaTex: string[][] | null
  jacobianaAnalitica: boolean
}

interface Compilada {
  evaluar: EvalFunction
}

// arma el ambito de mathjs con los valores actuales de las variables
const ambito = (variables: string[], x: Vector): Record<string, number> =>
  Object.fromEntries(variables.map((nombre, i) => [nombre, x[i]]))

function aNumero(valor: unknown, ecuacion: string, x: Vector, variables: string[]): number {
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor
  const punto = variables.map((v, i) => `${v} = ${Number(x[i].toPrecision(6))}`).join(', ')
  if (typeof valor === 'number') {
    throw new ErrorNumerico(`La ecuación "${ecuacion}" da un valor infinito o indefinido en (${punto}).`)
  }
  throw new ErrorNumerico(`La ecuación "${ecuacion}" da un valor complejo o no real en (${punto}). Prueba otro vector inicial.`)
}

function traducirError(error: unknown, ecuacion: string): ErrorNumerico {
  const mensaje = error instanceof Error ? error.message : String(error)
  const funcion = mensaje.match(/Undefined function (\w+)/)
  if (funcion) return new ErrorNumerico(`La función "${funcion[1]}" no existe. Usa sin, cos, exp, log, sqrt, abs, etc.`)
  if (/Unexpected end|Parenthesis|Unexpected operator|Value expected|Unexpected type/i.test(mensaje)) {
    return new ErrorNumerico(`Revisa la sintaxis de "${ecuacion}", parece que falta un operador o un paréntesis.`)
  }
  return new ErrorNumerico(`No se pudo leer "${ecuacion}". ${mensaje}`)
}

// acepta "a = b" y lo pasa a la forma (a) - (b) = 0
export function separarEcuaciones(texto: string): string[] {
  return texto
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter((linea) => linea.length > 0 && !linea.startsWith('%') && !linea.startsWith('//'))
    .map((linea) => {
      const partes = linea.split('=')
      if (partes.length > 2) throw new ErrorNumerico(`"${linea}" tiene más de un signo igual.`)
      if (partes.length === 2) {
        const [izq, der] = partes.map((p) => p.trim())
        if (!izq || !der) throw new ErrorNumerico(`A "${linea}" le falta un lado de la igualdad.`)
        return `(${izq}) - (${der})`
      }
      return linea
    })
}

function simbolosLibres(nodo: MathNode): string[] {
  const simbolos = new Set<string>()
  nodo.traverse((hijo, ruta, padre) => {
    // los nombres de funciones como sin o exp tambien son SymbolNode, esos se saltan
    if (hijo.type === 'SymbolNode' && !(padre?.type === 'FunctionNode' && ruta === 'fn')) {
      simbolos.add((hijo as MathNode & { name: string }).name)
    }
  })
  return [...simbolos]
}

export function crearSistema(texto: string): SistemaNoLineal {
  const ecuaciones = separarEcuaciones(texto)
  const n = ecuaciones.length

  if (n === 0) throw new ErrorNumerico('Escribe al menos una ecuación, una por línea.')
  if (n === 1) throw new ErrorNumerico('Newton multivariable necesita al menos 2 ecuaciones.')
  if (n > NOMBRES_VARIABLES.length) {
    throw new ErrorNumerico(`Se soportan hasta ${NOMBRES_VARIABLES.length} ecuaciones (${NOMBRES_VARIABLES.join(', ')}).`)
  }

  const variables = NOMBRES_VARIABLES.slice(0, n) as string[]
  const nodos: MathNode[] = ecuaciones.map((ec) => {
    try {
      return parse(ec)
    } catch (error) {
      throw traducirError(error, ec)
    }
  })

  // el sistema debe ser cuadrado, n ecuaciones con n incognitas
  nodos.forEach((nodo, i) => {
    const extranas = simbolosLibres(nodo).filter((s) => !variables.includes(s) && !CONSTANTES.has(s))
    if (extranas.length > 0) {
      throw new ErrorNumerico(
        `En la ecuación ${i + 1} aparece "${extranas[0]}". Con ${n} ecuaciones las variables son ${variables.join(', ')}.`
      )
    }
  })

  const compiladas: Compilada[] = nodos.map((nodo) => ({ evaluar: nodo.compile() }))

  // se intenta derivar de forma simbolica, si alguna derivada falla se usa diferencias finitas
  let derivadas: { nodo: MathNode; evaluar: EvalFunction }[][] | null = null
  try {
    derivadas = nodos.map((nodo) =>
      variables.map((v) => {
        const d = derivative(nodo, v)
        return { nodo: d, evaluar: d.compile() }
      })
    )
  } catch {
    derivadas = null
  }

  const evaluar = (x: Vector): Vector =>
    compiladas.map((c, i) => {
      let valor: unknown
      try {
        valor = c.evaluar.evaluate(ambito(variables, x))
      } catch (error) {
        throw traducirError(error, ecuaciones[i])
      }
      return aNumero(valor, ecuaciones[i], x, variables)
    })

  const evaluarSeguro = (x: Vector): Vector =>
    compiladas.map((c) => {
      try {
        const valor = c.evaluar.evaluate(ambito(variables, x))
        return typeof valor === 'number' && Number.isFinite(valor) ? valor : NaN
      } catch {
        return NaN
      }
    })

  const jacobianaNumerica = (x: Vector): Matriz => {
    const J: Matriz = Array.from({ length: n }, () => new Array(n).fill(0))
    for (let j = 0; j < n; j++) {
      // paso centrado proporcional al tamano de la variable
      const h = Math.sqrt(Number.EPSILON) * Math.max(1, Math.abs(x[j]))
      const adelante = [...x]
      const atras = [...x]
      adelante[j] += h
      atras[j] -= h
      const Fa = evaluar(adelante)
      const Fb = evaluar(atras)
      for (let i = 0; i < n; i++) J[i][j] = (Fa[i] - Fb[i]) / (2 * h)
    }
    return J
  }

  const jacobiana = (x: Vector): Matriz => {
    if (!derivadas) return jacobianaNumerica(x)
    try {
      return derivadas.map((fila, i) =>
        fila.map((d) => aNumero(d.evaluar.evaluate(ambito(variables, x)), ecuaciones[i], x, variables))
      )
    } catch {
      // por ejemplo abs en cero, ahi la numerica aguanta mejor
      return jacobianaNumerica(x)
    }
  }

  return {
    ecuaciones,
    variables,
    ecuacionesTex: nodos.map((nodo) => nodo.toTex({ parenthesis: 'auto' })),
    evaluar,
    evaluarSeguro,
    jacobiana,
    jacobianaTex: derivadas ? derivadas.map((fila) => fila.map((d) => d.nodo.toTex({ parenthesis: 'auto' }))) : null,
    jacobianaAnalitica: derivadas !== null
  }
}
