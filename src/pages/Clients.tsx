import { useEffect, useState } from 'react'
import { miimboColors } from '../theme/colors'
import { useAuthStore } from '../store/authStore'
import { useReferenceStore } from '../store/referenceStore'
import { useClientsStore } from '../store/clientsStore'
import {
  type Client,
  type CreateClientRequest,
  type UpdateClientRequest,
  fetchClients,
  createClient,
  updateClient,
} from '../services/clientsApi'

const CREDIT_HISTORY_LABELS: Record<number, string> = {
  0: 'Sin historial',
  1: 'Muy malo',
  2: 'Malo',
  3: 'Regular',
  4: 'Bueno',
}

const CREDIT_OPTIONS = [
  { value: 0, label: 'Sin historial' },
  { value: 1, label: 'Muy malo' },
  { value: 2, label: 'Malo' },
  { value: 3, label: 'Regular' },
  { value: 4, label: 'Bueno' },
]

const emptyForm = {
  name: '',
  lastname: '',
  dni: '',
  age: '',
  email: '',
  phoneNumber: '',
  ownsProperty: false,
  creditHistory: 3,
  idCurrency: 1,
  salary: '',
  familyIncome: '',
}

export function Clients() {
  const user = useAuthStore((s) => s.user)
  const currencies = useReferenceStore((s) => s.currencies)
  const clients = useClientsStore((s) => s.clients)
  const isLoading = useClientsStore((s) => s.isLoading)
  const error = useClientsStore((s) => s.error)
  const setClients = useClientsStore((s) => s.setClients)
  const addClient = useClientsStore((s) => s.addClient)
  const updateClientInStore = useClientsStore((s) => s.updateClient)
  const setIsLoading = useClientsStore((s) => s.setIsLoading)
  const setError = useClientsStore((s) => s.setError)

  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [formData, setFormData] = useState(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadClients = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchClients()
      setClients([...data].reverse())
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadClients()
  }, [])

  const openCreateModal = () => {
    setModalMode('create')
    setFormData({
      ...emptyForm,
      idCurrency: currencies[0]?.id ?? 1,
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  const openEditModal = (client: Client) => {
    setModalMode('edit')
    setFormData({
      name: client.name,
      lastname: client.lastname,
      dni: client.dni,
      age: String(client.age),
      email: client.email,
      phoneNumber: client.phoneNumber ?? '',
      ownsProperty: client.ownsProperty,
      creditHistory: client.creditHistory,
      idCurrency: client.idCurrency,
      salary: String(client.salary),
      familyIncome: String(client.familyIncome),
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setFormError(null)
  }

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setFormError('El nombre es obligatorio')
      return false
    }
    if (!formData.lastname.trim()) {
      setFormError('Los apellidos son obligatorios')
      return false
    }
    if (!formData.dni.trim()) {
      setFormError('El DNI es obligatorio')
      return false
    }
    const age = Number(formData.age)
    if (!formData.age || isNaN(age) || age < 1 || age > 150) {
      setFormError('Edad inválida')
      return false
    }
    if (!formData.email.trim()) {
      setFormError('El correo es obligatorio')
      return false
    }
    const salary = Number(formData.salary)
    const familyIncome = Number(formData.familyIncome)
    if (!formData.salary || isNaN(salary) || salary < 0) {
      setFormError('Salario inválido')
      return false
    }
    if (!formData.familyIncome || isNaN(familyIncome) || familyIncome < 0) {
      setFormError('Ingreso familiar inválido')
      return false
    }
    if (!user?.id) {
      setFormError('Sesión inválida. Vuelve a iniciar sesión.')
      return false
    }
    setFormError(null)
    return true
  }

  const handleSubmit = async () => {
    if (!validateForm() || !user?.id) return

    setIsSubmitting(true)
    try {
      if (modalMode === 'create') {
        const payload: CreateClientRequest = {
          name: formData.name.trim(),
          lastname: formData.lastname.trim(),
          dni: formData.dni.trim(),
          age: Number(formData.age),
          email: formData.email.trim(),
          phoneNumber: formData.phoneNumber.trim() || undefined,
          ownsProperty: formData.ownsProperty,
          creditHistory: formData.creditHistory,
          idCurrency: formData.idCurrency,
          salary: Number(formData.salary),
          familyIncome: Number(formData.familyIncome),
          createdBy: user.id,
        }
        const created = await createClient(payload)
        addClient(created)
        setSelectedClient(created)
        closeModal()
      } else if (selectedClient) {
        const payload: UpdateClientRequest = {
          name: formData.name.trim(),
          lastname: formData.lastname.trim(),
          dni: formData.dni.trim(),
          age: Number(formData.age),
          email: formData.email.trim(),
          phoneNumber: formData.phoneNumber.trim() || undefined,
          ownsProperty: formData.ownsProperty,
          creditHistory: formData.creditHistory,
          idCurrency: formData.idCurrency,
          salary: Number(formData.salary),
          familyIncome: Number(formData.familyIncome),
          updatedBy: user.id,
        }
        const updated = await updateClient(selectedClient.id, payload)
        updateClientInStore(updated)
        setSelectedClient(updated)
        closeModal()
      }
    } catch (err) {
      setFormError((err as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8 relative">
      <header className="flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-bold tracking-tight"
            style={{ color: miimboColors.brand.midnight }}
          >
            Clientes
          </h1>
          <p className="text-sm" style={{ color: 'rgba(12,8,41,0.6)' }}>
            Actualmente existen {clients.length} clientes registrados.
          </p>
        </div>

        <PrimaryBarButton
          label="+ Nuevo Cliente"
          onClick={openCreateModal}
          className="w-auto px-8 py-2.5"
        />
      </header>

      {error && (
        <div
          className="rounded-xl border border-red-200/70 bg-red-50/90 px-4 py-2.5 text-xs text-red-700"
        >
          {error}
        </div>
      )}

      <section className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)] gap-6 xl:gap-8">
        <div className="space-y-3 pt-2">
          <h2
            className="text-sm font-bold tracking-tight"
            style={{ color: miimboColors.brand.midnight }}
          >
            Clientes Registrados
          </h2>
          <ClientsTable
            clients={clients}
            isLoading={isLoading}
            selectedId={selectedClient?.id ?? null}
            onSelect={setSelectedClient}
          />
        </div>

        <Panel
          variant="yellow"
          title={selectedClient ? `${selectedClient.name} ${selectedClient.lastname}` : 'Detalle del cliente'}
        >
          <ClientDetailPanel
            client={selectedClient}
            onEdit={openEditModal}
          />
        </Panel>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-[#FEFBF7]/60 backdrop-blur-sm transition-opacity"
            onClick={closeModal}
          />

          <div className="relative w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-[24px] shadow-2xl animate-in fade-in zoom-in duration-200">
            <Panel
              variant="modal"
              title={modalMode === 'create' ? 'Crear Nuevo Cliente' : 'Editar Cliente'}
            >
              <button
                onClick={closeModal}
                className="absolute right-6 top-6 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-[rgba(12,8,41,0.8)] hover:bg-white transition-colors shadow-sm font-bold text-xs backdrop-blur-md"
              >
                ✕
              </button>

              <div className="space-y-6 mt-2">
                {formError && (
                  <div className="rounded-xl border border-red-200/70 bg-red-50/90 px-4 py-2.5 text-xs text-red-700">
                    {formError}
                  </div>
                )}

                <div className="space-y-3">
                  <h3
                    className="text-xs font-bold uppercase tracking-wider border-b border-white/40 pb-1"
                    style={{ color: 'rgba(12,8,41,0.6)' }}
                  >
                    Datos Personales
                  </h3>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <Input
                      label="Nombre"
                      placeholder="Nombres"
                      value={formData.name}
                      onChange={(v) => setFormData((p) => ({ ...p, name: v }))}
                    />
                    <Input
                      label="Apellidos"
                      placeholder="Apellidos"
                      value={formData.lastname}
                      onChange={(v) => setFormData((p) => ({ ...p, lastname: v }))}
                    />
                    <Input
                      label="DNI"
                      placeholder="DNI"
                      value={formData.dni}
                      onChange={(v) =>
                        setFormData((p) => ({ ...p, dni: v.replace(/\D/g, '') }))
                      }
                    />
                    <Input
                      label="Edad"
                      type="number"
                      placeholder="Edad"
                      value={formData.age}
                      onChange={(v) => setFormData((p) => ({ ...p, age: v }))}
                    />
                    <Input
                      label="Correo Electrónico"
                      type="email"
                      placeholder="Correo"
                      value={formData.email}
                      onChange={(v) => setFormData((p) => ({ ...p, email: v }))}
                    />
                    <Input
                      label="Teléfono"
                      type="tel"
                      placeholder="Teléfono"
                      value={formData.phoneNumber}
                      onChange={(v) =>
                        setFormData((p) => ({
                          ...p,
                          phoneNumber: v.replace(/\D/g, ''),
                        }))
                      }
                    />
                  </div>
                  <div className="pt-2 flex items-center gap-3">
                    <input
                      id="modal-posee-propiedades"
                      type="checkbox"
                      checked={formData.ownsProperty}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          ownsProperty: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-[rgba(12,8,41,0.2)] accent-[#E5A845]"
                    />
                    <label
                      htmlFor="modal-posee-propiedades"
                      className="text-xs font-medium"
                      style={{ color: 'rgba(12,8,41,0.8)' }}
                    >
                      ¿El cliente posee propiedades actualmente?
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3
                    className="text-xs font-bold uppercase tracking-wider border-b border-white/40 pb-1"
                    style={{ color: 'rgba(12,8,41,0.6)' }}
                  >
                    Perfil Financiero
                  </h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <Select
                      label="Historial Crediticio"
                      value={formData.creditHistory}
                      onChange={(v) =>
                        setFormData((p) => ({
                          ...p,
                          creditHistory: Number(v),
                        }))
                      }
                      options={CREDIT_OPTIONS}
                    />
                    <Select
                      label="Moneda"
                      value={formData.idCurrency}
                      onChange={(v) =>
                        setFormData((p) => ({
                          ...p,
                          idCurrency: Number(v),
                        }))
                      }
                      options={currencies.map((c) => ({
                        value: c.id,
                        label: `${c.name} (${c.symbol})`,
                      }))}
                    />
                    <Input
                      label="Salario"
                      type="number"
                      placeholder="Monto"
                      value={formData.salary}
                      onChange={(v) => setFormData((p) => ({ ...p, salary: v }))}
                    />
                    <Input
                      label="Ingreso Familiar"
                      type="number"
                      placeholder="Monto"
                      value={formData.familyIncome}
                      onChange={(v) =>
                        setFormData((p) => ({ ...p, familyIncome: v }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <PrimaryBarButton
                  label={isSubmitting ? 'Guardando...' : 'Guardar Cliente'}
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full md:w-auto px-10"
                />
              </div>
            </Panel>
          </div>
        </div>
      )}
    </div>
  )
}

function ClientDetailPanel({
  client,
  onEdit,
}: {
  client: Client | null
  onEdit: (c: Client) => void
}) {
  if (!client) {
    return (
      <p
        className="text-xs py-8 text-center"
        style={{ color: 'rgba(12,8,41,0.6)' }}
      >
        Selecciona un cliente de la tabla para ver sus detalles
      </p>
    )
  }

  const currencyLabel = `${client.currency.name} (${client.currency.symbol})`

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <h3
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: 'rgba(12,8,41,0.5)' }}
        >
          Datos Personales
        </h3>
        <div className="space-y-2">
          <InlineDisplay label="Nombre" value={client.name} />
          <InlineDisplay label="Apellidos" value={client.lastname} />
          <InlineDisplay label="DNI" value={client.dni} />
          <InlineDisplay label="Edad" value={String(client.age)} />
          <InlineDisplay label="Correo" value={client.email} />
          <InlineDisplay
            label="Teléfono"
            value={client.phoneNumber ?? '—'}
          />
        </div>
        <div className="pt-1 flex items-center gap-3">
          <input
            type="checkbox"
            checked={client.ownsProperty}
            readOnly
            className="h-4 w-4 rounded border-[rgba(12,8,41,0.2)] accent-[#E5A845]"
          />
          <span
            className="text-[11px] font-medium"
            style={{ color: 'rgba(12,8,41,0.8)' }}
          >
            Posee propiedades
          </span>
        </div>
      </div>

      <hr className="border-t border-white/50" />

      <div className="space-y-3">
        <h3
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: 'rgba(12,8,41,0.5)' }}
        >
          Perfil Financiero
        </h3>
        <div className="space-y-2">
          <InlineDisplay
            label="Historial"
            value={CREDIT_HISTORY_LABELS[client.creditHistory] ?? '—'}
          />
          <InlineDisplay label="Moneda" value={currencyLabel} />
          <InlineDisplay label="Salario" value={String(client.salary)} />
          <InlineDisplay label="Ingr. Familiar" value={String(client.familyIncome)} />
        </div>
      </div>

      <hr className="border-t border-white/50" />

      <div className="space-y-3">
        <h3
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: 'rgba(12,8,41,0.5)' }}
        >
          Solicitudes
        </h3>
        <div className="space-y-2">
          <p
            className="text-[11px] py-2"
            style={{ color: 'rgba(12,8,41,0.6)' }}
          >
            Sin solicitudes (próximamente)
          </p>
          <SecondaryOutlineButton label="Nueva simulación" />
        </div>
      </div>

      <div className="pt-2">
        <PrimaryBarButton
          label="Editar cliente"
          onClick={() => onEdit(client)}
          className="w-full"
        />
      </div>
    </div>
  )
}

