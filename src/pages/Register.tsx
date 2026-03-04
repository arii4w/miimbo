import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { miimboColors } from '../theme/colors'
import pantalla from '../assets/Pantalla.svg'
import fondoMivivienda from '../assets/fondomivivienda.svg'
import techoPropio from '../assets/techopropio.svg'
import { registerApi } from '../services/authApi'
import { useAuthStore } from '../store/authStore'
import { useReferenceStore } from '../store/referenceStore'
import { useClientsStore } from '../store/clientsStore'
import { usePropertiesStore } from '../store/propertiesStore'
import { fetchAllReferenceData } from '../services/referenceApi'
import { fetchClients } from '../services/clientsApi'
import { fetchProperties } from '../services/propertiesApi'

export function Register() {
  const navigate = useNavigate()
  const setUser = useAuthStore((state) => state.setUser)
  const setAllReference = useReferenceStore((state) => state.setAll)
  const setReferenceLoading = useReferenceStore((state) => state.setIsLoading)
  const setReferenceError = useReferenceStore((state) => state.setError)
  const setClients = useClientsStore((state) => state.setClients)
  const setProperties = usePropertiesStore((state) => state.setProperties)

  const [name, setName] = useState('')
  const [lastname, setLastname] = useState('')
  const [document, setDocument] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    console.log('[MIIMBO] [REGISTER] handleRegister iniciado')

    if (!name || !lastname || !email || !password) {
      console.log('[MIIMBO] [REGISTER] Validación fallida: campos obligatorios vacíos')
      setError('Completa todos los campos obligatorios')
      return
    }

    try {
      setIsSubmitting(true)
      console.log('[MIIMBO] [REGISTER] Llamando registerApi...')
      const { user } = await registerApi(name, lastname, email, password)
      console.log('[MIIMBO] [REGISTER] Registro OK, guardando usuario')
      setUser(user)

      try {
        setReferenceLoading(true)
        setReferenceError(null)
        console.log('[MIIMBO] [REGISTER] Cargando datos de referencia...')
        const referenceData = await fetchAllReferenceData()
        setAllReference(referenceData)
        console.log('[MIIMBO] [REGISTER] Datos de referencia OK')
      } catch (refErr) {
        console.warn('[MIIMBO] [REGISTER] Error cargando referencia (no bloquea)', refErr)
        setReferenceError((refErr as Error).message)
      } finally {
        setReferenceLoading(false)
      }

      try {
        console.log('[MIIMBO] [REGISTER] Cargando clientes y propiedades...')
        const [clientsData, propertiesData] = await Promise.all([
          fetchClients(),
          fetchProperties(),
        ])
        setClients([...clientsData].reverse())
        setProperties([...propertiesData].reverse())
        console.log('[MIIMBO] [REGISTER] Clientes y propiedades OK')
      } catch (listErr) {
        console.warn('[MIIMBO] [REGISTER] Error cargando clientes/propiedades (no bloquea)', listErr)
      }

      console.log('[MIIMBO] [REGISTER] Navegando a /')
      navigate('/')
    } catch (err) {
      console.warn('[MIIMBO] [REGISTER] Error de registro', err)
      setError((err as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-6 bg-cover bg-center relative overflow-hidden"
      style={{
        backgroundImage: `url(${pantalla})`,
      }}
    >
      <img
        src={fondoMivivienda}
        alt="Fondo Mivivienda"
        className="pointer-events-none select-none absolute bottom-6 left-10 h-20 w-auto"
      />
      <img
        src={techoPropio}
        alt="Techo Propio"
        className="pointer-events-none select-none absolute bottom-7 right-10 h-20 w-auto"
      />

      <div className="relative max-w-[320px] w-full">
        <div className="mb-3 text-center">
          <p
            className="text-[10px] font-semibold tracking-[0.22em] uppercase"
            style={{ color: '#FEFBF7' }}
          >
            MIIMBO
          </p>
        </div>

        <div
          className="rounded-[24px] px-6 py-6 border backdrop-blur-2xl shadow-[0_14px_60px_rgba(255,209,109,0.85)]"
          style={{
            background:
              'linear-gradient(145deg, rgba(255,132,0,0.65) 0%, rgba(255,168,9,0.55) 40%, rgba(255,240,225,0.85) 100%)',
            borderColor: miimboColors.glass.warm.border,
          }}
        >
          <h1
            className="mb-4 text-lg font-semibold text-center tracking-tight"
            style={{ color: '#FEFBF7' }}
          >
            Crear Cuenta
          </h1>

          {error && (
            <div className="mb-3 flex items-start gap-2 rounded-2xl border border-red-200/70 bg-[rgba(255,242,242,0.9)] px-3 py-2.5 text-[11px] text-red-700 shadow-sm">
              <span className="mt-[1px] inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-600">
                !
              </span>
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-2.5" onSubmit={handleRegister}>
            <div className="grid grid-cols-2 gap-2.5">
              <Input label="Nombre" value={name} onChange={setName} />
              <Input label="Apellidos" value={lastname} onChange={setLastname} />
            </div>
            <Input label="Número de Documento" value={document} onChange={setDocument} />
            <Input label="Correo Electrónico" type="email" value={email} onChange={setEmail} />
            <Input label="Contraseña" type="password" value={password} onChange={setPassword} />

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-4 w-full rounded-full text-xs font-semibold tracking-wide py-2 transition-all hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed"
              style={{
                background: 'rgba(230, 140, 70, 0.3)',
                color: '#FEFBF7',
                border: '1px solid rgba(255,255,255,0.6)',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
              }}
            >
              {isSubmitting ? 'Creando cuenta...' : 'Crear Cuenta'}
            </button>
          </form>

          <p className="mt-4 text-[11px] text-center" style={{ color: 'rgba(254,251,247,0.9)' }}>
            ¿Ya tienes una cuenta?{' '}
            <Link to="/login" className="underline font-medium" style={{ color: '#FFF0E1' }}>
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

type InputProps = {
  label: string
  type?: string
  value: string
  onChange: (value: string) => void
}

function Input({ label, type = 'text', value, onChange }: InputProps) {
  return (
    <input
      type={type}
      placeholder={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-full border px-4 py-2 text-xs outline-none bg-[rgba(254,251,247,0.95)] placeholder:text-gray-700/70"
      style={{
        borderColor: 'rgba(255,255,255,0.35)',
        color: miimboColors.brand.midnight,
      }}
    />
  )
}