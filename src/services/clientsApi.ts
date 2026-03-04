const BASE_URL = 'http://localhost:5123/api/Clients'

export type Client = {
  id: number
  name: string
  lastname: string
  dni: string
  age: number
  email: string
  phoneNumber: string | null
  ownsProperty: boolean
  creditHistory: number
  idCurrency: number
  currency: {
    id: number
    name: string
    symbol: string
  }
  salary: number
  familyIncome: number
  createdBy: number
  createdAt: string
  updatedBy: number | null
  updatedAt: string | null
}

export type CreateClientRequest = {
  name: string
  lastname: string
  dni: string
  age: number
  email: string
  phoneNumber?: string | null
  ownsProperty: boolean
  creditHistory: number
  idCurrency: number
  salary: number
  familyIncome: number
  createdBy: number
}

export type UpdateClientRequest = {
  name: string
  lastname: string
  dni: string
  age: number
  email: string
  phoneNumber?: string | null
  ownsProperty: boolean
  creditHistory: number
  idCurrency: number
  salary: number
  familyIncome: number
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
    const msg = typeof data === 'object' && data !== null && 'message' in data
      ? (data as { message?: string }).message
      : `Error ${response.status}`
    throw new Error(msg as string)
  }

  return data
}

export async function fetchClients(): Promise<Client[]> {
  const url = BASE_URL
  console.log('[MIIMBO] [API] GET', url)
  const response = await fetch(url, { headers: { accept: '*/*' } })
  const data = await handleJsonResponse<Client[]>(response)
  console.log('[MIIMBO] [API] GET', url, '→ OK', Array.isArray(data) ? data.length : 0, 'clientes')
  return data
}

export async function fetchClientById(id: number): Promise<Client> {
  const url = `${BASE_URL}/${id}`
  console.log('[MIIMBO] [API] GET', url)
  const response = await fetch(url, { headers: { accept: '*/*' } })
  const data = await handleJsonResponse<Client>(response)
  console.log('[MIIMBO] [API] GET', url, '→ OK')
  return data
}

export async function createClient(payload: CreateClientRequest): Promise<Client> {
  const url = BASE_URL
  console.log('[MIIMBO] [API] POST', url, payload)
  const body = {
    ...payload,
    phoneNumber: payload.phoneNumber?.trim() || null,
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      accept: '*/*',
    },
    body: JSON.stringify(body),
  })
  const data = await handleJsonResponse<Client>(response)
  console.log('[MIIMBO] [API] POST', url, '→ OK', data.id)
  return data
}

export async function updateClient(id: number, payload: UpdateClientRequest): Promise<Client> {
  const url = `${BASE_URL}/${id}`
  console.log('[MIIMBO] [API] PUT', url, payload)
  const body = {
    ...payload,
    phoneNumber: payload.phoneNumber?.trim() || null,
  }
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      accept: '*/*',
    },
    body: JSON.stringify(body),
  })
  const data = await handleJsonResponse<Client>(response)
  console.log('[MIIMBO] [API] PUT', url, '→ OK')
  return data
}
