import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { Subscription, interval, filter } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  template: `
    <router-outlet></router-outlet>

    <!-- Update Banner -->
    @if (showUpdateBanner) {
      <div class="fixed top-0 left-0 right-0 z-[100] safe-area-top">
        <div class="mx-4 mt-3 md:mx-auto md:max-w-md">
          <div class="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary-600 text-white shadow-2xl shadow-primary-900/50 border border-primary-500/50 backdrop-blur-sm">
            <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <span class="text-sm font-medium flex-1">A new version is available</span>
            <button (click)="applyUpdate()" class="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-bold transition-colors">
              Update
            </button>
            <button (click)="dismissUpdate()" class="p-1 rounded-lg hover:bg-white/20 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'TJ Plex Media Manager';
  showUpdateBanner = false;

  private subscriptions: Subscription[] = [];

  constructor(private swUpdate: SwUpdate) {}

  ngOnInit(): void {
    if (!this.swUpdate.isEnabled) return;

    // Listen for new version ready
    this.subscriptions.push(
      this.swUpdate.versionUpdates.pipe(
        filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY')
      ).subscribe(() => {
        this.showUpdateBanner = true;
      })
    );

    // Check for updates every 5 minutes
    this.subscriptions.push(
      interval(5 * 60 * 1000).subscribe(() => {
        this.swUpdate.checkForUpdate().catch(err =>
          console.error('Update check failed:', err)
        );
      })
    );

    // Also check immediately on app start
    this.swUpdate.checkForUpdate().catch(err =>
      console.error('Initial update check failed:', err)
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  applyUpdate(): void {
    // Activate the new service worker and reload
    this.swUpdate.activateUpdate().then(() => {
      window.location.reload();
    });
  }

  dismissUpdate(): void {
    this.showUpdateBanner = false;
  }
}
