import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-icon',
  standalone: false,
  template: `
    <svg
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
      [class]="className"
    >
      @switch (name) {
        @case ('dashboard') {
          <rect width="7" height="9" x="3" y="3" rx="1"/>
          <rect width="7" height="5" x="14" y="3" rx="1"/>
          <rect width="7" height="9" x="14" y="12" rx="1"/>
          <rect width="7" height="5" x="3" y="16" rx="1"/>
        }
        @case ('projects') {
          <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
        }
        @case ('tasks') {
          <rect width="18" height="18" x="3" y="3" rx="2"/>
          <path d="m9 12 2 2 4-4"/>
        }
        @case ('budgets') {
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v12M17 10a5 5 0 0 0-10 0c0 4 6 3 6 7a5 5 0 0 1-6 0"/>
        }
        @case ('expenses') {
          <rect width="20" height="14" x="2" y="5" rx="2"/>
          <line x1="2" x2="22" y1="10" y2="10"/>
        }
        @case ('analytics') {
          <path d="M3 3v18h18"/>
          <path d="m19 9-5 5-4-4-3 3"/>
        }
        @case ('time') {
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        }
        @case ('search') {
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.3-4.3"/>
        }
        @case ('bell') {
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
        }
        @case ('sun') {
          <circle cx="12" cy="12" r="4"/>
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
        }
        @case ('moon') {
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
        }
        @case ('laptop') {
          <path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"/>
        }
        @case ('plus') {
          <path d="M5 12h14M12 5v14"/>
        }
        @case ('check') {
          <path d="m5 12 5 5L20 7"/>
        }
        @case ('clock') {
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        }
        @case ('alert') {
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" x2="12" y1="8" y2="12"/>
          <line x1="12" x2="12.01" y1="16" y2="16"/>
        }
        @case ('chevron-down') {
          <path d="m6 9 6 6 6-6"/>
        }
        @case ('chevron-right') {
          <path d="m9 18 6-6-6-6"/>
        }
        @case ('x') {
          <path d="M18 6 6 18M6 6l12 12"/>
        }
        @case ('trash') {
          <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        }
        @case ('edit') {
          <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
        }
        @case ('menu') {
          <line x1="4" x2="20" y1="12" y2="12"/>
          <line x1="4" x2="20" y1="6" y2="6"/>
          <line x1="4" x2="20" y1="18" y2="18"/>
        }
        @case ('arrow-up-right') {
          <path d="M7 17 17 7M7 7h10v10"/>
        }
        @default {
          <circle cx="12" cy="12" r="10"/>
        }
      }
    </svg>
  `,
})
export class IconComponent {
  @Input() name: string = 'dashboard';
  @Input() size: number = 20;
  @Input() strokeWidth: number = 2;
  @Input() className: string = '';
}
