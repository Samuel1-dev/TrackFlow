import { ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

export type LoginStep =
  | 'login'
  | 'forgot-email'
  | 'forgot-sent'
  | 'forgot-code'
  | 'forgot-reset';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnDestroy {
  step: LoginStep = 'login';

  // Login fields
  email = '';
  password = '';
  showPassword = false;

  // Forgot password fields
  resetEmail = '';
  resetCode = '';
  newPassword = '';
  confirmPassword = '';
  showNewPassword = false;
  showConfirmPassword = false;

  // Feedback & states
  errorMessage = '';
  successMessage = '';
  loading = false;

  // Timers
  sentCountdown = 5;
  private sentTimer: any = null;

  timeLeft = 60;
  private resendTimer: any = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnDestroy(): void {
    this.clearSentTimer();
    this.clearResendTimer();
  }

  // ─── Toggles de visibilité des mots de passe ────────────────────────────

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
    this.cdr.detectChanges();
  }

  toggleNewPasswordVisibility(): void {
    this.showNewPassword = !this.showNewPassword;
    this.cdr.detectChanges();
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
    this.cdr.detectChanges();
  }

  // ─── Connexion classique ────────────────────────────────────────────────

  onSubmit(): void {
    if (!this.email || !this.password) return;
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService
      .login({ email: this.email.trim(), password: this.password })
      .subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/dashboard']);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage =
            err.error?.message || 'Identifiants invalides ou mot de passe incorrect';
          this.cdr.detectChanges();
        },
      });
  }

  // ─── Flux Mot de passe oublié ───────────────────────────────────────────

  openForgotPassword(): void {
    this.clearSentTimer();
    this.clearResendTimer();
    this.step = 'forgot-email';
    this.resetEmail = this.email;
    this.resetCode = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();
  }

  backToLogin(): void {
    this.clearSentTimer();
    this.clearResendTimer();
    this.step = 'login';
    this.errorMessage = '';
    this.cdr.detectChanges();
  }

  onSendResetOtp(): void {
    if (!this.resetEmail || !this.resetEmail.trim()) {
      this.errorMessage = 'Veuillez saisir votre adresse email';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.sendPasswordResetOtp(this.resetEmail.trim()).subscribe({
      next: () => {
        this.loading = false;
        this.step = 'forgot-sent';
        this.sentCountdown = 5;
        this.cdr.detectChanges();
        this.startSentCountdown();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage =
          err.error?.message || "Erreur lors de l'envoi du code de réinitialisation";
        this.cdr.detectChanges();
      },
    });
  }

  private startSentCountdown(): void {
    this.clearSentTimer();
    this.sentTimer = setInterval(() => {
      this.sentCountdown--;
      if (this.sentCountdown <= 0) {
        this.clearSentTimer();
        this.goToCodeStep();
      }
      this.cdr.detectChanges();
    }, 1000);
  }

  goToCodeStep(): void {
    this.clearSentTimer();
    this.step = 'forgot-code';
    this.resetCode = '';
    this.errorMessage = '';
    this.successMessage = '';
    this.startResendCountdown(60);
    this.cdr.detectChanges();
  }

  private startResendCountdown(seconds: number = 60): void {
    this.clearResendTimer();
    this.timeLeft = seconds;
    this.resendTimer = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
      } else {
        this.clearResendTimer();
      }
      this.cdr.detectChanges();
    }, 1000);
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  resendResetCode(): void {
    if (this.timeLeft > 0 || this.loading) return;
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.sendPasswordResetOtp(this.resetEmail.trim()).subscribe({
      next: () => {
        this.loading = false;
        this.resetCode = '';
        this.successMessage = 'Un nouveau code a été envoyé à votre adresse email.';
        this.startResendCountdown(60);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage =
          err.error?.message || "Erreur lors de l'envoi du code de réinitialisation";
        this.cdr.detectChanges();
      },
    });
  }

  onVerifyResetCode(): void {
    if (!this.resetCode || this.resetCode.trim().length !== 6) {
      this.errorMessage = 'Veuillez saisir le code à 6 chiffres';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService
      .verifyResetOtp(this.resetEmail.trim(), this.resetCode.trim())
      .subscribe({
        next: () => {
          this.loading = false;
          this.clearResendTimer();
          this.step = 'forgot-reset';
          this.errorMessage = '';
          this.successMessage = '';
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage =
            err.error?.message || 'Code de réinitialisation invalide ou expiré';
          this.cdr.detectChanges();
        },
      });
  }

  onResetPassword(): void {
    if (!this.newPassword || !this.confirmPassword) {
      this.errorMessage = 'Veuillez remplir tous les champs du formulaire';
      this.cdr.detectChanges();
      return;
    }

    if (this.newPassword.length < 6) {
      this.errorMessage = 'Le nouveau mot de passe doit comporter au moins 6 caractères';
      this.cdr.detectChanges();
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Le nouveau mot de passe et sa confirmation ne correspondent pas';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService
      .resetPassword({
        email: this.resetEmail.trim(),
        code: this.resetCode.trim(),
        newPassword: this.newPassword,
        confirmPassword: this.confirmPassword,
      })
      .subscribe({
        next: () => {
          this.loading = false;
          this.step = 'login';
          this.password = '';
          this.email = this.resetEmail;
          this.successMessage =
            'Votre mot de passe a été réinitialisé avec succès ! Vous pouvez maintenant vous connecter.';
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage =
            err.error?.message || 'Erreur lors de la réinitialisation du mot de passe';
          this.cdr.detectChanges();
        },
      });
  }

  private clearSentTimer(): void {
    if (this.sentTimer) {
      clearInterval(this.sentTimer);
      this.sentTimer = null;
    }
  }

  private clearResendTimer(): void {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
      this.resendTimer = null;
    }
  }
}
