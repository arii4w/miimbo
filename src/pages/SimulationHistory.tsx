import { useState, useEffect } from 'react'
import { miimboColors } from '../theme/colors'
import { usePaymentPlansStore } from '../store/paymentPlansStore'
import { fetchPaymentPlans, fetchPaymentPlanById } from '../services/paymentPlansApi'
import type { PaymentPlan, PaymentPlanPeriod } from '../services/paymentPlansApi'

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return iso
  }
}
function formatNum(n: number | null | undefined): string {
  if (n == null) return '—'
  return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function formatPct(n: number | null | undefined): string {
  if (n == null) return '—'
  return `${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 5 })}%`
}
function formatMoney(n: number | null | undefined): string {
  if (n == null) return '—'
  return `S/ ${formatNum(n)}`
}

export function SimulationHistory() {
  const { plans, setPlans, setSelectedPlan, setIsLoading, setError, isLoading } = usePaymentPlansStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [detailPlan, setDetailPlan] = useState<PaymentPlan | null>(null)

  useEffect(() => {
    setIsLoading(true)
    setError(null)
    fetchPaymentPlans()
      .then(setPlans)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar historial'))
      .finally(() => setIsLoading(false))
  }, [setPlans, setIsLoading, setError])

  const openDetails = (plan: PaymentPlan) => {
    setSelectedPlan(plan)
    if (plan.paymentPlanPeriods?.length) {
      setDetailPlan(plan)
      setIsModalOpen(true)
    } else {
      fetchPaymentPlanById(plan.id)
        .then((full) => {
          setDetailPlan(full)
          setIsModalOpen(true)
        })
        .catch(() => setError('Error al cargar detalle del plan'))
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setDetailPlan(null)
  }

  return (
    <div className="space-y-8 relative max-w-5xl mx-auto">
      <header className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight" style={{ color: miimboColors.brand.midnight }}>
          Historial de Simulaciones
        </h1>
      </header>

      <section className="animate-in fade-in slide-in-from-bottom-4 duration-300">
        <HistoryTable plans={plans} onOpenDetails={openDetails} isLoading={isLoading} />
      </section>

      {isModalOpen && detailPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-[#FEFBF7]/60 backdrop-blur-sm transition-opacity"
            onClick={closeModal}
          />
          <div className="relative w-full max-w-6xl max-h-[95vh] overflow-y-auto rounded-[24px] shadow-2xl animate-in fade-in zoom-in duration-200 p-1">
            <Panel variant="modal">
              <div className="sticky top-0 z-10 flex justify-end pb-2">
                <button
                  onClick={closeModal}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-[rgba(12,8,41,0.8)] hover:bg-white transition-colors shadow-sm font-bold text-sm backdrop-blur-md"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                <div className="px-2">
                  <h2 className="text-xl font-bold tracking-tight mb-1" style={{ color: miimboColors.brand.midnight }}>
                    Detalle de Simulación
                  </h2>
                  <p className="text-xs" style={{ color: 'rgba(12,8,41,0.6)' }}>
                    Generada el {formatDate(detailPlan.createdAt)} para {detailPlan.client ? `${detailPlan.client.name} ${detailPlan.client.lastname}` : '—'}
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <IndicatorCard label="Tasa de Descuento" value={formatPct(detailPlan.profitabilityDiscountRate)} />
                  <IndicatorCard label="TIR de la Operación" value={formatPct(detailPlan.operationTir)} />
                  <IndicatorCard label="TCEA de la Operación" value={formatPct(detailPlan.operationTcea)} />
                  <IndicatorCard label="VAN de la Operación" value={formatMoney(detailPlan.operationVan)} />
                </div>

                <Panel variant="yellow" title="Resumen del Financiamiento">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-6">
                    <div className="space-y-5">
                      <SummarySection title="Datos Generales">
                        <SummaryItem label="Cliente" value={detailPlan.client ? `${detailPlan.client.name} ${detailPlan.client.lastname}` : '—'} />
                        <SummaryItem label="Inmueble" value={detailPlan.property?.name ?? '—'} />
                        <SummaryItem label="Bono aplicado" value={detailPlan.bono?.name ?? '—'} />
                      </SummarySection>
                      <SummarySection title="Del Préstamo">
                        <SummaryItem label="Precio de Venta" value={formatNum(detailPlan.property?.totalPropertyPrice)} />
                        <SummaryItem label="% Cuota Inicial" value={formatPct(detailPlan.downPaymentPercentage)} />
                        <SummaryItem label="Nº de Años" value={String(detailPlan.termYears)} />
                        <SummaryItem label="Frecuencia de pago" value={String(detailPlan.paymentFrequencyDays)} />
                        <SummaryItem label="Nº de días por año" value={String(detailPlan.daysPerYear)} />
                      </SummarySection>
                    </div>
                    <div className="space-y-5">
                      <SummarySection title="De los Costes/Gastos Iniciales">
                        <SummaryItem label="Costes Notariales" value={formatNum(detailPlan.notaryCosts)} />
                        <SummaryItem label="Costes Registrales" value={formatNum(detailPlan.registrationCosts)} />
                        <SummaryItem label="Tasación" value={formatNum(detailPlan.appraisalCost)} />
                        <SummaryItem label="Comisión de estudio" value={formatNum(detailPlan.evaluationFee)} />
                        <SummaryItem label="Comisión activación" value={detailPlan.activationFee ? formatNum(detailPlan.activationFee) : '-'} />
                      </SummarySection>
                      <SummarySection title="De los Costes/Gastos Periódicos">
                        <SummaryItem label="Comisión periódica" value={formatNum(detailPlan.periodicCommissionFee)} />
                        <SummaryItem label="Portes" value={formatNum(detailPlan.postageFee)} />
                        <SummaryItem label="Gastos de Administración" value={formatNum(detailPlan.adminFee)} />
                        <SummaryItem label="% Seguro desgravamen" value={formatPct(detailPlan.desgravamenInsurancePercentage)} />
                        <SummaryItem label="% Seguro riesgo" value={formatPct(detailPlan.allRiskInsurancePercentage)} />
                        <SummaryItem label="% Seguro desgrav. per." value={formatPct(detailPlan.periodicDesgravamenPercentage)} />
                        <SummaryItem label="Seguro riesgo" value={formatNum(detailPlan.periodicRiskInsuranceAmount)} />
                      </SummarySection>
                    </div>
                    <div className="space-y-5">
                      <SummarySection title="Del Financiamiento y Oportunidad">
                        <SummaryItem label="Tasa de descuento" value={formatPct(detailPlan.opportunityDiscountRate)} />
                        <SummaryItem label="Saldo a financiar" value={formatNum(detailPlan.financingBalance)} />
                        <SummaryItem label="Monto del préstamo" value={formatNum(detailPlan.loanAmount)} />
                        <SummaryItem label="Nº Cuotas por Año" value={String(detailPlan.installmentsPerYear ?? '—')} />
                        <SummaryItem label="Nº Total de Cuotas" value={String(detailPlan.totalInstallments ?? '—')} />
                      </SummarySection>
                      <SummarySection title="Totales de la Operación">
                        <SummaryItem label="Intereses" value={formatNum(detailPlan.totalInterest)} />
                        <SummaryItem label="Amortización del capital" value={formatNum(detailPlan.totalPrincipalAmortization)} />
                        <SummaryItem label="Seguro de desgravamen" value={formatNum(detailPlan.totalDesgravamenInsurance)} />
                        <SummaryItem label="Seguro contra todo riesgo" value={formatNum(detailPlan.totalAllRiskInsurance)} />
                        <SummaryItem label="Comisiones periódicas" value={formatNum(detailPlan.totalPeriodicFees)} />
                        <SummaryItem label="Portes / Gastos adm." value={formatNum(detailPlan.totalPostageAndAdminFees)} />
                      </SummarySection>
                    </div>
                  </div>
                </Panel>

                <div className="space-y-3">
                  <h2 className="text-sm font-bold tracking-tight px-2" style={{ color: miimboColors.brand.midnight }}>
                    Cronograma de Pagos Detallado
                  </h2>
                  <SimulationTable periods={detailPlan.paymentPlanPeriods ?? []} />
                </div>
              </div>
            </Panel>
          </div>
        </div>
      )}
    </div>
  )
}

/* ================= TABLA DE HISTORIAL ================= */

function HistoryTable({
  plans,
  onOpenDetails,
  isLoading,
}: {
  plans: PaymentPlan[]
  onOpenDetails: (plan: PaymentPlan) => void
  isLoading: boolean
}) {
  return (
    <div
      className="overflow-hidden rounded-[24px] border border-white/80 shadow-[0_18px_45px_rgba(11,8,41,0.06)] backdrop-blur-xl"
      style={{ background: 'linear-gradient(145deg, rgba(255,240,225,0.7) 0%, rgba(254,251,247,0.95) 100%)' }}
    >
      <table className="w-full border-collapse text-xs">
        <thead
          className="text-[11px] font-bold uppercase tracking-wider"
          style={{ backgroundColor: 'rgba(235, 175, 165, 0.65)' }}
        >
          <tr>
            <th className="px-6 py-4 text-left" style={{ color: miimboColors.brand.midnight }}>Clientes</th>
            <th className="px-6 py-4 text-left" style={{ color: miimboColors.brand.midnight }}>Fecha</th>
            <th className="px-6 py-4 text-left" style={{ color: miimboColors.brand.midnight }}>Inmueble</th>
            <th className="px-6 py-4 text-left" style={{ color: miimboColors.brand.midnight }}>Bono</th>
            <th className="px-6 py-4 text-center" style={{ color: miimboColors.brand.midnight }}>Detalles</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={5} className="px-6 py-8 text-center" style={{ color: 'rgba(12,8,41,0.6)' }}>
                Cargando…
              </td>
            </tr>
          ) : plans.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-8 text-center" style={{ color: 'rgba(12,8,41,0.6)' }}>
                No hay simulaciones registradas.
              </td>
            </tr>
          ) : (
            plans.map((plan) => (
              <tr
                key={plan.id}
                className="border-b border-white/40 last:border-0 odd:bg-transparent even:bg-white/30 hover:bg-white/50 transition-colors"
                style={{ color: 'rgba(12,8,41,0.85)' }}
              >
                <td className="px-6 py-3.5 font-medium">
                  {plan.client ? `${plan.client.name} ${plan.client.lastname}` : '—'}
                </td>
                <td className="px-6 py-3.5">{formatDate(plan.createdAt)}</td>
                <td className="px-6 py-3.5">{plan.property?.name ?? '—'}</td>
                <td className="px-6 py-3.5">{plan.bono?.name ?? '—'}</td>
                <td className="px-6 py-3.5 text-center">
                  <button
                    type="button"
                    onClick={() => onOpenDetails(plan)}
                    className="text-[11.5px] font-bold underline transition-colors"
                    style={{ color: miimboColors.brand.sunrise }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = miimboColors.brand.sunriseSoft)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = miimboColors.brand.sunrise)}
                  >
                    Ver Detalles
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

/* ================= COMPONENTES SECUNDARIOS ================= */

type PanelProps = {
  title?: string
  variant: 'modal' | 'yellow'
  children: React.ReactNode
}

function Panel({ title, variant, children }: PanelProps) {
  const background =
    variant === 'modal'
      ? 'linear-gradient(145deg, rgba(235,195,185,0.8) 0%, rgba(253,235,218,0.95) 100%)'
      : 'linear-gradient(145deg, rgba(255,213,99,0.25) 0%, rgba(255,240,225,0.7) 100%)'
  return (
    <section
      className="rounded-[24px] border border-white/70 px-6 py-6 shadow-[0_18px_45px_rgba(12,8,41,0.08)] backdrop-blur-xl relative"
      style={{ background }}
    >
      {title && (
        <h2 className="mb-5 text-sm font-bold tracking-tight" style={{ color: miimboColors.brand.midnight }}>
          {title}
        </h2>
      )}
      {children}
    </section>
  )
}

function SummarySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-[10px] font-bold uppercase mb-2 border-b border-white/40 pb-1" style={{ color: 'rgba(12,8,41,0.5)' }}>
        {title}
      </h4>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-[11px] pb-1 gap-2">
      <span className="shrink" style={{ color: 'rgba(12,8,41,0.7)' }}>{label}</span>
      <span className="font-bold text-right shrink-0" style={{ color: 'rgba(12,8,41,0.9)' }}>{value}</span>
    </div>
  )
}

function IndicatorCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-[20px] border border-white/80 p-4 text-center shadow-[0_12px_30px_rgba(12,8,41,0.06)] backdrop-blur-md"
      style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.7) 0%, rgba(253,235,218,0.9) 100%)' }}
    >
      <p className="text-[10px] uppercase font-bold text-[rgba(12,8,41,0.5)] tracking-wider truncate">{label}</p>
      <p className="text-xl font-black mt-1" style={{ color: '#D98A36' }}>{value}</p>
    </div>
  )
}

