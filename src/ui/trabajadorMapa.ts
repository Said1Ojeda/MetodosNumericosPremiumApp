// calcula el mapa de convergencia en otro hilo para que la pagina no se congele

import { mapaConvergencia } from '../metodos/newton'
import { crearSistema } from '../metodos/sistema'

export interface PedidoMapa {
  ecuaciones: string
  rangoX: [number, number]
  rangoY: [number, number]
  resolucion: number
}

self.onmessage = (evento: MessageEvent<PedidoMapa>) => {
  const { ecuaciones, rangoX, rangoY, resolucion } = evento.data
  try {
    const sistema = crearSistema(ecuaciones)
    const mapa = mapaConvergencia(sistema, rangoX, rangoY, resolucion, 40, (fraccion) =>
      self.postMessage({ tipo: 'avance', fraccion })
    )
    self.postMessage({ tipo: 'listo', mapa })
  } catch (error) {
    self.postMessage({ tipo: 'error', mensaje: error instanceof Error ? error.message : String(error) })
  }
}
