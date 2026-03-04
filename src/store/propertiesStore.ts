import { create } from 'zustand'
import type { Property } from '../services/propertiesApi'

type PropertiesState = {
  properties: Property[]
  isLoading: boolean
  error: string | null
  setProperties: (properties: Property[]) => void
  addProperty: (property: Property) => void
  updateProperty: (property: Property) => void
  setIsLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  clear: () => void
}

export const usePropertiesStore = create<PropertiesState>((set) => ({
  properties: [],
  isLoading: false,
  error: null,
  setProperties: (properties) => set({ properties, error: null }),
  addProperty: (property) =>
    set((state) => ({ properties: [property, ...state.properties], error: null })),
  updateProperty: (property) =>
    set((state) => ({
      properties: state.properties.map((p) => (p.id === property.id ? property : p)),
      error: null,
    })),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clear: () => set({ properties: [], isLoading: false, error: null }),
}))
