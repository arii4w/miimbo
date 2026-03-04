const BASE_URL = 'http://localhost:5123/api/Properties'

export type Property = {
  id: number
  name: string
  code: string
  idPropertyType: number
  propertyType: {
    id: number
    name: string
  }
  totalPropertyPrice: number
  propertyPrice?: number | null
  numberDepartments?: number | null
  idCurrency: number
  currency: {
    id: number
    name: string
    symbol: string
  }
  address: string
  district: string
  province: string
  totalArea: number
  createdBy: number
  createdAt: string
  updatedBy: number | null
  updatedAt: string | null
}

export type CreatePropertyRequest = {
  name: string
  code: string
  idPropertyType: number
  totalPropertyPrice: number
  propertyPrice?: number | null
  numberDepartments?: number | null
  idCurrency: number
  address: string
  district: string
  province: string
  totalArea: number
  createdBy: number
}

export type UpdatePropertyRequest = {
  name: string
  code: string
  idPropertyType: number
  totalPropertyPrice: number
  propertyPrice?: number | null
  numberDepartments?: number | null
  idCurrency: number
  address: string
  district: string
  province: string
  totalArea: number
  updatedBy: number
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

export async function fetchProperties(): Promise<Property[]> {
  const url = BASE_URL
  console.log('[MIIMBO] [API] GET', url)
  const response = await fetch(url, { headers: { accept: '*/*' } })
  const data = await handleJsonResponse<Property[]>(response)
  console.log('[MIIMBO] [API] GET', url, '→ OK', Array.isArray(data) ? data.length : 0, 'propiedades')
  return data
}

export async function fetchPropertyById(id: number): Promise<Property> {
  const url = `${BASE_URL}/${id}`
  console.log('[MIIMBO] [API] GET', url)
  const response = await fetch(url, { headers: { accept: '*/*' } })
  const data = await handleJsonResponse<Property>(response)
  console.log('[MIIMBO] [API] GET', url, '→ OK')
  return data
}

export async function createProperty(payload: CreatePropertyRequest): Promise<Property> {
  const url = BASE_URL
  console.log('[MIIMBO] [API] POST', url, payload)
  const body = {
    ...payload,
    propertyPrice: payload.propertyPrice ?? null,
    numberDepartments: payload.numberDepartments ?? null,
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      accept: '*/*',
    },
    body: JSON.stringify(body),
  })
  const data = await handleJsonResponse<Property>(response)
  console.log('[MIIMBO] [API] POST', url, '→ OK', data.id)
  return data
}

export async function updateProperty(id: number, payload: UpdatePropertyRequest): Promise<Property> {
  const url = `${BASE_URL}/${id}`
  console.log('[MIIMBO] [API] PUT', url, payload)
  const body = {
    ...payload,
    propertyPrice: payload.propertyPrice ?? null,
    numberDepartments: payload.numberDepartments ?? null,
  }
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      accept: '*/*',
    },
    body: JSON.stringify(body),
  })
  const data = await handleJsonResponse<Property>(response)
  console.log('[MIIMBO] [API] PUT', url, '→ OK')
  return data
}
