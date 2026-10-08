import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app';

/* Warm Three + STLLoader pendant le bootstrap Angular (appel d’âge < 1 s). */
void Promise.all([
  import('three'),
  import('three/examples/jsm/loaders/STLLoader.js'),
]);

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
