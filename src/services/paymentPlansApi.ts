const BASE_URL = 'http://localhost:5123/api/PaymentPlans'

/* ---------- Nested types from API (simplified for responses) ---------- */
export type PaymentPlanProperty = {
  id: number
  name: string
  code: string
  totalPropertyPrice: number
  propertyPrice?: number | null
  currency: { id: number; name: string; symbol: string }
  address?: string
  district?: string
  province?: string
  totalArea?: number
}

export type PaymentPlanClient = {
  id: number
  name: string
  lastname: string
  dni?: string
  email?: string
  salary?: number
  familyIncome?: number
  currency?: { id: number; name: string; symbol: string }
}

export type PaymentPlanBono = {
  id: number
  name: string
}

export type PaymentPlanPeriod = {
  id?: number
  idPaymentPlan?: number
  periodNumber: number
  annualEffectiveRate: number
  periodicEffectiveRate: number
  accumulatedAdjustmentIndex?: number | null
  periodInflation?: number | null
  gracePeriodType?: string | null
  initialBalance?: number | null
  indexedInitialBalance?: number | null
  interestAmount?: number | null
  installmentAmount?: number | null
  principalAmortization?: number | null
  prepaymentAmount?: number | null
  desgravamenInsuranceAmount?: number | null
  allRiskInsuranceAmount?: number | null
  commissionFee?: number | null
  postageFee?: number | null
  adminFee?: number | null
  finalBalance?: number | null
  cashFlow?: number | null
  createdBy?: number | null
  createdAt?: string | null
  updatedBy?: number | null
  updatedAt?: string | null
}

export type PaymentPlan = {
  id: number
  idProperty: number
  property: PaymentPlanProperty
  idClient: number
  client: PaymentPlanClient
  idBono: number | null
  bono?: PaymentPlanBono | null
  downPaymentPercentage: number
  termYears: number
  paymentFrequencyDays: number
  daysPerYear: number
  notaryCosts: number
  registrationCosts: number
  appraisalCost: number
  evaluationFee: number
  activationFee: number
  periodicCommissionFee: number
  postageFee: number
  adminFee: number
  desgravamenInsurancePercentage: number
  allRiskInsurancePercentage: number
  opportunityDiscountRate: number
  financingBalance: number | null
  loanAmount: number | null
  installmentsPerYear: number | null
  totalInstallments: number | null
  periodicDesgravamenPercentage: number | null
  periodicRiskInsuranceAmount: number | null
  totalInterest: number | null
  totalPrincipalAmortization: number | null
  totalDesgravamenInsurance: number | null
  totalAllRiskInsurance: number | null
  totalPeriodicFees: number | null
  totalPostageAndAdminFees: number | null
  profitabilityDiscountRate: number | null
  operationTir: number | null
  operationTcea: number | null
  operationVan: number | null
  createdBy: number
  createdAt: string
  updatedBy: number | null
  updatedAt: string | null
  paymentPlanPeriods: PaymentPlanPeriod[]
}

export type CreatePaymentPlanRequest = {
  idProperty: number
  idClient: number
  downPaymentPercentage: number
  termYears: number
  paymentFrequencyDays: number
  desgravamenInsurancePercentage: number
  allRiskInsurancePercentage: number
  opportunityDiscountRate: number
  createdBy: number
  idBono?: number | null
  daysPerYear?: number
  notaryCosts?: number
  registrationCosts?: number
  appraisalCost?: number
  evaluationFee?: number
  activationFee?: number
  periodicCommissionFee?: number
  postageFee?: number
  adminFee?: number
}

