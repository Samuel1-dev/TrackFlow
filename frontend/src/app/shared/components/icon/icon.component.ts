import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-icon',
  standalone: false,
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.scss',
})
export class IconComponent {
  @Input() name: string = 'dashboard';
  @Input() size: number = 20;
  @Input() strokeWidth: number = 2;
  @Input() className: string = '';
}
