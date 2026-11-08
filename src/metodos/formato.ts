// formatos para mostrar numeros sin ruido de punto flotante

export function formatoNumero(valor: number, decimales = 6): string {
  if (!Number.isFinite(valor)) return String(valor)
  if (valor === 0 || Object.is(valor, -0)) return '0'
  const abs = Math.abs(valor)
  if (abs < 1e-4 || abs >= 1e7) return valor.toExponential(Math.min(decimales, 4))
  // quita ceros de sobra al final
  return String(Number(valor.toFixed(decimales)))
}

export const formatoCientifico = (valor: number, decimales = 3): string =>
  Number.isFinite(valor) ? valor.toExponential(decimales) : String(valor)

export const formatoVector = (v: number[], decimales = 6): string =>
  `[${v.map((vi) => formatoNumero(vi, decimales)).join(', ')}]`
