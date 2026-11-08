import { $, escaparHtml } from './dom'

// notificaciones flotantes, la app nunca se cierra por un error, solo avisa

export type TipoAlerta = 'error' | 'exito' | 'aviso' | 'info'

const ICONOS: Record<TipoAlerta, string> = { error: '!', exito: '✓', aviso: '⚠', info: 'i' }

export function alerta(tipo: TipoAlerta, titulo: string, mensaje = '', duracion = 5200): void {
  const contenedor = $('#alertas')
  const caja = document.createElement('div')
  caja.className = `alerta ${tipo}`
  caja.setAttribute('role', tipo === 'error' ? 'alert' : 'status')
  caja.style.setProperty('--duracion', `${duracion}ms`)
  caja.innerHTML = `
    <span class="alerta-icono">${ICONOS[tipo]}</span>
    <div><strong>${escaparHtml(titulo)}</strong>${mensaje ? `<p>${escaparHtml(mensaje)}</p>` : ''}</div>
    <button aria-label="Cerrar">×</button>`

  const cerrar = () => {
    caja.classList.add('saliendo')
    caja.addEventListener('animationend', () => caja.remove(), { once: true })
  }
  caja.querySelector('button')!.addEventListener('click', cerrar)
  setTimeout(cerrar, duracion)

  // maximo cuatro alertas a la vez
  while (contenedor.children.length >= 4) contenedor.firstElementChild?.remove()
  contenedor.append(caja)
}
