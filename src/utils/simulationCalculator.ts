/**
 * Cálculo en frontend: genera conclusiones y periodos para un plan de pagos.
 * Sistema francés: cuota fija, TEP derivada de TEA, seguros y comisiones por periodo.
 */

export type SimulationInput = {
  salePrice: number
  downPaymentPercentage: number
  termYears: number
  paymentFrequencyDays: number
  daysPerYear: number
  annualEffectiveRate: number // TEA (%)
  desgravamenInsurancePercentage: number // % anual
  allRiskInsurancePercentage: number // % del valor
  opportunityDiscountRate: number // % para VAN
  notaryCosts: number
  registrationCosts: number
  appraisalCost: number
  evaluationFee: number
  activationFee: number
  periodicCommissionFee: number
  postageFee: number
  adminFee: number
  bonoAmount?: number
  gracePeriodRanges?: { sin?: string; parcial?: string; total?: string }
}

export type PeriodRow = {
  periodNumber: number
  annualEffectiveRate: number
  periodicEffectiveRate: number
  gracePeriodType: string | null
  initialBalance: number
  indexedInitialBalance: number
  interestAmount: number
  installmentAmount: number
  principalAmortization: number
  desgravamenInsuranceAmount: number
  allRiskInsuranceAmount: number
  commissionFee: number
  postageFee: number
  adminFee: number
  finalBalance: number
  cashFlow: number
}

export type SimulationResult = {
  financingBalance: number
  loanAmount: number
  installmentsPerYear: number
  totalInstallments: number
  periodicDesgravamenPercentage: number
  periodicRiskInsuranceAmount: number
  totalInterest: number
  totalPrincipalAmortization: number
  totalDesgravamenInsurance: number
  totalAllRiskInsurance: number
  totalPeriodicFees: number
  totalPostageAndAdminFees: number
  profitabilityDiscountRate: number
  operationTir: number
  operationTcea: number
  operationVan: number
  periods: PeriodRow[]
}

function parseGraceRanges(
  ranges: SimulationInput['gracePeriodRanges']
): { sin: number[]; parcial: number[]; total: number[] } {
  const toSet = (s: string | undefined): number[] => {
    if (!s || !s.trim()) return []
    const out: number[] = []
    s.split(',').forEach((part) => {
      const m = part.trim().match(/^(\d+)-(\d+)$/)
      if (m) {
        const a = parseInt(m[1], 10)
        const b = parseInt(m[2], 10)
        for (let i = a; i <= b; i++) out.push(i)
      } else {
        const n = parseInt(part.trim(), 10)
        if (!isNaN(n)) out.push(n)
      }
    })
    return out
  }
  return {
    sin: toSet(ranges?.sin),
    parcial: toSet(ranges?.parcial),
    total: toSet(ranges?.total),
  }
}

