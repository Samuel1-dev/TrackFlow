import { Injectable, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  isAlert?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  readonly options = signal<ConfirmDialogOptions | null>(null);
  private result$ = new Subject<boolean>();

  open(options: ConfirmDialogOptions): Observable<boolean> {
    this.options.set(options);
    this.result$ = new Subject<boolean>();
    return this.result$.asObservable();
  }

  alert(message: string, title = 'Attention', danger = true): Observable<boolean> {
    return this.open({
      title,
      message,
      confirmLabel: 'Compris',
      cancelLabel: '',
      danger,
      isAlert: true,
    });
  }

  confirm(): void {
    this.result$.next(true);
    this.result$.complete();
    this.options.set(null);
  }

  cancel(): void {
    this.result$.next(false);
    this.result$.complete();
    this.options.set(null);
  }
}
