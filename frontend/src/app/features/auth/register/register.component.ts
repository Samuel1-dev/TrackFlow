import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: false,
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
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