export function runSimulation(input: SimulationInput): SimulationResult {
  const {
    salePrice,
    downPaymentPercentage,
    termYears,
    paymentFrequencyDays,
    daysPerYear,
    annualEffectiveRate,
    desgravamenInsurancePercentage,
    allRiskInsurancePercentage,
    opportunityDiscountRate,
    notaryCosts,
    registrationCosts,
    appraisalCost,
    evaluationFee,
    activationFee,
    periodicCommissionFee,
    postageFee,
    adminFee,
    bonoAmount = 0,
  } = input

  const downPayment = (salePrice * downPaymentPercentage) / 100
  const financingBalance = salePrice - downPayment
  const initialCosts =
    notaryCosts + registrationCosts + appraisalCost + evaluationFee + activationFee
  const loanAmount = financingBalance + initialCosts - bonoAmount

  const installmentsPerYear = Math.round(daysPerYear / paymentFrequencyDays)
  const totalInstallments = installmentsPerYear * termYears

  const teaDecimal = annualEffectiveRate / 100
  const periodicEffectiveRate =
    Math.pow(1 + teaDecimal, paymentFrequencyDays / daysPerYear) - 1
  const periodicDesgravamenPercentage =
    (desgravamenInsurancePercentage / 100) * (paymentFrequencyDays / daysPerYear)
  const periodicRiskInsuranceAmount =
    (salePrice * (allRiskInsurancePercentage / 100)) / installmentsPerYear

  const grace = parseGraceRanges(input.gracePeriodRanges)
  const isTotalGrace = (n: number) => grace.total.includes(n)
  const isParcialGrace = (n: number) => grace.parcial.includes(n)
  const isSinGrace = (n: number) => grace.sin.includes(n)

  const getGraceType = (n: number): string | null => {
    if (isTotalGrace(n)) return 'T'
    if (isParcialGrace(n)) return 'P'
    if (isSinGrace(n)) return 'S'
    return null
  }

  const periods: PeriodRow[] = []
  let balance = loanAmount
  let totalInterest = 0
  let totalPrincipal = 0
  let totalDesgravamen = 0
  let totalAllRisk = 0
  let totalFees = 0
  let totalPostageAdmin = 0

  const tep = periodicEffectiveRate
  let cuotaFija = 0
  if (totalInstallments > 0 && tep > -0.9999) {
    cuotaFija =
      (balance * tep * Math.pow(1 + tep, totalInstallments)) /
      (Math.pow(1 + tep, totalInstallments) - 1)
  }

  const cashFlows: number[] = [-loanAmount]

  for (let n = 1; n <= totalInstallments; n++) {
    const initialBalance = balance
    const indexedInitialBalance = initialBalance
    const isTotal = isTotalGrace(n)
    const isParcial = isParcialGrace(n)

    let interestAmount = 0
    let principalAmortization = 0
    let installmentAmount = 0

    if (isTotal) {
      interestAmount = balance * tep
      principalAmortization = 0
      installmentAmount = 0
    } else if (isParcial) {
      interestAmount = balance * tep
      principalAmortization = 0
      installmentAmount = interestAmount
    } else {
      interestAmount = balance * tep
      principalAmortization = Math.min(
        cuotaFija - interestAmount,
        balance
      )
      installmentAmount = principalAmortization + interestAmount
    }

    const desgravamenAmount = balance * (periodicDesgravamenPercentage / 100)
    const allRiskAmount = periodicRiskInsuranceAmount
    const commission = periodicCommissionFee
    const portes = postageFee
    const adm = adminFee

    balance = Math.max(0, balance - principalAmortization)
    const totalOut =
      installmentAmount +
      desgravamenAmount +
      allRiskAmount +
      commission +
      portes +
      adm
    const cashFlow = -totalOut

    totalInterest += interestAmount
    totalPrincipal += principalAmortization
    totalDesgravamen += desgravamenAmount
    totalAllRisk += allRiskAmount
    totalFees += commission
    totalPostageAdmin += portes + adm
    cashFlows.push(cashFlow)

    periods.push({
      periodNumber: n,
      annualEffectiveRate,
      periodicEffectiveRate: tep * 100,
      gracePeriodType: getGraceType(n),
      initialBalance: initialBalance,
      indexedInitialBalance,
      interestAmount,
      installmentAmount,
      principalAmortization,
      desgravamenInsuranceAmount: desgravamenAmount,
      allRiskInsuranceAmount: allRiskAmount,
      commissionFee: commission,
      postageFee: portes,
      adminFee: adm,
      finalBalance: balance,
      cashFlow,
    })
  }

  const discountDecimal = opportunityDiscountRate / 100
  let van = -loanAmount
  for (let t = 1; t < cashFlows.length; t++) {
    van += cashFlows[t] / Math.pow(1 + discountDecimal, t / installmentsPerYear)
  }

  let tir = 0
  const tirIterations = 100
  let low = -0.99
  let high = 2
  for (let i = 0; i < tirIterations; i++) {
    const mid = (low + high) / 2
    let npv = -loanAmount
    for (let t = 1; t < cashFlows.length; t++) {
      npv += cashFlows[t] / Math.pow(1 + mid, t / installmentsPerYear)
    }
    if (npv >= 0) low = mid
    else high = mid
    tir = mid
  }
  const operationTir = tir * 100
  const operationTcea =
    (Math.pow(1 + tir, installmentsPerYear) - 1) * 100

  return {
    financingBalance,
    loanAmount,
    installmentsPerYear,
    totalInstallments,
    periodicDesgravamenPercentage: periodicDesgravamenPercentage * 100,
    periodicRiskInsuranceAmount,
    totalInterest,
    totalPrincipalAmortization: totalPrincipal,
    totalDesgravamenInsurance: totalDesgravamen,
    totalAllRiskInsurance: totalAllRisk,
    totalPeriodicFees: totalFees,
    totalPostageAndAdminFees: totalPostageAdmin,
    profitabilityDiscountRate: opportunityDiscountRate,
    operationTir,
    operationTcea,
    operationVan: van,
    periods,
  }
}
