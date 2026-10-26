import {
  Component,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  HostListener,
  ChangeDetectorRef,
} from '@angular/core';
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService, ThemeMode } from '../../core/services/theme.service';
import { TaskSelectionService } from '../../core/services/task-selection.service';
import { SearchService } from '../../core/services/search.service';
import { NotificationService } from '../../core/services/notification.service';
import {
  SearchResponse,
  SearchResultItem,
  SearchScopeType,
} from '../../core/models/search.models';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Output() toggleMobileSidebar = new EventEmitter<void>();

  @ViewChild('searchInput') searchInputElement?: ElementRef<HTMLInputElement>;
  @ViewChild('searchContainer') searchContainerRef?: ElementRef<HTMLElement>;

  isThemeMenuOpen = false;
  isUserMenuOpen = false;

  // ─── État des notifications ────────────────────────────────────────────────
  unreadNotificationCount: number = 0;
  private notifSub?: Subscription;

  // ─── État de la recherche en temps réel ─────────────────────────────────────
  searchQuery: string = '';
  searchType: SearchScopeType = 'all';
  searchPage: number = 1;
  readonly searchLimit: number = 6;
  isSearching: boolean = false;
  isSearchDropdownOpen: boolean = false;
  isMobileSearchOpen: boolean = false;
  searchResponse: SearchResponse | null = null;

  private search$ = new Subject<string>();
  private searchSub?: Subscription;

  constructor(
    public authService: AuthService,
    public themeService: ThemeService,
    public taskSelectionService: TaskSelectionService,
    public notificationService: NotificationService,
    private searchService: SearchService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    // Écoute de la saisie lettre par lettre avec debounce anti-latence (200ms)
    this.searchSub = this.search$
      .pipe(
        debounceTime(200),
        distinctUntilChanged(),
      )
      .subscribe((query) => {
        this.searchPage = 1;
        this.executeSearch(query);
      });

    // Écoute des notifications système (tâches en retard, budgets dépassés)
    this.notificationService.loadNotifications();
    this.notifSub = this.notificationService.unreadCount$.subscribe((count) => {
      this.unreadNotificationCount = count;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy() {
    this.searchSub?.unsubscribe();
    this.notifSub?.unsubscribe();
  }

  // ─── Raccourcis clavier & fermeture au clic extérieur ───────────────────────
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    // Ctrl+K ou Cmd+K : focalise la barre de recherche
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.focusSearch();
    } else if (event.key === 'Escape') {
      this.closeSearch();
      this.closeMobileSearch();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (
      this.searchContainerRef &&
      !this.searchContainerRef.nativeElement.contains(event.target as Node)
    ) {
      this.closeSearch();
    }
  }

  focusSearch() {
    if (this.searchInputElement) {
      this.searchInputElement.nativeElement.focus();
    }
    if (this.searchQuery.trim()) {
      this.isSearchDropdownOpen = true;
    }
    this.cdr.detectChanges();
  }

  onSearchInput(value: string) {
    this.searchQuery = value;
    if (!value.trim()) {
      this.searchResponse = null;
      this.isSearchDropdownOpen = false;
      this.isSearching = false;
      this.cdr.detectChanges();
      return;
    }

    this.isSearchDropdownOpen = true;
    this.isSearching = true;
    this.search$.next(value);
    this.cdr.detectChanges();
  }

  setSearchType(type: SearchScopeType) {
    if (this.searchType === type) return;
    this.searchType = type;
    this.searchPage = 1;
    this.executeSearch(this.searchQuery);
  }

  goToSearchPage(page: number, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    if (page < 1 || (this.searchResponse && page > this.searchResponse.totalPages)) {
      return;
    }
    this.searchPage = page;
    this.executeSearch(this.searchQuery);
  }

  executeSearch(query: string) {
    const trimmed = query.trim();
    if (!trimmed) {
      this.searchResponse = null;
      this.isSearching = false;
      this.cdr.detectChanges();
      return;
    }

    this.isSearching = true;
    this.cdr.detectChanges();

    this.searchService
      .search(trimmed, this.searchPage, this.searchLimit, this.searchType)
      .subscribe({
        next: (response) => {
          this.searchResponse = response;
          this.isSearching = false;
          this.isSearchDropdownOpen = true;
          this.cdr.detectChanges();
        },
        error: () => {
          this.isSearching = false;
          this.cdr.detectChanges();
        },
      });
  }

  clearSearch(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.searchQuery = '';
    this.searchResponse = null;
    this.isSearchDropdownOpen = false;
    this.isSearching = false;
    if (this.searchInputElement) {
      this.searchInputElement.nativeElement.focus();
    }
    this.cdr.detectChanges();
  }

  closeSearch() {
    this.isSearchDropdownOpen = false;
    this.cdr.detectChanges();
  }

  openMobileSearch() {
    this.isMobileSearchOpen = true;
    setTimeout(() => {
      this.focusSearch();
    }, 50);
  }

  closeMobileSearch() {
    this.isMobileSearchOpen = false;
    this.clearSearch();
  }

  selectResult(item: SearchResultItem, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.closeSearch();
    this.closeMobileSearch();

    if (item.type === 'task') {
      // Déploie immédiatement les détails de la tâche dans le panneau latéral droit
      this.taskSelectionService.selectTask(item.data);
    } else if (item.type === 'project') {
      this.router.navigate(['/projects']);
    } else if (item.type === 'expense') {
      this.router.navigate(['/finance/expenses']);
    }
  }

  // ─── Profil & Thème ────────────────────────────────────────────────────────
  get user() {
    return this.authService.currentUser;
  }

  get isLeftSidebarCollapsed(): boolean {
    return this.taskSelectionService.isLeftSidebarCollapsed();
  }

  get isRightPanelCollapsed(): boolean {
    return this.taskSelectionService.isRightPanelCollapsed();
  }

  toggleLeftSidebar() {
    this.taskSelectionService.toggleLeftSidebar();
  }

  toggleRightPanel() {
    this.taskSelectionService.toggleRightPanel();
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
