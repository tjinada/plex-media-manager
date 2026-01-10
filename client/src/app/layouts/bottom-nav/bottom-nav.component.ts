import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

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
  navItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/movies', label: 'Movies', icon: 'movie' },
    { path: '/shows', label: 'Shows', icon: 'tv' },
    { path: '/wanted', label: 'Wanted', icon: 'wanted' },
    { path: '/compatibility', label: 'Compat', icon: 'compatibility' }
  ];
}
