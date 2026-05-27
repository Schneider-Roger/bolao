import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Colaborador {
  id: number;
  nome: string;
  apelido?: string;
  selecao_favorita?: string;
  foto_perfil?: string;
  codigo_funcionario?: string;
  setor?: string;
  unidade?: string;
  email_corporativo?: string;
  role?: string;
}

interface AuthState {
  user: Colaborador | null;
  isAuthenticated: boolean;
  login: (user: Colaborador) => void;
  logout: () => void;
  setPrimeiroAcessoCompleto: (userUpdates: Partial<Colaborador>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      login: (user) => {
        set({ user, isAuthenticated: true });
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
      },

      setPrimeiroAcessoCompleto: (userUpdates) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userUpdates } : null,
        }));
      },
    }),
    {
      name: 'auth-storage', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
    }
  )
);
