import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './bottom-nav.component.html'
})
export class BottomNavComponent {
  showMoreMenu = false;

  // Main navigation items (always visible)
  navItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/wanted', label: 'Wanted', icon: 'wanted' },
    { path: '/compatibility', label: 'Compat', icon: 'compatibility' },
    { path: '/storage', label: 'Storage', icon: 'storage' }
  ];

  // Items in the "More" menu
  moreItems: NavItem[] = [
    { path: '/watch-history', label: 'Watch History', icon: 'watch-history' },
    { path: '/movies', label: 'Movies', icon: 'movie' },
    { path: '/shows', label: 'TV Shows', icon: 'tv' }
  ];

  constructor(private router: Router) {
    // Close menu on navigation
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.showMoreMenu = false;
    });
  }

  toggleMoreMenu(): void {
    this.showMoreMenu = !this.showMoreMenu;
  }

  closeMoreMenu(): void {
    this.showMoreMenu = false;
  }

  isMoreItemActive(): boolean {
    const currentUrl = this.router.url;
    return this.moreItems.some(item => currentUrl.startsWith(item.path));
  }
}
