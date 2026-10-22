import { Injectable, signal, effect } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly storageKey = 'taskflow_theme_mode';
  private mediaQuery: MediaQueryList | null =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null;

  // Signal pour le mode sélectionné par l'utilisateur
  public readonly mode = signal<ThemeMode>(this.getInitialMode());

  // Signal indiquant si le thème sombre est actuellement actif (booléen)
  public readonly isDark = signal<boolean>(this.checkIsDark(this.getInitialMode()));

  constructor() {
    // Écouter les changements système
    if (this.mediaQuery?.addEventListener) {
      this.mediaQuery.addEventListener('change', (e) => {
        if (this.mode() === 'system') {
          this.applyTheme(e.matches);
        }
      });
    }

    // Appliquer le thème initial
    this.applyTheme(this.isDark());
  }

  private getInitialMode(): ThemeMode {
    if (typeof localStorage === 'undefined') return 'system';
    const saved = localStorage.getItem(this.storageKey) as ThemeMode | null;
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
    return 'system'; // Par défaut : thème du système
  }

  private checkIsDark(mode: ThemeMode): boolean {
    if (mode === 'dark') return true;
    if (mode === 'light') return false;
    return this.mediaQuery ? this.mediaQuery.matches : false;
  }

  public setMode(newMode: ThemeMode) {
    this.mode.set(newMode);
    localStorage.setItem(this.storageKey, newMode);
    const dark = this.checkIsDark(newMode);
    this.applyTheme(dark);
  }

  public toggle() {
    // Cycle : system -> light -> dark -> system
    const current = this.mode();
    if (current === 'system') {
      this.setMode(this.isDark() ? 'light' : 'dark');
    } else if (current === 'light') {
      this.setMode('dark');
    } else {
      this.setMode('system');
    }
  }

  private applyTheme(isDark: boolean) {
    this.isDark.set(isDark);
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
}
