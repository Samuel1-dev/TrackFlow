import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: false,
  template: `
    <div class="min-h-screen w-full flex items-center justify-center p-4 bg-[#f4f7fb] dark:bg-surface-dark transition-colors">
      <div class="w-full max-w-md bg-white dark:bg-surface-cardDark rounded-3xl p-8 shadow-card border border-slate-100 dark:border-slate-800 space-y-6">
        <!-- Logo -->
        <div class="text-center space-y-2">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white flex items-center justify-center mx-auto shadow-md shadow-brand-500/20">
            <app-icon name="dashboard" [size]="24"></app-icon>
          </div>
          <h1 class="text-2xl font-black text-slate-900 dark:text-white">Créer un compte TaskFlow</h1>
          <p class="text-xs text-slate-400">Rejoignez-nous pour gérer votre temps et votre argent</p>
        </div>

        @if (errorMessage) {
          <div class="p-3.5 rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
            <app-icon name="alert" [size]="14"></app-icon>
            <span>{{ errorMessage }}</span>
          </div>
        }

        <form (ngSubmit)="onSubmit()" class="space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Prénom</label>
              <input
                type="text"
                [(ngModel)]="firstName"
                name="firstName"
                required
                placeholder="Ayesha"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Nom</label>
              <input
                type="text"
                [(ngModel)]="lastName"
                name="lastName"
                required
                placeholder="Rahman"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Email</label>
            <input
              type="email"
              [(ngModel)]="email"
              name="email"
              required
              placeholder="votre@email.com"
              class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Mot de passe (min 6 caractères)</label>
            <input
              type="password"
              [(ngModel)]="password"
              name="password"
              required
              minlength="6"
              placeholder="••••••••"
              class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Devise</label>
              <select
                [(ngModel)]="currency"
                name="currency"
                class="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
              >
                <option value="XOF">FCFA (XOF)</option>
                <option value="EUR">Euro (€)</option>
                <option value="USD">Dollar ($)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Fuseau horaire</label>
              <input
                type="text"
                [(ngModel)]="timezone"
                name="timezone"
                placeholder="Africa/Porto-Novo"
                class="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            [disabled]="loading"
            class="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md shadow-brand-500/25 transition-all disabled:opacity-50"
          >
            {{ loading ? 'Création en cours...' : 'Créer mon compte' }}
          </button>
        </form>

        <div class="text-center text-xs text-slate-500 dark:text-slate-400">
          Déjà inscrit ?
          <a routerLink="/auth/login" class="font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 ml-1">
            Se connecter
          </a>
        </div>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  firstName = '';
  lastName = '';
  email = '';
  password = '';
  currency = 'XOF';
  timezone = 'Africa/Porto-Novo';
  errorMessage = '';
  loading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  onSubmit() {
    if (!this.email || !this.password || !this.firstName || !this.lastName) return;
    this.loading = true;
    this.errorMessage = '';

    this.authService
      .register({
        firstName: this.firstName,
        lastName: this.lastName,
        email: this.email,
        password: this.password,
        currency: this.currency,
        timezone: this.timezone,
      })
      .subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err.error?.message || "Erreur lors de l'inscription";
        },
      });
  }
}
