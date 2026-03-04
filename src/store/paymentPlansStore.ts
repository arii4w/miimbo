import { create } from 'zustand'
import type { PaymentPlan } from '../services/paymentPlansApi'

type PaymentPlansState = {
  plans: PaymentPlan[]
  selectedPlan: PaymentPlan | null
  isLoading: boolean
  error: string | null
  setPlans: (plans: PaymentPlan[]) => void
  setSelectedPlan: (plan: PaymentPlan | null) => void
  addPlan: (plan: PaymentPlan) => void
  updatePlanInList: (plan: PaymentPlan) => void
  setIsLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  clear: () => void
}

export const usePaymentPlansStore = create<PaymentPlansState>((set) => ({
  plans: [],
  selectedPlan: null,
  isLoading: false,
  error: null,
  setPlans: (plans) => set({ plans, error: null }),
  setSelectedPlan: (selectedPlan) => set({ selectedPlan }),
  addPlan: (plan) =>
    set((state) => ({ plans: [plan, ...state.plans], error: null })),
  updatePlanInList: (plan) =>
    set((state) => ({
      plans: state.plans.map((p) => (p.id === plan.id ? plan : p)),
      selectedPlan: state.selectedPlan?.id === plan.id ? plan : state.selectedPlan,
      error: null,
    })),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clear: () =>
    set({
      plans: [],
      selectedPlan: null,
      isLoading: false,
      error: null,
    }),
}))