function SimulationTable({ periods }: { periods: PaymentPlanPeriod[] }) {
  const headers = ['Nº', 'TEA', "i'=TEP=TEM", 'P.G.', 'Saldo Inicial', 'Interés', 'Cuota (inc. Seg)', 'Amort.', 'Seg. Desgrav.', 'Seg. Riesgo', 'Comisión', 'Portes', 'Gastos Adm.', 'Saldo Final', 'Flujo']
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/70 shadow-sm backdrop-blur-xl" style={{ background: 'linear-gradient(145deg, rgba(255,132,0,0.1) 0%, rgba(255,240,225,0.5) 100%)' }}>
      <table className="min-w-[1200px] w-full border-collapse text-[10px]">
        <thead className="font-bold text-center border-b border-white/50" style={{ backgroundColor: 'rgba(255,132,0,0.15)', color: miimboColors.brand.midnight }}>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className={`px-2 py-3 ${i === 0 || i === 3 ? 'text-center' : 'text-right'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="text-right">
          {periods.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-2 py-4 text-center" style={{ color: 'rgba(12,8,41,0.6)' }}>
                Sin periodos
              </td>
            </tr>
          ) : (
            periods.map((p) => (
              <tr key={p.periodNumber} className="border-b border-white/30 last:border-0 hover:bg-white/30 transition-colors" style={{ color: 'rgba(12,8,41,0.8)' }}>
                <td className="px-2 py-2 text-center font-bold">{p.periodNumber}</td>
                <td className="px-2 py-2">{formatPct(p.annualEffectiveRate)}</td>
                <td className="px-2 py-2">{formatPct(p.periodicEffectiveRate)}</td>
                <td className="px-2 py-2 text-center font-bold text-[#D98A36]">{p.gracePeriodType ?? '—'}</td>
                <td className="px-2 py-2">{formatNum(p.initialBalance ?? p.indexedInitialBalance)}</td>
                <td className="px-2 py-2 text-red-500/80">{formatNum(p.interestAmount)}</td>
                <td className="px-2 py-2 font-bold text-[#D98A36]">{formatNum(p.installmentAmount)}</td>
                <td className="px-2 py-2 text-blue-600/80">{formatNum(p.principalAmortization)}</td>
                <td className="px-2 py-2">{formatNum(p.desgravamenInsuranceAmount)}</td>
                <td className="px-2 py-2">{formatNum(p.allRiskInsuranceAmount)}</td>
                <td className="px-2 py-2">{formatNum(p.commissionFee)}</td>
                <td className="px-2 py-2">{formatNum(p.postageFee)}</td>
                <td className="px-2 py-2">{formatNum(p.adminFee)}</td>
                <td className="px-2 py-2 font-bold">{formatNum(p.finalBalance)}</td>
                <td className="px-2 py-2 text-blue-600/80 font-bold">{formatNum(p.cashFlow)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
