import type {
  Bono,
  Currency,
  PriceRangeBBP,
  PriceRangeBFH,
  PropertyType,
  ReferenceData,
} from '../store/referenceStore'

const BASE_URL = 'http://localhost:5123/api'

async function handleArrayResponse<T>(response: Response, label: string): Promise<T[]> {
  if (!response.ok) {
    console.warn('[MIIMBO] [API]', label, '→ Error', response.status)
    throw new Error('No se pudo cargar la información de referencia')
  }

  const data = (await response.json()) as T[]
  console.log('[MIIMBO] [API] GET', label, '→ OK', data.length, 'items')
  return data
}

export async function fetchBonos(): Promise<Bono[]> {
  const url = `${BASE_URL}/Bonos`
  console.log('[MIIMBO] [API] GET', url)
  const response = await fetch(url, {
    headers: {
      accept: '*/*',
    },
  })
  return handleArrayResponse<Bono>(response, url)
}

export async function fetchCurrencies(): Promise<Currency[]> {
  const url = `${BASE_URL}/Currencies`
  console.log('[MIIMBO] [API] GET', url)
  const response = await fetch(url, {
    headers: {
      accept: '*/*',
    },
  })
  return handleArrayResponse<Currency>(response, url)
}

export async function fetchPropertyTypes(): Promise<PropertyType[]> {
  const url = `${BASE_URL}/Properties/types`
  console.log('[MIIMBO] [API] GET', url)
  const response = await fetch(url, {
    headers: {
      accept: '*/*',
    },
  })
  return handleArrayResponse<PropertyType>(response, url)
}

export async function fetchPriceRangesBBP(): Promise<PriceRangeBBP[]> {
  const url = `${BASE_URL}/PriceRanges/bbp`
  console.log('[MIIMBO] [API] GET', url)
  const response = await fetch(url, {
    headers: {
      accept: '*/*',
    },
  })
  return handleArrayResponse<PriceRangeBBP>(response, url)
}

export async function fetchPriceRangesBFH(): Promise<PriceRangeBFH[]> {
  const url = `${BASE_URL}/PriceRanges/bfh`
  console.log('[MIIMBO] [API] GET', url)
  const response = await fetch(url, {
    headers: {
      accept: '*/*',
    },
  })
  return handleArrayResponse<PriceRangeBFH>(response, url)
}

export async function fetchAllReferenceData(): Promise<ReferenceData> {
  console.log('[MIIMBO] [API] fetchAllReferenceData → iniciando 5 requests en paralelo')
  const [bonos, currencies, propertyTypes, priceRangesBBP, priceRangesBFH] = await Promise.all([
    fetchBonos(),
    fetchCurrencies(),
    fetchPropertyTypes(),
    fetchPriceRangesBBP(),
    fetchPriceRangesBFH(),
  ])

  const result = {
    bonos,
    currencies,
    propertyTypes,
    priceRangesBBP,
    priceRangesBFH,
  }
  console.log('[MIIMBO] [API] fetchAllReferenceData → OK', {
    bonos: result.bonos.length,
    currencies: result.currencies.length,
    propertyTypes: result.propertyTypes.length,
    priceRangesBBP: result.priceRangesBBP.length,
    priceRangesBFH: result.priceRangesBFH.length,
  })
  return result
}

