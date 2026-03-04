import { create } from 'zustand'

export type Bono = {
  id: number
  name: string
}

export type Currency = {
  id: number
  name: string
  symbol: string
}

export type PropertyType = {
  id: number
  name: string
}

export type PriceRangeBBP = {
  id: number
  lowerPrice: number
  higherPrice: number
  bonusAmount: number
  idBono: number
}

export type PriceRangeBFH = {
  id: number
  higherPrice: number
  bonusAmount: number
  minimumSavings: number | null
  maximumSavings: number | null
  idBono: number
}

export type ReferenceData = {
  bonos: Bono[]
  currencies: Currency[]
  propertyTypes: PropertyType[]
  priceRangesBBP: PriceRangeBBP[]
  priceRangesBFH: PriceRangeBFH[]
}

type ReferenceState = ReferenceData & {
  isLoading: boolean
  error: string | null
  hasLoaded: boolean
  setAll: (data: ReferenceData) => void
  setIsLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  clear: () => void
}

const initialData: ReferenceData = {
  bonos: [],
  currencies: [],
  propertyTypes: [],
  priceRangesBBP: [],
  priceRangesBFH: [],
}

export const useReferenceStore = create<ReferenceState>((set) => ({
  ...initialData,
  isLoading: false,
  error: null,
  hasLoaded: false,
  setAll: (data) => {
    console.log('[MIIMBO] [REF] setAll: catálogos guardados', {
      bonos: data.bonos.length,
      currencies: data.currencies.length,
      propertyTypes: data.propertyTypes.length,
      priceRangesBBP: data.priceRangesBBP.length,
      priceRangesBFH: data.priceRangesBFH.length,
    })
    set({ ...data, error: null, hasLoaded: true })
  },
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clear: () => {
    console.log('[MIIMBO] [REF] clear: catálogos limpiados')
    set({ ...initialData, isLoading: false, error: null, hasLoaded: false })
  },
}))

