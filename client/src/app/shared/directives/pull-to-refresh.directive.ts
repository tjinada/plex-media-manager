import { Directive, ElementRef, EventEmitter, OnDestroy, OnInit, Output, NgZone } from '@angular/core';

@Directive({
  selector: '[appPullToRefresh]',
  standalone: true
})
export class PullToRefreshDirective implements OnInit, OnDestroy {
  @Output() refresh = new EventEmitter<void>();

  private startY = 0;
  private currentY = 0;
  private pulling = false;
  private threshold = 80;
  private maxPull = 120;
  private indicator: HTMLElement | null = null;
  private isRefreshing = false;

  private touchStartHandler = this.onTouchStart.bind(this);
  private touchMoveHandler = this.onTouchMove.bind(this);
  private touchEndHandler = this.onTouchEnd.bind(this);

  constructor(
    private el: ElementRef<HTMLElement>,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.createIndicator();
    this.zone.runOutsideAngular(() => {
      this.el.nativeElement.addEventListener('touchstart', this.touchStartHandler, { passive: true });
      this.el.nativeElement.addEventListener('touchmove', this.touchMoveHandler, { passive: false });
      this.el.nativeElement.addEventListener('touchend', this.touchEndHandler, { passive: true });
    });
  }

  ngOnDestroy(): void {
    this.el.nativeElement.removeEventListener('touchstart', this.touchStartHandler);
    this.el.nativeElement.removeEventListener('touchmove', this.touchMoveHandler);
    this.el.nativeElement.removeEventListener('touchend', this.touchEndHandler);
    this.indicator?.remove();
  }

  private createIndicator(): void {
    this.indicator = document.createElement('div');
    this.indicator.className = 'pull-to-refresh-indicator';
    this.indicator.innerHTML = `
      <svg class="ptr-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
      </svg>
    `;
    this.indicator.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 0;
      overflow: hidden;
      transition: none;
      z-index: 10;
      pointer-events: none;
    `;

    const style = document.createElement('style');
    style.textContent = `
      .pull-to-refresh-indicator .ptr-spinner {
        width: 24px;
        height: 24px;
        color: #14b8a6;
        transition: transform 0.2s ease;
      }
      .pull-to-refresh-indicator.ptr-refreshing .ptr-spinner {
        animation: ptr-spin 0.8s linear infinite;
      }
      @keyframes ptr-spin { to { transform: rotate(360deg); } }
    `;
    this.indicator.appendChild(style);

    const el = this.el.nativeElement;
    const position = getComputedStyle(el).position;
    if (position === 'static') {
      el.style.position = 'relative';
    }
    el.insertBefore(this.indicator, el.firstChild);
  }

  private onTouchStart(e: TouchEvent): void {
    if (this.isRefreshing) return;
    if (this.el.nativeElement.scrollTop <= 0) {
      this.startY = e.touches[0].clientY;
      this.pulling = true;
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (!this.pulling || this.isRefreshing) return;

    if (this.el.nativeElement.scrollTop > 0) {
      this.pulling = false;
      this.resetIndicator();
      return;
    }

    this.currentY = e.touches[0].clientY;
    const pullDistance = Math.max(0, this.currentY - this.startY);

    if (pullDistance > 5) {
      e.preventDefault();
    }

    if (pullDistance > 0 && this.indicator) {
      const displayDistance = Math.min(pullDistance * 0.5, this.maxPull);
      this.indicator.style.height = `${displayDistance}px`;
      this.indicator.style.transition = 'none';

      const rotation = (displayDistance / this.threshold) * 360;
      const spinner = this.indicator.querySelector('.ptr-spinner') as HTMLElement;
      if (spinner) {
        spinner.style.transform = `rotate(${rotation}deg)`;
        spinner.style.opacity = `${Math.min(1, displayDistance / this.threshold)}`;
      }
    }
  }

  private onTouchEnd(): void {
    if (!this.pulling || this.isRefreshing) return;
    this.pulling = false;

    const pullDistance = Math.max(0, this.currentY - this.startY) * 0.5;

    if (pullDistance >= this.threshold) {
      this.triggerRefresh();
    } else {
      this.resetIndicator();
    }
  }

  private triggerRefresh(): void {
    this.isRefreshing = true;
    if (this.indicator) {
      this.indicator.style.transition = 'height 0.2s ease';
      this.indicator.style.height = '48px';
      this.indicator.classList.add('ptr-refreshing');
    }

    this.zone.run(() => {
      this.refresh.emit();
    });

    setTimeout(() => this.completeRefresh(), 2000);
  }

  completeRefresh(): void {
    this.isRefreshing = false;
    this.resetIndicator();
  }

  private resetIndicator(): void {
    if (this.indicator) {
      this.indicator.style.transition = 'height 0.2s ease';
      this.indicator.style.height = '0';
      this.indicator.classList.remove('ptr-refreshing');

      const spinner = this.indicator.querySelector('.ptr-spinner') as HTMLElement;
      if (spinner) {
        spinner.style.transform = 'rotate(0deg)';
        spinner.style.opacity = '0';
      }
    }
  }
}
