import { Component, Output, EventEmitter } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService, ThemeMode } from '../../core/services/theme.service';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  @Output() toggleMobileSidebar = new EventEmitter<void>();

  isThemeMenuOpen = false;
  isUserMenuOpen = false;

  constructor(
    public authService: AuthService,
    public themeService: ThemeService,
  ) {}

  get user() {
    return this.authService.currentUser;
  }

  getInitials(): string {
    const u = this.user();
    if (!u) return 'TF';
    return `${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`.toUpperCase() || 'TF';
  }

  toggleThemeMenu() {
    this.isThemeMenuOpen = !this.isThemeMenuOpen;
    this.isUserMenuOpen = false;
  }

  toggleUserMenu() {
    this.isUserMenuOpen = !this.isUserMenuOpen;
    this.isThemeMenuOpen = false;
  }

  setTheme(mode: ThemeMode) {
    this.themeService.setMode(mode);
    this.isThemeMenuOpen = false;
  }

  logout() {
    this.authService.logout();
    this.isUserMenuOpen = false;
  }
}
