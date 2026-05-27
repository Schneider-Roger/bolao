import axios from 'axios';

export const BASE_URL = import.meta.env.VITE_BASE_URL || window.location.origin;

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || `${BASE_URL}/wp-json/bolao/v1`,
  withCredentials: true, // For HTTPOnly cookies
});

import { useAuthStore } from '../stores/authStore';

// Interceptor para tratar respostas 401 (Não Autorizado)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
