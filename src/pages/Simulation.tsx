import React, { useState, useMemo, useEffect, useCallback } from 'react'
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
} from '../services/paymentPlansApi'
import { fetchClients } from '../services/clientsApi'
import { fetchProperties } from '../services/propertiesApi'

function PMT(rate: number, nper: number, pv: number): number {
  if (rate === 0) return -pv / nper;
  return -(pv * rate * Math.pow(1 + rate, nper)) / (Math.pow(1 + rate, nper) - 1);
}

function IRR(cashflows: number[], guess: number = 0.1): number {
  const maxTries = 1000;
  const epsMax = 1e-10;
  let rate = guess;
  for (let i = 0; i < maxTries; i++) {
    let npvVal = 0;
    let npvDeriv = 0;
    for (let j = 0; j < cashflows.length; j++) {
      npvVal += cashflows[j] / Math.pow(1 + rate, j);
      npvDeriv -= j * cashflows[j] / Math.pow(1 + rate, j + 1);
    }
    if (Math.abs(npvDeriv) < epsMax) break;
    const newRate = rate - npvVal / npvDeriv;
    if (Math.abs(newRate - rate) < epsMax) return newRate;
    rate = newRate;
  }
  return rate;
}

function NPV(rate: number, cashflows: number[]): number {
  let val = 0;
  for (let i = 1; i < cashflows.length; i++) {
    val += cashflows[i] / Math.pow(1 + rate, i);
  }
  return val + cashflows[0];
}

const valNum = (n: number | string | null | undefined): number => Number(n) || 0

const TIPO_CAMBIO = 3.80; 
const TIPO_CAMBIO_CURRENCY = 3.42; 

type CurrencyLike = { id?: number; name?: string; symbol?: string } | null | undefined
const currencyCodeFrom = (c: CurrencyLike): 'PEN' | 'USD' | null => {
  if (!c) return null
  const s = `${c.symbol ?? ''}`.toUpperCase()
  const n = `${c.name ?? ''}`.toUpperCase()
  if (s.includes('S/') || n.includes('SOL') || n.includes('PEN')) return 'PEN'
  if (s.includes('$') || n.includes('DOL') || n.includes('USD')) return 'USD'
  return null
}

const convertCurrencyAmount = (amount: number, from: 'PEN' | 'USD', to: 'PEN' | 'USD'): number => {
  if (from === to) return amount;
  
  let convertedAmount = amount;
  if (from === 'USD' && to === 'PEN') {
    convertedAmount = amount * TIPO_CAMBIO_CURRENCY;
  } else {
    convertedAmount = amount / TIPO_CAMBIO_CURRENCY;
  }
  
  return Math.round(convertedAmount * 100) / 100;
}


type TasaVariable = {
  rango: string;
  rate: number | string;
}

export type SimulationRow = {
  NC: number; 
  TEA: number | null; 
  TEP: number | null; 
  PG: string | null; 
  SI: number | null;
  I: number | null; 
  Cuota: number | null; 
  A: number | null; 
  SegDes: number | null;
  SegRie: number | null; 
  Comision: number | null; 
  Portes: number | null; 
  GasAdm: number | null;
  SF: number | null; 
  Flujo: number | null;
}

type ResumenData = {
  Saldo?: number;
  Prestamo?: number;
  NCxA?: number;
  N?: number;
  pSegDesPer?: number;
  SegRiePer?: number;
  COKi?: number;
  tIntereses?: number;
  tAmortizacion?: number;
  tSegDesgravamen?: number;
  tSegRiesgo?: number;
  tComisiones?: number;
  tPortesGastosAdm?: number;
  tir?: number;
  tcea?: number;
  van?: number;
  bonoAplicado?: number;
}

