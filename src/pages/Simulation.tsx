import { useState, useEffect } from 'react'
import { miimboColors } from '../theme/colors'
import { useClientsStore } from '../store/clientsStore'
import { usePropertiesStore } from '../store/propertiesStore'
import { useReferenceStore } from '../store/referenceStore'
import { useAuthStore } from '../store/authStore'
import { usePaymentPlansStore } from '../store/paymentPlansStore'
import {
  createPaymentPlan,
  updatePaymentPlan,
  createPaymentPlanPeriods,
  fetchPaymentPlanById,
  type CreatePaymentPlanRequest,
  type PaymentPlan,
  type PaymentPlanPeriod,
} from '../services/paymentPlansApi'
import { runSimulation, type SimulationInput } from '../utils/simulationCalculator'
import { fetchClients } from '../services/clientsApi'
import { fetchProperties } from '../services/propertiesApi'

const PAYMENT_FREQUENCIES = [
  { label: 'Diaria', days: 1 },
  { label: 'Quincenal', days: 15 },
  { label: 'Mensual', days: 30 },
  { label: 'Bimestral', days: 60 },
  { label: 'Trimestral', days: 90 },
  { label: 'Semestral', days: 180 },
  { label: 'Anual', days: 360 },
] as const

function formatMoney(value: number): string {
  return `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function formatNum(value: number, decimals = 2): string {
  return value.toLocaleString('es-PE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}
function formatPct(value: number): string {
  return `${formatNum(value, 5)}%`
}

export function Simulation() {
  const [tasaTipo, setTasaTipo] = useState('Constante')
  const [activeTab, setActiveTab] = useState<'datos' | 'resultados'>('datos')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { user } = useAuthStore()
  const { clients, setClients, setIsLoading: setClientsLoading, setError: setClientsError } = useClientsStore()
  const { properties, setProperties, setIsLoading: setPropsLoading, setError: setPropsError } = usePropertiesStore()
  const { bonos } = useReferenceStore()
  const { setSelectedPlan, addPlan, updatePlanInList } = usePaymentPlansStore()

  const [idClient, setIdClient] = useState<number | ''>('')
  const [idProperty, setIdProperty] = useState<number | ''>('')
  const [downPaymentPercentage, setDownPaymentPercentage] = useState<string>('20')
  const [paymentFrequencyDays, setPaymentFrequencyDays] = useState<number>(30)
  const [termYears, setTermYears] = useState<string>('10')
  const [tea, setTea] = useState<string>('9')
  const [idBono, setIdBono] = useState<number | ''>('')
  const [notaryCosts, setNotaryCosts] = useState<string>('150')
  const [registrationCosts, setRegistrationCosts] = useState<string>('200')
  const [appraisalCost, setAppraisalCost] = useState<string>('80')
  const [evaluationFee, setEvaluationFee] = useState<string>('100')
  const [activationFee, setActivationFee] = useState<string>('0')
  const [periodicCommissionFee, setPeriodicCommissionFee] = useState<string>('3')
  const [postageFee, setPostageFee] = useState<string>('4')
  const [adminFee, setAdminFee] = useState<string>('8')
  const [desgravamenInsurancePercentage, setDesgravamenInsurancePercentage] = useState<string>('0.049')
  const [allRiskInsurancePercentage, setAllRiskInsurancePercentage] = useState<string>('0.4')
  const [opportunityDiscountRate, setOpportunityDiscountRate] = useState<string>('20')
  const [graceSin, setGraceSin] = useState<string>('')
  const [graceParcial, setGraceParcial] = useState<string>('')
  const [graceTotal, setGraceTotal] = useState<string>('')

  const [currentPlan, setCurrentPlan] = useState<PaymentPlan | null>(null)

  useEffect(() => {
    setClientsLoading(true)
    setClientsError(null)
    fetchClients()
      .then(setClients)
      .catch((e) => setClientsError(e instanceof Error ? e.message : 'Error al cargar clientes'))
      .finally(() => setClientsLoading(false))
  }, [setClients, setClientsLoading, setClientsError])

  useEffect(() => {
    setPropsLoading(true)
    setPropsError(null)
    fetchProperties()
      .then(setProperties)
      .catch((e) => setPropsError(e instanceof Error ? e.message : 'Error al cargar propiedades'))
      .finally(() => setPropsLoading(false))
  }, [setProperties, setPropsLoading, setPropsError])

  const selectedClient = idClient ? clients.find((c) => c.id === idClient) : null
  const selectedProperty = idProperty ? properties.find((p) => p.id === idProperty) : null
  const salePrice = selectedProperty?.totalPropertyPrice ?? 0
  const downPayment = salePrice * (Number(downPaymentPercentage) || 0) / 100
  const daysPerYear = 360
  const installmentsPerYear = paymentFrequencyDays > 0 ? Math.round(daysPerYear / paymentFrequencyDays) : 0
  const totalInstallments = installmentsPerYear * (Number(termYears) || 0)

  const bonoAmount = 0

  const handleGenerate = async () => {
    if (!user) {
      setSubmitError('Debes iniciar sesión para generar una simulación.')
      return
    }
    const idC = idClient === '' ? null : idClient
    const idP = idProperty === '' ? null : idProperty
    if (idC == null || idP == null) {
      setSubmitError('Selecciona cliente e inmueble.')
      return
    }
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      const createPayload: CreatePaymentPlanRequest = {
        idProperty: idP,
        idClient: idC,
        downPaymentPercentage: Number(downPaymentPercentage) || 0,
        termYears: Number(termYears) || 10,
        paymentFrequencyDays,
        desgravamenInsurancePercentage: Number(desgravamenInsurancePercentage) || 0,
        allRiskInsurancePercentage: Number(allRiskInsurancePercentage) || 0,
        opportunityDiscountRate: Number(opportunityDiscountRate) || 0,
        createdBy: user.id,
        idBono: idBono === '' ? null : idBono,
        daysPerYear,
        notaryCosts: Number(notaryCosts) || 0,
        registrationCosts: Number(registrationCosts) || 0,
        appraisalCost: Number(appraisalCost) || 0,
        evaluationFee: Number(evaluationFee) || 0,
        activationFee: Number(activationFee) || 0,
        periodicCommissionFee: Number(periodicCommissionFee) || 0,
        postageFee: Number(postageFee) || 0,
        adminFee: Number(adminFee) || 0,
      }
      const plan = await createPaymentPlan(createPayload)
      addPlan(plan)

      const input: SimulationInput = {
        salePrice,
        downPaymentPercentage: Number(downPaymentPercentage) || 0,
        termYears: Number(termYears) || 10,
        paymentFrequencyDays,
        daysPerYear,
        annualEffectiveRate: Number(tea) || 9,
        desgravamenInsurancePercentage: Number(desgravamenInsurancePercentage) || 0,
        allRiskInsurancePercentage: Number(allRiskInsurancePercentage) || 0,
        opportunityDiscountRate: Number(opportunityDiscountRate) || 0,
        notaryCosts: Number(notaryCosts) || 0,
        registrationCosts: Number(registrationCosts) || 0,
        appraisalCost: Number(appraisalCost) || 0,
        evaluationFee: Number(evaluationFee) || 0,
        activationFee: Number(activationFee) || 0,
        periodicCommissionFee: Number(periodicCommissionFee) || 0,
        postageFee: Number(postageFee) || 0,
        adminFee: Number(adminFee) || 0,
        bonoAmount,
        gracePeriodRanges: { sin: graceSin || undefined, parcial: graceParcial || undefined, total: graceTotal || undefined },
      }
      const result = runSimulation(input)

      await updatePaymentPlan(plan.id, {
        idProperty: plan.idProperty,
        idClient: plan.idClient,
        downPaymentPercentage: plan.downPaymentPercentage,
        termYears: plan.termYears,
        paymentFrequencyDays: plan.paymentFrequencyDays,
        daysPerYear: plan.daysPerYear,
        notaryCosts: plan.notaryCosts,
        registrationCosts: plan.registrationCosts,
        appraisalCost: plan.appraisalCost,
        evaluationFee: plan.evaluationFee,
        activationFee: plan.activationFee,
        periodicCommissionFee: plan.periodicCommissionFee,
        postageFee: plan.postageFee,
        adminFee: plan.adminFee,
        desgravamenInsurancePercentage: plan.desgravamenInsurancePercentage,
        allRiskInsurancePercentage: plan.allRiskInsurancePercentage,
        opportunityDiscountRate: plan.opportunityDiscountRate,
        updatedBy: user.id,
        financingBalance: result.financingBalance,
        loanAmount: result.loanAmount,
        installmentsPerYear: result.installmentsPerYear,
        totalInstallments: result.totalInstallments,
        periodicDesgravamenPercentage: result.periodicDesgravamenPercentage,
        periodicRiskInsuranceAmount: result.periodicRiskInsuranceAmount,
        totalInterest: result.totalInterest,
        totalPrincipalAmortization: result.totalPrincipalAmortization,
        totalDesgravamenInsurance: result.totalDesgravamenInsurance,
        totalAllRiskInsurance: result.totalAllRiskInsurance,
        totalPeriodicFees: result.totalPeriodicFees,
        totalPostageAndAdminFees: result.totalPostageAndAdminFees,
        profitabilityDiscountRate: result.profitabilityDiscountRate,
        operationTir: result.operationTir,
        operationTcea: result.operationTcea,
        operationVan: result.operationVan,
      })

      await createPaymentPlanPeriods({
        idPaymentPlan: plan.id,
        createdBy: user.id,
        periods: result.periods.map((p) => ({
          periodNumber: p.periodNumber,
          annualEffectiveRate: p.annualEffectiveRate,
          periodicEffectiveRate: p.periodicEffectiveRate,
          gracePeriodType: p.gracePeriodType,
          initialBalance: p.initialBalance,
          indexedInitialBalance: p.indexedInitialBalance,
          interestAmount: p.interestAmount,
          installmentAmount: p.installmentAmount,
          principalAmortization: p.principalAmortization,
          desgravamenInsuranceAmount: p.desgravamenInsuranceAmount,
          allRiskInsuranceAmount: p.allRiskInsuranceAmount,
          commissionFee: p.commissionFee,
          postageFee: p.postageFee,
          adminFee: p.adminFee,
          finalBalance: p.finalBalance,
          cashFlow: p.cashFlow,
        })),
      })

      const updated = await fetchPaymentPlanById(plan.id)
      updatePlanInList(updated)
      setSelectedPlan(updated)
      setCurrentPlan(updated)
      setActiveTab('resultados')
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Error al generar la simulación')
    } finally {
      setIsSubmitting(false)
    }
  }

  const planForResults = currentPlan ?? usePaymentPlansStore.getState().selectedPlan
  const periodsForTable: PaymentPlanPeriod[] = planForResults?.paymentPlanPeriods ?? []

  return (
    <div className="space-y-6 relative max-w-5xl mx-auto">
      <header className="flex items-center justify-between border-b border-[rgba(12,8,41,0.1)] pb-4">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold tracking-tight" style={{ color: miimboColors.brand.midnight }}>
            Simulación
          </h1>
          <div className="flex bg-white/40 p-1 rounded-full border border-white/60 shadow-sm backdrop-blur-md shrink-0">
            <button
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                activeTab === 'datos'
                  ? 'bg-gradient-to-r from-[#FF8400] to-[#FFA909] text-white shadow-md'
                  : 'text-[rgba(12,8,41,0.6)] hover:bg-white/50'
              }`}
              onClick={() => setActiveTab('datos')}
            >
              Datos
            </button>
            <button
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                activeTab === 'resultados'
                  ? 'bg-gradient-to-r from-[#FF8400] to-[#FFA909] text-white shadow-md'
                  : 'text-[rgba(12,8,41,0.6)] hover:bg-white/50'
              }`}
              onClick={() => setActiveTab('resultados')}
            >
              Resultados
            </button>
          </div>
        </div>
        <button
          type="button"
          className="rounded-full text-xs font-bold tracking-wide px-6 py-2.5 transition-transform hover:scale-[1.02] shrink-0"
          style={{
            background: 'linear-gradient(145deg, rgba(230,150,140,0.95) 0%, rgba(245,185,170,0.95) 100%)',
            color: '#FFFFFF',
            boxShadow: '0 4px 15px rgba(226,164,153,0.3)',
          }}
          onClick={() => setActiveTab('datos')}
        >
          + Nueva Simulación
        </button>
      </header>

      {submitError && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-800">
          {submitError}
        </div>
      )}

      {/* ======================= PESTAÑA 1: DATOS ======================= */}
      <section className={`space-y-6 transition-all duration-300 ${activeTab === 'datos' ? 'block animate-in fade-in slide-in-from-left-4' : 'hidden'}`}>
        <div className="grid gap-5 lg:grid-cols-3">
          <Panel variant="pink" title="Datos Principales">
            <div className="space-y-4">
              <div className="space-y-2">
                <Select
                  label="Cliente"
                  value={idClient}
                  options={clients.map((c) => ({ value: c.id, label: `${c.name} ${c.lastname}` }))}
                  onChange={(v) => setIdClient(v === '' ? '' : Number(v))}
                  placeholder="Seleccionar cliente"
                />
                <div className="px-2 space-y-1">
                  <SummaryRow label="Ingreso Mensual" value={selectedClient != null ? formatMoney(selectedClient.salary) : '—'} />
                  <SummaryRow label="Ingreso Familiar" value={selectedClient != null ? formatMoney(selectedClient.familyIncome) : '—'} />
                </div>
              </div>
              <hr className="border-t border-white/50" />
              <div className="space-y-2">
                <Select
                  label="Inmueble"
                  value={idProperty}
                  options={properties.map((p) => ({ value: p.id, label: p.name }))}
                  onChange={(v) => setIdProperty(v === '' ? '' : Number(v))}
                  placeholder="Seleccionar inmueble"
                />
                <div className="px-2">
                  <SummaryRow label="Precio de Venta" value={salePrice > 0 ? formatMoney(salePrice) : '—'} />
                </div>
              </div>
            </div>
          </Panel>

          <Panel variant="yellow" title="Datos del Préstamo">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="% Cuota Inicial"
                  type="number"
                  placeholder="Ej. 20"
                  suffix="%"
                  value={downPaymentPercentage}
                  onChange={setDownPaymentPercentage}
                />
                <div className="flex flex-col justify-end pb-2">
                  <SummaryRow label="Cuota Inicial:" value={salePrice > 0 ? formatMoney(downPayment) : '—'} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  className="rounded-xl border bg-white/60 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#D98A36]/50"
                  style={{ borderColor: 'rgba(255,255,255,0.8)', color: 'rgba(12,8,41,0.9)' }}
                  value={paymentFrequencyDays}
                  onChange={(e) => setPaymentFrequencyDays(Number(e.target.value))}
                >
                  {PAYMENT_FREQUENCIES.map((f) => (
                    <option key={f.days} value={f.days}>{f.label}</option>
                  ))}
                </select>
                <Input label="Nº de Años" type="number" placeholder="Ej. 10" value={termYears} onChange={setTermYears} />
              </div>
              <p className="text-[10px]" style={{ color: 'rgba(12,8,41,0.5)' }}>
                * Se considerarán 360 días por año (Req. Interbank)
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Input label="Nº Cuotas por Año" type="number" value={String(installmentsPerYear)} readOnly />
                <Input label="Nº Total de Cuotas (n)" type="number" value={String(totalInstallments)} readOnly />
              </div>
            </div>
          </Panel>

          <Panel variant="orange" title="Tasas y Bonos">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold" style={{ color: 'rgba(12,8,41,0.8)' }}>Tipo de Tasa</p>
                <div className="flex gap-4 text-xs font-medium" style={{ color: 'rgba(12,8,41,0.7)' }}>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="tasa" checked={tasaTipo === 'Constante'} onChange={() => setTasaTipo('Constante')} className="accent-[#E5A845]" />
                    Constante
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="tasa" checked={tasaTipo === 'Variable'} onChange={() => setTasaTipo('Variable')} className="accent-[#E5A845]" />
                    Variable
                  </label>
                </div>
                {tasaTipo === 'Constante' ? (
                  <Input label="TEA" type="number" placeholder="Ej. 9.0" suffix="%" value={tea} onChange={setTea} />
                ) : (
                  <div className="space-y-1">
                    <Input label="TEA Periodo 1-12" type="number" placeholder="Ej. 9.0" suffix="%" value={tea} onChange={setTea} />
                    <button type="button" className="text-[10px] text-[#D98A36] font-bold">+ Agregar otro periodo</button>
                  </div>
                )}
              </div>
              <hr className="border-t border-white/50" />
              <div className="space-y-2 text-xs" style={{ color: 'rgba(12,8,41,0.7)' }}>
                <p className="font-semibold" style={{ color: 'rgba(12,8,41,0.8)' }}>Bono</p>
                {bonos.map((b) => (
                  <label key={b.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="bono"
                      className="accent-[#E5A845]"
                      checked={idBono === b.id}
                      onChange={() => setIdBono(idBono === b.id ? '' : b.id)}
                    />
                    {b.name}
                  </label>
                ))}
                <div className="pt-1">
                  <SummaryRow label="Monto del Bono:" value={formatMoney(bonoAmount)} />
                </div>
              </div>
            </div>
          </Panel>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel variant="yellow" title="Costes y Gastos">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold uppercase" style={{ color: 'rgba(12,8,41,0.5)' }}>Iniciales</h4>
                <div className="space-y-2">
                  <CostInput label="Notariales" value={notaryCosts} onChange={setNotaryCosts} />
                  <CostInput label="Registrales" value={registrationCosts} onChange={setRegistrationCosts} />
                  <CostInput label="Tasación" value={appraisalCost} onChange={setAppraisalCost} />
                  <CostInput label="Comis. estudio" value={evaluationFee} onChange={setEvaluationFee} />
                  <CostInput label="Comis. activación" value={activationFee} onChange={setActivationFee} />
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold uppercase" style={{ color: 'rgba(12,8,41,0.5)' }}>Periódicos</h4>
                <div className="space-y-2">
                  <CostInput label="Comisión periódica" value={periodicCommissionFee} onChange={setPeriodicCommissionFee} />
                  <CostInput label="Portes" value={postageFee} onChange={setPostageFee} />
                  <CostInput label="Gastos Admin." value={adminFee} onChange={setAdminFee} />
                  <CostInput label="% Seguro desgrav." value={desgravamenInsurancePercentage} onChange={setDesgravamenInsurancePercentage} suffix="%" />
                  <CostInput label="% Seguro riesgo" value={allRiskInsurancePercentage} onChange={setAllRiskInsurancePercentage} suffix="%" />
                </div>
                <div className="pt-3">
                  <h4 className="text-[11px] font-bold uppercase mb-2" style={{ color: 'rgba(12,8,41,0.5)' }}>Costo Oportunidad</h4>
                  <CostInput label="Tasa de desc." value={opportunityDiscountRate} onChange={setOpportunityDiscountRate} suffix="%" />
                </div>
              </div>
            </div>
          </Panel>

          <div className="space-y-5 flex flex-col justify-between">
            <Panel variant="pink" title="Periodos de Gracia">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2 text-center">
                  <span className="text-xs font-bold text-[#D98A36]">SIN</span>
                  <Input label="" placeholder="Ej: 1-4" value={graceSin} onChange={setGraceSin} />
                </div>
                <div className="space-y-2 text-center">
                  <span className="text-xs font-bold text-[#D98A36]">PARCIAL</span>
                  <Input label="" placeholder="Ej: 5-6" value={graceParcial} onChange={setGraceParcial} />
                </div>
                <div className="space-y-2 text-center">
                  <span className="text-xs font-bold text-[#D98A36]">TOTAL</span>
                  <Input label="" placeholder="Ej: 7-8" value={graceTotal} onChange={setGraceTotal} />
                </div>
              </div>
            </Panel>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isSubmitting}
              className="w-full rounded-2xl text-sm font-bold tracking-wide py-4 transition-transform hover:scale-[1.01] disabled:opacity-60"
              style={{
                background: 'linear-gradient(145deg, rgba(230,150,140,0.95) 0%, rgba(245,185,170,0.95) 100%)',
                color: '#FFFFFF',
                boxShadow: '0 8px 20px rgba(226,164,153,0.35)',
              }}
            >
              {isSubmitting ? 'Generando…' : 'Generar Simulación'}
            </button>
          </div>
        </div>
      </section>

      {/* ======================= PESTAÑA 2: RESULTADOS ======================= */}
      <section className={`space-y-6 transition-all duration-300 ${activeTab === 'resultados' ? 'block animate-in fade-in slide-in-from-right-4' : 'hidden'}`}>
        {!planForResults ? (
          <p className="text-sm" style={{ color: 'rgba(12,8,41,0.6)' }}>Genera una simulación para ver los resultados.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <IndicatorCard label="Tasa de Descuento" value={formatPct(planForResults.profitabilityDiscountRate ?? 0)} />
              <IndicatorCard label="TIR de la Operación" value={formatPct(planForResults.operationTir ?? 0)} />
              <IndicatorCard label="TCEA de la Operación" value={formatPct(planForResults.operationTcea ?? 0)} />
              <IndicatorCard label="VAN de la Operación" value={formatMoney(planForResults.operationVan ?? 0)} />
            </div>
            <Panel variant="yellow" title="Resumen del Financiamiento">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-6">
                <div className="space-y-5">
                  <SummarySection title="Datos Generales">
                    <SummaryItem label="Cliente" value={planForResults.client ? `${planForResults.client.name} ${planForResults.client.lastname}` : '—'} />
                    <SummaryItem label="Inmueble" value={planForResults.property?.name ?? '—'} />
                    <SummaryItem label="Bono aplicado" value={planForResults.bono?.name ?? '—'} />
                  </SummarySection>
                  <SummarySection title="Del Préstamo">
                    <SummaryItem label="Precio de Venta" value={formatNum(planForResults.property?.totalPropertyPrice ?? 0)} />
                    <SummaryItem label="% Cuota Inicial" value={formatPct(planForResults.downPaymentPercentage)} />
                    <SummaryItem label="Nº de Años" value={String(planForResults.termYears)} />
                    <SummaryItem label="Frecuencia de pago" value={String(planForResults.paymentFrequencyDays)} />
                    <SummaryItem label="Nº de días por año" value={String(planForResults.daysPerYear)} />
                  </SummarySection>
                </div>
                <div className="space-y-5">
                  <SummarySection title="De los Costes/Gastos Iniciales">
                    <SummaryItem label="Costes Notariales" value={formatNum(planForResults.notaryCosts)} />
                    <SummaryItem label="Costes Registrales" value={formatNum(planForResults.registrationCosts)} />
                    <SummaryItem label="Tasación" value={formatNum(planForResults.appraisalCost)} />
                    <SummaryItem label="Comisión de estudio" value={formatNum(planForResults.evaluationFee)} />
                    <SummaryItem label="Comisión activación" value={planForResults.activationFee ? formatNum(planForResults.activationFee) : '-'} />
                  </SummarySection>
                  <SummarySection title="De los Costes/Gastos Periódicos">
                    <SummaryItem label="Comisión periódica" value={formatNum(planForResults.periodicCommissionFee)} />
                    <SummaryItem label="Portes" value={formatNum(planForResults.postageFee)} />
                    <SummaryItem label="Gastos de Administración" value={formatNum(planForResults.adminFee)} />
                    <SummaryItem label="% Seguro desgravamen" value={formatPct(planForResults.desgravamenInsurancePercentage)} />
                    <SummaryItem label="% Seguro riesgo" value={formatPct(planForResults.allRiskInsurancePercentage)} />
                    <SummaryItem label="% Seguro desgrav. per." value={planForResults.periodicDesgravamenPercentage != null ? formatPct(planForResults.periodicDesgravamenPercentage) : '—'} />
                    <SummaryItem label="Seguro riesgo" value={planForResults.periodicRiskInsuranceAmount != null ? formatNum(planForResults.periodicRiskInsuranceAmount) : '—'} />
                  </SummarySection>
                </div>
                <div className="space-y-5">
                  <SummarySection title="Del Financiamiento y Oportunidad">
                    <SummaryItem label="Tasa de descuento" value={formatPct(planForResults.opportunityDiscountRate)} />
                    <SummaryItem label="Saldo a financiar" value={formatNum(planForResults.financingBalance ?? 0)} />
                    <SummaryItem label="Monto del préstamo" value={formatNum(planForResults.loanAmount ?? 0)} />
                    <SummaryItem label="Nº Cuotas por Año" value={String(planForResults.installmentsPerYear ?? 0)} />
                    <SummaryItem label="Nº Total de Cuotas" value={String(planForResults.totalInstallments ?? 0)} />
                  </SummarySection>
                  <SummarySection title="Totales de la Operación">
                    <SummaryItem label="Intereses" value={formatNum(planForResults.totalInterest ?? 0)} />
                    <SummaryItem label="Amortización del capital" value={formatNum(planForResults.totalPrincipalAmortization ?? 0)} />
                    <SummaryItem label="Seguro de desgravamen" value={formatNum(planForResults.totalDesgravamenInsurance ?? 0)} />
                    <SummaryItem label="Seguro contra todo riesgo" value={formatNum(planForResults.totalAllRiskInsurance ?? 0)} />
                    <SummaryItem label="Comisiones periódicas" value={formatNum(planForResults.totalPeriodicFees ?? 0)} />
                    <SummaryItem label="Portes / Gastos de adm." value={formatNum(planForResults.totalPostageAndAdminFees ?? 0)} />
                  </SummarySection>
                </div>
              </div>
            </Panel>
            <div className="space-y-3">
              <h2 className="text-sm font-bold tracking-tight px-2" style={{ color: miimboColors.brand.midnight }}>
                Cronograma de Pagos Detallado
              </h2>
              <SimulationTable periods={periodsForTable} />
            </div>
          </>
        )}
      </section>
    </div>
  )
}

/* ================= COMPONENTES SECUNDARIOS ================= */

type PanelProps = {
  title?: string
  variant: 'pink' | 'yellow' | 'orange'
  children: React.ReactNode
}

function Panel({ title, variant, children }: PanelProps) {
  let background = ''
  if (variant === 'pink') background = 'linear-gradient(145deg, rgba(244,167,160,0.3) 0%, rgba(255,240,225,0.7) 100%)'
  else if (variant === 'yellow') background = 'linear-gradient(145deg, rgba(255,213,99,0.25) 0%, rgba(255,240,225,0.7) 100%)'
  else if (variant === 'orange') background = 'linear-gradient(145deg, rgba(255,132,0,0.15) 0%, rgba(255,240,225,0.7) 100%)'
  return (
    <section
      className="rounded-[24px] border border-white/70 px-6 py-5 shadow-[0_18px_45px_rgba(12,8,41,0.05)] backdrop-blur-xl relative"
      style={{ background }}
    >
      {title && (
        <h2 className="mb-4 text-sm font-bold tracking-tight" style={{ color: miimboColors.brand.midnight }}>
          {title}
        </h2>
      )}
      {children}
    </section>
  )
}

type InputProps = {
  label: string
  type?: string
  placeholder?: string
  value?: string
  readOnly?: boolean
  suffix?: string
  onChange?: (value: string) => void
}

function Input({ label, type = 'text', placeholder, value, readOnly, suffix, onChange }: InputProps) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-medium shrink-0" style={{ color: 'rgba(12,8,41,0.8)' }}>
      {label}
      <div className="relative flex items-center">
        <input
          type={type}
          placeholder={placeholder}
          value={value ?? ''}
          readOnly={readOnly}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          className={`w-full rounded-xl border bg-white/60 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#D98A36]/50 focus:border-transparent transition-all backdrop-blur-sm ${readOnly ? 'opacity-70 bg-white/40 cursor-not-allowed' : ''}`}
          style={{ borderColor: 'rgba(255,255,255,0.8)', color: 'rgba(12,8,41,0.9)' }}
        />
        {suffix && <span className="absolute right-3 text-xs font-bold text-[rgba(12,8,41,0.5)]">{suffix}</span>}
      </div>
    </label>
  )
}

