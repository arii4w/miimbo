import { create } from 'zustand'
import type { Client } from '../services/clientsApi'

type ClientsState = {
  clients: Client[]
  isLoading: boolean
  error: string | null
  setClients: (clients: Client[]) => void
  addClient: (client: Client) => void
  updateClient: (client: Client) => void
  setIsLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  clear: () => void
}

export const useClientsStore = create<ClientsState>((set) => ({
  clients: [],
  isLoading: false,
  error: null,
  setClients: (clients) => set({ clients, error: null }),
  addClient: (client) =>
    set((state) => ({ clients: [client, ...state.clients], error: null })),
  updateClient: (client) =>
    set((state) => ({
      clients: state.clients.map((c) => (c.id === client.id ? client : c)),
      error: null,
    })),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clear: () => set({ clients: [], isLoading: false, error: null }),
}))
