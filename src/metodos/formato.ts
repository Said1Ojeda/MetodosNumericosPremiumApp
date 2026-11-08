// formatos para mostrar numeros sin ruido de punto flotante

export function formatoNumero(valor: number, decimales = 6): string {
  if (!Number.isFinite(valor)) return String(valor)
  if (valor === 0 || Object.is(valor, -0)) return '0'
  const abs = Math.abs(valor)
  if (abs < 1e-4 || abs >= 1e7) return valor.toExponential(Math.min(decimales, 4))
  // quita ceros de sobra al final
  return String(Number(valor.toFixed(decimales)))
}

export function formatoCientifico(valor: number, decimales = 3): string {
  if (!Number.isFinite(valor)) return String(valor)
  // un cero exacto se ve mejor como 0 que como 0.000e+0
  if (valor === 0) return '0'
  return valor.toExponential(decimales)
}

export const formatoVector = (v: number[], decimales = 6): string =>
  `[${v.map((vi) => formatoNumero(vi, decimales)).join(', ')}]`
