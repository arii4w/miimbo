import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useReferenceStore } from '../store/referenceStore'
import { useClientsStore } from '../store/clientsStore'
import { usePropertiesStore } from '../store/propertiesStore'
import { fetchAllReferenceData } from '../services/referenceApi'
import { fetchClients } from '../services/clientsApi'
import { fetchProperties } from '../services/propertiesApi'

export function PrivateRoute() {
  const user = useAuthStore((state) => state.user)
  const hasLoaded = useReferenceStore((state) => state.hasLoaded)
  const isLoading = useReferenceStore((state) => state.isLoading)
  const setAll = useReferenceStore((state) => state.setAll)
  const setIsLoading = useReferenceStore((state) => state.setIsLoading)
  const setError = useReferenceStore((state) => state.setError)
  const setClients = useClientsStore((state) => state.setClients)
  const setProperties = usePropertiesStore((state) => state.setProperties)

  useEffect(() => {
    if (!user || hasLoaded || isLoading) {
      if (!user) console.log('[MIIMBO] [PrivateRoute] useEffect: no user, skip')
      else if (hasLoaded) console.log('[MIIMBO] [PrivateRoute] useEffect: ya cargado, skip')
      else if (isLoading) console.log('[MIIMBO] [PrivateRoute] useEffect: loading, skip')
      return
    }

    const loadInitialData = async () => {
      try {
        console.log('[MIIMBO] [PrivateRoute] Cargando reference, clientes y propiedades (user en localStorage, recarga)...')
        setIsLoading(true)
        setError(null)
        const data = await fetchAllReferenceData()
        setAll(data)
        console.log('[MIIMBO] [PrivateRoute] Reference data OK')

        try {
          const [clientsData, propertiesData] = await Promise.all([
            fetchClients(),
            fetchProperties(),
          ])
          setClients([...clientsData].reverse())
          setProperties([...propertiesData].reverse())
          console.log('[MIIMBO] [PrivateRoute] Clientes y propiedades OK')
        } catch (listErr) {
          console.warn('[MIIMBO] [PrivateRoute] Error cargando clientes/propiedades (no bloquea)', listErr)
        }
      } catch (error) {
        console.warn('[MIIMBO] [PrivateRoute] Error cargando reference data', error)
        setError((error as Error).message)
      } finally {
        setIsLoading(false)
      }
    }

    void loadInitialData()
  }, [user, hasLoaded, isLoading])

  if (!user) {
    console.log('[MIIMBO] [PrivateRoute] Sin usuario → Redirect /login')
    return <Navigate to="/login" replace />
  }

  if (!hasLoaded) {
    console.log('[MIIMBO] [PrivateRoute] Esperando reference data → mostrando loader')

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FDF7EE]">
        <div className="rounded-2xl bg-white/80 px-6 py-4 shadow-lg border border-orange-100 text-xs text-[rgba(12,8,41,0.8)]">
          Cargando información inicial de Miimbo...
        </div>
      </div>
    )
  }

  console.log('[MIIMBO] [PrivateRoute] Usuario OK, reference OK → renderizando Outlet')
  return <Outlet />
}

