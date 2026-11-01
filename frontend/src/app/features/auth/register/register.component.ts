import { ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: false,
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent implements OnDestroy {
  step: 'form' | 'sent' | 'verify' = 'form';

  firstName = '';
  lastName = '';
  email = '';
  password = '';
  currency = 'XOF';
  timezone = 'Africa/Porto-Novo';

  code = '';
  errorMessage = '';
  successMessage = '';
  loading = false;
  showPassword = false;

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

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
    this.cdr.detectChanges();
  }

  onSubmitForm(): void {
    if (!this.email || !this.password || !this.firstName || !this.lastName) {
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires';
      this.cdr.detectChanges();
      return;
    }
    if (this.password.length < 6) {
      this.errorMessage = 'Le mot de passe doit comporter au moins 6 caractères';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.sendVerificationOtp(this.email.trim()).subscribe({
      next: () => {
        this.loading = false;
        this.step = 'sent';
        this.sentCountdown = 5;
        this.cdr.detectChanges();
        this.startSentCountdown();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage =
          err.error?.message || "Erreur lors de l'envoi du code de validation";
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
        this.goToVerifyStep();
      }
      this.cdr.detectChanges();
    }, 1000);
  }

  goToVerifyStep(): void {
    this.clearSentTimer();
    this.step = 'verify';
    this.errorMessage = '';
    this.successMessage = '';
    this.code = '';
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

  resendCode(): void {
    if (this.timeLeft > 0 || this.loading) return;
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.sendVerificationOtp(this.email.trim()).subscribe({
      next: () => {
        this.loading = false;
        this.code = '';
        this.clearResendTimer();
        this.step = 'sent';
        this.sentCountdown = 5;
        this.cdr.detectChanges();
        this.startSentCountdown();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage =
          err.error?.message || "Erreur lors de l'envoi du code de validation";
        this.cdr.detectChanges();
      },
    });
  }

  onVerifyCode(): void {
    if (!this.code || this.code.trim().length !== 6) {
      this.errorMessage = 'Veuillez saisir le code complet à 6 chiffres';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService
      .verifyEmailAndRegister({
        firstName: this.firstName.trim(),
        lastName: this.lastName.trim(),
        email: this.email.trim(),
        password: this.password,
        currency: this.currency,
        timezone: this.timezone,
        code: this.code.trim(),
      })
      .subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/dashboard']);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage =
            err.error?.message || 'Code de validation invalide ou expiré';
          this.cdr.detectChanges();
        },
      });
  }

  backToForm(): void {
    this.clearSentTimer();
    this.clearResendTimer();
    this.step = 'form';
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();
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