/* ================= COMPONENTES SECUNDARIOS ================= */

type PanelProps = {
  title?: string
  variant: 'pink' | 'orange' | 'yellow' | 'modal'
  children: React.ReactNode
}

function Panel({ title, variant, children }: PanelProps) {
  let background = ''
  if (variant === 'pink') {
    background =
      'linear-gradient(145deg, rgba(244,167,160,0.3) 0%, rgba(255,240,225,0.7) 100%)'
  } else if (variant === 'yellow') {
    background =
      'linear-gradient(145deg, rgba(255,213,99,0.25) 0%, rgba(255,240,225,0.7) 100%)'
  } else if (variant === 'orange') {
    background =
      'linear-gradient(145deg, rgba(255,132,0,0.15) 0%, rgba(255,240,225,0.7) 100%)'
  } else if (variant === 'modal') {
    background =
      'linear-gradient(145deg, rgba(235,195,185,0.8) 0%, rgba(253,235,218,0.95) 100%)'
  }

  return (
    <section
      className="rounded-[24px] border border-white/70 px-6 py-6 shadow-[0_18px_45px_rgba(12,8,41,0.08)] backdrop-blur-xl relative"
      style={{ background }}
    >
      {title && (
        <h2
          className="mb-4 text-sm font-bold tracking-tight"
          style={{ color: miimboColors.brand.midnight }}
        >
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
  value: string
  onChange: (value: string) => void
}

function Input({ label, type = 'text', placeholder, value, onChange }: InputProps) {
  return (
    <label
      className="flex flex-col gap-1.5 text-xs font-medium"
      style={{ color: 'rgba(12,8,41,0.8)' }}
    >
      {label}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border bg-white/80 px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-[rgba(255,132,0,0.5)] focus:border-transparent transition-all shadow-sm"
        style={{
          borderColor: 'rgba(255,255,255,0.9)',
          color: 'rgba(12,8,41,0.9)',
        }}
      />
    </label>
  )
}

type SelectProps = {
  label: string
  value: number
  onChange: (value: number) => void
  options: { value: number; label: string }[]
}

function Select({ label, value, onChange, options }: SelectProps) {
  return (
    <label
      className="flex flex-col gap-1.5 text-xs font-medium"
      style={{ color: 'rgba(12,8,41,0.8)' }}
    >
      {label}
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-xl border bg-white/80 px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-[rgba(255,132,0,0.5)] focus:border-transparent appearance-none shadow-sm"
        style={{
          borderColor: 'rgba(255,255,255,0.9)',
          color: 'rgba(12,8,41,0.9)',
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function InlineDisplay({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[1fr_1.5fr] items-center gap-2 text-[11px]">
      <span style={{ color: 'rgba(12,8,41,0.65)' }}>{label}</span>
      <div
        className="rounded-lg border bg-white/60 px-3 py-1.5 font-medium text-xs backdrop-blur-sm"
        style={{
          borderColor: 'rgba(255,255,255,0.7)',
          color: 'rgba(12,8,41,0.9)',
        }}
      >
        {value}
      </div>
    </div>
  )
}

type PrimaryBarButtonProps = {
  label: string
  onClick?: () => void
  disabled?: boolean
  className?: string
}

function PrimaryBarButton({
  label,
  onClick,
  disabled = false,
  className = 'w-full',
}: PrimaryBarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full text-xs font-bold tracking-wide py-2.5 transition-transform hover:scale-[1.01] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 ${className}`}
      style={{
        background:
          'linear-gradient(145deg, rgba(244,167,160,0.9) 0%, rgba(249,198,181,0.9) 100%)',
        color: '#FFFFFF',
        boxShadow: '0 8px 20px rgba(226,164,153,0.35)',
      }}
    >
      {label}
    </button>
  )
}

function SecondaryOutlineButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="w-full rounded-full text-xs font-bold tracking-wide py-2 transition-colors hover:bg-white/40"
      style={{
        border: '1px solid rgba(255,132,0,0.5)',
        color: miimboColors.brand.sunrise,
        backgroundColor: 'rgba(255,255,255,0.3)',
      }}
    >
      {label}
    </button>
  )
}

function ClientsTable({
  clients,
  isLoading,
  selectedId,
  onSelect,
}: {
  clients: Client[]
  isLoading: boolean
  selectedId: number | null
  onSelect: (c: Client) => void
}) {
  if (isLoading) {
    return (
      <div
        className="rounded-2xl border border-white/70 shadow-[0_18px_45px_rgba(12,8,41,0.08)] backdrop-blur-xl p-8 text-center"
        style={{
          background:
            'linear-gradient(145deg, rgba(255,132,0,0.15) 0%, rgba(255,240,225,0.7) 100%)',
        }}
      >
        <p
          className="text-xs"
          style={{ color: 'rgba(12,8,41,0.6)' }}
        >
          Cargando clientes...
        </p>
      </div>
    )
  }

  return (
    <div
      className="overflow-hidden rounded-2xl border border-white/70 shadow-[0_18px_45px_rgba(12,8,41,0.08)] backdrop-blur-xl h-full"
      style={{
        background:
          'linear-gradient(145deg, rgba(255,132,0,0.15) 0%, rgba(255,240,225,0.7) 100%)',
      }}
    >
      <table className="w-full border-collapse text-xs">
        <thead
          className="text-[10px] font-bold tracking-wider uppercase border-b border-white/40"
          style={{
            backgroundColor: 'rgba(255,132,0,0.15)',
            color: miimboColors.brand.midnight,
          }}
        >
          <tr>
            <th className="px-5 py-3.5 text-left">Nombre Completo</th>
            <th className="px-5 py-3.5 text-left">DNI</th>
            <th className="px-5 py-3.5 text-left">Correo Electrónico</th>
            <th className="px-5 py-3.5 text-left">Teléfono</th>
            <th className="px-5 py-3.5 text-center">Detalles</th>
          </tr>
        </thead>
        <tbody>
          {clients.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                className="px-5 py-8 text-center"
                style={{ color: 'rgba(12,8,41,0.6)' }}
              >
                No hay clientes. Crea el primero.
              </td>
            </tr>
          ) : (
            clients.map((c) => (
              <tr
                key={c.id}
                className={`border-b border-white/20 last:border-0 hover:bg-white/20 transition-colors ${
                  selectedId === c.id ? 'bg-white/30' : ''
                }`}
                style={{ color: 'rgba(12,8,41,0.85)' }}
              >
                <td className="px-5 py-3 font-medium">
                  {c.name} {c.lastname}
                </td>
                <td className="px-5 py-3">{c.dni}</td>
                <td className="px-5 py-3">{c.email}</td>
                <td className="px-5 py-3">{c.phoneNumber ?? '—'}</td>
                <td className="px-5 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => onSelect(c)}
                    className="text-[11px] font-bold underline"
                    style={{ color: miimboColors.brand.sunrise }}
                  >
                    Mostrar
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
