import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KidsService } from '@core/services';

/**
 * Adds or removes a title from the kids library.
 *
 * Optimistic: the state flips immediately and reverts if the server rejects
 * the change. Hidden entirely while kids sync is disabled, so it never offers
 * an action the backend would refuse.
 */
@Component({
  selector: 'app-kids-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (enabled$ | async) {
      <button
        type="button"
        (click)="toggle($event)"
        [disabled]="saving"
        [title]="isKids ? 'In kids library — click to remove' : 'Add to kids library'"
        class="inline-flex items-center gap-1 rounded-lg font-semibold transition-colors disabled:opacity-50"
        [ngClass]="[
          compact ? 'px-1.5 py-1 text-[10px]' : 'px-2.5 py-1.5 text-[12px]',
          isKids ? 'bg-amber-500/90 text-black active:bg-amber-600' : 'bg-white/[0.08] text-gray-300 active:bg-white/[0.14]'
        ]">
        <svg [class]="compact ? 'w-3 h-3' : 'w-3.5 h-3.5'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          @if (isKids) {
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
          } @else {
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 5v14m-7-7h14"/>
          }
        </svg>
        Kids
      </button>
    }
  `
})
export class KidsToggleComponent {
  @Input({ required: true }) plexId!: string;
  @Input() isKids = false;
  @Input() compact = false;
  @Output() isKidsChange = new EventEmitter<boolean>();

  private kidsService = inject(KidsService);

  enabled$ = this.kidsService.isEnabled();
  saving = false;

  toggle(event: Event): void {
    // Rows and cards navigate on click; the toggle must not.
    event.stopPropagation();

    const previous = this.isKids;
    const next = !previous;

    this.isKids = next;
    this.isKidsChange.emit(next);
    this.saving = true;

    this.kidsService.setLabel(this.plexId, next).subscribe({
      next: () => (this.saving = false),
      error: err => {
        this.isKids = previous;
        this.isKidsChange.emit(previous);
        this.saving = false;
        alert(err.error?.error || 'Failed to update kids library');
      }
    });
  }
}
