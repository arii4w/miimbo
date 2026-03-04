import { useEffect, useState } from 'react'
import { miimboColors } from '../theme/colors'
import { useAuthStore } from '../store/authStore'
import { useReferenceStore } from '../store/referenceStore'
import { usePropertiesStore } from '../store/propertiesStore'
import {
  type Property,
  type CreatePropertyRequest,
  type UpdatePropertyRequest,
  fetchProperties,
  createProperty,
  updateProperty,
} from '../services/propertiesApi'

const emptyForm = {
  name: '',
  code: '',
  idPropertyType: 1,
  totalPropertyPrice: '',
  propertyPrice: '',
  numberDepartments: '',
  idCurrency: 1,
  address: '',
  district: '',
  province: '',
  totalArea: '',
}

function formatPrice(value: number, symbol: string): string {
  return `${symbol} ${value.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`
}

export function Properties() {
  const user = useAuthStore((s) => s.user)
  const propertyTypes = useReferenceStore((s) => s.propertyTypes)
  const currencies = useReferenceStore((s) => s.currencies)
  const properties = usePropertiesStore((s) => s.properties)
  const isLoading = usePropertiesStore((s) => s.isLoading)
  const error = usePropertiesStore((s) => s.error)
  const setProperties = usePropertiesStore((s) => s.setProperties)
  const addProperty = usePropertiesStore((s) => s.addProperty)
  const updatePropertyInStore = usePropertiesStore((s) => s.updateProperty)
  const setIsLoading = usePropertiesStore((s) => s.setIsLoading)
  const setError = usePropertiesStore((s) => s.setError)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [formData, setFormData] = useState(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadProperties = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchProperties()
      setProperties([...data].reverse())
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadProperties()
  }, [])

  const openCreateModal = () => {
    setModalMode('create')
    setSelectedProperty(null)
    setFormData({
      ...emptyForm,
      idPropertyType: propertyTypes[0]?.id ?? 1,
      idCurrency: currencies[0]?.id ?? 1,
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  const openEditModal = (property: Property) => {
    setModalMode('edit')
    setSelectedProperty(property)
    setFormData({
      name: property.name,
      code: property.code,
      idPropertyType: property.idPropertyType,
      totalPropertyPrice: String(property.totalPropertyPrice),
      propertyPrice: property.propertyPrice != null ? String(property.propertyPrice) : '',
      numberDepartments: property.numberDepartments != null ? String(property.numberDepartments) : '',
      idCurrency: property.idCurrency,
      address: property.address,
      district: property.district,
      province: property.province,
      totalArea: String(property.totalArea),
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedProperty(null)
    setFormError(null)
  }

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setFormError('El nombre es obligatorio')
      return false
    }
    if (!formData.code.trim()) {
      setFormError('El código es obligatorio')
      return false
    }
    const totalPrice = Number(formData.totalPropertyPrice)
    if (!formData.totalPropertyPrice || isNaN(totalPrice) || totalPrice < 0) {
      setFormError('Precio de venta inválido')
      return false
    }
    const totalArea = Number(formData.totalArea)
    if (!formData.totalArea || isNaN(totalArea) || totalArea <= 0) {
      setFormError('Área total inválida')
      return false
    }
    if (!formData.address.trim()) {
      setFormError('La dirección es obligatoria')
      return false
    }
    if (!formData.district.trim()) {
      setFormError('El distrito es obligatorio')
      return false
    }
    if (!formData.province.trim()) {
      setFormError('La provincia es obligatoria')
      return false
    }
    const propPrice = formData.propertyPrice ? Number(formData.propertyPrice) : null
    const numDepts = formData.numberDepartments ? Number(formData.numberDepartments) : null
    if (propPrice !== null && (isNaN(propPrice) || propPrice < 0)) {
      setFormError('Precio del departamento inválido')
      return false
    }
    if (numDepts !== null && (isNaN(numDepts) || numDepts < 0 || !Number.isInteger(numDepts))) {
      setFormError('Número de departamentos inválido')
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
        const payload: CreatePropertyRequest = {
          name: formData.name.trim(),
          code: formData.code.trim(),
          idPropertyType: formData.idPropertyType,
          totalPropertyPrice: Number(formData.totalPropertyPrice),
          propertyPrice: formData.propertyPrice ? Number(formData.propertyPrice) : null,
          numberDepartments: formData.numberDepartments ? Number(formData.numberDepartments) : null,
          idCurrency: formData.idCurrency,
          address: formData.address.trim(),
          district: formData.district.trim(),
          province: formData.province.trim(),
          totalArea: Number(formData.totalArea),
          createdBy: user.id,
        }
        const created = await createProperty(payload)
        addProperty(created)
        closeModal()
      } else if (selectedProperty) {
        const payload: UpdatePropertyRequest = {
          name: formData.name.trim(),
          code: formData.code.trim(),
          idPropertyType: formData.idPropertyType,
          totalPropertyPrice: Number(formData.totalPropertyPrice),
          propertyPrice: formData.propertyPrice ? Number(formData.propertyPrice) : null,
          numberDepartments: formData.numberDepartments ? Number(formData.numberDepartments) : null,
          idCurrency: formData.idCurrency,
          address: formData.address.trim(),
          district: formData.district.trim(),
          province: formData.province.trim(),
          totalArea: Number(formData.totalArea),
          updatedBy: user.id,
        }
        const updated = await updateProperty(selectedProperty.id, payload)
        updatePropertyInStore(updated)
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
        <h1
          className="text-xl font-bold tracking-tight"
          style={{ color: miimboColors.brand.midnight }}
        >
          Inmuebles
        </h1>
        <PrimaryBarButton
          label="+ Nuevo Inmueble"
          onClick={openCreateModal}
          className="w-auto px-8 py-2.5"
        />
      </header>

      {error && (
        <div className="rounded-xl border border-red-200/70 bg-red-50/90 px-4 py-2.5 text-xs text-red-700">
          {error}
        </div>
      )}

      <section className="space-y-6">
        {isLoading ? (
          <p className="text-xs py-8 text-center" style={{ color: 'rgba(12,8,41,0.6)' }}>
            Cargando inmuebles...
          </p>
        ) : properties.length === 0 ? (
          <p className="text-xs py-8 text-center" style={{ color: 'rgba(12,8,41,0.6)' }}>
            No hay inmuebles. Crea el primero.
          </p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {properties.map((p) => (
              <PropertyCard key={p.id} property={p} onEdit={openEditModal} />
            ))}
          </div>
        )}
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-[#FFF0E1]/70 backdrop-blur-md transition-opacity"
            onClick={closeModal}
          />

          <div className="relative w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-[24px] shadow-2xl animate-in fade-in zoom-in duration-200">
            <Panel
              variant="modal"
              title={modalMode === 'create' ? 'Crear Inmueble' : 'Editar Inmueble'}
            >
              <button
                onClick={closeModal}
                className="absolute right-6 top-6 flex h-7 w-7 items-center justify-center rounded-full bg-white text-[rgba(12,8,41,0.8)] hover:bg-white/80 transition-colors shadow-sm font-bold text-xs"
              >
                ✕
              </button>

              <div className="mt-2 space-y-4">
                {formError && (
                  <div className="rounded-xl border border-red-200/70 bg-red-50/90 px-4 py-2.5 text-xs text-red-700">
                    {formError}
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Input
                    label="Nombre del Proyecto"
                    placeholder="Nombre"
                    value={formData.name}
                    onChange={(v) => setFormData((p) => ({ ...p, name: v }))}
                  />
                  <Input
                    label="Código"
                    placeholder="Código"
                    value={formData.code}
                    onChange={(v) => setFormData((p) => ({ ...p, code: v }))}
                  />
                  <Select
                    label="Tipo de inmueble"
                    value={formData.idPropertyType}
                    onChange={(v) => setFormData((p) => ({ ...p, idPropertyType: v }))}
                    options={propertyTypes.map((t) => ({ value: t.id, label: t.name }))}
                  />

                  <Input
                    label="Dirección"
                    placeholder="Dirección"
                    value={formData.address}
                    onChange={(v) => setFormData((p) => ({ ...p, address: v }))}
                  />
                  <Input
                    label="Provincia"
                    placeholder="Provincia"
                    value={formData.province}
                    onChange={(v) => setFormData((p) => ({ ...p, province: v }))}
                  />
                  <Input
                    label="Distrito"
                    placeholder="Distrito"
                    value={formData.district}
                    onChange={(v) => setFormData((p) => ({ ...p, district: v }))}
                  />

                  <Select
                    label="Moneda"
                    value={formData.idCurrency}
                    onChange={(v) => setFormData((p) => ({ ...p, idCurrency: v }))}
                    options={currencies.map((c) => ({
                      value: c.id,
                      label: `${c.name} (${c.symbol})`,
                    }))}
                  />
                  <Input
                    label="Precio de venta (total)"
                    type="number"
                    placeholder="Monto total"
                    value={formData.totalPropertyPrice}
                    onChange={(v) => setFormData((p) => ({ ...p, totalPropertyPrice: v }))}
                  />
                  <Input
                    label="Área total (m²)"
                    type="number"
                    placeholder="Área"
                    value={formData.totalArea}
                    onChange={(v) => setFormData((p) => ({ ...p, totalArea: v }))}
                  />

                  <Input
                    label="Precio departamento (opcional)"
                    type="number"
                    placeholder="Monto"
                    value={formData.propertyPrice}
                    onChange={(v) => setFormData((p) => ({ ...p, propertyPrice: v }))}
                  />
                  <Input
                    label="Nº departamentos (opcional)"
                    type="number"
                    placeholder="Cantidad"
                    value={formData.numberDepartments}
                    onChange={(v) =>
                      setFormData((p) => ({
                        ...p,
                        numberDepartments: v.replace(/\D/g, ''),
                      }))
                    }
                  />
                </div>
              </div>

              <div className="mt-7 flex justify-end">
                <PrimaryBarButton
                  label={isSubmitting ? 'Guardando...' : 'Guardar Inmueble'}
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

/* ================= COMPONENTES SECUNDARIOS ================= */

type PanelProps = {
  title?: string
  variant: 'modal' | 'yellow'
  children: React.ReactNode
}

function Panel({ title, variant, children }: PanelProps) {
  const background =
    variant === 'modal'
      ? 'linear-gradient(145deg, rgba(235,195,185,0.8) 0%, rgba(253,235,218,0.95) 100%)'
      : 'linear-gradient(145deg, rgba(255,213,99,0.25) 0%, rgba(255,240,225,0.7) 100%)'

  return (
    <section
      className="rounded-[24px] border border-white/70 px-6 py-6 shadow-[0_18px_45px_rgba(12,8,41,0.08)] backdrop-blur-xl relative"
      style={{ background }}
    >
      {title && (
        <h2
          className="mb-5 text-sm font-bold tracking-tight"
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
        className="rounded-xl border bg-white/90 px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-[rgba(255,132,0,0.5)] focus:border-transparent transition-all shadow-sm"
        style={{ borderColor: 'rgba(255,255,255,1)', color: 'rgba(12,8,41,0.9)' }}
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
        className="rounded-xl border bg-white/90 px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-[rgba(255,132,0,0.5)] focus:border-transparent appearance-none shadow-sm"
        style={{ borderColor: 'rgba(255,255,255,1)', color: 'rgba(12,8,41,0.9)' }}
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
      className={`rounded-full text-xs font-bold tracking-wide py-2.5 transition-transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 ${className}`}
      style={{
        background:
          'linear-gradient(145deg, rgba(230,150,140,0.95) 0%, rgba(245,185,170,0.95) 100%)',
        color: '#FFFFFF',
        boxShadow: '0 8px 20px rgba(226,164,153,0.35)',
      }}
    >
      {label}
    </button>
  )
}

function PropertyCard({ property, onEdit }: { property: Property; onEdit: (p: Property) => void }) {
  const symbol = property.currency.symbol
  const costPerM2 =
    property.totalArea > 0
      ? property.totalPropertyPrice / property.totalArea
      : 0

  return (
    <article
      className="flex flex-col justify-between rounded-[24px] border border-white/70 px-5 py-5 text-xs shadow-[0_18px_45px_rgba(12,8,41,0.08)] backdrop-blur-xl transition-transform hover:scale-[1.02]"
      style={{
        background:
          'linear-gradient(145deg, rgba(255,213,99,0.25) 0%, rgba(255,240,225,0.7) 100%)',
      }}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-white/40 pb-3">
          <p className="font-bold text-sm" style={{ color: '#D98A36' }}>
            {property.name}
          </p>
          <p className="text-[10px] font-medium" style={{ color: 'rgba(12,8,41,0.6)' }}>
            Código: {property.code}
          </p>
        </div>

        <div className="space-y-1.5 text-[11px] bg-white/40 p-3 rounded-xl border border-white/50">
          <p style={{ color: 'rgba(12,8,41,0.8)' }}>
            <span className="font-medium opacity-70">Dirección:</span> {property.address}
          </p>
          <p style={{ color: 'rgba(12,8,41,0.8)' }}>
            <span className="font-medium opacity-70">Distrito:</span> {property.district}
          </p>
          <p style={{ color: 'rgba(12,8,41,0.8)' }}>
            <span className="font-medium opacity-70">Provincia:</span> {property.province}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-2 text-[11px]">
        <div className="flex justify-between items-center">
          <span className="font-bold" style={{ color: '#D98A36' }}>
            Precio del Inmueble
          </span>
          <span className="font-medium" style={{ color: 'rgba(12,8,41,0.9)' }}>
            {formatPrice(property.totalPropertyPrice, symbol)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-bold" style={{ color: '#D98A36' }}>
            Costo por m²
          </span>
          <span className="font-medium" style={{ color: 'rgba(12,8,41,0.9)' }}>
            {formatPrice(costPerM2, symbol)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-bold" style={{ color: '#D98A36' }}>
            Área total
          </span>
          <span className="font-medium" style={{ color: 'rgba(12,8,41,0.9)' }}>
            {property.totalArea} m²
          </span>
        </div>
      </div>

      <div className="mt-4">
        <PrimaryBarButton
          label="Editar"
          onClick={() => onEdit(property)}
          className="w-full"
        />
      </div>
    </article>
  )
}