export type UpdatePaymentPlanRequest = {
  idProperty: number
  idClient: number
  downPaymentPercentage: number
  termYears: number
  paymentFrequencyDays: number
  daysPerYear: number
  notaryCosts: number
  registrationCosts: number
  appraisalCost: number
  evaluationFee: number
  activationFee: number
  periodicCommissionFee: number
  postageFee: number
  adminFee: number
  desgravamenInsurancePercentage: number
  allRiskInsurancePercentage: number
  opportunityDiscountRate: number
  updatedBy: number
  idBono?: number | null
  financingBalance?: number | null
  loanAmount?: number | null
  installmentsPerYear?: number | null
  totalInstallments?: number | null
  periodicDesgravamenPercentage?: number | null
  periodicRiskInsuranceAmount?: number | null
  totalInterest?: number | null
  totalPrincipalAmortization?: number | null
  totalDesgravamenInsurance?: number | null
  totalAllRiskInsurance?: number | null
  totalPeriodicFees?: number | null
  totalPostageAndAdminFees?: number | null
  profitabilityDiscountRate?: number | null
  operationTir?: number | null
  operationTcea?: number | null
  operationVan?: number | null
}

export type CreatePaymentPlanPeriodItemRequest = {
  periodNumber: number
  annualEffectiveRate: number
  periodicEffectiveRate: number
  accumulatedAdjustmentIndex?: number
  periodInflation?: number
  prepaymentAmount?: number
  gracePeriodType?: string | null
  initialBalance?: number | null
  indexedInitialBalance?: number | null
  interestAmount?: number | null
  installmentAmount?: number | null
  principalAmortization?: number | null
  desgravamenInsuranceAmount?: number | null
  allRiskInsuranceAmount?: number | null
  commissionFee?: number | null
  postageFee?: number | null
  adminFee?: number | null
  finalBalance?: number | null
  cashFlow?: number | null
}

export type CreatePaymentPlanPeriodsRequest = {
  idPaymentPlan: number
  createdBy: number
  periods: CreatePaymentPlanPeriodItemRequest[]
}

async function handleJsonResponse<T>(response: Response): Promise<T> {
  let data: T | null = null
  try {
    data = (await response.json()) as T
  } catch {
    throw new Error('Error al procesar la respuesta del servidor')
  }
  if (!response.ok) {
    const msg =
      typeof data === 'object' && data !== null && 'message' in data
        ? (data as { message?: string }).message
        : `Error ${response.status}`
    throw new Error(msg as string)
  }
  return data
}

export async function fetchPaymentPlans(): Promise<PaymentPlan[]> {
  const url = BASE_URL
  const response = await fetch(url, { headers: { accept: '*/*' } })
  const data = await handleJsonResponse<PaymentPlan[]>(response)
  return data
}

export async function fetchPaymentPlanById(id: number): Promise<PaymentPlan> {
  const url = `${BASE_URL}/${id}`
  const response = await fetch(url, { headers: { accept: '*/*' } })
  const data = await handleJsonResponse<PaymentPlan>(response)
  return data
}

export async function createPaymentPlan(
  payload: CreatePaymentPlanRequest
): Promise<PaymentPlan> {
  const url = BASE_URL
  const body = {
    ...payload,
    idBono: payload.idBono ?? null,
    daysPerYear: payload.daysPerYear ?? 360,
    notaryCosts: payload.notaryCosts ?? 0,
    registrationCosts: payload.registrationCosts ?? 0,
    appraisalCost: payload.appraisalCost ?? 0,
    evaluationFee: payload.evaluationFee ?? 0,
    activationFee: payload.activationFee ?? 0,
    periodicCommissionFee: payload.periodicCommissionFee ?? 0,
    postageFee: payload.postageFee ?? 0,
    adminFee: payload.adminFee ?? 0,
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accept: '*/*' },
    body: JSON.stringify(body),
  })
  const data = await handleJsonResponse<PaymentPlan>(response)
  return data
}

export async function updatePaymentPlan(
  id: number,
  payload: UpdatePaymentPlanRequest
): Promise<PaymentPlan> {
  const url = `${BASE_URL}/${id}`
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', accept: '*/*' },
    body: JSON.stringify(payload),
  })
  const data = await handleJsonResponse<PaymentPlan>(response)
  return data
}

export async function createPaymentPlanPeriods(
  payload: CreatePaymentPlanPeriodsRequest
): Promise<PaymentPlanPeriod[]> {
  const url = `${BASE_URL}/periods`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accept: '*/*' },
    body: JSON.stringify(payload),
  })
  const data = await handleJsonResponse<PaymentPlanPeriod[]>(response)
  return data
}
