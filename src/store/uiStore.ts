import { create } from 'zustand';

export type Theme = 'dark' | 'light';

interface UiState {
  theme: Theme;
  toggleTheme: () => void;
}

const initial = ((): Theme => {
  const saved = localStorage.getItem('bb-theme');
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
})();

document.documentElement.dataset.theme = initial;

export const useUiStore = create<UiState>((set, get) => ({
  theme: initial,
  toggleTheme: () => {
    const theme: Theme = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('bb-theme', theme);
    document.documentElement.dataset.theme = theme;
    set({ theme });
  },
}));
