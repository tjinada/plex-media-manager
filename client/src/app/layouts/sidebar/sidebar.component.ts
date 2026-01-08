import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

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
export class SidebarComponent {
  navItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/movies', label: 'Movies', icon: 'movie' },
    { path: '/shows', label: 'TV Shows', icon: 'tv' },
    { path: '/storage', label: 'Storage', icon: 'storage' },
    { path: '/wanted', label: 'Wanted', icon: 'wanted' },
    { path: '/watch-history', label: 'Watch History', icon: 'watch-history' },
    { path: '/compatibility', label: 'Compatibility', icon: 'compatibility' },
    { path: '/settings', label: 'Settings', icon: 'settings' }
  ];

  isCollapsed = false;

  toggleCollapsed(): void {
    this.isCollapsed = !this.isCollapsed;
  }
}