function CostInput({ label, value, onChange, suffix }: { label: string; value: string; onChange: (v: string) => void; suffix?: string }) {
  return (
    <div className="flex justify-between items-center text-[11px] gap-2">
      <span className="shrink" style={{ color: 'rgba(12,8,41,0.7)' }}>{label}</span>
      <div className="relative flex items-center w-20 shrink-0">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-right bg-white/70 border border-white/80 outline-none font-bold focus:ring-2 focus:ring-[#D98A36]/50 rounded-lg px-2 py-1 shadow-sm transition-all"
          style={{ color: 'rgba(12,8,41,0.9)', paddingRight: suffix ? '1.2rem' : '0.5rem' }}
        />
        {suffix && <span className="absolute right-1 text-[10px] font-bold text-[rgba(12,8,41,0.5)]">{suffix}</span>}
      </div>
    </div>
  )
}

function Select({
  label,
  value,
  options,
  onChange,
  placeholder,
}: {
  label: string
  value: number | ''
  options: { value: number; label: string }[]
  onChange: (value: number | '') => void
  placeholder?: string
}) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-medium" style={{ color: 'rgba(12,8,41,0.8)' }}>
      {label}
      <select
        className="rounded-xl border bg-white/60 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#D98A36]/50 focus:border-transparent appearance-none backdrop-blur-sm"
        style={{ borderColor: 'rgba(255,255,255,0.8)', color: 'rgba(12,8,41,0.9)' }}
        value={value === '' ? '' : value}
        onChange={(e) => {
          const v = e.target.value
          onChange(v === '' ? '' : Number(v))
        }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex justify-between items-center text-[11px]">
      <span style={{ color: 'rgba(12,8,41,0.6)' }}>{label}</span>
      <span className="font-bold" style={{ color: '#D98A36' }}>{value}</span>
    </p>
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
      className="rounded-[20px] border border-white/80 p-4 text-center shadow-[0_12px_30px_rgba(12,8,41,0.06)] backdrop-blur-md transition-transform hover:-translate-y-1"
      style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.7) 0%, rgba(253,235,218,0.9) 100%)' }}
    >
      <p className="text-[10px] uppercase font-bold text-[rgba(12,8,41,0.5)] tracking-wider truncate">{label}</p>
      <p className="text-xl font-black mt-1" style={{ color: '#D98A36' }}>{value}</p>
    </div>
  )
}

