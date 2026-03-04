import type { User } from '../store/authStore'

const BASE_URL = 'http://localhost:5123/api/Auth'

type AuthResponse = {
  ok: boolean
  message: string
  user: User
}

async function handleResponse(response: Response): Promise<AuthResponse> {
  let data: AuthResponse | null = null

  try {
    data = (await response.json()) as AuthResponse
  } catch {
    // si la respuesta no es JSON, usaremos un mensaje genérico
  }

  const isSuccess = response.ok && data?.ok

  if (!isSuccess) {
    const message =
      data?.message ||
      (response.status === 401
        ? 'Correo o contraseña incorrectos'
        : 'Ocurrió un error al procesar la solicitud')
    console.warn('[MIIMBO] [API] Auth error:', response.status, message, data)
    throw new Error(message)
  }

  return data!
}

export async function loginApi(email: string, password: string): Promise<AuthResponse> {
  const url = `${BASE_URL}/login`
  console.log('[MIIMBO] [API] POST', url, { email: email.replace(/(.{2}).*(@.*)/, '$1***$2') })
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      accept: '*/*',
    },
    body: JSON.stringify({ email, password }),
  })
  const result = await handleResponse(response)
  console.log('[MIIMBO] [API] POST', url, '→ OK', result)
  return result
}

export async function registerApi(
  name: string,
  lastname: string,
  email: string,
  password: string,
): Promise<AuthResponse> {
  const url = `${BASE_URL}/register`
  console.log('[MIIMBO] [API] POST', url, { name, lastname, email: email.replace(/(.{2}).*(@.*)/, '$1***$2') })
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      accept: '*/*',
    },
    body: JSON.stringify({ name, lastname, email, password }),
  })
  const result = await handleResponse(response)
  console.log('[MIIMBO] [API] POST', url, '→ OK', result)
  return result
}

