/**
 * Ejemplo de uso del componente MobileMenu
 * 
 * Este componente soluciona los problemas comunes del menú hamburguesa:
 * - Área de click más grande (48x48px mínimo)
 * - Prevención de propagación de eventos
 * - Manejo correcto del estado
 * - Cierre automático al hacer click fuera
 * - Soporte para tecla Escape
 */

import MobileMenu from './MobileMenu';
import Link from 'next/link';

export default function ExampleUsage() {
  return (
    <header className="flex items-center justify-between p-4">
      <div className="logo">Tu Logo</div>
      
      {/* Menú hamburguesa - Solo visible en móvil */}
      <div className="md:hidden">
        <MobileMenu>
          <ul className="space-y-4">
            <li>
              <Link
                href="/"
                className="block py-2 px-4 rounded-lg hover:bg-slate-800 transition-colors"
                style={{ color: 'var(--color-cloud)' }}
              >
                Inicio
              </Link>
            </li>
            <li>
              <Link
                href="/about"
                className="block py-2 px-4 rounded-lg hover:bg-slate-800 transition-colors"
                style={{ color: 'var(--color-cloud)' }}
              >
                Acerca de
              </Link>
            </li>
            <li>
              <Link
                href="/contact"
                className="block py-2 px-4 rounded-lg hover:bg-slate-800 transition-colors"
                style={{ color: 'var(--color-cloud)' }}
              >
                Contacto
              </Link>
            </li>
          </ul>
        </MobileMenu>
      </div>

      {/* Menú desktop - Oculto en móvil */}
      <nav className="hidden md:flex space-x-4">
        <Link href="/">Inicio</Link>
        <Link href="/about">Acerca de</Link>
        <Link href="/contact">Contacto</Link>
      </nav>
    </header>
  );
}