export function Simulation() {
  const [activeTab, setActiveTab] = useState<string>('datos')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { user } = useAuthStore()
  const { clients, setClients, setIsLoading: setClientsLoading, setError: setClientsError } = useClientsStore()
  const { properties, setProperties, setIsLoading: setPropsLoading, setError: setPropsError } = usePropertiesStore()
  const { bonos, priceRangesBBP, priceRangesBFH } = useReferenceStore()
  const { setSelectedPlan, addPlan, updatePlanInList } = usePaymentPlansStore()

  const [idClient, setIdClient] = useState<number | ''>('')
  const [idProperty, setIdProperty] = useState<number | ''>('')
  const [idBono, setIdBono] = useState<number | ''>('')
  
  // Moneda
  const [moneda, setMoneda] = useState<'PEN' | 'USD'>('PEN')
  const sym = moneda === 'PEN' ? 'S/' : '$'
  
  // Tipos de tasa globales
  const [tipoTasaGlobal, setTipoTasaGlobal] = useState<'Efectiva' | 'Nominal'>('Efectiva')
  const [tasaTipo, setTasaTipo] = useState<string>('Constante')


  const [PV, setPV] = useState<number | ''>(0) 
  const [pCI, setPCI] = useState<number | ''>(0)
  const [NA, setNA] = useState<number | ''>(2)
  const [frec, setFrec] = useState<number>(180)
  const NDxA = 360 

  // Ingresos del Cliente 
  const [ingresoMensual, setIngresoMensual] = useState<number | ''>(0)
  const [ingresoFamiliar, setIngresoFamiliar] = useState<number | ''>(0)

  const [costeNotarial, setCosteNotarial] = useState<number | ''>(0)
  const [costeRegistral, setCosteRegistral] = useState<number | ''>(0)
  const [tasacion, setTasacion] = useState<number | ''>(0)
  const [comEstudio, setComEstudio] = useState<number | ''>(0)
  const [comActivacion, setComActivacion] = useState<number | ''>(0)

  const [ComPer, setComPer] = useState<number | ''>(0)
  const [PortesPer, setPortesPer] = useState<number | ''>(0)
  const [GasAdmPer, setGasAdmPer] = useState<number | ''>(0)
  const [pSegDes, setPSegDes] = useState<number | ''>(0.0) 
  const [pSegRie, setPSegRie] = useState<number | ''>(0.0) 

  const [COK, setCOK] = useState<number | ''>(0) 
  
  // Tasas Efectivas
  const [teaConstante, setTeaConstante] = useState<number | ''>(0.0) 
  const [tasasVariables, setTasasVariables] = useState<TasaVariable[]>([{ rango: '1-12', rate: 9.0 }])

  // Tasas Nominales
  const [plazoTN, setPlazoTN] = useState<number>(360)
  const [valTN, setValTN] = useState<number | ''>(0.0)
  const [capTN, setCapTN] = useState<number>(30)

  const [graciaTotal, setGraciaTotal] = useState<string>('')
  const [graciaParcial, setGraciaParcial] = useState<string>('')
  const [graciaSin, setGraciaSin] = useState<string>('')

  const [validationError, setValidationError] = useState<string | null>(null)
  
  const [bonoTipo, setBonoTipo] = useState<string>('')
  const [bonoError, setBonoError] = useState<string>('')

  const [cronogramaData, setCronogramaData] = useState<SimulationRow[]>([])
  const [resumenData, setResumenData] = useState<ResumenData>({})

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

  const numPV = valNum(PV)
  const numPCI = valNum(pCI)
  const numNA = valNum(NA)
  const numFrec = valNum(frec)
  const numIngresoMensual = valNum(ingresoMensual)
  const numIngresoFamiliar = valNum(ingresoFamiliar)

  const selectedClient = idClient !== '' ? clients.find((c) => c.id === idClient) : null
  const selectedProperty = idProperty !== '' ? properties.find((p) => p.id === idProperty) : null

  const bonoBBPRef = useMemo(
    () =>
      bonos.find((b) => {
        const name = b.name.toUpperCase()
        return name.includes('BBP') || name.includes('BUEN PAGADOR')
      }) ?? null,
    [bonos]
  )

  const bonoBFHRef = useMemo(
    () =>
      bonos.find((b) => {
        const name = b.name.toUpperCase()
        return name.includes('BFH') || name.includes('FAMILIAR') || name.includes('HABITACIONAL')
      }) ?? null,
    [bonos]
  )

  // Bonos
  const pvSoles = moneda === 'USD' ? numPV * TIPO_CAMBIO : numPV;
  const imSoles = moneda === 'USD' ? numIngresoMensual * TIPO_CAMBIO : numIngresoMensual;
  const ifSoles = moneda === 'USD' ? numIngresoFamiliar * TIPO_CAMBIO : numIngresoFamiliar;

  const minPCI_BFH = pvSoles < 109000 ? 1 : 3;

  const RequisitosBBP =
    numPCI >= 7.5 &&
    numNA >= 5 &&
    numNA <= 25 &&
    pvSoles >= 68800 &&
    pvSoles <= 362100 &&
    imSoles >= 1000;

  const RequisitosBFH =
  numPCI >= minPCI_BFH &&
    numNA >= 5 &&
    numNA <= 25 &&
    pvSoles <= 136000 &&
    ifSoles <= 3715 &&
    imSoles >= 350;

  const bonoBBPEnSoles =
    priceRangesBBP.find(
      (r) => pvSoles >= r.lowerPrice && pvSoles <= r.higherPrice
    )?.bonusAmount ?? 0;

  const bonoBFHEnSoles =
    priceRangesBFH.find(
      (r) => pvSoles <= r.higherPrice
    )?.bonusAmount ?? 0;

  const BonoBBP =
    bonoTipo === 'BuenPagador' && RequisitosBBP
      ? moneda === 'USD'
        ? bonoBBPEnSoles / TIPO_CAMBIO
        : bonoBBPEnSoles
      : 0;

  const BonoBFH =
    bonoTipo === 'FamiliarHabitacional' && RequisitosBFH
      ? moneda === 'USD'
        ? bonoBFHEnSoles / TIPO_CAMBIO
        : bonoBFHEnSoles
      : 0;
  const bonoActivoValue = BonoBBP || BonoBFH;

  const GastosIni = valNum(costeNotarial) + valNum(costeRegistral) + valNum(tasacion) + valNum(comEstudio) + valNum(comActivacion)
  const NCxA = numFrec > 0 ? Math.floor(NDxA / numFrec) : 0
  const N = NCxA * numNA
  

  const Saldo = useMemo(() => {
    let s = numPV - (numPV * (numPCI / 100));
    if (bonoTipo === 'BuenPagador' && RequisitosBBP) {
      s = s - BonoBBP;
    } else if (bonoTipo === 'FamiliarHabitacional' && RequisitosBFH) {
      s = Math.max(0, s - BonoBFH);
    }
    return s;
  }, [numPV, numPCI, bonoTipo, RequisitosBBP, RequisitosBFH, BonoBBP, BonoBFH])

  const Prestamo = Saldo + GastosIni
  const pSegDesPer = (valNum(pSegDes) / 100) / 30 * numFrec
  const SegRiePer = ((valNum(pSegRie) / 100) * numPV) / (NCxA || 1) 
  const COKi = Math.pow(1 + (valNum(COK) / 100), numFrec / NDxA) - 1

  const TEA_calc_decimal = useMemo(() => {
    const c = valNum(capTN);
    const p = valNum(plazoTN);
    const tn = valNum(valTN);
    if (c === 0 || p === 0) return 0;
    const m = p / c;
    const n = 360 / c;
    return Math.pow(1 + (tn / 100) / m, n) - 1;
  }, [plazoTN, valTN, capTN]);

// CAMBIO DE MONEDA 
const handleMonedaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
  const newMoneda = e.target.value as 'PEN' | 'USD';
  if (newMoneda === moneda) return;

  if (selectedClient) {
    const fromClient = currencyCodeFrom(selectedClient.currency);
    const rawMensual = selectedClient.salary ?? 0;
    const rawFamiliar = selectedClient.familyIncome ?? 0;
    setIngresoMensual(fromClient ? convertCurrencyAmount(rawMensual, fromClient, newMoneda) : rawMensual);
    setIngresoFamiliar(fromClient ? convertCurrencyAmount(rawFamiliar, fromClient, newMoneda) : rawFamiliar);
  } else {
    setIngresoMensual(prev => prev === '' ? '' : convertCurrencyAmount(Number(prev), moneda, newMoneda));
    setIngresoFamiliar(prev => prev === '' ? '' : convertCurrencyAmount(Number(prev), moneda, newMoneda));
  }

  if (selectedProperty) {
    const fromProp = currencyCodeFrom(selectedProperty.currency);
    const rawPV = selectedProperty.totalPropertyPrice ?? 0;
    setPV(fromProp ? convertCurrencyAmount(rawPV, fromProp, newMoneda) : rawPV);
  } else {
    setPV(prev => prev === '' ? '' : convertCurrencyAmount(Number(prev), moneda, newMoneda));
  }

  setCosteNotarial(prev => prev === '' ? '' : convertCurrencyAmount(Number(prev), moneda, newMoneda));
  setCosteRegistral(prev => prev === '' ? '' : convertCurrencyAmount(Number(prev), moneda, newMoneda));
  setTasacion(prev => prev === '' ? '' : convertCurrencyAmount(Number(prev), moneda, newMoneda));
  setComEstudio(prev => prev === '' ? '' : convertCurrencyAmount(Number(prev), moneda, newMoneda));
  setComActivacion(prev => prev === '' ? '' : convertCurrencyAmount(Number(prev), moneda, newMoneda));
  setComPer(prev => prev === '' ? '' : convertCurrencyAmount(Number(prev), moneda, newMoneda));
  setPortesPer(prev => prev === '' ? '' : convertCurrencyAmount(Number(prev), moneda, newMoneda));
  setGasAdmPer(prev => prev === '' ? '' : convertCurrencyAmount(Number(prev), moneda, newMoneda));

  setMoneda(newMoneda);
}



  const handleNuevaSimulacion = () => {
    setSubmitError(null)
    setMoneda('PEN')
    setIdClient('')
    setIdProperty('')
    setIdBono('')
    setPV('')
    setPCI('')
    setNA('')
    setFrec(30)
    setIngresoMensual('')
    setIngresoFamiliar('')
    setCosteNotarial('')
    setCosteRegistral('')
    setTasacion('')
    setComEstudio('')
    setComActivacion('')
    setComPer('')
    setPortesPer('')
    setGasAdmPer('')
    setPSegDes('')
    setPSegRie('')
    setCOK('')
    setTipoTasaGlobal('Efectiva')
    setTasaTipo('Constante')
    setTeaConstante('')
    setTasasVariables([{ rango: '', rate: '' }])
    setPlazoTN(360)
    setValTN('')
    setCapTN(30)
    setGraciaTotal('')
    setGraciaParcial('')
    setGraciaSin('')
    setBonoTipo('')
    setBonoError('')
    setValidationError(null)
    setCronogramaData([])
    setResumenData({})
    setActiveTab('datos')
  }

 
  const checkBonoRequirementsStr = useCallback((tipo: string): string => {
    if (selectedClient && selectedClient.ownsProperty) {
      return 'El cliente no puede acceder a bonos porque ya posee una propiedad.'
    }
    if (tipo === 'BuenPagador') {
      if (pvSoles < 68800 || pvSoles > 362100) return `El valor del inmueble debe estar entre S/68,800 y S/362,100 (o eq. en USD).`
      if (imSoles < 1000) return `El ingreso mensual mínimo debe ser de S/1,000 (o eq. en USD).`
      if (numPCI < 7.5) return 'La cuota inicial debe ser de al menos 7.5%.'
      if (numNA < 5 || numNA > 25) return 'No se puede pagar el crédito fuera del rango de 5 a 25 años.'
    } else if (tipo === 'FamiliarHabitacional') {
      if (pvSoles > 136000) return `El valor del inmueble no puede superar los S/136,000 (o eq. en USD).`
      if (ifSoles > 3715) return `El ingreso familiar máximo es S/3,715 (o eq. en USD).`
      if (imSoles < 350) return `El ingreso mensual mínimo debe ser de S/350 (o eq. en USD).`
      if (numNA < 5 || numNA > 25) return 'No se puede pagar el crédito fuera del rango de 5 a 25 años.'
    }
    return ''
  }, [pvSoles, imSoles, ifSoles, numPCI, numNA, selectedClient])

  const handleBonoSelect = (tipo: string) => {
    if (bonoTipo === tipo) {
      setBonoTipo('')
      setBonoError('')
      setIdBono('')
      return
    }
    
    const error = checkBonoRequirementsStr(tipo)
    if (error) {
      setBonoTipo('')
      setBonoError(error)
      setIdBono('')
    } else {
      setBonoTipo(tipo)
      setBonoError('')
      if (tipo === 'BuenPagador') {
        setIdBono(bonoBBPRef?.id ?? '')
      } else if (tipo === 'FamiliarHabitacional') {
        setIdBono(bonoBFHRef?.id ?? '')
      }
      if (tipo === 'FamiliarHabitacional') {
        setPCI(minPCI_BFH)
      }
    }
  }

  useEffect(() => {
    if (bonoTipo) {
      const error = checkBonoRequirementsStr(bonoTipo)
      if (error) {
        setBonoTipo('')
        setBonoError(`Bono desactivado: ${error}`)
        setIdBono('')
      }
    }
  }, [numPV, numPCI, numNA, ingresoMensual, ingresoFamiliar, bonoTipo, moneda, checkBonoRequirementsStr])

  
  useEffect(() => {
    if (N > 0 && graciaSin === '' && graciaParcial === '' && graciaTotal === '') {
      setGraciaSin(`1-${N}`)
    }
  }, [N, graciaSin, graciaParcial, graciaTotal])

  const parseRangesToSet = (inputStr: string, maxN: number, existingSet: Set<number> = new Set()) => {
    const newSet = new Set<number>()
    let hasError = false
    let errorMessage = ''
    if (!inputStr) return { set: newSet, hasError, errorMessage }

    const ranges = inputStr.split(',')
    for (const range of ranges) {
      if (range.includes('-')) {
        const [start, end] = range.split('-')
        const s = parseInt(start.trim())
        const e = parseInt(end.trim())
        
        if (isNaN(s) || isNaN(e)) {
           hasError = true; errorMessage = "Formato de rango inválido."
        } else if (s < 1 || e > maxN) {
           hasError = true; errorMessage = `Rango fuera de límites (1-${maxN}).`
        } else if (s > e) {
           hasError = true; errorMessage = "El inicio del rango debe ser menor o igual al fin."
        } else {
          for (let i = s; i <= e; i++) {
            if (existingSet.has(i) || newSet.has(i)) { 
                hasError = true; 
                errorMessage = `El periodo ${i} se superpone.`
            }
            newSet.add(i)
          }
        }
      } else {
        const s = parseInt(range.trim())
        if (isNaN(s)) {
            hasError = true; errorMessage = "Formato inválido."
        } else if (s < 1 || s > maxN) {
           hasError = true; errorMessage = `Periodo fuera de límites (1-${maxN}).`
        } else {
          if (existingSet.has(s) || newSet.has(s)) { 
              hasError = true; 
              errorMessage = `El periodo ${s} se superpone.` 
          }
          newSet.add(s)
        }
      }
    }
    return { set: newSet, hasError, errorMessage }
  }

  useEffect(() => {
     let currentError = null;

     const usedG = new Set<number>()
     const tr = parseRangesToSet(graciaTotal, N, usedG)
     tr.set.forEach(p => usedG.add(p))
     const pr = parseRangesToSet(graciaParcial, N, usedG)
     pr.set.forEach(p => usedG.add(p))
     const sr = parseRangesToSet(graciaSin, N, usedG)
     
     if (tr.hasError) currentError = `Gracia TOTAL: ${tr.errorMessage}`
     else if (pr.hasError) currentError = `Gracia PARCIAL: ${pr.errorMessage}`
     else if (sr.hasError) currentError = `Gracia SIN: ${sr.errorMessage}`

     if (!currentError && tipoTasaGlobal === 'Efectiva' && tasaTipo === 'Variable') {
       const usedT = new Set<number>()
       for (const tv of tasasVariables) {
          const res = parseRangesToSet(tv.rango, N, usedT)
          if (res.hasError) {
              currentError = `Tasa Variable: ${res.errorMessage}`
              break;
          }
          res.set.forEach(p => usedT.add(p))
       }
     }

     setValidationError(currentError)
  }, [graciaTotal, graciaParcial, graciaSin, tasasVariables, tasaTipo, tipoTasaGlobal, N])

  const handleAddTasaVariable = () => {
    setTasasVariables([...tasasVariables, { rango: '', rate: '' }])
  }
  const handleUpdateTasaVariable = (index: number, field: keyof TasaVariable, value: string) => {
    const newTasas = [...tasasVariables]
    newTasas[index][field] = value
    setTasasVariables(newTasas)
  }
  const handleRemoveTasaVariable = (index: number) => {
    const newTasas = [...tasasVariables]
    newTasas.splice(index, 1)
    setTasasVariables(newTasas)
  }

  const tasas = useMemo(() => {
    if (N <= 0) return []
    if (tipoTasaGlobal === 'Nominal') {
      if (tasaTipo === 'Constante') {
        return Array(N).fill(TEA_calc_decimal)
      } else {
        const vectorTasas = Array(N).fill(0)
        const usedPeriods = new Set<number>()
        tasasVariables.forEach(tv => {
          const r = valNum(tv.rate)
          const p = valNum(plazoTN)
          const c = valNum(capTN)
          let teaDec = 0
          if (c > 0 && p > 0) {
             const m = p / c;
             const n = 360 / c;
             teaDec = Math.pow(1 + (r / 100) / m, n) - 1;
          }
          const { set: periods } = parseRangesToSet(tv.rango, N, usedPeriods)
          periods.forEach(per => {
            vectorTasas[per - 1] = teaDec
            usedPeriods.add(per)
          })
        })
        return vectorTasas
      }
    } else {
      if (tasaTipo === 'Constante') {
        return Array(N).fill(valNum(teaConstante) / 100)
      } else {
        const vectorTasas = Array(N).fill(0)
        const usedPeriods = new Set<number>()
        tasasVariables.forEach(tv => {
          const r = valNum(tv.rate)
          const { set: periods } = parseRangesToSet(tv.rango, N, usedPeriods)
          periods.forEach(per => {
            vectorTasas[per - 1] = r / 100
            usedPeriods.add(per)
          })
        })
        return vectorTasas
      }
    }
  }, [N, teaConstante, tasaTipo, tasasVariables, tipoTasaGlobal, TEA_calc_decimal, plazoTN, capTN])

  const periodosGracia = useMemo(() => {
    if (N <= 0) return []
    const vectorGracia = Array(N).fill('S')
    const usedPeriods = new Set<number>()

    const totalRes = parseRangesToSet(graciaTotal, N, usedPeriods)
    totalRes.set.forEach(p => { vectorGracia[p - 1] = 'T'; usedPeriods.add(p) })

    const parcialRes = parseRangesToSet(graciaParcial, N, usedPeriods)
    parcialRes.set.forEach(p => { vectorGracia[p - 1] = 'P'; usedPeriods.add(p) })

    const sinRes = parseRangesToSet(graciaSin, N, usedPeriods)
    sinRes.set.forEach(p => { vectorGracia[p - 1] = 'S'; usedPeriods.add(p) })

    return vectorGracia
  }, [N, graciaTotal, graciaParcial, graciaSin])

  //cronograma
  const handleGenerarSimulacion = async () => {
    if (validationError || N <= 0) return;

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
        downPaymentPercentage: numPCI || 0,
        termYears: numNA || 0,
        paymentFrequencyDays: numFrec,
        desgravamenInsurancePercentage: valNum(pSegDes) || 0,
        allRiskInsurancePercentage: valNum(pSegRie) || 0,
        opportunityDiscountRate: valNum(COK) || 0,
        createdBy: user.id,
        idBono: idBono === '' ? null : idBono,
        daysPerYear: NDxA,
        notaryCosts: valNum(costeNotarial) || 0,
        registrationCosts: valNum(costeRegistral) || 0,
        appraisalCost: valNum(tasacion) || 0,
        evaluationFee: valNum(comEstudio) || 0,
        activationFee: valNum(comActivacion) || 0,
        periodicCommissionFee: valNum(ComPer) || 0,
        postageFee: valNum(PortesPer) || 0,
        adminFee: valNum(GasAdmPer) || 0,
      }

      const plan = await createPaymentPlan(createPayload)
      addPlan(plan)

      const cronograma: SimulationRow[] = []
      const flujos: number[] = []
      
      let tIntereses = 0, tAmortizacion = 0, tSegDesgravamen = 0
      let tSegRiesgo = 0, tComisiones = 0, tPortesGastosAdm = 0

      cronograma.push({
        NC: 0, TEA: null, TEP: null, PG: null, SI: null, I: null, Cuota: null,
        A: null, SegDes: null, SegRie: null, Comision: null, Portes: null,
        GasAdm: null, SF: null, Flujo: Prestamo
      })
      flujos.push(Prestamo)

      let saldoPrevio = 0

      for (let i = 1; i <= N; i++) {
        const idx = i - 1
        const TEA = tasas[idx] || 0
        const PG = periodosGracia[idx] || 'S'
        
        const TEP = Math.pow(1 + TEA, numFrec / NDxA) - 1
        
        let SI = 0
        if (i === 1) {
          SI = Prestamo
        } else if (i <= N) {
          SI = saldoPrevio
        }

        const I = -SI * TEP
        const SegDes = -SI * pSegDesPer
        const SegRie = -SegRiePer
        const Comision = -valNum(ComPer)
        const Portes = -valNum(PortesPer)
        const GasAdm = -valNum(GasAdmPer)

        let Cuota = 0
        if (PG === 'T') {
          Cuota = 0
        } else if (PG === 'P') {
          Cuota = I
        } else {
          Cuota = PMT(TEP + pSegDesPer, N - i + 1, SI)
        }

        let A = 0
        if (PG === 'T' || PG === 'P') {
          A = 0
        } else {
          A = Cuota - I - SegDes
        }

        let SF = 0
        if (PG === 'T') {
          SF = SI - I
        } else {
          SF = SI + A
        }
        
        saldoPrevio = SF

        const extraFlujo = (PG === 'T' || PG === 'P') ? SegDes : 0
        const Flujo = Cuota + SegRie + Comision + Portes + GasAdm + extraFlujo
        
        flujos.push(Flujo)

        cronograma.push({
          NC: i, TEA, TEP, PG, SI, I, Cuota, A,
          SegDes, SegRie, Comision, Portes, GasAdm, SF, Flujo
        })

        tAmortizacion += Math.abs(A)
        tSegDesgravamen += Math.abs(SegDes)
        tSegRiesgo += Math.abs(SegRie)
        tComisiones += Math.abs(Comision)
        tPortesGastosAdm += Math.abs(Portes + GasAdm)
      }

      let sumaCuota = 0
      let sumaA = 0
      let sumaSegDes = 0
      for (const row of cronograma) {
        if (row.NC === 0) continue
        sumaCuota += row.Cuota ?? 0
        sumaA += row.A ?? 0
        sumaSegDes += row.SegDes ?? 0
      }
      tIntereses = -(sumaCuota - sumaA - sumaSegDes)

      const tir = IRR(flujos, 0.01)
      const tcea = Math.pow(1 + tir, NCxA) - 1
      const van = NPV(COKi, flujos)

      setCronogramaData(cronograma)
      setResumenData({
        Saldo, Prestamo, NCxA, N, pSegDesPer, SegRiePer, COKi,
        tIntereses, tAmortizacion, tSegDesgravamen, tSegRiesgo,
        tComisiones, tPortesGastosAdm, tir, tcea, van,
        bonoAplicado: bonoActivoValue
      })

      await updatePaymentPlan(plan.id, {
        idProperty: plan.idProperty,
        idClient: plan.idClient,
        idBono: idBono === '' ? null : idBono,
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
        financingBalance: Saldo,
        loanAmount: Prestamo,
        installmentsPerYear: NCxA,
        totalInstallments: N,
        periodicDesgravamenPercentage: pSegDesPer * 100,
        periodicRiskInsuranceAmount: SegRiePer,
        totalInterest: tIntereses,
        totalPrincipalAmortization: tAmortizacion,
        totalDesgravamenInsurance: tSegDesgravamen,
        totalAllRiskInsurance: tSegRiesgo,
        totalPeriodicFees: tComisiones,
        totalPostageAndAdminFees: tPortesGastosAdm,
        profitabilityDiscountRate: COKi * 100,
        operationTir: tir * 100,
        operationTcea: tcea * 100,
        operationVan: van,
      })

      await createPaymentPlanPeriods({
        idPaymentPlan: plan.id,
        createdBy: user.id,
        periods: cronograma
          .filter((row) => row.NC > 0)
          .map((row) => ({
            periodNumber: row.NC,
            annualEffectiveRate: (row.TEA ?? 0) * 100,
            periodicEffectiveRate: (row.TEP ?? 0) * 100,
            gracePeriodType: row.PG,
            initialBalance: row.SI ?? 0,
            indexedInitialBalance: row.SI ?? 0,
            interestAmount: Math.abs(row.I ?? 0),
            installmentAmount: Math.abs(row.Cuota ?? 0),
            principalAmortization: Math.abs(row.A ?? 0),
            desgravamenInsuranceAmount: Math.abs(row.SegDes ?? 0),
            allRiskInsuranceAmount: Math.abs(row.SegRie ?? 0),
            commissionFee: Math.abs(row.Comision ?? 0),
            postageFee: Math.abs(row.Portes ?? 0),
            adminFee: Math.abs(row.GasAdm ?? 0),
            finalBalance: row.SF ?? 0,
            cashFlow: row.Flujo ?? 0,
          })),
      })

      const updated = await fetchPaymentPlanById(plan.id)
      updatePlanInList(updated)
      setSelectedPlan(updated)
      setActiveTab('resultados')
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Error al generar la simulación')
    } finally {
      setIsSubmitting(false)
    }
  }

  const fmt = (num: number | null | undefined): string => typeof num === 'number' ? num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''
  const fmtPct = (num: number | null | undefined): string => typeof num === 'number' ? (num * 100).toLocaleString('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 5 }) + '%' : ''
  const fmtCurr = (num: number | null | undefined): string => typeof num === 'number' ? `${sym} ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''

  const frecuenciaOptions = [
    { label: 'Diaria (1)', value: 1 }, { label: 'Quincenal (15)', value: 15 },
    { label: 'Mensual (30)', value: 30 }, { label: 'Bimestral (60)', value: 60 },
    { label: 'Trimestral (90)', value: 90 }, { label: 'Cuatrimestral (120)', value: 120 },
    { label: 'Semestral (180)', value: 180 }, { label: 'Anual (360)', value: 360 },
  ]

  const capitalizacionOptions = [
    { label: 'cd (1)', value: 1 }, { label: 'cq (15)', value: 15 },
    { label: 'cm (30)', value: 30 }, { label: 'cb (60)', value: 60 },
    { label: 'ct (90)', value: 90 }, { label: 'cc (120)', value: 120 },
    { label: 'cs (180)', value: 180 }, { label: 'ca (360)', value: 360 },
  ]

  return (
    <div className="space-y-6 relative max-w-5xl mx-auto">
      {/* CABECERA */}
      <header className="flex items-center justify-between border-b border-[rgba(12,8,41,0.1)] pb-4">
        <div className="flex items-center gap-6">
          <h1
            className="text-xl font-bold tracking-tight"
            style={{ color: miimboColors.brand.midnight }}
            title="Crea y analiza una simulación de crédito hipotecario"
          >
            Simulación
          </h1>
          <div className="flex bg-white/40 p-1 rounded-full border border-white/60 shadow-sm backdrop-blur-md shrink-0">
            <button
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${activeTab === 'datos' ? 'bg-gradient-to-r from-[#FF8400] to-[#FFA909] text-white shadow-md' : 'text-[rgba(12,8,41,0.6)] hover:bg-white/50'}`}
              onClick={() => setActiveTab('datos')}
              title="Configura aquí todos los datos necesarios antes de simular"
            >
              Datos
            </button>
            <button
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${activeTab === 'resultados' ? 'bg-gradient-to-r from-[#FF8400] to-[#FFA909] text-white shadow-md' : 'text-[rgba(12,8,41,0.6)] hover:bg-white/50'}`}
              onClick={() => setActiveTab('resultados')}
              title="Revisa los resultados, indicadores y cronograma de la simulación"
            >
              Resultados
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleNuevaSimulacion}
          className="rounded-full text-xs font-bold tracking-wide px-6 py-2.5 transition-transform hover:scale-[1.02] shrink-0"
          style={{background: 'linear-gradient(145deg, rgba(230,150,140,0.95) 0%, rgba(245,185,170,0.95) 100%)', color: '#FFFFFF', boxShadow: '0 4px 15px rgba(226,164,153,0.3)'}}
          title="Limpia todos los campos para empezar una simulación desde cero"
        >
          + Nueva Simulación
        </button>
      </header>

      {/* DATOS */}
      <section className={`space-y-6 transition-all duration-300 ${activeTab === 'datos' ? 'block animate-in fade-in slide-in-from-left-4' : 'hidden'}`}>
        <div className="grid gap-5 lg:grid-cols-3">
          <Panel variant="pink" title="Datos Principales">
            <div className="space-y-4">
              <div className="space-y-2">
                <Select
                  label="Cliente"
                  options={[
                    { label: 'Seleccionar cliente', value: '' },
                    ...clients.map((c) => ({ label: `${c.name} ${c.lastname}`, value: c.id })),
                  ]}
                  value={idClient === '' ? '' : idClient}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    const v = e.target.value
                    const parsed = v === '' ? '' : Number(v)
                    setIdClient(parsed)
                    if (parsed !== '') {
                      const selected = clients.find((c) => c.id === parsed)
                      if (selected) {
                        const from = currencyCodeFrom(selected.currency)
                        const to = moneda
                        const rawMensual = selected.salary ?? 0
                        const rawFamiliar = selected.familyIncome ?? 0
                        const ingresoMens = from ? convertCurrencyAmount(rawMensual, from, to) : rawMensual
                        const ingresoFam = from ? convertCurrencyAmount(rawFamiliar, from, to) : rawFamiliar
                        setIngresoMensual(ingresoMens)
                        setIngresoFamiliar(ingresoFam)
                      }
                    } else {
                      setIngresoMensual('')
                      setIngresoFamiliar('')
                    }
                  }}
                />
                <div className="px-2 space-y-1">
                  <DiscreteInput label="Ingreso Mensual" value={ingresoMensual} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIngresoMensual(e.target.value === '' ? '' : Number(e.target.value))} prefix={sym} />
                  <DiscreteInput label="Ingreso Familiar" value={ingresoFamiliar} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIngresoFamiliar(e.target.value === '' ? '' : Number(e.target.value))} prefix={sym} />
                </div>
              </div>
              <hr className="border-t border-white/50" />
              <div className="space-y-2">
                <Select
                  label="Inmueble"
                  options={[
                    { label: 'Seleccionar inmueble', value: '' },
                    ...properties.map((p) => ({ label: p.name, value: p.id })),
                  ]}
                  value={idProperty === '' ? '' : idProperty}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    const v = e.target.value
                    const parsed = v === '' ? '' : Number(v)
                    setIdProperty(parsed)
                    if (parsed !== '') {
                      const selected = properties.find((p) => p.id === parsed)
                      if (selected) {
                        const from = currencyCodeFrom(selected.currency)
                        const to = moneda
                        const rawPV = selected.totalPropertyPrice ?? 0
                        const pv = from ? convertCurrencyAmount(rawPV, from, to) : rawPV
                        setPV(pv)
                      }
                    } else {
                      setPV('')
                    }
                  }}
                />
                <div className="px-2">
                  <DiscreteInput label="Precio de Venta (PV)" value={PV} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPV(e.target.value === '' ? '' : Number(e.target.value))} prefix={sym} />
                </div>
                <div className="pt-2">
                  <Select
                    label="Moneda"
                    options={[{label: 'Soles (S/)', value: 'PEN'}, {label: 'Dólares ($)', value: 'USD'}]}
                    value={moneda}
                    onChange={handleMonedaChange}
                  />
                </div>
              </div>
            </div>
          </Panel>

          <Panel variant="yellow" title="Datos del Préstamo">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input label="% Cuota Inicial" type="number" value={pCI} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPCI(e.target.value === '' ? '' : Number(e.target.value))} suffix="%" />
                <div className="flex flex-col justify-end pb-2">
                  <SummaryRow label="Cuota Inicial:" value={`${sym} ${((valNum(PV) * valNum(pCI)) / 100).toLocaleString('en-US', {minimumFractionDigits: 2})}`} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select label="Frecuencia de pago" options={frecuenciaOptions} value={frec} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFrec(Number(e.target.value))}/>
                <Input label="Nº de Años" type="number" value={NA} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNA(e.target.value === '' ? '' : Number(e.target.value))} />
              </div>
              <p className="text-[10px]" style={{ color: 'rgba(12,8,41,0.5)' }}>* Se considerarán {NDxA} días por año</p>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Input label="Nº Cuotas por Año" type="number" value={NCxA} readOnly />
                <Input label="Nº Total de Cuotas (N)" type="number" value={N} readOnly />
              </div>
            </div>
          </Panel>

          <Panel variant="orange" title="Tasas y Bonos">
            <div className="space-y-4">
              <div className="space-y-3">
                <p className="text-xs font-semibold border-b border-white/40 pb-1" style={{ color: 'rgba(12,8,41,0.8)' }}>Configuración de Tasa</p>
                <div className="flex gap-4 text-xs font-medium" style={{ color: 'rgba(12,8,41,0.7)' }}>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="tipoTasaGlobal" checked={tipoTasaGlobal === 'Efectiva'} onChange={() => setTipoTasaGlobal('Efectiva')} className="accent-[#E5A845]" /> Tasa Efectiva
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="tipoTasaGlobal" checked={tipoTasaGlobal === 'Nominal'} onChange={() => setTipoTasaGlobal('Nominal')} className="accent-[#E5A845]" /> Tasa Nominal
                  </label>
                </div>

                <div className="flex gap-4 text-[11px] font-medium" style={{ color: 'rgba(12,8,41,0.6)' }}>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="tasa" checked={tasaTipo === 'Constante'} onChange={() => setTasaTipo('Constante')} className="accent-[#E5A845]" /> Constante
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="tasa" checked={tasaTipo === 'Variable'} onChange={() => setTasaTipo('Variable')} className="accent-[#E5A845]" /> Variable
                  </label>
                </div>

                {tipoTasaGlobal === 'Efectiva' ? (
                  <div className="space-y-3 pt-1">
                    {tasaTipo === 'Constante' ? (
                      <Input label="TEA" type="number" value={teaConstante} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTeaConstante(e.target.value === '' ? '' : Number(e.target.value))} suffix="%" />
                    ) : (
                      <div className="space-y-3">
                        {tasasVariables.map((tv, idx) => (
                          <div key={idx} className="flex gap-2 items-start">
                            <div className="w-24"><Input label={idx === 0 ? "Rango" : ""} type="text" placeholder="Ej: 1-12" value={tv.rango} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateTasaVariable(idx, 'rango', e.target.value)} /></div>
                            <div className="flex-1"><Input label={idx === 0 ? "TEA" : ""} type="number" value={tv.rate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateTasaVariable(idx, 'rate', e.target.value)} suffix="%" /></div>
                            {idx > 0 && (<button type="button" onClick={() => handleRemoveTasaVariable(idx)} className="mt-5 text-red-400 font-black hover:text-red-600 px-1">✕</button>)}
                          </div>
                        ))}
                        <button type="button" onClick={handleAddTasaVariable} className="text-[10px] text-[#D98A36] font-bold">+ Agregar periodo</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-2 gap-2">
                      <Select label="Plazo" options={frecuenciaOptions} value={plazoTN} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPlazoTN(Number(e.target.value))}/>
                      <Select label="Capit." options={capitalizacionOptions} value={capTN} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCapTN(Number(e.target.value))}/>
                    </div>
                    {tasaTipo === 'Constante' ? (
                      <div className="space-y-1">
                        <Input label="TN" type="number" value={valTN} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValTN(e.target.value === '' ? '' : Number(e.target.value))} suffix="%" />
                        <p className="text-[11px] font-bold px-2" style={{ color: '#D98A36' }}>
                          La TEA es de {fmtPct(TEA_calc_decimal)}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {tasasVariables.map((tv, idx) => {
                          let localTEA = 0
                          const r = valNum(tv.rate)
                          const p = valNum(plazoTN)
                          const c = valNum(capTN)
                          if (p > 0 && c > 0) {
                            localTEA = Math.pow(1 + (r / 100) / (p / c), 360 / c) - 1
                          }
                          return (
                            <div key={idx} className="flex gap-2 items-start">
                              <div className="w-20">
                                <Input label={idx === 0 ? "Rango" : ""} type="text" placeholder="Ej: 1-12" value={tv.rango} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateTasaVariable(idx, 'rango', e.target.value)} />
                              </div>
                              <div className="flex-1">
                                <Input label={idx === 0 ? "TN" : ""} type="number" value={tv.rate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateTasaVariable(idx, 'rate', e.target.value)} suffix="%" />
                                {tv.rate !== '' && (
                                  <div className="text-[9px] text-[#D98A36] font-bold mt-1">TEA: {fmtPct(localTEA)}</div>
                                )}
                              </div>
                              {idx > 0 && (<button type="button" onClick={() => handleRemoveTasaVariable(idx)} className="mt-5 text-red-400 font-black hover:text-red-600 px-1">✕</button>)}
                            </div>
                          )
                        })}
                        <button type="button" onClick={handleAddTasaVariable} className="text-[10px] text-[#D98A36] font-bold">+ Agregar periodo</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <hr className="border-t border-white/50" />
              
              <div className="space-y-2 text-xs" style={{ color: 'rgba(12,8,41,0.7)' }}>
                <p className="font-semibold" style={{ color: 'rgba(12,8,41,0.8)' }}>Bono</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="bono"
                    className="accent-[#E5A845]"
                    checked={bonoTipo === 'BuenPagador'}
                    onChange={() => handleBonoSelect('BuenPagador')}
                  />
                  Bono del Buen Pagador (BBP)
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="bono"
                    className="accent-[#E5A845]"
                    checked={bonoTipo === 'FamiliarHabitacional'}
                    onChange={() => handleBonoSelect('FamiliarHabitacional')}
                  />
                  Bono Familiar Habitacional (BFH)
                </label>
                
                {/* Mensaje de Error de Bono */}
                {bonoError && (
                  <p className="text-[10px] text-red-500 font-bold leading-tight pt-1">
                    {bonoError}
                  </p>
                )}
                
                <div className="pt-2">
                  <SummaryRow label="Monto del Bono:" value={bonoTipo ? `${sym} ${fmt(bonoActivoValue)}` : `${sym} 0.00`} />
                </div>
                
                {/* Monto Final a Financiar */}
                <div className="pt-1">
                  <p className="text-[10px] font-bold text-center border border-[#D98A36]/30 bg-white/40 rounded-lg py-1.5 shadow-sm" style={{ color: '#D98A36' }}>
                    El monto a financiar será de: {sym} {fmt(Prestamo)}
                  </p>
                </div>
              </div>
            </div>
          </Panel>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel variant="yellow" title="Costes y Gastos">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-white/40 pb-1">
                  <h4 className="text-[11px] font-bold uppercase" style={{ color: 'rgba(12,8,41,0.5)' }}>Iniciales</h4>
                  <span className="text-[10px] font-bold" style={{ color: '#D98A36' }}>Total: {sym} {fmt(GastosIni)}</span>
                </div>
                <div className="space-y-2">
                  <CostInput label="Notariales" value={costeNotarial} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCosteNotarial(e.target.value === '' ? '' : Number(e.target.value))} prefix={sym} />
                  <CostInput label="Registrales" value={costeRegistral} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCosteRegistral(e.target.value === '' ? '' : Number(e.target.value))} prefix={sym} />
                  <CostInput label="Tasación" value={tasacion} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTasacion(e.target.value === '' ? '' : Number(e.target.value))} prefix={sym} />
                  <CostInput label="Comis. estudio" value={comEstudio} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setComEstudio(e.target.value === '' ? '' : Number(e.target.value))} prefix={sym} />
                  <CostInput label="Comis. activación" value={comActivacion} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setComActivacion(e.target.value === '' ? '' : Number(e.target.value))} prefix={sym} />
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold uppercase" style={{ color: 'rgba(12,8,41,0.5)' }}>Periódicos</h4>
                <div className="space-y-2">
                  <CostInput label="Comisión periódica" value={ComPer} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setComPer(e.target.value === '' ? '' : Number(e.target.value))} prefix={sym} />
                  <CostInput label="Portes" value={PortesPer} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPortesPer(e.target.value === '' ? '' : Number(e.target.value))} prefix={sym} />
                  <CostInput label="Gastos Admin." value={GasAdmPer} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGasAdmPer(e.target.value === '' ? '' : Number(e.target.value))} prefix={sym} />
                  <CostInput label="% Seguro desgrav." value={pSegDes} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPSegDes(e.target.value === '' ? '' : Number(e.target.value))} suffix="%" />
                  <CostInput label="% Seguro riesgo" value={pSegRie} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPSegRie(e.target.value === '' ? '' : Number(e.target.value))} suffix="%" />
                </div>
                <div className="pt-3">
                  <h4 className="text-[11px] font-bold uppercase mb-2" style={{ color: 'rgba(12,8,41,0.5)' }}>Costo Oportunidad</h4>
                  <CostInput label="Tasa de desc." value={COK} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCOK(e.target.value === '' ? '' : Number(e.target.value))} suffix="%" />
                </div>
              </div>
            </div>
          </Panel>

          <div className="space-y-5 flex flex-col justify-between">
            <Panel variant="pink" title="Periodos de Gracia">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2 text-center">
                  <span className="text-xs font-bold text-[#D98A36]">TOTAL</span>
                  <Input label="" placeholder="Ej: 1-2" value={graciaTotal} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGraciaTotal(e.target.value)} />
                </div>
                <div className="space-y-2 text-center">
                  <span className="text-xs font-bold text-[#D98A36]">PARCIAL</span>
                  <Input label="" placeholder="Ej: 3-4" value={graciaParcial} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGraciaParcial(e.target.value)} />
                </div>
                <div className="space-y-2 text-center">
                  <span className="text-xs font-bold text-[#D98A36]">SIN</span>
                  <Input label="" placeholder={`Ej: 5-N'}`} value={graciaSin} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGraciaSin(e.target.value)} />
                </div>
              </div>
            </Panel>
            
            <div className="space-y-2">
              {validationError && (
                <p className="text-[11px] text-red-500 font-semibold px-2 bg-red-50/50 p-2 rounded-lg border border-red-200">
                  {validationError}
                </p>
              )}
              {submitError && !validationError && (
                <p className="text-[11px] text-red-500 font-semibold px-2 bg-red-50/50 p-2 rounded-lg border border-red-200">
                  {submitError}
                </p>
              )}
              <button
                type="button"
                onClick={handleGenerarSimulacion}
                disabled={!!validationError || isSubmitting}
                className={`w-full rounded-2xl text-sm font-bold tracking-wide py-4 transition-all ${
                  validationError || isSubmitting ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'hover:scale-[1.01]'
                }`}
                style={
                  validationError || isSubmitting
                    ? {}
                    : {
                        background: 'linear-gradient(145deg, rgba(230,150,140,0.95) 0%, rgba(245,185,170,0.95) 100%)',
                        color: '#FFFFFF',
                        boxShadow: '0 8px 20px rgba(226,164,153,0.35)',
                      }
                }
                title="Genera el cronograma de pagos y los indicadores con los datos ingresados"
              >
                {isSubmitting ? 'Generando…' : 'Generar Simulación'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* RESULTADOS */}
      <section className={`space-y-6 transition-all duration-300 ${activeTab === 'resultados' ? 'block animate-in fade-in slide-in-from-right-4' : 'hidden'}`}>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <IndicatorCard label="Tasa de Descuento" value={`${fmtPct(resumenData.COKi)}`} />
          <IndicatorCard label="TIR de la Operación" value={`${fmtPct(resumenData.tir)}`} />
          <IndicatorCard label="TCEA de la Operación" value={`${fmtPct(resumenData.tcea)}`} />
          <IndicatorCard label="VAN de la Operación" value={`${sym} ${fmt(resumenData.van)}`} />
        </div>
        
        <Panel variant="yellow" title="Resumen del Financiamiento">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-6">
            <div className="space-y-5">
              <SummarySection title="Datos Generales">
                <SummaryItem label="Cliente" value={selectedClient ? `${selectedClient.name} ${selectedClient.lastname}` : '—'} />
                <SummaryItem label="Inmueble" value={selectedProperty ? selectedProperty.name : '—'} />
                <SummaryItem label="Bono aplicado" value={bonoTipo === 'BuenPagador' ? "Bono del Buen Pagador" : bonoTipo === 'FamiliarHabitacional' ? "Bono Familiar Habitacional" : "Ninguno"} />
                {bonoTipo !== '' && (
                   <div className="pt-1 border-t border-white/30 mt-1">
                      <SummaryItem label="Valor del Bono" value={`${sym} ${fmt(resumenData.bonoAplicado)}`} />
                   </div>
                )}
              </SummarySection>
              <SummarySection title="Del Préstamo">
                <SummaryItem label="Precio de Venta" value={fmtCurr(valNum(PV))} />
                <SummaryItem label="% Cuota Inicial" value={`${valNum(pCI)}%`} />
                <SummaryItem label="Nº de Años" value={valNum(NA).toString()} />
                <SummaryItem label="Frecuencia de pago" value={frec.toString()} />
                <SummaryItem label="Nº de días por año" value={NDxA.toString()} />
              </SummarySection>
            </div>
            <div className="space-y-5">
              <SummarySection title="De los Costes/Gastos Iniciales">
                <SummaryItem label="Costes Notariales" value={fmtCurr(valNum(costeNotarial))} />
                <SummaryItem label="Costes Registrales" value={fmtCurr(valNum(costeRegistral))} />
                <SummaryItem label="Tasación" value={fmtCurr(valNum(tasacion))} />
                <SummaryItem label="Comisión de estudio" value={fmtCurr(valNum(comEstudio))} />
                <SummaryItem label="Comisión activación" value={comActivacion === 0 || comActivacion === '' ? '-' : fmtCurr(valNum(comActivacion))} />
              </SummarySection>
              <SummarySection title="De los Costes/Gastos Periódicos">
                <SummaryItem label="Comisión periódica" value={fmtCurr(valNum(ComPer))} />
                <SummaryItem label="Portes" value={fmtCurr(valNum(PortesPer))} />
                <SummaryItem label="Gastos de Administración" value={fmtCurr(valNum(GasAdmPer))} />
                <SummaryItem label="% Seguro desgravamen" value={`${valNum(pSegDes)}%`} />
                <SummaryItem label="% Seguro riesgo" value={`${valNum(pSegRie)}%`} />
                <SummaryItem label="% Seguro desgrav. per." value={`${fmtPct(resumenData.pSegDesPer)}`} />
                <SummaryItem label="Seguro riesgo" value={fmtCurr(resumenData.SegRiePer)} />
              </SummarySection>
            </div>
            <div className="space-y-5">
              <SummarySection title="Del Financiamiento y Oportunidad">
                <SummaryItem label="Tasa de descuento" value={`${valNum(COK)}%`} />
                <SummaryItem label="Saldo a financiar" value={fmtCurr(resumenData.Saldo)} />
                <SummaryItem label="Monto del préstamo" value={fmtCurr(resumenData.Prestamo)} />
                <SummaryItem label="Nº Cuotas por Año" value={resumenData.NCxA?.toString() || ''} />
                <SummaryItem label="Nº Total de Cuotas" value={resumenData.N?.toString() || ''} />
              </SummarySection>
              <SummarySection title="Totales de la Operación">
                <SummaryItem label="Intereses" value={fmtCurr(resumenData.tIntereses)} />
                <SummaryItem label="Amortización del capital" value={fmtCurr(resumenData.tAmortizacion)} />
                <SummaryItem label="Seguro de desgravamen" value={fmtCurr(resumenData.tSegDesgravamen)} />
                <SummaryItem label="Seguro contra todo riesgo" value={fmtCurr(resumenData.tSegRiesgo)} />
                <SummaryItem label="Comisiones periódicas" value={fmtCurr(resumenData.tComisiones)} />
                <SummaryItem label="Portes / Gastos adm." value={fmtCurr(resumenData.tPortesGastosAdm)} />
              </SummarySection>
            </div>
          </div>
        </Panel>

        <div className="space-y-3">
          <h2 className="text-sm font-bold tracking-tight px-2" style={{ color: miimboColors.brand.midnight }}>
            Cronograma de Pagos Detallado
          </h2>
          <SimulationTable data={cronogramaData} fmt={fmt} fmtPct={fmtPct} sym={sym} />
        </div>
      </section>
    </div>
  )
}


