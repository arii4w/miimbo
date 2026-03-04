import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export function PublicRoute() {
  const user = useAuthStore((state) => state.user)

  if (user) {
    console.log('[MIIMBO] [PublicRoute] Usuario logueado → Redirect /')
    return <Navigate to="/" replace />
  }

  console.log('[MIIMBO] [PublicRoute] Sin usuario → mostrando Login/Register')
  return <Outlet />
}

