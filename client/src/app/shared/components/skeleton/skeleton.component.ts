import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="animate-pulse bg-white/10"
      [class]="rounded"
      [style.width]="width"
      [style.height]="height">
    </div>
  `
})
export class SkeletonComponent {
  @Input() width = '100%';
  @Input() height = '1rem';
  @Input() rounded = 'rounded';
}
