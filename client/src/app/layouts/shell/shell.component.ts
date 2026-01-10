import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { BottomNavComponent } from '../bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, SidebarComponent, BottomNavComponent],
  templateUrl: './shell.component.html'
})
export class ShellComponent {}
