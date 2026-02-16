import { Routes } from '@angular/router';
import { ShellComponent } from './layouts/shell/shell.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component')
      .then(m => m.LoginComponent)
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      },
      {
        path: 'home',
        loadComponent: () => import('./features/home/home.component')
          .then(m => m.HomeComponent)
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
        path: 'wanted',
        loadComponent: () => import('./features/wanted/wanted.component')
          .then(m => m.WantedComponent)
      },
      {
        path: 'watch-history',
        loadComponent: () => import('./features/watch-history/watch-history.component')
          .then(m => m.WatchHistoryComponent)
      },
      {
        path: 'compatibility',
        loadComponent: () => import('./features/compatibility/compatibility.component')
          .then(m => m.CompatibilityComponent)
      },
      {
        path: 'transcoding',
        loadComponent: () => import('./features/transcoding/transcoding.component')
          .then(m => m.TranscodingComponent)
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
    redirectTo: 'home'
  }
];
