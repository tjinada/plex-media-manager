import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chart-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card p-4 md:p-6 h-full">
      <h3 class="text-sm font-medium text-gray-400 mb-4">{{ title }}</h3>
      <div class="h-64 md:h-72">
        <ng-content></ng-content>
      </div>
    </div>
  `
})
export class ChartCardComponent {
  @Input() title = '';
}
