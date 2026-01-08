import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-range-slider',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './range-slider.component.html'
})
export class RangeSliderComponent implements OnInit, OnChanges {
  @Input() min = 0;
  @Input() max = 100;
  @Input() minValue = 0;
  @Input() maxValue = 100;
  @Input() step = 1;
  @Input() unit = '';

  @Output() rangeChange = new EventEmitter<{ min: number; max: number }>();

  currentMin = 0;
  currentMax = 100;

  ngOnInit(): void {
    this.currentMin = this.minValue;
    this.currentMax = this.maxValue;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['minValue']) {
      this.currentMin = this.minValue;
    }
    if (changes['maxValue']) {
      this.currentMax = this.maxValue;
    }
  }

  onMinChange(event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    if (value <= this.currentMax) {
      this.currentMin = value;
      this.emitChange();
    }
  }

  onMaxChange(event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    if (value >= this.currentMin) {
      this.currentMax = value;
      this.emitChange();
    }
  }

  private emitChange(): void {
    this.rangeChange.emit({ min: this.currentMin, max: this.currentMax });
  }

  get leftPercent(): number {
    return ((this.currentMin - this.min) / (this.max - this.min)) * 100;
  }

  get rightPercent(): number {
    return ((this.currentMax - this.min) / (this.max - this.min)) * 100;
  }

  formatValue(value: number): string {
    if (this.unit === 'GB') {
      return `${value} GB`;
    }
    return `${value}${this.unit}`;
  }
}
