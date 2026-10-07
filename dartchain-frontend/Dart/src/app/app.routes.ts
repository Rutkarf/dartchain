import { Routes } from '@angular/router';

import { ShellRouteComponent } from './shell-route.component';

const shell = ShellRouteComponent;

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: shell },
  { path: 'wallet', component: shell },
  { path: 'faucet', component: shell },
  { path: 'transactions', component: shell },
  { path: 'chain', component: shell },
  { path: 'quests', component: shell },
  { path: 'peers', component: shell },
  { path: 'admin', component: shell },
  { path: 'rv23', component: shell },
  { path: 'daonews', component: shell },
  { path: 'dao', component: shell },
  { path: 'market', component: shell },
  { path: 'r4v3', component: shell },
  { path: 'tours', component: shell },
];
