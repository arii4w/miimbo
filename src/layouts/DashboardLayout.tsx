import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { miimboColors } from '../theme/colors'
import { useAuthStore } from '../store/authStore'
import { useClientsStore } from '../store/clientsStore'
import { usePropertiesStore } from '../store/propertiesStore'

// Redujimos un poco el padding (px-4 a px-3, py-2.5 a py-2) y el tamaño del texto a text-xs
const navItemBase =
  'flex items-center gap-3 px-3 py-2 rounded-full text-xs font-medium transition-all duration-200'

export function DashboardLayout() {
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)
  const clearClients = useClientsStore((state) => state.clear)
  const clearProperties = usePropertiesStore((state) => state.clear)

  const handleLogout = () => {
    console.log('[MIIMBO] [DashboardLayout] Cerrar sesión presionado')
    logout()
    clearClients()
    clearProperties()
    navigate('/login', { replace: true })
    console.log('[MIIMBO] [DashboardLayout] Redirigiendo a /login')
  }

  return (
    <div
      className="min-h-screen w-full flex"
      style={{ backgroundColor: miimboColors.brand.sand }}
    >
      {/* Sidebar: 
          - Redujimos ancho de w-60 a w-[200px] 
          - Aumentamos el margen vertical (my-8) para hacerlo un poco más corto 
          - Redujimos el padding interno (px-3)
      */}
      <aside
        className="w-[200px] flex flex-col justify-between py-6 px-3 mx-6 my-4 rounded-3xl"
        style={{
          backgroundImage: miimboColors.gradients.sidebar,
          boxShadow: '0 24px 60px rgba(12, 8, 41, 0.35)',
        }}
      >
        <div className="space-y-6">
          {/* Logo (Centrado y ajustado al nuevo ancho) */}
          <div className="flex justify-center">
            <div className="h-9 w-24 rounded-2xl bg-white/18 backdrop-blur-xl border border-white/40 flex items-center justify-center">
              <span className="text-[10px] font-bold tracking-[0.2em] text-white uppercase">
                miimbo
              </span>
            </div>
          </div>

          {/* Navegación principal */}
          <nav className="space-y-1.5">
            <SidebarItem to="/" label="Inicio" icon="home" />
            <SidebarItem to="/clientes" label="Clientes" icon="users" />
            <SidebarItem to="/propiedades" label="Propiedades" icon="building" />
            <SidebarItem to="/simulacion" label="Simulación" icon="calculator" />
            <SidebarItem
              to="/historial"
              label="Historial de simulaciones"
              icon="files"
            />
          </nav>
        </div>

        {/* Configuración / Cerrar sesión (Alineado con el nuevo tamaño de los items) */}
        <div className="space-y-1.5 text-xs">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-full px-3 py-2 text-white/90 hover:bg-white/15 transition-colors"
          >
            <Icon name="settings" className="h-3.5 w-3.5" />
            <span>Configuración</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-full px-3 py-2 text-white/90 hover:bg-white/15 transition-colors"
          >
            <Icon name="logout" className="h-3.5 w-3.5" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <main className="flex-1 pr-10 py-8">
        <div className="max-w-6xl mx-auto pl-4">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

type SidebarItemProps = {
  to: string
  label: string
  icon: IconName
}

function SidebarItem({ to, label, icon }: SidebarItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          navItemBase,
          isActive
            ? 'bg-white/85 text-[rgba(12,8,41,0.9)] shadow-sm'
            : 'text-white/90 hover:bg-white/10',
        ].join(' ')
      }
      end={to === '/'}
    >
      {/* Círculo del icono un poco más pequeño para encajar mejor */}
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/40 text-[rgba(12,8,41,0.9)] shrink-0">
        <Icon name={icon} className="h-3 w-3" />
      </div>
      <span className="truncate">{label}</span>
    </NavLink>
  )
}

type IconName = 'home' | 'users' | 'building' | 'calculator' | 'files' | 'settings' | 'logout'

type IconProps = {
  name: IconName
  className?: string
}

function Icon({ name, className }: IconProps) {
  switch (name) {
    case 'home':
      return (
        <span className={className}>
          <svg viewBox="0 0 24 24" className="w-full h-full fill-current">
            <path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4.5V14h-5V21H5a1 1 0 0 1-1-1z" />
          </svg>
        </span>
      )
    case 'users':
      return (
        <span className={className}>
          <svg viewBox="0 0 24 24" className="w-full h-full fill-current">
            <path d="M8 12a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm8-1a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm-8 2c-2.67 0-8 1.34-8 4v1h9v-1c0-1.52.86-2.87 2.24-3.78A8.21 8.21 0 0 0 8 13Zm6 .5c-1.34 0-2.61.26-3.71.74A4 4 0 0 1 16 19h6v-1c0-2.66-5.33-4.5-8-4.5Z" />
          </svg>
        </span>
      )
    case 'building':
      return (
        <span className={className}>
          <svg viewBox="0 0 24 24" className="w-full h-full fill-current">
            <path d="M4 21V3h10v4h6v14h-3v-3h-3v3H4Zm4-4h2v-2H8Zm0-4h2v-2H8Zm0-4h2V7H8Zm4 8h2v-2h-2Zm0-4h2v-2h-2Z" />
          </svg>
        </span>
      )
    case 'calculator':
      return (
        <span className={className}>
          <svg viewBox="0 0 24 24" className="w-full h-full fill-current">
            <path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm0 4h12V5H6Zm2 4v2h2v-2Zm0 4v2h2v-2Zm4-4v2h2v-2Zm0 4v2h2v-2Zm4-4v6h2v-6Z" />
          </svg>
        </span>
      )
    case 'files':
      return (
        <span className={className}>
          <svg viewBox="0 0 24 24" className="w-full h-full fill-current">
            <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm7 0v5h5ZM8 11v2h8v-2Zm0 4v2h5v-2Z" />
          </svg>
        </span>
      )
    case 'settings':
      return (
        <span className={className}>
          <svg viewBox="0 0 24 24" className="w-full h-full fill-current">
            <path d="M19.14 12.94a7.52 7.52 0 0 0 .05-.94 7.52 7.52 0 0 0-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.27 7.27 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.49.42l-.36 2.54a7.27 7.27 0 0 0-1.63.94l-2.39-.96a.5.5 0 0 0-.61.22L2.7 8.48a.5.5 0 0 0 .12.64l2.03 1.58c-.03.31-.05.63-.05.94s.02.63.05.94L2.82 14.16a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .61.22l2.39-.96c.5.38 1.05.7 1.63.94l.36 2.54a.5.5 0 0 0 .49.42h3.8a.5.5 0 0 0 .49-.42l.36-2.54c.58-.24 1.13-.56 1.63-.94l2.39.96a.5.5 0 0 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64ZM12 15a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />
          </svg>
        </span>
      )
    case 'logout':
      return (
        <span className={className}>
          <svg viewBox="0 0 24 24" className="w-full h-full fill-current">
            <path d="M10 4h2v4h-2V4Zm0 12h2v4h-2v-4ZM4 10h4v2H4v-2Zm12 0h4v2h-4v-2Zm-1.95-5.95 1.41 1.41L13.41 8 12 6.59 14.05 4.05Zm0 11.9L12 17.41 13.41 16l2.05 2.05-1.41 1.41Z" />
          </svg>
        </span>
      )
    default:
      return null
  }
}