function fmtNum(n: number | null | undefined): string {
  if (n == null) return '—'
  return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtPct(n: number | null | undefined): string {
  if (n == null) return '—'
  return `${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 5 })}%`
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
                <td className="px-2 py-2">{fmtPct(p.annualEffectiveRate)}</td>
                <td className="px-2 py-2">{fmtPct(p.periodicEffectiveRate)}</td>
                <td className="px-2 py-2 text-center font-bold text-[#D98A36]">{p.gracePeriodType ?? '—'}</td>
                <td className="px-2 py-2">{fmtNum(p.initialBalance ?? p.indexedInitialBalance)}</td>
                <td className="px-2 py-2 text-red-500/80">{fmtNum(p.interestAmount)}</td>
                <td className="px-2 py-2 font-bold text-[#D98A36]">{fmtNum(p.installmentAmount)}</td>
                <td className="px-2 py-2 text-blue-600/80">{fmtNum(p.principalAmortization)}</td>
                <td className="px-2 py-2">{fmtNum(p.desgravamenInsuranceAmount)}</td>
                <td className="px-2 py-2">{fmtNum(p.allRiskInsuranceAmount)}</td>
                <td className="px-2 py-2">{fmtNum(p.commissionFee)}</td>
                <td className="px-2 py-2">{fmtNum(p.postageFee)}</td>
                <td className="px-2 py-2">{fmtNum(p.adminFee)}</td>
                <td className="px-2 py-2 font-bold">{fmtNum(p.finalBalance)}</td>
                <td className="px-2 py-2 text-blue-600/80 font-bold">{fmtNum(p.cashFlow)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
