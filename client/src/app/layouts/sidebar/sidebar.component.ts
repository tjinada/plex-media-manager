import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SyncService, PlexService } from '@core/services';
import { Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent implements OnInit, OnDestroy {
  navItems: NavItem[] = [
    { path: '/home', label: 'Home', icon: 'home' },
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/movies', label: 'Movies', icon: 'movie' },
    { path: '/shows', label: 'TV Shows', icon: 'tv' },
    { path: '/storage', label: 'Storage', icon: 'storage' },
    { path: '/wanted', label: 'Wanted', icon: 'wanted' },
    { path: '/watch-history', label: 'Library Analyzer', icon: 'watch-history' },
    { path: '/compatibility', label: 'Compatibility', icon: 'compatibility' },
    { path: '/transcoding', label: 'Transcoding', icon: 'transcoding' },
    { path: '/settings', label: 'Settings', icon: 'settings' }
  ];

  isCollapsed = false;
  
  // Sync state
  isSyncing = false;
  hasServer = false;
  lastSyncAt: string | null = null;
  private statusSubscription?: Subscription;
  private serverSubscription?: Subscription;

  constructor(
    private syncService: SyncService,
    private plexService: PlexService
  ) {}

  ngOnInit(): void {
    this.checkServerStatus();
    this.checkSyncStatus();
  }

  ngOnDestroy(): void {
    this.statusSubscription?.unsubscribe();
    this.serverSubscription?.unsubscribe();
  }

  checkServerStatus(): void {
    this.serverSubscription = this.plexService.getServer().subscribe({
      next: (response) => {
        this.hasServer = !!response.server;
        this.lastSyncAt = response.server?.lastSyncAt || null;
      }
    });
  }

  checkSyncStatus(): void {
    this.syncService.getStatus().subscribe({
      next: (response) => {
        this.isSyncing = response.isRunning;
        if (this.isSyncing) {
          this.pollSyncStatus();
        }
      }
    });
  }

  pollSyncStatus(): void {
    this.statusSubscription?.unsubscribe();
    this.statusSubscription = interval(2000).pipe(
      switchMap(() => this.syncService.getStatus())
    ).subscribe({
      next: (response) => {
        this.isSyncing = response.isRunning;
        if (!this.isSyncing) {
          this.statusSubscription?.unsubscribe();
          this.checkServerStatus(); // Refresh last sync time
        }
      }
    });
  }

  startSync(): void {
    if (this.isSyncing || !this.hasServer) return;
    
    this.isSyncing = true;
    this.syncService.startSync('full').subscribe({
      next: () => {
        this.pollSyncStatus();
      },
      error: () => {
        this.isSyncing = false;
      }
    });
  }

  formatLastSync(): string {
    if (!this.lastSyncAt) return 'Never';
    const date = new Date(this.lastSyncAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  toggleCollapsed(): void {
    this.isCollapsed = !this.isCollapsed;
  }
}
