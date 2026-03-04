import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { miimboColors } from '../theme/colors'
import { useAuthStore } from '../store/authStore'
import { useClientsStore } from '../store/clientsStore'
import { usePropertiesStore } from '../store/propertiesStore'
import { usePaymentPlansStore } from '../store/paymentPlansStore'
import { useReferenceStore } from '../store/referenceStore'
import { fetchPaymentPlans } from '../services/paymentPlansApi'

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return '—'
  }
}

export function Home() {
  const user = useAuthStore((s) => s.user)
  const clients = useClientsStore((s) => s.clients)
  const properties = usePropertiesStore((s) => s.properties)
  const { plans, setPlans, isLoading: plansLoading, setIsLoading: setPlansLoading, setError: setPlansError } = usePaymentPlansStore()
  const { bonos, currencies, propertyTypes, hasLoaded: refLoaded } = useReferenceStore()

  useEffect(() => {
    setPlansLoading(true)
    setPlansError(null)
    fetchPaymentPlans()
      .then(setPlans)
      .catch((e) => setPlansError(e instanceof Error ? e.message : 'Error al cargar simulaciones'))
      .finally(() => setPlansLoading(false))
  }, [setPlans, setPlansLoading, setPlansError])

  const firstName = user?.name?.split(' ')[0] || 'Usuario'
  const recentPlans = plans.slice(0, 5)

  return (
    <div className="space-y-8 max-w-4xl">
      {/* ——— Bienvenida ——— */}
      <header className="rounded-[20px] border border-white/70 px-6 py-5 shadow-[0_14px_40px_rgba(12,8,41,0.08)] backdrop-blur-xl"
        style={{ background: 'linear-gradient(145deg, rgba(255,132,0,0.06) 0%, rgba(255,240,225,0.5) 60%, #FEFBF7 100%)' }}
      >
        <h1 className="text-xl font-bold tracking-tight" style={{ color: miimboColors.brand.midnight }}>
          Hola, {firstName}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(12,8,41,0.55)' }}>
          Resumen de tu actividad en Miimbo
        </p>
      </header>

      {/* ——— Tres métricas principales ——— */}
      <section className="grid gap-5 sm:grid-cols-3">
        <StatCard
          title="Clientes registrados"
          value={clients.length}
          href="/clientes"
          buttonLabel="Ver clientes"
          tone="soft-rose"
        />
        <StatCard
          title="Propiedades actuales"
          value={properties.length}
          href="/propiedades"
          buttonLabel="Ver propiedades"
          tone="soft-gold"
        />
        <StatCard
          title="Simulaciones realizadas"
          value={plansLoading ? '…' : plans.length}
          href="/historial"
          buttonLabel="Ver historial"
          tone="soft-amber"
        />
      </section>

      {/* ——— Catálogos + Últimas simulaciones ——— */}
      <section className="grid gap-6 lg:grid-cols-2">
        {/* Catálogos de referencia */}
        <article
          className="rounded-[24px] border border-white/70 px-6 py-5 shadow-[0_14px_35px_rgba(12,8,41,0.06)] backdrop-blur-xl"
          style={{ background: 'linear-gradient(145deg, rgba(244,167,160,0.12) 0%, rgba(255,240,225,0.6) 100%)' }}
        >
          <h2 className="text-sm font-bold tracking-tight mb-4" style={{ color: miimboColors.brand.midnight }}>
            Catálogos cargados
          </h2>
          {refLoaded ? (
            <ul className="space-y-3">
              <CatalogRow label="Bonos disponibles" value={bonos.length} />
              <CatalogRow label="Monedas" value={currencies.length} />
              <CatalogRow label="Tipos de propiedad" value={propertyTypes.length} />
            </ul>
          ) : (
            <p className="text-xs" style={{ color: 'rgba(12,8,41,0.5)' }}>Cargando catálogos…</p>
          )}
        </article>

        {/* Últimas simulaciones */}
        <article
          className="rounded-[24px] border border-white/70 px-6 py-5 shadow-[0_14px_35px_rgba(12,8,41,0.06)] backdrop-blur-xl"
          style={{ background: 'linear-gradient(145deg, rgba(255,213,99,0.15) 0%, rgba(255,240,225,0.6) 100%)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold tracking-tight" style={{ color: miimboColors.brand.midnight }}>
              Últimas simulaciones
            </h2>
            <Link
              to="/historial"
              className="text-xs font-semibold transition-colors hover:underline"
              style={{ color: miimboColors.brand.sunrise }}
            >
              Ver todo
            </Link>
          </div>
          {plansLoading ? (
            <p className="text-xs" style={{ color: 'rgba(12,8,41,0.5)' }}>Cargando…</p>
          ) : recentPlans.length === 0 ? (
            <p className="text-xs" style={{ color: 'rgba(12,8,41,0.5)' }}>Aún no hay simulaciones.</p>
          ) : (
            <ul className="space-y-2.5">
              {recentPlans.map((plan) => (
                <li
                  key={plan.id}
                  className="flex items-center justify-between gap-3 py-2 px-3 rounded-xl border border-white/50 bg-white/30"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate" style={{ color: 'rgba(12,8,41,0.85)' }}>
                      {plan.client ? `${plan.client.name} ${plan.client.lastname}` : '—'} · {plan.property?.name ?? '—'}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'rgba(12,8,41,0.5)' }}>
                      {formatDate(plan.createdAt)}
                    </p>
                  </div>
                  <Link
                    to="/historial"
                    className="text-[10px] font-semibold shrink-0"
                    style={{ color: miimboColors.brand.sunrise }}
                  >
                    Ver
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      {/* ——— Acceso rápido ——— */}
      <section className="rounded-[24px] border border-white/70 px-6 py-5 shadow-[0_14px_35px_rgba(12,8,41,0.06)] backdrop-blur-xl"
        style={{ background: 'linear-gradient(145deg, rgba(255,132,0,0.08) 0%, rgba(255,240,225,0.5) 100%)' }}
      >
        <h2 className="text-sm font-bold tracking-tight mb-4" style={{ color: miimboColors.brand.midnight }}>
          Acceso rápido
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/clientes"
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-all hover:scale-[1.02]"
            style={{ backgroundColor: 'rgba(245,180,170,0.6)', color: miimboColors.brand.midnight }}
          >
            + Nuevo cliente
          </Link>
          <Link
            to="/propiedades"
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-all hover:scale-[1.02]"
            style={{ backgroundColor: 'rgba(255,207,115,0.6)', color: miimboColors.brand.midnight }}
          >
            + Nueva propiedad
          </Link>
          <Link
            to="/simulacion"
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-all hover:scale-[1.02]"
            style={{ backgroundColor: 'rgba(255,179,71,0.6)', color: miimboColors.brand.midnight }}
          >
            + Nueva simulación
          </Link>
        </div>
      </section>
    </div>
  )
}

/* ——— Stat cards ——— */

type Tone = 'soft-rose' | 'soft-gold' | 'soft-amber'

const toneStyles: Record<Tone, { bg: string; accent: string }> = {
  'soft-rose': {
    bg: 'linear-gradient(145deg, rgba(255,133,0,0.04) 0%, #F9DFC6 55%, #FEFBF7 100%)',
    accent: '#F5B4A4',
  },
  'soft-gold': {
    bg: 'linear-gradient(145deg, rgba(255,133,0,0.08) 0%, #F9DFC6 55%, #FEFBF7 100%)',
    accent: '#FFCF73',
  },
  'soft-amber': {
    bg: 'linear-gradient(145deg, rgba(255,133,0,0.12) 0%, #F9DFC6 55%, #FEFBF7 100%)',
    accent: '#FFB347',
  },
}

type StatCardProps = {
  title: string
  value: number | string
  href: string
  buttonLabel: string
  tone: Tone
  icon?: 'users' | 'building' | 'calculator'
}

function StatCard({ title, value, href, buttonLabel, tone }: StatCardProps) {
  const style = toneStyles[tone]
  return (
    <article
      className="rounded-3xl px-5 py-5 shadow-[0_14px_35px_rgba(12,8,41,0.12)] border border-white/60 backdrop-blur-lg flex flex-col gap-4 transition-transform hover:-translate-y-0.5"
      style={{ background: style.bg }}
    >
      <p className="text-xs font-medium tracking-wide uppercase" style={{ color: 'rgba(12,8,41,0.55)' }}>
        {title}
      </p>
      <p className="text-3xl font-black tracking-tight" style={{ color: miimboColors.brand.midnight }}>
        {value}
      </p>
      <Link
        to={href}
        className="mt-auto inline-flex items-center justify-center rounded-full border text-[11px] font-semibold px-4 py-2 tracking-wide transition-all hover:opacity-90"
        style={{
          borderColor: 'rgba(12,8,41,0.15)',
          color: 'rgba(12,8,41,0.75)',
          backgroundColor: 'rgba(254,251,247,0.9)',
        }}
      >
        {buttonLabel}
      </Link>
    </article>
  )
}

function CatalogRow({ label, value }: { label: string; value: number }) {
  return (
    <li className="flex items-center justify-between py-1.5 border-b border-white/40 last:border-0">
      <span className="text-xs" style={{ color: 'rgba(12,8,41,0.7)' }}>{label}</span>
      <span className="text-sm font-bold" style={{ color: miimboColors.brand.sunrise }}>{value}</span>
    </li>
  )
}
