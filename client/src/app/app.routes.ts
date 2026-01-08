import { Routes } from '@angular/router';
import { ShellComponent } from './layouts/shell/shell.component';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component')
          .then(m => m.DashboardComponent)
      },
      {
        path: 'movies',
        loadComponent: () => import('./features/movies/movies.component')
          .then(m => m.MoviesComponent)
      },
      {
        path: 'movies/:id',
        loadComponent: () => import('./features/movies/movie-detail/movie-detail.component')
          .then(m => m.MovieDetailComponent)
      },
      {
        path: 'shows',
        loadComponent: () => import('./features/shows/shows.component')
          .then(m => m.ShowsComponent)
      },
      {
        path: 'shows/:id',
        loadComponent: () => import('./features/shows/show-detail/show-detail.component')
          .then(m => m.ShowDetailComponent)
      },
      {
        path: 'storage',
        loadComponent: () => import('./features/storage/storage.component')
          .then(m => m.StorageComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings.component')
          .then(m => m.SettingsComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