type SimulationTableProps = {
  data: SimulationRow[];
  fmt: (num: number | null | undefined) => string;
  fmtPct: (num: number | null | undefined) => string;
  sym: string;
}

function SimulationTable({ data, fmt, fmtPct, sym }: SimulationTableProps) {
  const headers = ['NC', 'TEA', "i'=TEP=TEM", 'P.G.', `Saldo Inicial (${sym})`, `Interés (${sym})`, `Cuota (${sym})`, `Amort. (${sym})`, `Seg. Desgrav. (${sym})`, `Seg. Riesgo (${sym})`, `Comisión (${sym})`, `Portes (${sym})`, `Gastos Adm. (${sym})`, `Saldo Final (${sym})`, `Flujo (${sym})`]

  const getColorClass = (val: number | null) => {
    if (val === null) return ''
    return val < 0 ? 'text-red-500/90 font-medium' : 'text-blue-600/90 font-medium'
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/70 shadow-sm backdrop-blur-xl" style={{ background: 'linear-gradient(145deg, rgba(255,132,0,0.1) 0%, rgba(255,240,225,0.5) 100%)', maxHeight: '600px' }}>
      <table className="min-w-[1200px] w-full border-collapse text-[10px]">
        <thead className="font-bold text-center border-b border-white/50 sticky top-0 backdrop-blur-md z-10" style={{ backgroundColor: 'rgba(255,230,205,0.9)', color: miimboColors.brand.midnight }}>
          <tr>
            {headers.map((h, i) => <th key={i} className={`px-2 py-3 ${i === 0 || i === 3 ? 'text-center' : 'text-right'}`}>{h}</th>)}
          </tr>
        </thead>
        <tbody className="text-right">
          {data.map((row, i) => (
            <tr key={i} className="border-b border-white/40 last:border-0 hover:bg-white/40 transition-colors" style={{ color: 'rgba(12,8,41,0.85)' }}>
              <td className="px-2 py-2.5 text-center font-bold">{row.NC}</td>
              <td className="px-2 py-2.5">{fmtPct(row.TEA)}</td>
              <td className="px-2 py-2.5">{fmtPct(row.TEP)}</td>
              <td className="px-2 py-2.5 text-center font-bold text-[#D98A36]">{row.PG || ''}</td>
              <td className={`px-2 py-2.5 ${getColorClass(row.SI)}`}>{fmt(row.SI)}</td>
              <td className={`px-2 py-2.5 ${getColorClass(row.I)}`}>{fmt(row.I)}</td>
              <td className="px-2 py-2.5 font-bold text-[#D98A36]">{fmt(row.Cuota)}</td>
              <td className={`px-2 py-2.5 ${getColorClass(row.A)}`}>{fmt(row.A)}</td>
              <td className={`px-2 py-2.5 ${getColorClass(row.SegDes)}`}>{fmt(row.SegDes)}</td>
              <td className={`px-2 py-2.5 ${getColorClass(row.SegRie)}`}>{fmt(row.SegRie)}</td>
              <td className={`px-2 py-2.5 ${getColorClass(row.Comision)}`}>{fmt(row.Comision)}</td>
              <td className={`px-2 py-2.5 ${getColorClass(row.Portes)}`}>{fmt(row.Portes)}</td>
              <td className={`px-2 py-2.5 ${getColorClass(row.GasAdm)}`}>{fmt(row.GasAdm)}</td>
              <td className={`px-2 py-2.5 font-bold ${getColorClass(row.SF)}`}>{fmt(row.SF)}</td>
              <td className={`px-2 py-2.5 font-bold ${getColorClass(row.Flujo)}`}>{fmt(row.Flujo)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

type PanelProps = { title?: string; variant: 'pink' | 'yellow' | 'orange'; children: React.ReactNode }
function Panel({ title, variant, children }: PanelProps) {
  let background = ''
  if (variant === 'pink') background = 'linear-gradient(145deg, rgba(244,167,160,0.3) 0%, rgba(255,240,225,0.7) 100%)'
  else if (variant === 'yellow') background = 'linear-gradient(145deg, rgba(255,213,99,0.25) 0%, rgba(255,240,225,0.7) 100%)'
  else if (variant === 'orange') background = 'linear-gradient(145deg, rgba(255,132,0,0.15) 0%, rgba(255,240,225,0.7) 100%)'

  return (
    <section className="rounded-[24px] border border-white/70 px-6 py-5 shadow-[0_18px_45px_rgba(12,8,41,0.05)] backdrop-blur-xl relative" style={{ background }}>
      {title && <h2 className="mb-4 text-sm font-bold tracking-tight" style={{ color: miimboColors.brand.midnight }}>{title}</h2>}
      {children}
    </section>
  )
}

type DiscreteInputProps = { label: string; value: number | string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; prefix?: string; }
function DiscreteInput({ label, value, onChange, prefix }: DiscreteInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (Number(e.target.value) < 0) return; // Validación anti-negativos
    onChange(e);
  }

  return (
    <div className="flex justify-between items-center text-[11px] group border-b border-transparent focus-within:border-[#D98A36]/40 hover:border-white/40 transition-colors py-0.5">
      <span style={{ color: 'rgba(12,8,41,0.6)' }}>{label}</span>
      <div className="flex items-center justify-end gap-1">
        {prefix && <span className="font-bold" style={{ color: '#D98A36' }}>{prefix}</span>}
        <input
          type="number"
          min="0"
          value={value}
          onChange={handleChange}
          onKeyDown={(e) => e.key === '-' && e.preventDefault()} // Bloquea tecla '-'
          className="w-20 text-right bg-transparent outline-none font-bold"
          style={{ color: '#D98A36' }}
        />
      </div>
    </div>
  )
}

type InputProps = { label?: string; type?: string; placeholder?: string; value?: string | number; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; readOnly?: boolean; suffix?: string }
function Input({ label, type = 'text', placeholder, value, onChange, readOnly, suffix }: InputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (type === 'number' && Number(e.target.value) < 0) return; // Validación anti-negativos
    if (onChange) onChange(e);
  }

  return (
    <label className="flex flex-col gap-1.5 text-xs font-medium shrink-0" style={{ color: 'rgba(12,8,41,0.8)' }}>
      {label && <span>{label}</span>}
      <div className="relative flex items-center">
        <input 
          type={type} 
          min={type === 'number' ? "0" : undefined}
          placeholder={placeholder} 
          value={value} 
          onChange={handleChange} 
          onKeyDown={(e) => type === 'number' && e.key === '-' && e.preventDefault()} // Bloquea tecla '-'
          readOnly={readOnly} 
          className={`w-full rounded-xl border bg-white/60 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#D98A36]/50 focus:border-transparent transition-all backdrop-blur-sm ${readOnly ? 'opacity-70 bg-white/40 cursor-not-allowed' : ''}`} style={{ borderColor: 'rgba(255,255,255,0.8)', color: 'rgba(12,8,41,0.9)' }} 
        />
        {suffix && <span className="absolute right-3 text-xs font-bold text-[rgba(12,8,41,0.5)]">{suffix}</span>}
      </div>
    </label>
  )
}

type CostInputProps = { label: string; value?: string | number; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; suffix?: string; prefix?: string; }
function CostInput({ label, value, onChange, suffix, prefix }: CostInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (Number(e.target.value) < 0) return; // Validación anti-negativos
    if (onChange) onChange(e);
  }

  return (
    <div className="flex justify-between items-center text-[11px] gap-2">
      <span className="shrink" style={{ color: 'rgba(12,8,41,0.7)' }}>{label}</span>
      <div className="relative flex items-center w-24 shrink-0">
        {prefix && <span className="absolute left-2 text-[10px] font-bold text-[rgba(12,8,41,0.5)] z-10">{prefix}</span>}
        <input 
          type="number" 
          min="0"
          value={value} 
          onChange={handleChange} 
          onKeyDown={(e) => e.key === '-' && e.preventDefault()} // Bloquea tecla '-'
          className={`w-full text-right bg-white/70 border border-white/80 outline-none font-bold focus:ring-2 focus:ring-[#D98A36]/50 rounded-lg py-1 shadow-sm transition-all ${prefix ? 'pl-5' : 'pl-2'} ${suffix ? 'pr-5' : 'pr-2'}`} style={{ color: 'rgba(12,8,41,0.9)' }} 
        />
        {suffix && <span className="absolute right-1 text-[10px] font-bold text-[rgba(12,8,41,0.5)]">{suffix}</span>}
      </div>
    </div>
  )
}

type SelectOption = { label: string; value: string | number }
type SelectProps = { label: string; options: SelectOption[]; value?: string | number; onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void }
function Select({ label, options, value, onChange }: SelectProps) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-medium" style={{ color: 'rgba(12,8,41,0.8)' }}>
      {label}
      <select value={value} onChange={onChange} className="rounded-xl border bg-white/60 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#D98A36]/50 focus:border-transparent appearance-none backdrop-blur-sm" style={{ borderColor: 'rgba(255,255,255,0.8)', color: 'rgba(12,8,41,0.9)' }}>
        {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </label>
  )
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
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
      <h4 className="text-[10px] font-bold uppercase mb-2 border-b border-white/40 pb-1" style={{ color: 'rgba(12,8,41,0.5)' }}>{title}</h4>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function SummaryItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center text-[11px] pb-1 gap-2">
      <span className="shrink" style={{ color: 'rgba(12,8,41,0.7)' }}>{label}</span>
      <span className="font-bold text-right shrink-0" style={{ color: 'rgba(12,8,41,0.9)' }}>{value}</span>
    </div>
  )
}

function IndicatorCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-[20px] border border-white/80 p-4 text-center shadow-[0_12px_30px_rgba(12,8,41,0.06)] backdrop-blur-md transition-transform hover:-translate-y-1" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.7) 0%, rgba(253,235,218,0.9) 100%)' }}>
      <p className="text-[10px] uppercase font-bold text-[rgba(12,8,41,0.5)] tracking-wider truncate">{label}</p>
      <p className="text-xl font-black mt-1" style={{ color: '#D98A36' }}>{value}</p>
    </div>
  )
}
