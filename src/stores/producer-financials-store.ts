import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

// Define a interface para os nossos dados e ações
interface FinancialState {
  financialData: any | null;
  isLoading: boolean;
  fetchFinancialData: () => Promise<void>;
  clearFinancialData: () => void;
}

export const useProducerFinancialsStore = create<FinancialState>((set, get) => ({
  financialData: null,
  isLoading: false,
  fetchFinancialData: async () => {
    // Evita múltiplas chamadas simultâneas
    if (get().isLoading) return;
    
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.functions.invoke('get-producer-dashboard-v2', {
        body: { 
          date_filter: "last_30_days",
          product_id: null
        }
      });
      if (error) throw error;
      set({ financialData: data, isLoading: false });
    } catch (error) {
      console.error("Erro ao buscar dados financeiros:", error);
      set({ isLoading: false, financialData: null });
    }
  },
  clearFinancialData: () => set({ financialData: null, isLoading: false })
}));

// Store não executa automaticamente - será chamado apenas quando necessário