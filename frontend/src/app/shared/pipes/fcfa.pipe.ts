import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fcfa',
  standalone: false,
})
export class FcfaPipe implements PipeTransform {
  transform(value: number | string | null | undefined, currency: string = 'FCFA'): string {
    if (value === null || value === undefined || isNaN(Number(value))) {
      return `0 ${currency}`;
    }
    const num = Math.round(Number(value));
    const formatted = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${formatted} ${currency}`;
  }
}
