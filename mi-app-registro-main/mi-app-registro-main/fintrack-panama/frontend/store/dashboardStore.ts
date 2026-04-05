'use client';
import { create } from 'zustand';
import type { DashboardData } from '@/types';

interface DashboardState {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  setData: (data: DashboardData) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  data: null,
  isLoading: false,
  error: null,
  setData: (data) => set({ data, isLoading: false, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
}));
